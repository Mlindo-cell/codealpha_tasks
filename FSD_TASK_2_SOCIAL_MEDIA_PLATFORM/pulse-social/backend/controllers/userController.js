const db   = require('../config/database');
const path = require('path');
const fs   = require('fs');

function hydrateUser(user, viewerId) {
  if (!user) return null;
  const { password, ...u } = user;
  u.follower_count  = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id=?').get(u.id).c;
  u.following_count = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id=?').get(u.id).c;
  u.post_count      = db.prepare('SELECT COUNT(*) as c FROM posts WHERE user_id=?').get(u.id).c;
  if (viewerId) {
    u.is_following = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(viewerId, u.id);
    u.is_followed_by = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(u.id, viewerId);
  }
  return u;
}

// GET /api/users/:username
exports.getProfile = (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: hydrateUser(user, req.user?.id) });
};

// PUT /api/users/me
exports.updateProfile = (req, res) => {
  const { name, bio, website, location } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  db.prepare(`
    UPDATE users SET name=?, bio=?, website=?, location=?, updated_at=?
    WHERE id=?
  `).run(name, bio||'', website||'', location||'', Date.now(), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const { password, ...safe } = user;
  res.json({ user: safe });
};

// POST /api/users/me/avatar
exports.uploadAvatar = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/avatars/${req.file.filename}`;
  const old = db.prepare('SELECT avatar FROM users WHERE id=?').get(req.user.id)?.avatar;
  if (old && old.startsWith('/uploads/')) {
    const p = path.join(__dirname, '../', old);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  db.prepare('UPDATE users SET avatar=? WHERE id=?').run(url, req.user.id);
  res.json({ avatar: url });
};

// POST /api/users/me/cover
exports.uploadCover = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/covers/${req.file.filename}`;
  db.prepare('UPDATE users SET cover_photo=? WHERE id=?').run(url, req.user.id);
  res.json({ cover_photo: url });
};

// POST /api/users/:id/follow
exports.toggleFollow = (req, res) => {
  const targetId  = parseInt(req.params.id);
  const followerId = req.user.id;
  if (targetId === followerId) return res.status(400).json({ error: 'Cannot follow yourself' });
  const target = db.prepare('SELECT id FROM users WHERE id=?').get(targetId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(followerId, targetId);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(followerId, targetId);
    return res.json({ following: false });
  }
  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?,?)').run(followerId, targetId);
  // Notify
  db.prepare(`INSERT INTO notifications (to_user_id, from_user_id, type, message) VALUES (?,?,?,?)`).run(
    targetId, followerId, 'follow', 'started following you'
  );
  res.json({ following: true });
};

// GET /api/users/:id/followers
exports.getFollowers = (req, res) => {
  const userId = parseInt(req.params.id);
  const users = db.prepare(`
    SELECT u.id, u.uuid, u.username, u.name, u.avatar, u.color, u.bio, u.is_verified
    FROM follows f JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT 100
  `).all(userId).map(u => ({
    ...u,
    is_following: req.user ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, u.id) : false
  }));
  res.json({ users });
};

// GET /api/users/:id/following
exports.getFollowing = (req, res) => {
  const userId = parseInt(req.params.id);
  const users = db.prepare(`
    SELECT u.id, u.uuid, u.username, u.name, u.avatar, u.color, u.bio, u.is_verified
    FROM follows f JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100
  `).all(userId).map(u => ({
    ...u,
    is_following: req.user ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, u.id) : false
  }));
  res.json({ users });
};

// GET /api/users/suggested
exports.getSuggested = (req, res) => {
  const uid = req.user.id;
  const users = db.prepare(`
    SELECT u.id, u.uuid, u.username, u.name, u.avatar, u.color, u.bio, u.is_verified
    FROM users u
    WHERE u.id != ? AND u.id NOT IN (
      SELECT following_id FROM follows WHERE follower_id = ?
    )
    ORDER BY (
      SELECT COUNT(*) FROM follows WHERE following_id = u.id
    ) DESC LIMIT 8
  `).all(uid, uid);
  res.json({ users });
};

// GET /api/users/search?q=
exports.search = (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const users = db.prepare(`
    SELECT id, uuid, username, name, avatar, color, bio, is_verified
    FROM users WHERE (name LIKE ? OR username LIKE ?) AND id != ?
    LIMIT 20
  `).all(q, q, req.user?.id || 0).map(u => ({
    ...u,
    is_following: req.user ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, u.id) : false
  }));
  res.json({ users });
};
