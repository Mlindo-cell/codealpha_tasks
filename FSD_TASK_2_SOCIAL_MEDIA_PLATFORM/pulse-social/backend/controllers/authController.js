const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db     = require('../config/database');

const safeUser = u => {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, username, email, password, bio = '' } = req.body;
    if (!name || !username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (username.length < 3 || username.length > 30)
      return res.status(400).json({ error: 'Username must be 3–30 characters' });
    if (!/^[a-zA-Z0-9_]+$/.test(username))
      return res.status(400).json({ error: 'Username can only contain letters, numbers and underscores' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username))
      return res.status(409).json({ error: 'Username already taken' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email))
      return res.status(409).json({ error: 'Email already registered' });

    const hash  = await bcrypt.hash(password, 12);
    const color = db.prepare('SELECT COUNT(*) as c FROM users').get().c % 6;
    const uuid  = uuidv4();
    const result = db.prepare(`
      INSERT INTO users (uuid, username, email, name, bio, password, color)
      VALUES (?,?,?,?,?,?,?)
    `).run(uuid, username.toLowerCase(), email.toLowerCase(), name, bio, hash, color);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    req.session.userId = user.id;
    res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password)
      return res.status(400).json({ error: 'Login and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?')
                   .get(login.toLowerCase(), login.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
};

// GET /api/auth/me
exports.me = (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: safeUser(user) });
};
