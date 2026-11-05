const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/id');

const router = express.Router();

function formatCompletedTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    date: task.date || null,
    completionDate: task.completion_date,
    project: task.project_id
      ? {
          projectId: task.project_id,
          projectTitle: task.project_title,
        }
      : null,
  };
}

// 1. GET /api/completed-tasks
router.get(['/', '/completed-tasks.json'], authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    const [rows] = await pool.query(
      'SELECT id, title, description, date, completion_date, project_id, project_title FROM completed_tasks WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    res.json(rows.map(formatCompletedTask));
  } catch (error) {
    console.error(`Error fetching completed tasks for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to fetch completed tasks' });
  }
});

// 2. POST /api/completed-tasks
router.post('/', authenticate, async (req, res) => {
  const userId = req.userId;
  const { id: providedId, title, description, date, completionDate, project } = req.body || {};

  if (!title || String(title).trim() === '') {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const completedId = providedId && String(providedId).startsWith('cmp_') ? providedId : generateId('cmp');
  const projectId = project?.projectId || null;
  const projectTitle = project?.projectTitle || null;
  const compDate = completionDate || new Date().toDateString();

  try {
    await pool.query(
      `INSERT INTO completed_tasks (id, user_id, title, description, date, completion_date, project_id, project_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [completedId, userId, title.trim(), description || '', date || null, compDate, projectId, projectTitle]
    );

    // If an active task with this ID existed for this user, delete it so tables remain consistent
    if (providedId) {
      await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [providedId, userId]);
    }

    res.status(201).json({
      id: completedId,
      title: title.trim(),
      description: description || '',
      date: date || null,
      completionDate: compDate,
      project: projectId ? { projectId, projectTitle } : null,
      message: 'Completed task recorded successfully',
    });
  } catch (error) {
    console.error('Error recording completed task:', error);
    res.status(500).json({ error: 'Failed to record completed task' });
  }
});

// 3. DELETE /api/completed-tasks/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const [result] = await pool.query(
      'DELETE FROM completed_tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Completed task not found' });
    }

    res.json({ message: 'Completed task deleted successfully', id });
  } catch (error) {
    console.error(`Error deleting completed task ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete completed task' });
  }
});

// 4. PUT /api/completed-tasks (bulk update legacy compatibility)
router.put(['/', '/completed-tasks.json'], authenticate, async (req, res) => {
  const userId = req.userId;
  const completedTasks = Array.isArray(req.body) ? req.body : [];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM completed_tasks WHERE user_id = ?', [userId]);

    for (const task of completedTasks) {
      if (!task || !task.title) continue;
      const completedId = task.id && String(task.id).startsWith('cmp_') ? task.id : generateId('cmp');
      const projectId = task.project ? task.project.projectId : null;
      const projectTitle = task.project ? task.project.projectTitle : null;

      await connection.query(
        `INSERT INTO completed_tasks (id, user_id, title, description, date, completion_date, project_id, project_title)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          completedId,
          userId,
          task.title,
          task.description || '',
          task.date || null,
          task.completionDate || new Date().toDateString(),
          projectId,
          projectTitle,
        ]
      );
    }

    await connection.commit();
    res.json({ message: 'Completed tasks updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error(`Error updating completed tasks for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update completed tasks' });
  } finally {
    connection.release();
  }
});

module.exports = router;
