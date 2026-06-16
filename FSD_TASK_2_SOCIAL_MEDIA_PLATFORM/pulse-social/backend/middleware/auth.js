const db = require('../config/database');

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const user = db.prepare('SELECT id, username, name, avatar, color, is_verified FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session expired' });
  }
  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  if (req.session?.userId) {
    const user = db.prepare('SELECT id, username, name, avatar, color, is_verified FROM users WHERE id = ?').get(req.session.userId);
    req.user = user || null;
  } else {
    req.user = null;
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
