const assert = require('assert');
const jwt = require('jsonwebtoken');
const { signToken, verifyToken, getJwtSecret } = require('../utils/jwt');

console.log('[TEST] Starting JWT utility tests...');

// Test 1: signToken returns a valid 3-part JWT
const payload = { userId: 'usr_demo02DoitApp88', email: 'user@doit.com' };
const token = signToken(payload);
assert.strictEqual(typeof token, 'string', 'Token must be a string');
const parts = token.split('.');
assert.strictEqual(parts.length, 3, 'JWT must consist of header, payload, and signature');

// Test 2: verifyToken returns decoded payload with userId and email
const decoded = verifyToken(token);
assert.ok(decoded, 'Decoded token should not be null');
assert.strictEqual(decoded.userId, payload.userId, 'Decoded userId must match');
assert.strictEqual(decoded.email, payload.email, 'Decoded email must match');
assert.ok(decoded.exp, 'Decoded token must have an expiration claim (exp)');
assert.ok(decoded.iat, 'Decoded token must have an issued-at claim (iat)');

// Expiration should be roughly 7 days in the future (within tolerance)
const sevenDaysInSeconds = 7 * 24 * 60 * 60;
const diff = decoded.exp - decoded.iat;
assert.strictEqual(diff, sevenDaysInSeconds, 'Token expiry must be exactly 7 days');

// Test 3: verifyToken returns null for tampered token
const tamperedToken = token.slice(0, -5) + 'abcde';
assert.strictEqual(verifyToken(tamperedToken), null, 'Tampered token must return null');

// Test 4: verifyToken returns null for malformed or empty inputs
assert.strictEqual(verifyToken(''), null, 'Empty string must return null');
assert.strictEqual(verifyToken('not.a.valid.jwt'), null, 'Invalid format must return null');
assert.strictEqual(verifyToken(null), null, 'null token must return null');
assert.strictEqual(verifyToken(undefined), null, 'undefined token must return null');

// Test 5: Algorithm pinning — reject tokens with algorithm 'none'
const unsignedToken = jwt.sign(payload, '', { algorithm: 'none' });
assert.strictEqual(verifyToken(unsignedToken), null, 'Tokens with algorithm none must be rejected');

// Test 6: Production secret enforcement
assert.throws(() => {
  getJwtSecret('production', '');
}, /JWT_SECRET must be explicitly set in production/, 'Must throw if JWT_SECRET missing in production');

console.log('[PASS] All JWT utility tests passed!');
