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
        return {
          json(data) {
            jsonCalled = data;
          },
        };
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

console.log('[PASS] Routes and auth middleware tests passed!');
