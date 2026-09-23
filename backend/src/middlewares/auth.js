import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getPool } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token missing or malformed',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const pool = getPool();
    // Verify user exists and is active
    const [users] = await pool.query(
      `SELECT u.id, u.organization_id, u.workspace_id, u.email, u.first_name, u.last_name, u.status,
              o.name AS organization_name, o.slug AS organization_slug, o.status AS organization_status,
              r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = ? AND u.organization_id = ?
       LIMIT 1;`,
      [decoded.id, decoded.organization_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or tenant mismatch',
      });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}`,
      });
    }

    if (user.organization_status !== 'active' && user.organization_status !== 'trial') {
      return res.status(403).json({
        success: false,
        message: `Organization subscription is ${user.organization_status}`,
      });
    }

    // Fetch user's permissions
    const [perms] = await pool.query(
      `SELECT p.module, p.action, rp.scope
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?;`,
      [user.role_id]
    );

    // Attach to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`.trim(),
      organizationId: user.organization_id,
      workspaceId: user.workspace_id,
      organizationName: user.organization_name,
      organizationSlug: user.organization_slug,
      role: user.role_name || 'Member',
      roleId: user.role_id,
      permissions: perms.map((p) => ({
        module: p.module,
        action: p.action,
        scope: p.scope,
      })),
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requirePermission = (moduleName, actionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    // Super Admin bypasses all checks
    if (req.user.role === 'Super Admin') {
      return next();
    }

    const hasPerm = req.user.permissions.some(
      (p) => p.module === moduleName && (p.action === actionName || p.action === 'manage' || p.action === 'all')
    );

    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission [${moduleName}:${actionName}]`,
      });
    }

    next();
  };
};
