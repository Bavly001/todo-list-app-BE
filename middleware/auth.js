const { verifyToken } = require('../utils/jwt');

/**
 * Express middleware to authenticate requests via JWT.
 * Extracts JWT strictly from 'Authorization: Bearer <token>' header
 * (or fallback token headers). Verifies signature and expiration.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else if (req.headers['token']) {
    token = String(req.headers['token']).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: valid user token required in Authorization header' });
  }

  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }

  req.userId = decoded.userId;
  req.user = decoded;
  next();
}

module.exports = {
  authenticate,
};
