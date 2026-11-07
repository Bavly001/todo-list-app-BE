-- ==============================================================================
-- DATABASE INITIALIZATION SCRIPT FOR TODOLIST APP
-- ==============================================================================
-- This script initializes the MySQL database schema and populates default
-- test users and initial data so the application is immediately usable.

-- Create database if it does not already exist
CREATE DATABASE IF NOT EXISTS `todolist_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `todolist_db`;

-- ------------------------------------------------------------------------------
-- Table 1: users
-- Stores registered user profiles and authentication credentials
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- Table 2: projects
-- Stores user-defined projects (e.g. Work, Personal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `project_id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `project_title` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`),
  CONSTRAINT `fk_projects_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- Table 3: tasks
-- Stores active to-do items linked to a specific user and optional project
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `date` VARCHAR(100) NULL,
  `project_id` VARCHAR(255) NULL,
  `project_title` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_tasks_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- Table 4: completed_tasks
-- Stores archived completed items for history, tracking, and activity log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `completed_tasks` (
  `id` VARCHAR(255) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `date` VARCHAR(100) NULL,
  `completion_date` VARCHAR(100) NOT NULL,
  `project_id` VARCHAR(255) NULL,
  `project_title` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_completed_tasks_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_completed_tasks_project`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- Table 5: themes
-- Stores user UI personalization preferences (mode: light/dark, color palette)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `themes` (
  `user_id` VARCHAR(255) NOT NULL,
  `mode` VARCHAR(50) DEFAULT NULL,
  `color_data` JSON NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_themes_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------------------
-- Table 6: feedbacks
-- Stores user feedback messages submitted via Contact Us page
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedbacks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `date_and_time` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- DEFAULT SEED DATA
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM `users` WHERE `id` IN ('1', '2');
SET FOREIGN_KEY_CHECKS = 1;

-- Seed test users matching requested IDs:
-- 1. admin@doit.com -> usr_admin01DoitApp99 (admin@password)
-- 2. user@doit.com -> usr_demo02DoitApp88 (user@password)
INSERT INTO `users` (`id`, `email`, `password`, `first_name`, `last_name`) VALUES
  ('usr_admin01DoitApp99', 'admin@doit.com', '$2b$10$u5bT9n57hpBXV8ezbTxojOE69.GrnmFRzxLBdRqykeK36VSfzKBYe', 'Admin', 'User'),
  ('usr_demo02DoitApp88', 'user@doit.com', '$2b$10$xQvKtpe/yas8576DdJRfz.BPaG1auvwFt3rlKaimK18j44BDc.0y.', 'Bavly', 'Ashraf')
ON DUPLICATE KEY UPDATE
  `id` = VALUES(`id`),
  `password` = VALUES(`password`),
  `first_name` = VALUES(`first_name`),
  `last_name` = VALUES(`last_name`);

-- Seed sample projects for both users
INSERT INTO `projects` (`project_id`, `user_id`, `project_title`) VALUES
  ('prj_work01DoitP01', 'usr_admin01DoitApp99', 'Personal Tasks'),
  ('prj_pers02DoitP02', 'usr_admin01DoitApp99', 'Work Projects'),
  ('prj_demo01DoitP01', 'usr_demo02DoitApp88', 'Personal Tasks'),
  ('prj_demo02DoitP02', 'usr_demo02DoitApp88', 'Work Projects')
ON DUPLICATE KEY UPDATE `project_title` = VALUES(`project_title`);

-- Seed active tasks for user admin@doit.com (usr_admin01DoitApp99)
INSERT INTO `tasks` (`id`, `user_id`, `title`, `description`, `date`, `project_id`, `project_title`) VALUES
  ('tsk_fe01DoitReact', 'usr_admin01DoitApp99', 'Review React Query Architecture', 'Inspect custom hooks, query key caching mechanics, and view-scoped data fetching.', DATE_FORMAT(CURRENT_DATE(), '%d %b %Y'), 'prj_pers02DoitP02', 'Work Projects'),
  ('tsk_ui02DoitDesign', 'usr_admin01DoitApp99', 'Check mobile responsive modal behavior', 'Verify 320px to 1080px viewport layouts and scrollable forms across all modals.', DATE_FORMAT(CURRENT_DATE(), '%d %b %Y'), 'prj_pers02DoitP02', 'Work Projects'),
  ('tsk_gro03DoitGrocery', 'usr_admin01DoitApp99', 'Grocery shopping for dinner', 'Pick up fresh vegetables, olive oil, and sourdough bread for tonight.', DATE_FORMAT(CURRENT_DATE(), '%d %b %Y'), 'prj_work01DoitP01', 'Personal Tasks'),
  ('tsk_doc04DoitDocker', 'usr_admin01DoitApp99', 'Docker compose deployment check', 'Verify multi-container networking between frontend, backend, and MySQL service.', DATE_FORMAT(DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '%d %b %Y'), 'prj_pers02DoitP02', 'Work Projects'),
  ('tsk_gym05DoitWorkout', 'usr_admin01DoitApp99', 'Morning workout session', '45 minutes cardio and core training routine at the local gym.', DATE_FORMAT(DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '%d %b %Y'), 'prj_work01DoitP01', 'Personal Tasks'),
  ('tsk_bk06DoitReading', 'usr_admin01DoitApp99', 'Read 2 chapters of Data-Intensive Applications', 'Focus on replication lag, partitioning, and distributed transactions.', DATE_FORMAT(DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY), '%d %b %Y'), 'prj_work01DoitP01', 'Personal Tasks'),
  ('tsk_inb07DoitInbox', 'usr_admin01DoitApp99', 'Quick idea: Add dark mode keyboard shortcut', 'Explore using Ctrl+Shift+D or native theme listeners for faster toggling.', NULL, NULL, NULL),
  ('tsk_inb08DoitClean', 'usr_admin01DoitApp99', 'Organize desktop downloads and assets', 'Archive old project assets and clear temporary screenshot captures.', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Seed active tasks for user user@doit.com (usr_demo02DoitApp88)
INSERT INTO `tasks` (`id`, `user_id`, `title`, `description`, `date`, `project_id`, `project_title`) VALUES
  ('tsk_demo01DoitReact', 'usr_demo02DoitApp88', 'Review React Query Architecture', 'Inspect custom hooks, query key caching mechanics, and view-scoped data fetching.', DATE_FORMAT(CURRENT_DATE(), '%d %b %Y'), 'prj_demo02DoitP02', 'Work Projects'),
  ('tsk_demo02DoitDesign', 'usr_demo02DoitApp88', 'Check mobile responsive modal behavior', 'Verify 320px to 1080px viewport layouts and scrollable forms across all modals.', DATE_FORMAT(CURRENT_DATE(), '%d %b %Y'), 'prj_demo02DoitP02', 'Work Projects'),
  ('tsk_demo03DoitGrocery', 'usr_demo02DoitApp88', 'Grocery shopping for dinner', 'Pick up fresh vegetables, olive oil, and sourdough bread for tonight.', DATE_FORMAT(CURRENT_DATE(), '%d %b %Y'), 'prj_demo01DoitP01', 'Personal Tasks'),
  ('tsk_demo04DoitDocker', 'usr_demo02DoitApp88', 'Docker compose deployment check', 'Verify multi-container networking between frontend, backend, and MySQL service.', DATE_FORMAT(DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '%d %b %Y'), 'prj_demo02DoitP02', 'Work Projects'),
  ('tsk_demo05DoitWorkout', 'usr_demo02DoitApp88', 'Morning workout session', '45 minutes cardio and core training routine at the local gym.', DATE_FORMAT(DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY), '%d %b %Y'), 'prj_demo01DoitP01', 'Personal Tasks'),
  ('tsk_demo06DoitReading', 'usr_demo02DoitApp88', 'Read 2 chapters of Data-Intensive Applications', 'Focus on replication lag, partitioning, and distributed transactions.', DATE_FORMAT(DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY), '%d %b %Y'), 'prj_demo01DoitP01', 'Personal Tasks'),
  ('tsk_demo07DoitInbox', 'usr_demo02DoitApp88', 'Quick idea: Add dark mode keyboard shortcut', 'Explore using Ctrl+Shift+D or native theme listeners for faster toggling.', NULL, NULL, NULL),
  ('tsk_demo08DoitClean', 'usr_demo02DoitApp88', 'Organize desktop downloads and assets', 'Archive old project assets and clear temporary screenshot captures.', NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

-- Completed tasks: none for the users (cleared per user instructions)
DELETE FROM `completed_tasks` WHERE `user_id` IN ('usr_admin01DoitApp99', 'usr_demo02DoitApp88', '1', '2');

