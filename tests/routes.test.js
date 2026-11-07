const assert = require('assert');
const { authenticate } = require('../middleware/auth');
const { signToken } = require('../utils/jwt');
const authRouter = require('../routes/auth');
const tasksRouter = require('../routes/tasks');
const projectsRouter = require('../routes/projects');
const completedTasksRouter = require('../routes/completedTasks');
const themesRouter = require('../routes/themes');
const feedbacksRouter = require('../routes/feedbacks');

function createMockRes() {
  let statusCalled = null;
  let jsonCalled = null;
  return {
    res: {
      status(code) {
        statusCalled = code;
        return this;
      },
      json(data) {
        jsonCalled = data;
        return this;
      },
    },
    getStatus: () => statusCalled,
    getJson: () => jsonCalled,
  };
}

// Test 1: authenticate middleware without headers returns 401
{
  const mock = createMockRes();
  const req = { headers: {} };
  let nextCalled = false;
  authenticate(req, mock.res, () => {
    nextCalled = true;
  });
  assert.strictEqual(mock.getStatus(), 401, 'Should return 401 when no auth header provided');
  assert.strictEqual(nextCalled, false, 'next() should not be called');
}

// Test 2: authenticate middleware with forged/raw user ID returns 401 (no longer accepted!)
{
  const mock = createMockRes();
  const req = {
    headers: {
      authorization: 'Bearer usr_admin01DoitApp99',
    },
  };
  let nextCalled = false;
  authenticate(req, mock.res, () => {
    nextCalled = true;
  });
  assert.strictEqual(mock.getStatus(), 401, 'Should reject raw user IDs with 401');
  assert.strictEqual(nextCalled, false, 'next() should not be called for raw IDs');
}

// Test 3: authenticate middleware with valid signed JWT succeeds
{
  const testPayload = { userId: 'usr_demo02DoitApp88', email: 'user@doit.com' };
  const validJwt = signToken(testPayload);

  const mock = createMockRes();
  const req = {
    headers: {
      authorization: `Bearer ${validJwt}`,
    },
  };
  let nextCalled = false;
  authenticate(req, mock.res, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true, 'next() must be called with valid JWT');
  assert.strictEqual(req.userId, testPayload.userId, 'req.userId must match decoded token');
  assert.strictEqual(req.user.email, testPayload.email, 'req.user must contain payload');
  assert.strictEqual(mock.getStatus(), null, 'status should not be called on success');
}

// Test 4: Routers are valid Express routers
assert.ok(typeof authRouter === 'function', 'authRouter must be an Express router');
assert.ok(typeof tasksRouter === 'function', 'tasksRouter must be an Express router');
assert.ok(typeof projectsRouter === 'function', 'projectsRouter must be an Express router');
assert.ok(typeof completedTasksRouter === 'function', 'completedTasksRouter must be an Express router');
assert.ok(typeof themesRouter === 'function', 'themesRouter must be an Express router');
assert.ok(typeof feedbacksRouter === 'function', 'feedbacksRouter must be an Express router');

// Test 5: Themes route handler returns null mode and color when no theme row exists in DB
(async () => {
  const { pool } = require('../db');
  const originalQuery = pool.query;
  try {
    pool.query = async (sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT mode, color_data FROM themes')) {
        return [[]];
      }
      return [[]];
    };

    const getLayer = themesRouter.stack.find((l) => l.route && l.route.methods.get);
    assert.ok(getLayer, 'GET route should exist on themesRouter');
    const handler = getLayer.route.stack[getLayer.route.stack.length - 1].handle;
    const mock = createMockRes();
    const req = { userId: 'usr_test' };
    await handler(req, mock.res);

    assert.deepStrictEqual(
      mock.getJson(),
      { mode: null, color: null },
      'Empty DB returns null mode and null color without forcing defaults'
    );
  } finally {
    pool.query = originalQuery;
  }

  // Test 6: Themes route handler returns stored mode and color when row exists
  try {
    pool.query = async (sql) => {
      if (typeof sql === 'string' && sql.includes('SELECT mode, color_data FROM themes')) {
        return [[{ mode: 'dark', color_data: JSON.stringify({ mainColor: 'cyan' }) }]];
      }
      return [[]];
    };

    const getLayer = themesRouter.stack.find((l) => l.route && l.route.methods.get);
    const handler = getLayer.route.stack[getLayer.route.stack.length - 1].handle;
    const mock = createMockRes();
    const req = { userId: 'usr_test' };
    await handler(req, mock.res);

    assert.deepStrictEqual(
      mock.getJson(),
      { mode: 'dark', color: { mainColor: 'cyan' } },
      'Should return saved dark mode and custom color'
    );
  } finally {
    pool.query = originalQuery;
  }

  console.log('[PASS] Routes, themes, and auth middleware tests passed!');
})();
