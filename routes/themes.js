const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_THEME = {
  mode: 'light',
  color: {
    bgColor: 'bg-blue-600',
    secondaryBg: 'bg-blue-100',
    bgHover: 'hover:bg-blue-700',
    textColor: 'text-blue-600',
    textHover: 'hover:text-blue-700',
    mainColor: 'blue',
  },
};

// GET /api/theme
router.get(['/', '/theme.json'], authenticate, async (req, res) => {
  const userId = req.userId;

  try {
    const [rows] = await pool.query(
      'SELECT mode, color_data FROM themes WHERE user_id = ?',
      [userId]
    );

    if (rows.length > 0) {
      const color =
        typeof rows[0].color_data === 'string'
          ? JSON.parse(rows[0].color_data)
          : rows[0].color_data;
      res.json({
        mode: rows[0].mode || 'light',
        color: color || DEFAULT_THEME.color,
      });
    } else {
      res.json(DEFAULT_THEME);
    }
  } catch (error) {
    console.error(`Error fetching theme for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
});

// PUT /api/theme
router.put(['/', '/theme.json'], authenticate, async (req, res) => {
  const userId = req.userId;
  const { mode = 'light', color = {} } = req.body || {};

  try {
    await pool.query(
      `INSERT INTO themes (user_id, mode, color_data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE mode = VALUES(mode), color_data = VALUES(color_data)`,
      [userId, mode, JSON.stringify(color)]
    );
    res.json({ message: 'Theme updated successfully' });
  } catch (error) {
    console.error(`Error updating theme for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

module.exports = router;
