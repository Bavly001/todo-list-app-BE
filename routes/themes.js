const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/theme
router.get(['/', '/theme.json'], authenticate, async (req, res) => {
  const userId = req.userId;

  try {
    const [rows] = await pool.query(
      'SELECT mode, color_data FROM themes WHERE user_id = ?',
      [userId]
    );

    if (rows.length > 0) {
      let color = null;
      if (rows[0].color_data) {
        color =
          typeof rows[0].color_data === 'string'
            ? JSON.parse(rows[0].color_data)
            : rows[0].color_data;
      }
      res.json({
        mode: rows[0].mode || null,
        color: color || null,
      });
    } else {
      res.json({
        mode: null,
        color: null,
      });
    }
  } catch (error) {
    console.error(`Error fetching theme for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to fetch theme' });
  }
});

// PUT /api/theme
router.put(['/', '/theme.json'], authenticate, async (req, res) => {
  const userId = req.userId;
  const { mode, color } = req.body || {};

  try {
    const colorJson = color !== undefined && color !== null ? JSON.stringify(color) : null;
    const modeVal = mode !== undefined && mode !== null ? mode : null;

    await pool.query(
      `INSERT INTO themes (user_id, mode, color_data)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         mode = COALESCE(VALUES(mode), mode),
         color_data = COALESCE(VALUES(color_data), color_data)`,
      [userId, modeVal, colorJson]
    );
    res.json({ message: 'Theme updated successfully' });
  } catch (error) {
    console.error(`Error updating theme for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

module.exports = router;
