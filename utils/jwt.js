const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Resolves the JWT secret.
 * Refuses to use a default fallback in production.
 */
function getJwtSecret(nodeEnv, envSecret) {
  const currentEnv = nodeEnv !== undefined ? nodeEnv : process.env.NODE_ENV;
  const currentSecret = envSecret !== undefined ? envSecret : process.env.JWT_SECRET;
  if (currentEnv === 'production' && (!currentSecret || String(currentSecret).trim() === '')) {
    throw new Error('FATAL: JWT_SECRET must be explicitly set in production');
  }
  return currentSecret;
}

const JWT_SECRET = getJwtSecret();
const DEFAULT_EXPIRATION = '7d';

/**
 * Signs a payload into a standard 7-day JWT using HMAC SHA-256.
 * @param {object} payload - Claims to include (e.g. { userId, email })
 * @param {object} [options] - Optional jsonwebtoken sign options
 * @returns {string} - Signed JWT
 */
function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: DEFAULT_EXPIRATION,
    ...options,
  });
}

/**
 * Verifies a JWT strictly using HMAC SHA-256 and returns the decoded payload.
 * Returns null if the token is missing, invalid, tampered, expired, or uses an unauthorized algorithm.
 * @param {string} token - The raw JWT string
 * @returns {object|null} - Decoded payload or null
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    return null;
  }

  try {
    return jwt.verify(token.trim(), JWT_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (err) {
    return null;
  }
}

module.exports = {
  signToken,
  verifyToken,
  getJwtSecret,
  JWT_SECRET,
};
