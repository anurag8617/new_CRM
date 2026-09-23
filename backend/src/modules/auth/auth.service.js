import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getPool } from '../../config/db.js';
import { config } from '../../config/env.js';

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  static async login({ email, password, ipAddress = null, userAgent = null }) {
    const pool = getPool();

    // 1. Fetch user by email with organization & role
    const [users] = await pool.query(
      `SELECT u.id, u.organization_id, u.workspace_id, u.email, u.password_hash, 
              u.first_name, u.last_name, u.avatar_url, u.job_title, u.status,
              o.id AS org_id, o.name AS org_name, o.slug AS org_slug, o.status AS org_status,
              o.currency, o.timezone,
              w.id AS ws_id, w.name AS ws_name, w.slug AS ws_slug,
              r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN workspaces w ON u.workspace_id = w.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.email = ?
       LIMIT 1;`,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // 2. Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // 3. Status checks
    if (user.status !== 'active') {
      throw new Error(`Your user account is ${user.status}. Please contact your administrator.`);
    }

    if (user.org_status !== 'active' && user.org_status !== 'trial') {
      throw new Error(`Your organization account is ${user.org_status}.`);
    }

    // 4. Fetch Role Permissions
    const [perms] = await pool.query(
      `SELECT p.module, p.action, rp.scope
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?;`,
      [user.role_id]
    );

    // 5. Generate JWT Access Token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      organization_id: user.org_id,
      workspace_id: user.ws_id,
      role: user.role_name || 'Member',
    };

    const accessToken = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // 6. Generate Refresh Token & store in user_sessions
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day session

    await pool.query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
       VALUES (?, ?, ?, ?, ?);`,
      [user.id, refreshTokenHash, userAgent ? userAgent.substring(0, 255) : null, ipAddress, expiresAt]
    );

    // 7. Update last_login_at
    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?;', [user.id]);

    // 8. Record audit log entry (Spec §40)
    await pool.query(
      `INSERT INTO audit_logs (organization_id, actor_id, action, object_type, record_id, ip_address, user_agent)
       VALUES (?, ?, 'auth.login', 'users', ?, ?, ?);`,
      [user.org_id, user.id, user.id, ipAddress, userAgent ? userAgent.substring(0, 255) : null]
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`.trim(),
        jobTitle: user.job_title,
        avatarUrl: user.avatar_url,
        role: user.role_name,
        roleId: user.role_id,
      },
      organization: {
        id: user.org_id,
        name: user.org_name,
        slug: user.org_slug,
        currency: user.currency,
        timezone: user.timezone,
      },
      workspace: user.ws_id
        ? {
            id: user.ws_id,
            name: user.ws_name,
            slug: user.ws_slug,
          }
        : null,
      permissions: perms.map((p) => ({
        module: p.module,
        action: p.action,
        scope: p.scope,
      })),
    };
  }

  /**
   * Refresh Access Token with valid Refresh Token
   */
  static async refreshAccessToken({ refreshToken }) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const pool = getPool();
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const [sessions] = await pool.query(
      `SELECT s.id, s.user_id, s.expires_at, u.organization_id, u.workspace_id, u.email, u.status, r.name as role_name
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE s.refresh_token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
       LIMIT 1;`,
      [tokenHash]
    );

    if (sessions.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }

    const session = sessions[0];
    if (session.status !== 'active') {
      throw new Error('User account is inactive');
    }

    const tokenPayload = {
      id: session.user_id,
      email: session.email,
      organization_id: session.organization_id,
      workspace_id: session.workspace_id,
      role: session.role_name || 'Member',
    };

    const newAccessToken = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    return { accessToken: newAccessToken };
  }

  /**
   * Get Current Authenticated User Profile & Context
   */
  static async getMe(userId) {
    const pool = getPool();

    const [users] = await pool.query(
      `SELECT u.id, u.organization_id, u.workspace_id, u.email, u.first_name, u.last_name,
              u.avatar_url, u.job_title, u.phone, u.status, u.last_login_at,
              o.id AS org_id, o.name AS org_name, o.slug AS org_slug, o.currency, o.timezone,
              w.id AS ws_id, w.name AS ws_name, w.slug AS ws_slug,
              r.id AS role_id, r.name AS role_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       LEFT JOIN workspaces w ON u.workspace_id = w.id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = ?
       LIMIT 1;`,
      [userId]
    );

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];

    // Fetch permissions
    const [perms] = await pool.query(
      `SELECT p.module, p.action, rp.scope
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?;`,
      [user.role_id]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`.trim(),
        jobTitle: user.job_title,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        lastLoginAt: user.last_login_at,
        role: user.role_name,
        roleId: user.role_id,
      },
      organization: {
        id: user.org_id,
        name: user.org_name,
        slug: user.org_slug,
        currency: user.currency,
        timezone: user.timezone,
      },
      workspace: user.ws_id
        ? {
            id: user.ws_id,
            name: user.ws_name,
            slug: user.ws_slug,
          }
        : null,
      permissions: perms.map((p) => ({
        module: p.module,
        action: p.action,
        scope: p.scope,
      })),
    };
  }

  /**
   * Revoke Session on Logout
   */
  static async logout({ userId, refreshToken = null }) {
    const pool = getPool();
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query('DELETE FROM user_sessions WHERE user_id = ? AND refresh_token_hash = ?;', [userId, tokenHash]);
    } else {
      await pool.query('DELETE FROM user_sessions WHERE user_id = ?;', [userId]);
    }
    return { success: true };
  }
}
