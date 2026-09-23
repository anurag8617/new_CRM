import { getPool } from '../../config/db.js';

export class CompaniesService {
  /**
   * List companies with multi-tenant isolation, search, and pagination
   */
  static async list({ orgId, search = '', page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' }) {
    const pool = getPool();
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    let whereClause = 'WHERE c.organization_id = ?';
    const params = [orgId];

    if (search && search.trim() !== '') {
      whereClause += ' AND (c.name LIKE ? OR c.domain LIKE ? OR c.industry LIKE ? OR c.city LIKE ?)';
      const searchParam = `%${search.trim()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Allowed sort columns
    const allowedSort = ['name', 'created_at', 'annual_revenue', 'employee_count', 'domain'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const safeOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM companies c ${whereClause};`,
      params
    );
    const total = countResult[0].total;

    // Data query with contact counts and owner
    const [rows] = await pool.query(
      `SELECT c.id, c.organization_id, c.name, c.domain, c.industry, c.phone,
              c.annual_revenue, c.employee_count, c.city, c.state, c.country,
              c.created_at, c.updated_at,
              CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
              p.name AS parent_company_name,
              COUNT(ct.id) AS contacts_count
       FROM companies c
       LEFT JOIN users u ON c.owner_id = u.id
       LEFT JOIN companies p ON c.parent_company_id = p.id
       LEFT JOIN contacts ct ON ct.company_id = c.id
       ${whereClause}
       GROUP BY c.id
       ORDER BY c.${safeSort} ${safeOrder}
       LIMIT ? OFFSET ?;`,
      [...params, parsedLimit, offset]
    );

    return {
      companies: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  /**
   * Get single company by ID with its contacts
   */
  static async getById({ orgId, id }) {
    const pool = getPool();

    const [rows] = await pool.query(
      `SELECT c.*, 
              CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
              p.name AS parent_company_name
       FROM companies c
       LEFT JOIN users u ON c.owner_id = u.id
       LEFT JOIN companies p ON c.parent_company_id = p.id
       WHERE c.id = ? AND c.organization_id = ?
       LIMIT 1;`,
      [id, orgId]
    );

    if (rows.length === 0) {
      throw new Error('Company not found');
    }

    const company = rows[0];

    // Fetch related contacts
    const [contacts] = await pool.query(
      `SELECT id, first_name, last_name, email, phone, job_title, lifecycle_stage, lead_status
       FROM contacts
       WHERE company_id = ? AND organization_id = ?
       ORDER BY last_name ASC;`,
      [id, orgId]
    );

    return {
      ...company,
      contacts,
    };
  }

  /**
   * Create new company record
   */
  static async create({ orgId, ownerId, data }) {
    const pool = getPool();
    const {
      name,
      domain = null,
      industry = null,
      phone = null,
      annualRevenue = null,
      employeeCount = null,
      city = null,
      state = null,
      country = 'United States',
      description = null,
      parentCompanyId = null,
    } = data;

    if (!name || name.trim() === '') {
      throw new Error('Company name is required');
    }

    const [result] = await pool.query(
      `INSERT INTO companies 
       (organization_id, owner_id, parent_company_id, name, domain, industry, phone, annual_revenue, employee_count, city, state, country, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId,
        ownerId || null,
        parentCompanyId || null,
        name.trim(),
        domain ? domain.trim() : null,
        industry || null,
        phone || null,
        annualRevenue ? parseFloat(annualRevenue) : null,
        employeeCount ? parseInt(employeeCount, 10) : null,
        city || null,
        state || null,
        country || null,
        description || null,
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, after_json)
       VALUES (?, ?, 'company.create', 'companies', ?, ?);`,
      [orgId, ownerId || null, result.insertId, JSON.stringify(data)]
    );

    return this.getById({ orgId, id: result.insertId });
  }

  /**
   * Update existing company record
   */
  static async update({ orgId, actorId, id, data }) {
    const pool = getPool();
    const existing = await this.getById({ orgId, id });

    const fieldsToUpdate = {};
    const fieldMapping = {
      name: 'name',
      domain: 'domain',
      industry: 'industry',
      phone: 'phone',
      annualRevenue: 'annual_revenue',
      employeeCount: 'employee_count',
      city: 'city',
      state: 'state',
      country: 'country',
      description: 'description',
      parentCompanyId: 'parent_company_id',
    };

    for (const [key, col] of Object.entries(fieldMapping)) {
      if (data[key] !== undefined) {
        fieldsToUpdate[col] = data[key];
      }
    }

    if (Object.keys(fieldsToUpdate).length === 0) {
      return existing;
    }

    const setClauses = Object.keys(fieldsToUpdate).map((col) => `${col} = ?`).join(', ');
    const values = [...Object.values(fieldsToUpdate), id, orgId];

    await pool.query(
      `UPDATE companies SET ${setClauses} WHERE id = ? AND organization_id = ?;`,
      values
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, before_json, after_json)
       VALUES (?, ?, 'company.update', 'companies', ?, ?, ?);`,
      [orgId, actorId || null, id, JSON.stringify(existing), JSON.stringify(data)]
    );

    return this.getById({ orgId, id });
  }

  /**
   * Delete company record
   */
  static async delete({ orgId, actorId, id }) {
    const pool = getPool();
    const existing = await this.getById({ orgId, id });

    await pool.query('DELETE FROM companies WHERE id = ? AND organization_id = ?;', [id, orgId]);

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, before_json)
       VALUES (?, ?, 'company.delete', 'companies', ?, ?);`,
      [orgId, actorId || null, id, JSON.stringify(existing)]
    );

    return { success: true, id };
  }
}
