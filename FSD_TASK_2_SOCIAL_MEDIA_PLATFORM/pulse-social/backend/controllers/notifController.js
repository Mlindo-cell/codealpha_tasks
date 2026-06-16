const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

exports.getNotifications = (req, res) => {
  const uid = req.user.id;
  const notifs = db.prepare(`
    SELECT n.*, u.username, u.name, u.avatar, u.color, u.is_verified
    FROM notifications n JOIN users u ON n.from_user_id = u.id
    WHERE n.to_user_id = ? ORDER BY n.created_at DESC LIMIT 50
  `).all(uid);
  res.json({ notifications: notifs });
};

exports.getUnreadCount = (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE to_user_id=? AND is_read=0').get(req.user.id).c;
  res.json({ count });
};

exports.markAllRead = (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE to_user_id=?').run(req.user.id);
  res.json({ ok: true });
};

exports.markRead = (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND to_user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
};

exports.deleteNotification = (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id=? AND to_user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
};

// ── MESSAGES ──────────────────────────────────────────────────────────────────

exports.getConversations = (req, res) => {
  const uid  = req.user.id;
  const convs = db.prepare(`
    SELECT c.*, cm.last_read_at,
      (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.created_at > cm.last_read_at) as unread_count,
      (SELECT m2.content FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.created_at DESC LIMIT 1) as last_message,
      (SELECT m2.created_at FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY m2.created_at DESC LIMIT 1) as last_message_at
    FROM conversations c
    JOIN conversation_members cm ON c.id = cm.conversation_id
    WHERE cm.user_id = ? ORDER BY last_message_at DESC
  `).all(uid, uid).map(conv => {
    conv.members = db.prepare(`
      SELECT u.id, u.username, u.name, u.avatar, u.color FROM users u
      JOIN conversation_members cm ON u.id = cm.user_id
      WHERE cm.conversation_id = ? AND u.id != ?
    `).all(conv.id, uid);
    return conv;
  });
  res.json({ conversations: convs });
};

exports.getMessages = (req, res) => {
  const uid    = req.user.id;
  const convId = req.params.id;
  const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?').get(convId, uid);
  if (!member) return res.status(403).json({ error: 'Access denied' });

  const messages = db.prepare(`
    SELECT m.*, u.username, u.name, u.avatar, u.color
    FROM messages m JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? ORDER BY m.created_at ASC LIMIT 100
  `).all(convId);

  db.prepare('UPDATE conversation_members SET last_read_at=? WHERE conversation_id=? AND user_id=?').run(Date.now(), convId, uid);
  res.json({ messages });
};

exports.sendMessage = (req, res) => {
  const uid     = req.user.id;
  const { to_user_id, content, conversation_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  let convId = conversation_id;
  if (!convId) {
    if (!to_user_id) return res.status(400).json({ error: 'to_user_id or conversation_id required' });
    const existing = db.prepare(`
      SELECT cm1.conversation_id FROM conversation_members cm1
      JOIN conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
      WHERE cm1.user_id=? AND cm2.user_id=?
    `).get(uid, to_user_id);
    if (existing) {
      convId = existing.conversation_id;
    } else {
      const uuid = uuidv4();
      const r    = db.prepare('INSERT INTO conversations (uuid) VALUES (?)').run(uuid);
      convId     = r.lastInsertRowid;
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?)').run(convId, uid);
      db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?)').run(convId, to_user_id);
    }
  }

  const uuid   = uuidv4();
  const result = db.prepare('INSERT INTO messages (uuid, conversation_id, sender_id, content) VALUES (?,?,?,?)').run(uuid, convId, uid, content.trim());
  const message = db.prepare(`
    SELECT m.*, u.username, u.name, u.avatar, u.color
    FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id=?
  `).get(result.lastInsertRowid);

  db.prepare('INSERT INTO notifications (to_user_id, from_user_id, type, message) VALUES (?,?,?,?)').run(
    to_user_id || 0, uid, 'message', 'sent you a message'
  );
  res.status(201).json({ message, conversation_id: convId });
};
