const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/id');

const router = express.Router();

function formatTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    date: task.date || null,
    project: task.project_id
      ? {
          projectId: task.project_id,
          projectTitle: task.project_title,
        }
      : null,
  };
}

// 1. Task counts endpoint: GET /api/tasks/counts?date=...
router.get('/counts', authenticate, async (req, res) => {
  const userId = req.userId;
  const clientDate = req.query.date;

  try {
    const [rows] = await pool.query(
      'SELECT id, date, project_id FROM tasks WHERE user_id = ?',
      [userId]
    );

    let today = 0;
    let upcoming = 0;
    let inbox = 0;
    const projects = {};

    for (const task of rows) {
      if (clientDate && task.date === clientDate) {
        today++;
      }
      if (task.date) {
        upcoming++;
      }
      if (!task.project_id) {
        inbox++;
      } else {
        projects[task.project_id] = (projects[task.project_id] || 0) + 1;
      }
    }

    res.json({ today, upcoming, inbox, projects });
  } catch (error) {
    console.error('Error fetching task counts:', error);
    res.status(500).json({ error: 'Failed to fetch task counts' });
  }
});

// 2. Single task by ID: GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const [rows] = await pool.query(
      'SELECT id, title, description, date, project_id, project_title FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(formatTask(rows[0]));
  } catch (error) {
    console.error(`Error fetching task ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// 3. Query tasks with views: GET /api/tasks?view=today|upcoming|inbox|all&date=...&projectId=...&search=...
router.get('/', authenticate, async (req, res) => {
  const userId = req.userId;
  const { view, date, projectId, search } = req.query;

  try {
    let query = 'SELECT id, title, description, date, project_id, project_title FROM tasks WHERE user_id = ?';
    const params = [userId];

    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    } else if (view === 'today') {
      if (date) {
        query += ' AND date = ?';
        params.push(date);
      }
    } else if (view === 'upcoming') {
      query += ' AND date IS NOT NULL AND date != ""';
    } else if (view === 'inbox') {
      query += ' AND project_id IS NULL';
    }

    if (search && search.trim().length > 0) {
      query += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)';
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term);
    }

    query += ' ORDER BY created_at ASC';

    const [rows] = await pool.query(query, params);
    const formatted = rows.map(formatTask);

    // Sort chronologically for upcoming view or general view
    if (view === 'upcoming') {
      formatted.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    }

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// 4. Create single task: POST /api/tasks
router.post('/', authenticate, async (req, res) => {
  const userId = req.userId;
  const { id: providedId, title, description, date, project } = req.body || {};

  if (!title || String(title).trim() === '') {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const taskId = providedId && String(providedId).startsWith('tsk_') ? providedId : generateId('tsk');
  let projectId = project?.projectId || null;
  let projectTitle = project?.projectTitle || null;

  // Validate that project belongs to this user
  if (projectId) {
    try {
      const [projRows] = await pool.query(
        'SELECT project_title FROM projects WHERE project_id = ? AND user_id = ?',
        [projectId, userId]
      );
      if (projRows.length > 0) {
        projectTitle = projRows[0].project_title;
      } else {
        projectId = null;
        projectTitle = null;
      }
    } catch (e) {
      console.warn('Project check error:', e);
    }
  }

  try {
    await pool.query(
      `INSERT INTO tasks (id, user_id, title, description, date, project_id, project_title)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [taskId, userId, title.trim(), description || '', date || null, projectId, projectTitle]
    );

    res.status(201).json({
      id: taskId,
      title: title.trim(),
      description: description || '',
      date: date || null,
      project: projectId ? { projectId, projectTitle } : null,
      message: 'Task created successfully',
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// 5. Update single task: PATCH /api/tasks/:id or PUT /api/tasks/:id
router.all(['/:id', '/:id.json'], async (req, res, next) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') return next();
  authenticate(req, res, async () => {
    const { id } = req.params;
    const userId = req.userId;
    const { title, description, date, project } = req.body || {};

    try {
      const [existing] = await pool.query(
        'SELECT id, title, description, date, project_id, project_title FROM tasks WHERE id = ? AND user_id = ?',
        [id, userId]
      );

      if (existing.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const current = existing[0];
      const newTitle = title !== undefined ? title : current.title;
      const newDesc = description !== undefined ? description : current.description;
      const newDate = date !== undefined ? date : current.date;
      const newProjectId = project !== undefined ? (project ? project.projectId : null) : current.project_id;
      const newProjectTitle = project !== undefined ? (project ? project.projectTitle : null) : current.project_title;

      await pool.query(
        `UPDATE tasks
         SET title = ?, description = ?, date = ?, project_id = ?, project_title = ?
         WHERE id = ? AND user_id = ?`,
        [newTitle, newDesc, newDate, newProjectId, newProjectTitle, id, userId]
      );

      res.json({
        id,
        title: newTitle,
        description: newDesc,
        date: newDate,
        project: newProjectId ? { projectId: newProjectId, projectTitle: newProjectTitle } : null,
        message: 'Task updated successfully',
      });
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });
});

// 6. Delete single task: DELETE /api/tasks/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully', id });
  } catch (error) {
    console.error(`Error deleting task ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// 7. Bulk update tasks (legacy compatibility): PUT /api/tasks
router.put('/', authenticate, async (req, res) => {
  const userId = req.userId;
  const tasks = Array.isArray(req.body) ? req.body : [];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM tasks WHERE user_id = ?', [userId]);

    for (const task of tasks) {
      if (!task || !task.title) continue;
      const taskId = task.id && String(task.id).startsWith('tsk_') ? task.id : generateId('tsk');
      const projectId = task.project ? task.project.projectId : null;
      const projectTitle = task.project ? task.project.projectTitle : null;

      await connection.query(
        `INSERT INTO tasks (id, user_id, title, description, date, project_id, project_title)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [taskId, userId, task.title, task.description || '', task.date || null, projectId, projectTitle]
      );
    }

    await connection.commit();
    res.json({ message: 'Tasks updated successfully', count: tasks.length });
  } catch (error) {
    await connection.rollback();
    console.error(`Error updating tasks for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update tasks' });
  } finally {
    connection.release();
  }
});

module.exports = router;
