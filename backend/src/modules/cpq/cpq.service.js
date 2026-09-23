import { getPool } from '../../config/db.js';

export class CpqService {
  // ===================================================================
  // 1. PRODUCTS CATALOG (Spec §2.1, §24)
  // ===================================================================

  static async listProducts(orgId, { search, category, isActive, limit = 50, offset = 0 } = {}) {
    const pool = getPool();
    let query = `
      SELECT p.*,
             (SELECT COUNT(*) FROM price_book_entries pbe WHERE pbe.product_id = p.id) AS price_book_count
      FROM products p
      WHERE p.organization_id = ?
    `;
    const params = [orgId];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ' AND p.category = ?';
      params.push(category);
    }

    if (isActive !== undefined && isActive !== '') {
      query += ' AND p.is_active = ?';
      params.push(isActive === 'true' || isActive === true ? 1 : 0);
    }

    query += ' ORDER BY p.name ASC LIMIT ? OFFSET ?;';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getProductById(orgId, id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );

    if (rows.length === 0) return null;
    const prod = rows[0];

    const [entries] = await pool.query(
      `SELECT pbe.*, pb.name AS price_book_name
       FROM price_book_entries pbe
       JOIN price_books pb ON pb.id = pbe.price_book_id
       WHERE pbe.product_id = ? AND pbe.organization_id = ?;`,
      [id, orgId]
    );
    prod.priceBookEntries = entries;
    return prod;
  }

  static async createProduct(orgId, userId, data) {
    const pool = getPool();
    const {
      name,
      sku,
      description = '',
      category = 'Software',
      pricingType = 'recurring',
      billingFrequency = 'annual',
      unitPrice = 0.00,
      costPrice = 0.00,
      currency = 'USD',
      taxRate = 0.00,
      isActive = true
    } = data;

    const [res] = await pool.query(
      `INSERT INTO products (
        organization_id, name, sku, description, category, pricing_type,
        billing_frequency, unit_price, cost_price, currency, tax_rate, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId, name, sku, description, category, pricingType,
        billingFrequency, parseFloat(unitPrice), parseFloat(costPrice),
        currency, parseFloat(taxRate), isActive ? 1 : 0, userId
      ]
    );

    return this.getProductById(orgId, res.insertId);
  }

  static async updateProduct(orgId, id, data) {
    const pool = getPool();
    const fields = [];
    const params = [];

    const fieldMap = {
      name: 'name',
      sku: 'sku',
      description: 'description',
      category: 'category',
      pricingType: 'pricing_type',
      billingFrequency: 'billing_frequency',
      unitPrice: 'unit_price',
      costPrice: 'cost_price',
      currency: 'currency',
      taxRate: 'tax_rate',
      isActive: 'is_active',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = ?`);
        if (key === 'isActive') {
          params.push(data[key] ? 1 : 0);
        } else if (['unitPrice', 'costPrice', 'taxRate'].includes(key)) {
          params.push(parseFloat(data[key]));
        } else {
          params.push(data[key]);
        }
      }
    }

    if (fields.length === 0) return this.getProductById(orgId, id);

    params.push(id, orgId);
    await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = ? AND organization_id = ?;`,
      params
    );

    return this.getProductById(orgId, id);
  }

  static async deleteProduct(orgId, id) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM products WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    return res.affectedRows > 0;
  }

  // ===================================================================
  // 2. PRICE BOOKS & PRICING MATRICES (Spec §24)
  // ===================================================================

  static async listPriceBooks(orgId, { isActive } = {}) {
    const pool = getPool();
    let query = `
      SELECT pb.*,
             (SELECT COUNT(*) FROM price_book_entries pbe WHERE pbe.price_book_id = pb.id) AS entry_count
      FROM price_books pb
      WHERE pb.organization_id = ?
    `;
    const params = [orgId];

    if (isActive !== undefined && isActive !== '') {
      query += ' AND pb.is_active = ?';
      params.push(isActive === 'true' || isActive === true ? 1 : 0);
    }

    query += ' ORDER BY pb.is_standard DESC, pb.name ASC;';
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getPriceBookById(orgId, id) {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM price_books WHERE id = ? AND organization_id = ?;',
      [id, orgId]
    );
    if (rows.length === 0) return null;
    const pb = rows[0];

    // Fetch entries with product details
    const [entries] = await pool.query(
      `SELECT pbe.*, p.name AS product_name, p.sku, p.category, p.unit_price AS standard_list_price
       FROM price_book_entries pbe
       JOIN products p ON p.id = pbe.product_id
       WHERE pbe.price_book_id = ? AND pbe.organization_id = ?
       ORDER BY p.name ASC;`,
      [id, orgId]
    );
    pb.entries = entries;
    return pb;
  }

  static async createPriceBook(orgId, data) {
    const pool = getPool();
    const {
      name,
      description = '',
      currency = 'USD',
      isStandard = false,
      isActive = true,
      validFrom = null,
      validTo = null
    } = data;

    const [res] = await pool.query(
      `INSERT INTO price_books (
        organization_id, name, description, currency, is_standard, is_active, valid_from, valid_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId, name, description, currency, isStandard ? 1 : 0, isActive ? 1 : 0,
        validFrom || null, validTo || null
      ]
    );

    return this.getPriceBookById(orgId, res.insertId);
  }

  static async addPriceBookEntry(orgId, priceBookId, data) {
    const pool = getPool();
    const {
      productId,
      unitPrice,
      currency = 'USD',
      minQuantity = 1,
      discountPercent = 0.00,
      isActive = true
    } = data;

    const [res] = await pool.query(
      `INSERT INTO price_book_entries (
        organization_id, price_book_id, product_id, unit_price, currency, min_quantity, discount_percent, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        unit_price = VALUES(unit_price),
        discount_percent = VALUES(discount_percent),
        is_active = VALUES(is_active);`,
      [
        orgId, priceBookId, productId, parseFloat(unitPrice),
        currency, parseInt(minQuantity, 10), parseFloat(discountPercent), isActive ? 1 : 0
      ]
    );

    return { id: res.insertId || null, priceBookId, productId, unitPrice, discountPercent };
  }

  static async deletePriceBookEntry(orgId, entryId) {
    const pool = getPool();
    const [res] = await pool.query(
      'DELETE FROM price_book_entries WHERE id = ? AND organization_id = ?;',
      [entryId, orgId]
    );
    return res.affectedRows > 0;
  }

  // ===================================================================
  // 3. QUOTES & CPQ ENGINE (Spec §25)
  // ===================================================================

  static async listQuotes(orgId, { dealId, companyId, status, search, limit = 50, offset = 0 } = {}) {
    const pool = getPool();
    let query = `
      SELECT q.*,
             d.title AS deal_title,
             c.name AS company_name,
             CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
             ct.email AS contact_email,
             pb.name AS price_book_name,
             (SELECT COUNT(*) FROM quote_line_items qli WHERE qli.quote_id = q.id) AS item_count
      FROM quotes q
      LEFT JOIN deals d ON d.id = q.deal_id
      LEFT JOIN companies c ON c.id = q.company_id
      LEFT JOIN contacts ct ON ct.id = q.contact_id
      LEFT JOIN price_books pb ON pb.id = q.price_book_id
      WHERE q.organization_id = ?
    `;
    const params = [orgId];

    if (dealId) {
      query += ' AND q.deal_id = ?';
      params.push(dealId);
    }

    if (companyId) {
      query += ' AND q.company_id = ?';
      params.push(companyId);
    }

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (q.title LIKE ? OR q.quote_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY q.created_at DESC LIMIT ? OFFSET ?;';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async getQuoteById(orgId, id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT q.*,
              d.title AS deal_title,
              d.value AS deal_value,
              c.name AS company_name,
              c.domain AS company_domain,
              CONCAT(ct.first_name, ' ', ct.last_name) AS contact_name,
              ct.email AS contact_email,
              ct.job_title AS contact_job_title,
              pb.name AS price_book_name,
              CONCAT(u.first_name, ' ', u.last_name) AS creator_name,
              CONCAT(appr.first_name, ' ', appr.last_name) AS approver_name
       FROM quotes q
       LEFT JOIN deals d ON d.id = q.deal_id
       LEFT JOIN companies c ON c.id = q.company_id
       LEFT JOIN contacts ct ON ct.id = q.contact_id
       LEFT JOIN price_books pb ON pb.id = q.price_book_id
       LEFT JOIN users u ON u.id = q.created_by
       LEFT JOIN users appr ON appr.id = q.approved_by
       WHERE q.id = ? AND q.organization_id = ?;`,
      [id, orgId]
    );

    if (rows.length === 0) return null;
    const quote = rows[0];

    // Fetch line items
    const [lineItems] = await pool.query(
      `SELECT qli.*, p.name AS product_name, p.sku, p.category, p.pricing_type
       FROM quote_line_items qli
       JOIN products p ON p.id = qli.product_id
       WHERE qli.quote_id = ? AND qli.organization_id = ?
       ORDER BY qli.item_order ASC;`,
      [id, orgId]
    );

    quote.lineItems = lineItems;
    return quote;
  }

  static async createQuote(orgId, userId, data) {
    const pool = getPool();
    const {
      dealId = null,
      companyId = null,
      contactId = null,
      priceBookId = null,
      title,
      discountType = 'fixed',
      discountValue = 0.00,
      taxRate = 0.00,
      currency = 'USD',
      validUntil = null,
      termsConditions = 'Net-30 payment terms. Standard SLA applies.',
      notes = '',
      lineItems = []
    } = data;

    // Generate unique quote number
    const timestamp = Date.now().toString().slice(-4);
    const quoteNumber = `QT-${new Date().getFullYear()}-${timestamp}`;

    // Calculate subtotal from line items
    let subtotal = 0;
    const processedItems = lineItems.map((item, idx) => {
      const qty = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unitPrice || 0);
      const discountPct = parseFloat(item.discountPercent || 0);
      const discountAmt = (unitPrice * qty) * (discountPct / 100);
      const lineTotal = (unitPrice * qty) - discountAmt;
      subtotal += lineTotal;

      return {
        productId: item.productId,
        itemOrder: idx + 1,
        description: item.description || '',
        quantity: qty,
        unitPrice,
        discountPercent: discountPct,
        discountAmount: discountAmt,
        lineTotal,
        billingFrequency: item.billingFrequency || 'annual',
      };
    });

    // Calculate discount amount & tax
    let totalDiscount = 0;
    if (discountType === 'percent') {
      totalDiscount = subtotal * (parseFloat(discountValue) / 100);
    } else {
      totalDiscount = parseFloat(discountValue || 0);
    }

    const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
    const taxAmount = discountedSubtotal * (parseFloat(taxRate) / 100);
    const totalAmount = discountedSubtotal + taxAmount;

    // Insert Quote
    const [quoteRes] = await pool.query(
      `INSERT INTO quotes (
        organization_id, quote_number, deal_id, company_id, contact_id, price_book_id,
        title, status, version, subtotal, discount_type, discount_value, discount_amount,
        tax_rate, tax_amount, total_amount, currency, valid_until, terms_conditions,
        notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        orgId, quoteNumber, dealId || null, companyId || null, contactId || null, priceBookId || null,
        title, subtotal, discountType, parseFloat(discountValue), totalDiscount,
        parseFloat(taxRate), taxAmount, totalAmount, currency, validUntil || null,
        termsConditions, notes, userId
      ]
    );

    const quoteId = quoteRes.insertId;

    // Insert Line Items
    for (const item of processedItems) {
      await pool.query(
        `INSERT INTO quote_line_items (
          organization_id, quote_id, product_id, item_order, description,
          quantity, unit_price, discount_percent, discount_amount, line_total, billing_frequency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          orgId, quoteId, item.productId, item.itemOrder, item.description,
          item.quantity, item.unitPrice, item.discountPercent, item.discountAmount,
          item.lineTotal, item.billingFrequency
        ]
      );
    }

    // Attach activity to timeline if dealId exists
    if (dealId) {
      await pool.query(
        `INSERT INTO activities (
          organization_id, actor_id, record_type, record_id, activity_type,
          payload_json, created_at
        ) VALUES (?, ?, 'deal', ?, 'note', ?, NOW());`,
        [
          orgId, userId, dealId,
          JSON.stringify({
            title: `Generated CPQ Quote: ${quoteNumber}`,
            note: `Created formal quote "${title}" for total amount $${totalAmount.toLocaleString()} (${currency}).`
          })
        ]
      );
    }

    return this.getQuoteById(orgId, quoteId);
  }

  static async updateQuote(orgId, id, data) {
    const pool = getPool();
    const existing = await this.getQuoteById(orgId, id);
    if (!existing) throw new Error('Quote not found');

    const {
      title,
      priceBookId,
      status,
      discountType = existing.discount_type,
      discountValue = existing.discount_value,
      taxRate = existing.tax_rate,
      validUntil = existing.valid_until,
      termsConditions = existing.terms_conditions,
      notes = existing.notes,
      lineItems
    } = data;

    let subtotal = existing.subtotal;
    let totalDiscount = existing.discount_amount;
    let taxAmount = existing.tax_amount;
    let totalAmount = existing.total_amount;

    // If new line items are provided, replace them and recalculate
    if (lineItems && Array.isArray(lineItems)) {
      subtotal = 0;
      await pool.query('DELETE FROM quote_line_items WHERE quote_id = ? AND organization_id = ?;', [id, orgId]);

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        const qty = parseFloat(item.quantity || 1);
        const unitPrice = parseFloat(item.unitPrice || 0);
        const discountPct = parseFloat(item.discountPercent || 0);
        const discountAmt = (unitPrice * qty) * (discountPct / 100);
        const lineTotal = (unitPrice * qty) - discountAmt;
        subtotal += lineTotal;

        await pool.query(
          `INSERT INTO quote_line_items (
            organization_id, quote_id, product_id, item_order, description,
            quantity, unit_price, discount_percent, discount_amount, line_total, billing_frequency
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            orgId, id, item.productId, i + 1, item.description || '',
            qty, unitPrice, discountPct, discountAmt, lineTotal,
            item.billingFrequency || 'annual'
          ]
        );
      }

      if (discountType === 'percent') {
        totalDiscount = subtotal * (parseFloat(discountValue) / 100);
      } else {
        totalDiscount = parseFloat(discountValue || 0);
      }

      const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
      taxAmount = discountedSubtotal * (parseFloat(taxRate) / 100);
      totalAmount = discountedSubtotal + taxAmount;
    }

    await pool.query(
      `UPDATE quotes SET
        title = COALESCE(?, title),
        price_book_id = COALESCE(?, price_book_id),
        status = COALESCE(?, status),
        subtotal = ?,
        discount_type = ?,
        discount_value = ?,
        discount_amount = ?,
        tax_rate = ?,
        tax_amount = ?,
        total_amount = ?,
        valid_until = COALESCE(?, valid_until),
        terms_conditions = COALESCE(?, terms_conditions),
        notes = COALESCE(?, notes)
       WHERE id = ? AND organization_id = ?;`,
      [
        title || null, priceBookId || null, status || null,
        subtotal, discountType, parseFloat(discountValue), totalDiscount,
        parseFloat(taxRate), taxAmount, totalAmount,
        validUntil || null, termsConditions || null, notes || null,
        id, orgId
      ]
    );

    return this.getQuoteById(orgId, id);
  }

  static async updateQuoteStatus(orgId, userId, id, status, approverNotes = '') {
    const pool = getPool();
    const quote = await this.getQuoteById(orgId, id);
    if (!quote) throw new Error('Quote not found');

    const isApproved = status === 'approved';
    const isAccepted = status === 'accepted';

    await pool.query(
      `UPDATE quotes SET 
        status = ?,
        approved_by = CASE WHEN ? = 1 THEN ? ELSE approved_by END,
        approved_at = CASE WHEN ? = 1 THEN NOW() ELSE approved_at END,
        notes = CASE WHEN ? != '' THEN CONCAT(COALESCE(notes, ''), '\n[Status Update: ', ?, ']: ', ?) ELSE notes END
       WHERE id = ? AND organization_id = ?;`,
      [
        status,
        isApproved ? 1 : 0, userId,
        isApproved ? 1 : 0,
        approverNotes ? 1 : 0, status, approverNotes,
        id, orgId
      ]
    );

    // If accepted and tied to a deal, update deal value and attach to timeline
    if (isAccepted && quote.deal_id) {
      await pool.query(
        'UPDATE deals SET value = ? WHERE id = ? AND organization_id = ?;',
        [quote.total_amount, quote.deal_id, orgId]
      );
      await pool.query(
        `INSERT INTO activities (
          organization_id, actor_id, record_type, record_id, activity_type,
          payload_json, created_at
        ) VALUES (?, ?, 'deal', ?, 'status_change', ?, NOW());`,
        [
          orgId, userId, quote.deal_id,
          JSON.stringify({
            title: `Quote ${quote.quote_number} Accepted!`,
            note: `Client accepted quote "${quote.title}" with contract total of $${parseFloat(quote.total_amount).toLocaleString()} ${quote.currency}.`
          })
        ]
      );
    }

    return this.getQuoteById(orgId, id);
  }

  static async processQuoteSignature(orgId, id, { signerName, signatureData = 'e-signed-verified' }) {
    const pool = getPool();
    const quote = await this.getQuoteById(orgId, id);
    if (!quote) throw new Error('Quote not found');

    const signatureUrl = `https://docusign.local/verify/${quote.quote_number.toLowerCase()}-signed`;

    await pool.query(
      `UPDATE quotes SET
        status = 'accepted',
        signature_status = 'signed',
        signature_url = ?,
        signed_at = NOW()
       WHERE id = ? AND organization_id = ?;`,
      [signatureUrl, id, orgId]
    );

    // Timeline event
    if (quote.deal_id) {
      await pool.query(
        `INSERT INTO activities (
          organization_id, actor_id, record_type, record_id, activity_type,
          payload_json, created_at
        ) VALUES (?, ?, 'deal', ?, 'status_change', ?, NOW());`,
        [
          orgId, quote.created_by || null, quote.deal_id,
          JSON.stringify({
            title: `E-Signature Completed: ${quote.quote_number}`,
            note: `Signed by ${signerName || quote.contact_name || 'Client Principal'} on ${new Date().toLocaleDateString()}. DocuSign record: ${signatureUrl}`
          })
        ]
      );
    }

    return this.getQuoteById(orgId, id);
  }

  static async generateQuotePdf(orgId, id) {
    const quote = await this.getQuoteById(orgId, id);
    if (!quote) throw new Error('Quote not found');

    // Return HTML / printable document template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quote ${quote.quote_number} - ${quote.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
          .quote-title { font-size: 20px; font-weight: bold; margin-top: 24px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; background: #f8fafc; padding: 20px; border-radius: 8px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; font-size: 13px; }
          th { text-align: left; background: #f1f5f9; padding: 12px; font-weight: 600; border-bottom: 1px solid #cbd5e1; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .totals { margin-top: 24px; width: 300px; margin-left: auto; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #4f46e5; padding-top: 8px; color: #4f46e5; }
          .terms { margin-top: 40px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 12px; color: #64748b; }
          .signature-box { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; }
          .sig-line { width: 220px; border-top: 1px solid #94a3b8; margin-top: 50px; text-align: center; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">ACME CORP GLOBAL</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Enterprise Multi-Tenant Cloud Solutions</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 20px; font-weight: bold; color: #0f172a;">QUOTE #${quote.quote_number}</div>
            <div style="font-size: 12px; color: #64748b;">Status: <strong>${quote.status.toUpperCase()}</strong> · Version ${quote.version}</div>
            <div style="font-size: 12px; color: #64748b;">Valid Until: ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '30 Days'}</div>
          </div>
        </div>

        <div class="quote-title">${quote.title}</div>

        <div class="meta-grid">
          <div>
            <strong>PREPARED FOR:</strong><br>
            <strong>${quote.company_name || 'Client Organization'}</strong><br>
            Attn: ${quote.contact_name || 'Procurement Team'}<br>
            Email: ${quote.contact_email || 'client@example.com'}<br>
            Opportunity: ${quote.deal_title || 'Direct Engagement'}
          </div>
          <div>
            <strong>ISSUED BY:</strong><br>
            <strong>Acme Corp Global Sales</strong><br>
            Representative: ${quote.creator_name || 'Account Executive'}<br>
            Price Book: ${quote.price_book_name || 'Standard Enterprise'}<br>
            Currency: ${quote.currency}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product / Service</th>
              <th>Billing</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.lineItems || []).map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  <strong>${item.product_name}</strong><br>
                  <span style="font-size: 11px; color: #64748b;">SKU: ${item.sku}</span>
                </td>
                <td style="text-transform: capitalize;">${item.billing_frequency}</td>
                <td>${parseFloat(item.quantity).toFixed(0)}</td>
                <td>$${parseFloat(item.unit_price).toLocaleString()}</td>
                <td>${parseFloat(item.discount_percent) > 0 ? `${parseFloat(item.discount_percent)}%` : '—'}</td>
                <td style="text-align: right; font-weight: 600;">$${parseFloat(item.line_total).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${parseFloat(quote.subtotal).toLocaleString()}</span>
          </div>
          ${parseFloat(quote.discount_amount) > 0 ? `
            <div class="totals-row" style="color: #16a34a;">
              <span>Discount:</span>
              <span>-$${parseFloat(quote.discount_amount).toLocaleString()}</span>
            </div>
          ` : ''}
          ${parseFloat(quote.tax_amount) > 0 ? `
            <div class="totals-row">
              <span>Estimated Tax (${quote.tax_rate}%):</span>
              <span>$${parseFloat(quote.tax_amount).toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="totals-row grand-total">
            <span>Total (${quote.currency}):</span>
            <span>$${parseFloat(quote.total_amount).toLocaleString()}</span>
          </div>
        </div>

        <div class="terms">
          <strong>TERMS & CONDITIONS:</strong><br>
          ${quote.terms_conditions || 'Payment terms: Net-30 from date of invoice.'}
        </div>

        <div class="signature-box">
          <div>
            <div>Authorized Client Signature:</div>
            <div class="sig-line">
              ${quote.signature_status === 'signed' ? `<span style="color: #16a34a; font-weight: bold;">✔ Electronically Signed</span><br><span style="font-size: 10px; color: #64748b;">${quote.signed_at ? new Date(quote.signed_at).toLocaleString() : ''}</span>` : 'Authorized Representative'}
            </div>
          </div>
          <div>
            <div>Vendor Acceptance:</div>
            <div class="sig-line">
              <span style="color: #4f46e5; font-weight: bold;">✔ Approved by Acme Corp</span><br>
              <span style="font-size: 10px; color: #64748b;">${quote.approver_name || 'VP of Sales'}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return {
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      title: quote.title,
      html,
    };
  }
}
