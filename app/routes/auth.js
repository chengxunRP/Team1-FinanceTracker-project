const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('../envConfig');
const db = require('../config/db');
const { validateRegistrationPassword } = require('../authHelpers');
const { sendEmail, isEmailConfigured } = require('../emailService');
const { classifyResetTokenRow } = require('../passwordResetTokenHelpers');

const DEFAULT_RESET_TOKEN_MINUTES = 30;
const FORGOT_PASSWORD_SAFE_MESSAGE =
  'If an account with that email exists, we have sent a password reset link.';

function getResetTokenMinutes() {
  const parsed = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_RESET_TOKEN_MINUTES;
  }
  return Math.floor(parsed);
}

function getAppBaseUrl() {
  const configured = String(process.env.APP_BASE_URL || '').trim();
  const baseUrl = (configured || 'http://localhost:3000').replace(/\/+$/, '');
  return baseUrl;
}

function getAppBaseUrlDiagnostics() {
  const configured = Boolean(String(process.env.APP_BASE_URL || '').trim());
  const baseUrl = getAppBaseUrl();
  return {
    appBaseUrlConfigured: configured,
    baseUrl,
    route: 'GET /reset-password/:token',
    pathPrefix: `${baseUrl}/reset-password/`,
  };
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeRawToken(rawToken) {
  const value = String(rawToken || '').trim();
  if (!value) return '';

  try {
    return decodeURIComponent(value).trim();
  } catch (error) {
    return value;
  }
}

function isValidRawTokenFormat(rawToken) {
  return /^[a-f0-9]{64}$/i.test(rawToken);
}

function buildResetPasswordUrl(rawToken) {
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/reset-password/${encodeURIComponent(rawToken)}`;
}

function getDatabaseName() {
  return process.env.DB_NAME || 'finance_tracker';
}

// Option B: invalidate older unused tokens, then insert a brand-new unused row.
async function createPasswordResetToken(userId) {
  const rawToken = createResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresInMinutes = getResetTokenMinutes();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Invalidate older unused tokens for this user only. Newest token stays unused.
    await conn.query(
      `UPDATE password_reset_tokens
       SET used_at = UTC_TIMESTAMP()
       WHERE user_id = ?
         AND used_at IS NULL`,
      [userId]
    );

    const [insertResult] = await conn.query(
      `INSERT INTO password_reset_tokens
        (user_id, token_hash, expires_at, used_at, created_at)
       VALUES (
         ?,
         ?,
         DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE),
         NULL,
         UTC_TIMESTAMP()
       )`,
      [userId, tokenHash, expiresInMinutes]
    );

    const insertedId = insertResult && insertResult.insertId;
    if (insertedId) {
      // Force unused state on the brand-new row (guards against an unexpected used_at DEFAULT).
      await conn.query(
        `UPDATE password_reset_tokens
         SET used_at = NULL,
             expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
         WHERE id = ?`,
        [expiresInMinutes, insertedId]
      );

      const [verifyRows] = await conn.query(
        `SELECT id,
                user_id AS userId,
                used_at AS usedAt,
                expires_at AS expiresAt,
                UTC_TIMESTAMP() AS dbNowUtc
         FROM password_reset_tokens
         WHERE id = ?
         LIMIT 1`,
        [insertedId]
      );

      const verified = verifyRows[0];
      const diagnosis = classifyResetTokenRow(verified, getDatabaseName());
      if (diagnosis.status !== 'valid') {
        throw new Error(
          `Newly created reset token is not valid (status=${diagnosis.status})`
        );
      }

      console.log('[PasswordReset] token hash stored successfully', {
        userId,
        database: getDatabaseName(),
        expiresInMinutes,
        hasUsedAt: diagnosis.hasUsedAt,
        hasExpiresAt: diagnosis.hasExpiresAt,
        status: diagnosis.status,
      });
    } else {
      console.log('[PasswordReset] token hash stored successfully', {
        userId,
        database: getDatabaseName(),
        expiresInMinutes,
      });
    }

    await conn.commit();
    return rawToken;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function diagnoseResetToken(rawToken) {
  const normalized = normalizeRawToken(rawToken);

  if (!isValidRawTokenFormat(normalized)) {
    return {
      status: 'invalid_format',
      tokenLength: normalized.length,
      hasUsedAt: false,
      hasExpiresAt: false,
    };
  }

  const tokenHash = hashResetToken(normalized);
  const [rows] = await db.query(
    `SELECT id,
            user_id AS userId,
            used_at AS usedAt,
            expires_at AS expiresAt,
            UTC_TIMESTAMP() AS dbNowUtc,
            (expires_at IS NOT NULL AND expires_at > UTC_TIMESTAMP()) AS isNotExpired
     FROM password_reset_tokens
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );

  return classifyResetTokenRow(rows[0] || null, getDatabaseName());
}

