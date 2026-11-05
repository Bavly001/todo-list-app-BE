# 🚀 Doit - TodoList REST API Backend

[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JWT](https://img.shields.io/badge/JWT-Secure_Auth-black?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

A modular, production-structured REST API backend for the **Doit TodoList Application**, engineered with **Node.js**, **Express**, **MySQL**, and **Docker**.

> 💡 **Companion Frontend:** This backend powers the React + TypeScript frontend located at [Bavly001/todo-list-app](https://github.com/Bavly001/todo-list-app).

---

## 📌 Architectural Highlights

- **Clean Layered Architecture:** Decoupled routes, authentication middleware, database connection pool, and utility services.
- **Robust Security & Data Isolation:**
  - Stateless **JWT (JSON Web Token)** authentication using HMAC-SHA256 (`HS256`).
  - **Bcrypt password hashing** with 10 salt rounds and automatic legacy password migration.
  - Full multi-tenant data isolation; all CRUD queries strictly enforce `WHERE user_id = ?`.
  - SQL injection prevention via parameterized queries using `mysql2/promise`.
- **Database Resilience & Auto-Initialization:** Connection pool with automatic startup retry logic, table creation, foreign key constraints, and demo data seeding.
- **Containerized:** Production-ready `Dockerfile` (Node 18 Alpine base image) and `docker-compose` orchestration.
- **Automated Test Suite:** Fast unit and route integration tests built using the native Node.js test runner (`node --test`).

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+ LTS) | JavaScript asynchronous runtime |
| **Web Framework** | Express 4.19 | Modular routing and middleware pipeline |
| **Database** | MySQL 8.0 | Relational database with InnoDB engine & UTF-8 |
| **DB Client** | `mysql2/promise` | High-performance pooled connection management |
| **Auth & Security** | `jsonwebtoken` & `bcryptjs` | Token signing, verification & secure password hashing |
| **Config** | `dotenv` | Environment variable management |
| **Testing** | Node.js Test Runner | Native zero-dependency unit and integration testing |
| **Dev Tooling** | `node --watch` | Native fast hot-reloading in development |

---

## 📋 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/login` | Authenticate user & issue signed JWT token | ❌ |
| `GET` | `/api/auth/me` | Fetch authenticated user's profile | ✅ |
| `GET` | `/api/auth/users` | List users for administrative verification | ✅ |

### 📝 Tasks Management (`/api/tasks`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/tasks` | Get all user tasks (supports `?view=today\|upcoming\|inbox` & `?search=`) | ✅ |
| `GET` | `/api/tasks/counts` | Get badge counts for today, upcoming, inbox, and projects | ✅ |
| `GET` | `/api/tasks/:id` | Get single task by unique ID | ✅ |
| `POST` | `/api/tasks` | Create a new task (auto-generates `tsk_` ID) | ✅ |
| `PUT / PATCH`| `/api/tasks/:id` | Update an existing task | ✅ |
| `DELETE` | `/api/tasks/:id` | Permanently delete a task | ✅ |

### 📁 Projects (`/api/projects`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/projects` | Fetch all custom projects for the user | ✅ |
| `POST` | `/api/projects` | Create a new project (auto-generates `prj_` ID) | ✅ |
| `DELETE` | `/api/projects/:id` | Delete a project and clean up associated tasks | ✅ |

### ✅ Completed Tasks & History (`/api/completed-tasks`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/completed-tasks` | Get activity log of finished tasks | ✅ |
| `POST` | `/api/completed-tasks` | Mark task as completed (removes from active tasks) | ✅ |
| `DELETE` | `/api/completed-tasks/:id` | Remove a task from completed history | ✅ |

### 🎨 Theme & Feedback (`/api/theme`, `/api/feedbacks`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/theme` | Retrieve saved UI mode (light/dark) and accent colors | ✅ |
| `PUT` | `/api/theme` | Persist UI theme preferences in database | ✅ |
| `POST` | `/api/feedbacks` | Submit contact form feedback to database | ❌ |
| `GET` | `/api/health` | Healthcheck endpoint for container monitoring | ❌ |

---

## 🗄️ Database Schema

The database utilizes relational integrity with foreign keys and cascading operations:

```text
+------------------+         +------------------+
|      users       | <---+   |     projects     |
+------------------+     |   +------------------+
| id (PK)          |     +-- | project_id (PK)  |
| email (UNIQUE)   |         | user_id (FK)     |
| password (bcrypt)|         | project_title    |
| first_name       |         +------------------+
| last_name        |                   ^
+------------------+                   |
     |        |                        |
     |        +--------------+         |
     v                       v         |
+------------------+   +-----------------------+
|      tasks       |   |    completed_tasks    |
+------------------+   +-----------------------+
| id (PK)          |   | id (PK)               |
| user_id (FK)     |   | user_id (FK)          |
| title            |   | title                 |
| description      |   | description           |
| date             |   | completion_date       |
| project_id (FK) -+   | project_id (FK) ------+
+------------------+   +-----------------------+
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (v8.0) or **Docker**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Bavly001/todo-list-app-BE.git
cd todo-list-app-BE
npm install
```

### 2. Environment Variables Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=todolist_db
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Initialize MySQL Database
If using local MySQL:
```bash
mysql -u root -p < init.sql
```
*(Alternatively, starting the server will automatically run table migrations and initial seeds).*

### 4. Run the Server
```bash
# Development mode (auto-reload on file changes)
npm run dev

# Production mode
npm start
```

The API will be live at `http://localhost:5000`.

---

## 🐳 Running with Docker

You can build and run this backend service independently using Docker:

```bash
# Build Docker image
docker build -t doit-backend .

# Run Docker container
docker run -p 5000:5000 --env-file .env doit-backend
```

Or run the entire stack (Frontend, Backend & MySQL) from the root docker-compose configuration:
```bash
docker compose up --build
```

---

## 🧪 Running Automated Tests

Run the test suite verifying JWT generation, ID formats, password hashing, and route protection:

```bash
npm test
```

Expected output:
```text
✔ tests/auth.test.js
✔ tests/id.test.js
✔ tests/jwt.test.js
✔ tests/routes.test.js
ℹ pass 4
ℹ fail 0
```

---

## 👥 Seed User Credentials

For testing and demonstration, the database comes pre-seeded with trial credentials:

| Email | Password | Role |
| :--- | :--- | :--- |
| `user@doit.com` | `user@password` | Primary Trial User (with sample tasks & projects) |
| `admin@doit.com` | `admin@password` | Admin / Clean User |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
