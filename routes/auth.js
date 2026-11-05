const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { signToken } = require('../utils/jwt');
const { verifyAndUpgradePassword, sanitizeUser } = require('../utils/authHelper');

const router = express.Router();

// POST /api/auth/login or /login.json
router.post(['/login', '/login.json'], async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, password, first_name AS firstName, last_name AS lastName FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const dbUser = rows[0];
    const { isValid, needsRehash, newHash } = await verifyAndUpgradePassword(password, dbUser.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Seamlessly upgrade legacy plaintext password to bcrypt hash
    if (needsRehash && newHash) {
      try {
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [newHash, dbUser.id]);
        console.log(`[AUTH] Upgraded legacy password to bcrypt for user: ${dbUser.email}`);
      } catch (upgradeErr) {
        console.error('Failed to update password hash in database:', upgradeErr);
      }
    }

    const token = signToken({
      userId: dbUser.id,
      email: dbUser.email,
    });

    const user = sanitizeUser(dbUser);

    res.json({
      user,
      token,
      message: 'Login successful',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me, /:userId/me.json
router.get(['/me', '/me.json', '/:userId/me', '/:userId/me.json'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, first_name AS firstName, last_name AS lastName FROM users WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

// GET /api/users, /api/auth/users, /users
router.get(['/', '/users', '/users.json'], authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, first_name AS firstName, last_name AS lastName FROM users'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

module.exports = router;
