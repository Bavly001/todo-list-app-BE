const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt with 10 salt rounds.
 * @param {string} password - Raw password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compares candidate password against stored password.
 * Supports standard bcrypt hash as well as automatic upgrade
 * from legacy plaintext passwords.
 * @param {string} candidatePassword - Password from user input
 * @param {string} storedPassword - Password from database
 * @returns {Promise<{ isValid: boolean, needsRehash: boolean, newHash?: string }>}
 */
async function verifyAndUpgradePassword(candidatePassword, storedPassword) {
  if (!candidatePassword || !storedPassword) {
    return { isValid: false, needsRehash: false };
  }

  // 1. Try standard bcrypt comparison first
  try {
    const isBcryptMatch = await bcrypt.compare(candidatePassword, storedPassword);
    if (isBcryptMatch) {
      return { isValid: true, needsRehash: false };
    }
  } catch (err) {
    // If storedPassword is not a valid bcrypt hash, bcrypt.compare throws or returns false
  }

  // 2. Fallback check for legacy plaintext password
  if (candidatePassword === storedPassword) {
    const newHash = await hashPassword(candidatePassword);
    return { isValid: true, needsRehash: true, newHash };
  }

  return { isValid: false, needsRehash: false };
}

/**
 * Strips sensitive fields (like password) from user object.
 * @param {object} user - User record from database
 * @returns {object} - Sanitized user record
 */
function sanitizeUser(user) {
  if (!user) return null;
  const copy = { ...user };
  delete copy.password;
  return copy;
}

module.exports = {
  hashPassword,
  verifyAndUpgradePassword,
  sanitizeUser,
  SALT_ROUNDS,
};
