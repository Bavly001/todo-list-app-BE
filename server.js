// ==============================================================================
// TODOLIST APPLICATION - MODULAR BACKEND SERVER (server.js)
// ==============================================================================
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool, initializeDatabase } = require('./db');

const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const projectsRoutes = require('./routes/projects');
const completedTasksRoutes = require('./routes/completedTasks');
const themesRoutes = require('./routes/themes');
const feedbacksRoutes = require('./routes/feedbacks');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json({ type: ['application/json', 'text/plain', '*/*'] }));

// Fallback: parse string bodies if express.json didn't deserialize it
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      // Keep body as string if not valid JSON
    }
  }
  next();
});

// Parse incoming URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Simple logger middleware to trace incoming API requests
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'TodoList Backend API is running smoothly',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular route handlers
// 1. Auth routes (login, me, users)
app.use(['/api/auth', '/auth', '/api/users', '/users'], authRoutes);

// Root & convenience aliases for auth endpoints (POST /login, /api/login, GET /me, /api/me)
app.post(['/login', '/login.json', '/api/login'], (req, res, next) => {
  req.url = '/login';
  authRoutes(req, res, next);
});
app.get(['/me', '/me.json', '/api/me'], (req, res, next) => {
  req.url = '/me';
  authRoutes(req, res, next);
});

// 2. Tasks routes (query with views, counts, single task, CRUD, bulk fallback)
app.use(['/api/tasks', '/tasks'], tasksRoutes);

// 3. Projects routes (get, post, delete, bulk fallback)
app.use(['/api/projects', '/projects'], projectsRoutes);

// 4. Completed tasks routes (get, post, delete, bulk fallback)
app.use(
  [
    '/api/completed-tasks',
    '/completed-tasks',
    '/api/completedTasks',
    '/completedTasks',
  ],
  completedTasksRoutes
);

// 5. Theme preferences routes
app.use(['/api/theme', '/theme'], themesRoutes);

// 6. Feedback routes
app.use(['/api/feedbacks', '/feedbacks'], feedbacksRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start HTTP server
async function startServer() {
  await initializeDatabase();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] TodoList backend listening on http://0.0.0.0:${PORT}`);
  });
}

// Start only if run directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('[FATAL] Server startup failed:', err);
    process.exit(1);
  });
}

module.exports = app;
