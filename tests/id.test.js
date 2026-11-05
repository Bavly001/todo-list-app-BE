const assert = require('assert');
const { generateId } = require('../utils/id');

// Test prefix and format
const userId = generateId('usr');
assert.ok(userId.startsWith('usr_'), 'Must start with usr_ prefix');
assert.strictEqual(userId.length, 20, 'Prefix (4 chars) + 16 alphanumeric characters = 20 chars');
assert.match(userId, /^usr_[A-Za-z0-9]{16}$/, 'Must contain only alphanumeric characters after prefix');

// Test without prefix
const rawId = generateId();
assert.strictEqual(rawId.length, 16, 'Raw ID must be 16 characters');
assert.match(rawId, /^[A-Za-z0-9]{16}$/, 'Must contain only alphanumeric characters');

// Test collision resistance / uniqueness
const ids = new Set();
for (let i = 0; i < 1000; i++) {
  const id = generateId('tsk');
  assert.ok(!ids.has(id), 'Generated ID must be unique');
  ids.add(id);
}

console.log('generateId tests passed!');
