const crypto = require('crypto');

const ALPHANUMERIC = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Generates a cryptographically strong, collision-resistant alphanumeric identifier.
 * @param {string} [prefix] Optional prefix (e.g. 'usr', 'prj', 'tsk', 'cmp')
 * @returns {string} Formatted ID, e.g. 'usr_k9F8m2Xq1WpL3N8z'
 */
function generateId(prefix = '') {
  const bytes = crypto.randomBytes(16);
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return prefix ? `${prefix}_${id}` : id;
}

module.exports = { generateId };
