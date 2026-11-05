const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// POST /api/feedbacks, /feedbacks.json
router.post(['/', '/feedbacks.json'], async (req, res) => {
  const { firstName, lastName, email, message, dateAndTime } = req.body || {};

  if (!email || !message) {
    return res.status(400).json({ error: 'Email and message are required' });
  }

  try {
    await pool.query(
      `INSERT INTO feedbacks (first_name, last_name, email, message, date_and_time)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName || '', lastName || '', email, message, dateAndTime || new Date().toISOString()]
    );
    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

module.exports = router;
