// ==============================================================================
// DATABASE MODULE (db.js)
// ==============================================================================
// This module manages MySQL database connection pooling and provides
// an initialization routine that ensures all tables and seed data exist.

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a connection pool to manage concurrent database connections efficiently
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'todolist_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Formats a date matching the frontend's shortMonthFormat (e.g. "02 Nov 2026")
 */
function formatShortDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Ensures required tables and seed data exist in the database.
 * This runs on server startup so the application works seamlessly
 * even when starting with a fresh database.
 */
async function initializeDatabase(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DB] Attempting database connection (attempt ${attempt}/${retries})...`);

      // Test the connection
      const connection = await pool.getConnection();
      console.log('[DB] Connected to MySQL database successfully.');

      // 1. Create users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 2. Create projects table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS projects (
          project_id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          project_title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 3. Create tasks table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NULL,
          date VARCHAR(100) NULL,
          project_id VARCHAR(255) NULL,
          project_title VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 4. Create completed_tasks table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS completed_tasks (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NULL,
          date VARCHAR(100) NULL,
          completion_date VARCHAR(100) NOT NULL,
          project_id VARCHAR(255) NULL,
          project_title VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 5. Create themes table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS themes (
          user_id VARCHAR(255) PRIMARY KEY,
          mode VARCHAR(50) DEFAULT 'light',
          color_data JSON NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // 6. Create feedbacks table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS feedbacks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          date_and_time VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Reset and seed default trial users with bcrypt hashed passwords:
      // admin@doit.com -> usr_admin01DoitApp99 (admin@password)
      // user@doit.com  -> usr_demo02DoitApp88 (user@password)
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query(
        "DELETE FROM users WHERE email IN ('admin@doit.com', 'user@doit.com') OR id IN ('usr_admin01DoitApp99', 'usr_demo02DoitApp88', '1', '2')"
      );
      await connection.query(`
        INSERT INTO users (id, email, password, first_name, last_name) VALUES
          ('usr_admin01DoitApp99', 'admin@doit.com', '$2b$10$u5bT9n57hpBXV8ezbTxojOE69.GrnmFRzxLBdRqykeK36VSfzKBYe', 'Admin', 'User'),
          ('usr_demo02DoitApp88', 'user@doit.com', '$2b$10$xQvKtpe/yas8576DdJRfz.BPaG1auvwFt3rlKaimK18j44BDc.0y.', 'Bavly', 'Ashraf');
      `);
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');

      // Seed / update default projects for both users
      const projectsToSeed = [
        ['prj_work01DoitP01', 'usr_admin01DoitApp99', 'Personal Tasks'],
        ['prj_pers02DoitP02', 'usr_admin01DoitApp99', 'Work Projects'],
        ['prj_demo01DoitP01', 'usr_demo02DoitApp88', 'Personal Tasks'],
        ['prj_demo02DoitP02', 'usr_demo02DoitApp88', 'Work Projects'],
      ];
      for (const p of projectsToSeed) {
        await connection.query(
          `INSERT INTO projects (project_id, user_id, project_title)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), project_title = VALUES(project_title)`,
          p
        );
      }

      // Seed default themes
      await connection.query(`
        INSERT INTO themes (user_id, mode, color_data) VALUES
          ('usr_admin01DoitApp99', 'light', '{"bgColor": "bg-blue-600", "secondaryBg": "bg-blue-100", "bgHover": "hover:bg-blue-700", "textColor": "text-blue-600", "textHover": "hover:text-blue-700", "mainColor": "blue"}'),
          ('usr_demo02DoitApp88', 'light', '{"bgColor": "bg-blue-600", "secondaryBg": "bg-blue-100", "bgHover": "hover:bg-blue-700", "textColor": "text-blue-600", "textHover": "hover:text-blue-700", "mainColor": "blue"}')
        ON DUPLICATE KEY UPDATE mode = VALUES(mode);
      `);

      // Remove completed tasks for both users per user instructions
      await connection.query(
        "DELETE FROM completed_tasks WHERE user_id IN ('usr_admin01DoitApp99', 'usr_demo02DoitApp88', '1', '2')"
      );

      // Seed new active tasks for both users
      const todayStr = formatShortDate(new Date());
      const tomorrowStr = formatShortDate(new Date(Date.now() + 86400000));
      const inThreeDaysStr = formatShortDate(new Date(Date.now() + 3 * 86400000));

      const newSeedTasks = [
        // Tasks for admin@doit.com (usr_admin01DoitApp99)
        ['tsk_fe01DoitReact', 'usr_admin01DoitApp99', 'Review React Query Architecture', 'Inspect custom hooks, query key caching mechanics, and view-scoped data fetching.', todayStr, 'prj_pers02DoitP02', 'Work Projects'],
        ['tsk_ui02DoitDesign', 'usr_admin01DoitApp99', 'Check mobile responsive modal behavior', 'Verify 320px to 1080px viewport layouts and scrollable forms across all modals.', todayStr, 'prj_pers02DoitP02', 'Work Projects'],
        ['tsk_gro03DoitGrocery', 'usr_admin01DoitApp99', 'Grocery shopping for dinner', 'Pick up fresh vegetables, olive oil, and sourdough bread for tonight.', todayStr, 'prj_work01DoitP01', 'Personal Tasks'],
        ['tsk_doc04DoitDocker', 'usr_admin01DoitApp99', 'Docker compose deployment check', 'Verify multi-container networking between frontend, backend, and MySQL service.', tomorrowStr, 'prj_pers02DoitP02', 'Work Projects'],
        ['tsk_gym05DoitWorkout', 'usr_admin01DoitApp99', 'Morning workout session', '45 minutes cardio and core training routine at the local gym.', tomorrowStr, 'prj_work01DoitP01', 'Personal Tasks'],
        ['tsk_bk06DoitReading', 'usr_admin01DoitApp99', 'Read 2 chapters of Data-Intensive Applications', 'Focus on replication lag, partitioning, and distributed transactions.', inThreeDaysStr, 'prj_work01DoitP01', 'Personal Tasks'],
        ['tsk_inb07DoitInbox', 'usr_admin01DoitApp99', 'Quick idea: Add dark mode keyboard shortcut', 'Explore using Ctrl+Shift+D or native theme listeners for faster toggling.', null, null, null],
        ['tsk_inb08DoitClean', 'usr_admin01DoitApp99', 'Organize desktop downloads and assets', 'Archive old project assets and clear temporary screenshot captures.', null, null, null],

        // Tasks for user@doit.com (usr_demo02DoitApp88)
        ['tsk_demo01DoitReact', 'usr_demo02DoitApp88', 'Review React Query Architecture', 'Inspect custom hooks, query key caching mechanics, and view-scoped data fetching.', todayStr, 'prj_demo02DoitP02', 'Work Projects'],
        ['tsk_demo02DoitDesign', 'usr_demo02DoitApp88', 'Check mobile responsive modal behavior', 'Verify 320px to 1080px viewport layouts and scrollable forms across all modals.', todayStr, 'prj_demo02DoitP02', 'Work Projects'],
        ['tsk_demo03DoitGrocery', 'usr_demo02DoitApp88', 'Grocery shopping for dinner', 'Pick up fresh vegetables, olive oil, and sourdough bread for tonight.', todayStr, 'prj_demo01DoitP01', 'Personal Tasks'],
        ['tsk_demo04DoitDocker', 'usr_demo02DoitApp88', 'Docker compose deployment check', 'Verify multi-container networking between frontend, backend, and MySQL service.', tomorrowStr, 'prj_demo02DoitP02', 'Work Projects'],
        ['tsk_demo05DoitWorkout', 'usr_demo02DoitApp88', 'Morning workout session', '45 minutes cardio and core training routine at the local gym.', tomorrowStr, 'prj_demo01DoitP01', 'Personal Tasks'],
        ['tsk_demo06DoitReading', 'usr_demo02DoitApp88', 'Read 2 chapters of Data-Intensive Applications', 'Focus on replication lag, partitioning, and distributed transactions.', inThreeDaysStr, 'prj_demo01DoitP01', 'Personal Tasks'],
        ['tsk_demo07DoitInbox', 'usr_demo02DoitApp88', 'Quick idea: Add dark mode keyboard shortcut', 'Explore using Ctrl+Shift+D or native theme listeners for faster toggling.', null, null, null],
        ['tsk_demo08DoitClean', 'usr_demo02DoitApp88', 'Organize desktop downloads and assets', 'Archive old project assets and clear temporary screenshot captures.', null, null, null],
      ];

      for (const task of newSeedTasks) {
        await connection.query(
          `INSERT INTO tasks (id, user_id, title, description, date, project_id, project_title)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description), date = VALUES(date), project_id = VALUES(project_id), project_title = VALUES(project_title)`,
          task
        );
      }

      console.log('[DB] Database tables initialized: admin@doit.com (usr_admin01DoitApp99) and user@doit.com (usr_demo02DoitApp88) configured.');

      connection.release();
      return;
    } catch (error) {
      console.error(`[DB] Connection attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`[DB] Retrying in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('[DB] Max retries reached. Database initialization failed.');
      }
    }
  }
}

module.exports = {
  pool,
  initializeDatabase,
  formatShortDate,
};
