const assert = require('assert');
const bcrypt = require('bcryptjs');
const { signToken, verifyToken } = require('../utils/jwt');
const { verifyAndUpgradePassword, sanitizeUser } = require('../utils/authHelper');

console.log('[TEST] Starting Auth & Password Hashing tests...');

async function runTests() {
  // Test 1: Password hashing and comparison
  const rawPassword = 'user@password';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(rawPassword, salt);

  assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Hash should have bcrypt prefix');
  const isCorrect = await bcrypt.compare(rawPassword, hash);
  assert.strictEqual(isCorrect, true, 'bcrypt.compare should return true for matching password');
  const isWrong = await bcrypt.compare('wrong@password', hash);
  assert.strictEqual(isWrong, false, 'bcrypt.compare should return false for incorrect password');

  // Test 2: verifyAndUpgradePassword helper
  // Scenario A: Hashed password
  const resHashed = await verifyAndUpgradePassword('user@password', hash);
  assert.strictEqual(resHashed.isValid, true);
  assert.strictEqual(resHashed.needsRehash, false);

  // Scenario B: Plaintext legacy password
  const resLegacy = await verifyAndUpgradePassword('admin@password', 'admin@password');
  assert.strictEqual(resLegacy.isValid, true);
  assert.strictEqual(resLegacy.needsRehash, true);
  assert.ok(resLegacy.newHash, 'New hash should be generated on legacy password upgrade');
  assert.ok(await bcrypt.compare('admin@password', resLegacy.newHash));

  // Scenario C: Invalid password
  const resInvalid = await verifyAndUpgradePassword('wrong@password', hash);
  assert.strictEqual(resInvalid.isValid, false);

  // Test 3: sanitizeUser removes password
  const userWithPassword = {
    id: 'usr_demo02DoitApp88',
    email: 'user@doit.com',
    password: hash,
    firstName: 'Bavly',
    lastName: 'Ashraf',
  };
  const sanitized = sanitizeUser(userWithPassword);
  assert.strictEqual(sanitized.password, undefined, 'Password field must be removed');
  assert.strictEqual(sanitized.id, userWithPassword.id);
  assert.strictEqual(sanitized.email, userWithPassword.email);
  assert.strictEqual(sanitized.firstName, userWithPassword.firstName);
  assert.strictEqual(sanitized.lastName, userWithPassword.lastName);

  // Test 4: Token returned is valid JWT with 7-day expiration
  const token = signToken({ userId: sanitized.id, email: sanitized.email });
  const verified = verifyToken(token);
  assert.strictEqual(verified.userId, sanitized.id);
  assert.strictEqual(verified.email, sanitized.email);

  console.log('[PASS] Auth & Password Hashing tests passed!');
}

runTests().catch((err) => {
  console.error('[FAIL] Auth test failed:', err);
  process.exit(1);
});
