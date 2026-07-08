const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { validateRegistrationPassword } = require('../authHelpers');

const RESET_TOKEN_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
const FORGOT_PASSWORD_SAFE_MESSAGE =
  'If an account with that email exists, we have sent a password reset link.';

let authMailer = null;

function getAppBaseUrl() {
  const raw = String(process.env.APP_BASE_URL || '').trim();
  if (!raw) return 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getAuthMailer() {
  if (authMailer) return authMailer;
  if (!process.env.SMTP_HOST) return null;

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (error) {
    return null;
  }

  authMailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        }
      : undefined,
  });
  return authMailer;
}

async function sendPasswordResetEmail(user, rawToken) {
  const mailer = getAuthMailer();
  if (!mailer || !user || !user.email) return false;

  const resetUrl = `${getAppBaseUrl()}/reset-password/${encodeURIComponent(rawToken)}`;
  const displayName = user.name && String(user.name).trim() ? user.name.trim() : 'there';
  const expiryText = `${RESET_TOKEN_MINUTES} minutes`;
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
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@spendwise.local',
      to: user.email,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error('Password reset email send failed:', error.message || error);
    return false;
  }
}

async function findValidResetTokenRecord(rawToken) {
  const tokenHash = hashResetToken(rawToken);
  const [rows] = await db.query(
    `SELECT prt.id, prt.user_id AS userId, u.name, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE prt.token_hash = ?
       AND prt.used_at IS NULL
       AND prt.expires_at > NOW()
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
      const rawToken = createResetToken();
      const tokenHash = hashResetToken(rawToken);

      await db.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
        [user.id]
      );

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), NOW())`,
        [user.id, tokenHash, RESET_TOKEN_MINUTES]
      );

      await sendPasswordResetEmail(user, rawToken);
    }

    return res.render('auth/forgot-password', {
      pageTitle: 'Forgot Password',
      activePage: 'login',
      errors: [],
      formValues: {},
      infoMessage: FORGOT_PASSWORD_SAFE_MESSAGE,
    });
  } catch (error) {
    console.error('Database error during forgot password:', error);
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
  const token = String(req.params.token || '').trim();
  if (!token) {
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: ['This reset link is invalid or has expired.'],
      formValues: {},
      tokenValid: false,
      successMessage: '',
    });
  }

  try {
    const tokenRow = await findValidResetTokenRecord(token);
    if (!tokenRow) {
      return res.render('auth/reset-password', {
        pageTitle: 'Reset Password',
        activePage: 'login',
        errors: ['This reset link is invalid or has expired.'],
        formValues: {},
        tokenValid: false,
        successMessage: '',
      });
    }

    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: [],
      formValues: {},
      tokenValid: true,
      successMessage: '',
    });
  } catch (error) {
    console.error('Database error loading reset password page:', error);
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: ['This reset link is invalid or has expired.'],
      formValues: {},
      tokenValid: false,
      successMessage: '',
    });
  }
});

// POST /reset-password/:token — update password
router.post('/reset-password/:token', async (req, res) => {
  const token = String(req.params.token || '').trim();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const errors = [];

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
      tokenValid: true,
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
         AND expires_at > NOW()
       LIMIT 1
       FOR UPDATE`,
      [tokenHash]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.render('auth/reset-password', {
        pageTitle: 'Reset Password',
        activePage: 'login',
        errors: ['This reset link is invalid or has expired.'],
        formValues: {},
        tokenValid: false,
        successMessage: '',
      });
    }

    const tokenRow = rows[0];
    const passwordHash = await bcrypt.hash(password, 10);

    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [
      passwordHash,
      tokenRow.userId,
    ]);
    await conn.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [
      tokenRow.id,
    ]);
    await conn.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [tokenRow.userId]
    );

    await conn.commit();
    return res.redirect('/login?reset=1');
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (_rollbackErr) {
        // ignore rollback errors
      }
    }
    console.error('Database error during password reset:', error);
    return res.render('auth/reset-password', {
      pageTitle: 'Reset Password',
      activePage: 'login',
      errors: ['Unable to reset password right now. Please try again.'],
      formValues: {},
      tokenValid: true,
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