async function sendPasswordResetEmail(user, rawToken) {
  if (!isEmailConfigured() || !user || !user.email) return false;

  const resetUrl = buildResetPasswordUrl(rawToken);
  const displayName = user.name && String(user.name).trim() ? user.name.trim() : 'there';
  const expiryText = `${getResetTokenMinutes()} minutes`;
  const subject = 'Reset your spendWise password';
  const text = [
    `Hi ${displayName},`,
    '',
    'We received a request to reset your spendWise password.',
    `Use this link to reset your password: ${resetUrl}`,
    `This link expires in ${expiryText}.`,
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
      <p>Hi ${displayName},</p>
      <p>We received a request to reset your spendWise password.</p>
      <p style="margin:20px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p>This link expires in <strong>${expiryText}</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject,
      text,
      html,
    });
    console.log('[Email] password-reset email sent successfully');
    return true;
  } catch (error) {
    console.error('[Email] password-reset email send failed:', error.message || error);
    return false;
  }
}

async function findValidResetTokenRecord(rawToken) {
  const normalized = normalizeRawToken(rawToken);
  if (!isValidRawTokenFormat(normalized)) {
    return null;
  }

  const tokenHash = hashResetToken(normalized);
  const [rows] = await db.query(
    `SELECT prt.id, prt.user_id AS userId, u.name, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = ?
       AND prt.used_at IS NULL
       AND prt.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

// GET /register — show the registration form
router.get('/register', (req, res) => {
  res.render('auth/register', {
    pageTitle: 'Register',
    activePage: 'register',
    errors: [],
    formValues: {},
  });
});

// POST /register — create a new account
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || !name.trim()) errors.push('Name is required.');
  if (!email || !email.trim()) errors.push('Email is required.');
  if (!password) {
    errors.push('Password is required.');
  } else {
    const passwordCheck = validateRegistrationPassword(password);
    if (!passwordCheck.valid) errors.push(passwordCheck.message);
  }

  try {
    if (email) {
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
      if (existing.length > 0) errors.push('An account with that email already exists.');
    }

    if (errors.length) {
      return res.render('auth/register', {
        pageTitle: 'Register',
        activePage: 'register',
        errors,
        formValues: { name, email },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.trim(), passwordHash]
    );

    req.session.userId = result.insertId;
    req.session.userName = name.trim();

    res.redirect('/home');
  } catch (error) {
    console.error('Database error during registration:', error);
    res.status(500).render('auth/register', {
      pageTitle: 'Register',
      activePage: 'register',
      errors: ['Unable to create account right now. Please try again.'],
      formValues: { name, email },
    });
  }
});

// GET /login — show the login form
router.get('/login', (req, res) => {
  res.render('auth/login', {
    pageTitle: 'Login',
    activePage: 'login',
    errors: [],
    formValues: {},
    successMessage:
      req.query.reset === '1'
        ? 'Password reset successful. Please log in with your new password.'
        : '',
  });
});

// POST /login — check credentials and start a session
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !password) {
    errors.push('Email and password are required.');
    return res.render('auth/login', {
      pageTitle: 'Login',
      activePage: 'login',
      errors,
      formValues: { email },
    });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email.trim()]);

    if (rows.length === 0) {
      errors.push('Invalid email or password.');
    } else {
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        errors.push('Invalid email or password.');
      } else {
        req.session.userId = user.id;
        req.session.userName = user.name;
        return res.redirect('/home');
      }
    }

    res.render('auth/login', {
      pageTitle: 'Login',
      activePage: 'login',
      errors,
      formValues: { email },
      successMessage: '',
    });
  } catch (error) {
    console.error('Database error during login:', error);
    res.status(500).render('auth/login', {
      pageTitle: 'Login',
      activePage: 'login',
      errors: ['Unable to log in right now. Please try again.'],
      formValues: { email },
      successMessage: '',
    });
  }
});

// GET /forgot-password — show forgot password form
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    pageTitle: 'Forgot Password',
    activePage: 'login',
    errors: [],
    formValues: {},
    infoMessage: '',
  });
});

// POST /forgot-password — request reset link
router.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim();
  const errors = [];
  console.log('[PasswordReset] reset request received', { database: getDatabaseName() });

  if (!email) {
    errors.push('Email is required.');
  }

  if (errors.length) {
    return res.render('auth/forgot-password', {
      pageTitle: 'Forgot Password',
      activePage: 'login',
      errors,
      formValues: { email },
      infoMessage: '',
    });
  }

  try {
    const [users] = await db.query(
      'SELECT id, name, email FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length > 0) {
      const user = users[0];
      console.log('[PasswordReset] user record found', {
        userId: user.id,
        database: getDatabaseName(),
      });

      const rawToken = await createPasswordResetToken(user.id);
      const diagnostics = getAppBaseUrlDiagnostics();
      console.log('[PasswordReset] reset email URL route', {
        appBaseUrlConfigured: diagnostics.appBaseUrlConfigured,
        baseUrl: diagnostics.baseUrl,
        route: diagnostics.route,
        pathPrefix: diagnostics.pathPrefix,
        tokenLength: rawToken.length,
      });

      await sendPasswordResetEmail(user, rawToken);
    } else {
      console.log('[PasswordReset] user record not found');
    }

    return res.render('auth/forgot-password', {
      pageTitle: 'Forgot Password',
      activePage: 'login',
      errors: [],
      formValues: {},
      infoMessage: FORGOT_PASSWORD_SAFE_MESSAGE,
    });
  } catch (error) {
    console.error('Database error during forgot password:', error.message || error);
    return res.render('auth/forgot-password', {
      pageTitle: 'Forgot Password',
      activePage: 'login',
      errors: [],
      formValues: {},
      infoMessage: FORGOT_PASSWORD_SAFE_MESSAGE,
    });
  }
});

// GET /reset-password/:token — show reset form
router.get('/reset-password/:token', async (req, res) => {
  const token = normalizeRawToken(req.params.token);
  console.log('[PasswordReset] token lookup attempted', {
    database: getDatabaseName(),
    tokenLength: token.length,
    route: 'GET /reset-password/:token',
  });

  if (!token) {
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: ['This reset link is invalid or has expired.'],
      formValues: {},
      tokenValid: false,
      resetToken: '',
      successMessage: '',
    });
  }

  try {
    const diagnosis = await diagnoseResetToken(token);
    console.log('[PasswordReset] token lookup result', {
      status: diagnosis.status,
      userId: diagnosis.userId || null,
      database: diagnosis.database || getDatabaseName(),
      hasUsedAt: Boolean(diagnosis.hasUsedAt),
      hasExpiresAt: Boolean(diagnosis.hasExpiresAt),
      expiresAtPresent: Boolean(diagnosis.expiresAt),
      dbNowUtcPresent: Boolean(diagnosis.dbNowUtc),
    });

    if (diagnosis.status === 'valid') {
      console.log('[PasswordReset] matching token found and still valid', {
        userId: diagnosis.userId,
      });
    } else if (diagnosis.status === 'expired') {
      console.log('[PasswordReset] token expired', { userId: diagnosis.userId || null });
    } else if (diagnosis.status === 'already_used') {
      console.log('[PasswordReset] token already used', {
        userId: diagnosis.userId || null,
        hasUsedAt: true,
      });
    } else if (diagnosis.status === 'invalid') {
      console.log('[PasswordReset] token invalid (missing expiry)', {
        userId: diagnosis.userId || null,
      });
    } else {
      console.log('[PasswordReset] matching token not found');
    }

    // GET only validates and renders the form. It never sets used_at.
    const tokenRow = diagnosis.status === 'valid'
      ? await findValidResetTokenRecord(token)
      : null;

    if (!tokenRow) {
      return res.render('auth/reset-password', {
        pageTitle: 'Reset Password',
        activePage: 'login',
        errors: ['This reset link is invalid or has expired.'],
        formValues: {},
        tokenValid: false,
        resetToken: '',
        successMessage: '',
      });
    }

    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: [],
      formValues: {},
      tokenValid: true,
      resetToken: token,
      successMessage: '',
    });
  } catch (error) {
    console.error('Database error loading reset password page:', error.message || error);
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: ['This reset link is invalid or has expired.'],
      formValues: {},
      tokenValid: false,
      resetToken: '',
      successMessage: '',
    });
  }
});

// POST /reset-password/:token — update password
router.post('/reset-password/:token', async (req, res) => {
  const token = normalizeRawToken(req.params.token);
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const errors = [];

  console.log('[PasswordReset] password reset submit received', {
    database: getDatabaseName(),
    tokenLength: token.length,
    route: 'POST /reset-password/:token',
  });

  if (!token) {
    errors.push('This reset link is invalid or has expired.');
  }
  if (!password) {
    errors.push('New password is required.');
  } else {
    const passwordCheck = validateRegistrationPassword(password);
    if (!passwordCheck.valid) errors.push(passwordCheck.message);
  }
  if (password !== confirmPassword) {
    errors.push('Confirm password must match.');
  }

  if (errors.length) {
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors,
      formValues: {},
      tokenValid: Boolean(token),
      resetToken: token,
      successMessage: '',
    });
  }

  let conn = null;
  try {
    const tokenHash = hashResetToken(token);
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, user_id AS userId
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > UTC_TIMESTAMP()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (!rows.length) {
      await conn.rollback();
      console.log('[PasswordReset] matching token not found on submit');
      return res.render('auth/reset-password', {
        pageTitle: 'Reset Password',
        activePage: 'login',
        errors: ['This reset link is invalid or has expired.'],
        formValues: {},
        tokenValid: false,
        resetToken: '',
        successMessage: '',
      });
    }

    const tokenRow = rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [
      passwordHash,
      tokenRow.userId,
    ]);
    await conn.query(
      'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE id = ?',
      [tokenRow.id]
    );
    await conn.query(
      'UPDATE password_reset_tokens SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND used_at IS NULL',
      [tokenRow.userId]
    );

    await conn.commit();
    console.log('[PasswordReset] password reset completed', {
      userId: tokenRow.userId,
      database: getDatabaseName(),
    });
    return res.redirect('/login?reset=1');
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_rollbackErr) {
        // ignore rollback errors
      }
    }
    console.error('Database error during password reset:', error.message || error);
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: ['Unable to reset password right now. Please try again.'],
      formValues: {},
      tokenValid: true,
      resetToken: token,
      successMessage: '',
    });
  } finally {
    if (conn) conn.release();
  }
});

// POST /logout — end the session
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
