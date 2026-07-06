const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { validateRegistrationPassword } = require('../authHelpers');

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
    });
  } catch (error) {
    console.error('Database error during login:', error);
    res.status(500).render('auth/login', {
      pageTitle: 'Login',
      activePage: 'login',
      errors: ['Unable to log in right now. Please try again.'],
      formValues: { email },
    });
  }
});

// POST /logout — end the session
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
