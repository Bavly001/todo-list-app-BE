const express = require('express');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { generateId } = require('../utils/id');

const router = express.Router();

// 1. GET /api/projects
router.get(['/', '/projects.json'], authenticate, async (req, res) => {
  const userId = req.userId;
  try {
    const [rows] = await pool.query(
      'SELECT project_id AS projectId, project_title AS projectTitle FROM projects WHERE user_id = ? ORDER BY created_at ASC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error(`Error fetching projects for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 2. POST /api/projects
router.post('/', authenticate, async (req, res) => {
  const userId = req.userId;
  const { projectId: providedId, projectTitle } = req.body || {};

  if (!projectTitle || String(projectTitle).trim() === '') {
    return res.status(400).json({ error: 'Project title is required' });
  }

  const projectId = providedId && String(providedId).startsWith('prj_') ? providedId : generateId('prj');

  try {
    await pool.query(
      'INSERT INTO projects (project_id, user_id, project_title) VALUES (?, ?, ?)',
      [projectId, userId, projectTitle.trim()]
    );

    res.status(201).json({
      projectId,
      projectTitle: projectTitle.trim(),
      message: 'Project created successfully',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// 3. DELETE /api/projects/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    // Delete tasks inside this project first to keep tasks count clean if desired, or let FK set null
    await pool.query('DELETE FROM tasks WHERE project_id = ? AND user_id = ?', [id, userId]);

    const [result] = await pool.query(
      'DELETE FROM projects WHERE project_id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project and its tasks deleted successfully', projectId: id });
  } catch (error) {
    console.error(`Error deleting project ${id}:`, error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// 4. PUT /api/projects (bulk update legacy compatibility)
router.put(['/', '/projects.json'], authenticate, async (req, res) => {
  const userId = req.userId;
  const projects = Array.isArray(req.body) ? req.body : [];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM projects WHERE user_id = ?', [userId]);

    for (const project of projects) {
      if (!project || !project.projectTitle) continue;
      const projectId = project.projectId && String(project.projectId).startsWith('prj_')
        ? project.projectId
        : generateId('prj');

      await connection.query(
        'INSERT INTO projects (project_id, user_id, project_title) VALUES (?, ?, ?)',
        [projectId, userId, project.projectTitle]
      );
    }

    await connection.commit();
    res.json({ message: 'Projects updated successfully', count: projects.length });
  } catch (error) {
    await connection.rollback();
    console.error(`Error updating projects for user ${userId}:`, error);
    res.status(500).json({ error: 'Failed to update projects' });
  } finally {
    connection.release();
  }
});

module.exports = router;
