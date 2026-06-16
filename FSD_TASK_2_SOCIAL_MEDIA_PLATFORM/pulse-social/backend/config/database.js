require('dotenv').config();
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = path.resolve(process.env.DB_PATH || './data/pulse.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('cache_size = -10000');

db.exec(`
  -- USERS
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid         TEXT    UNIQUE NOT NULL,
    username     TEXT    UNIQUE NOT NULL COLLATE NOCASE,
    email        TEXT    UNIQUE NOT NULL COLLATE NOCASE,
    name         TEXT    NOT NULL,
    bio          TEXT    DEFAULT '',
    website      TEXT    DEFAULT '',
    location     TEXT    DEFAULT '',
    avatar       TEXT    DEFAULT NULL,
    cover_photo  TEXT    DEFAULT NULL,
    password     TEXT    NOT NULL,
    color        INTEGER DEFAULT 0,
    is_verified  INTEGER DEFAULT 0,
    is_private   INTEGER DEFAULT 0,
    post_count   INTEGER DEFAULT 0,
    created_at   INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at   INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  -- POSTS
  CREATE TABLE IF NOT EXISTS posts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid         TEXT    UNIQUE NOT NULL,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content      TEXT    NOT NULL,
    media        TEXT    DEFAULT NULL,
    media_type   TEXT    DEFAULT NULL,
    reply_to_id  INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    repost_of_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
    like_count   INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    repost_count INTEGER DEFAULT 0,
    view_count   INTEGER DEFAULT 0,
    is_edited    INTEGER DEFAULT 0,
    created_at   INTEGER DEFAULT (strftime('%s','now') * 1000),
    updated_at   INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  -- COMMENTS
  CREATE TABLE IF NOT EXISTS comments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid       TEXT    UNIQUE NOT NULL,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT    NOT NULL,
    like_count INTEGER DEFAULT 0,
    parent_id  INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  -- LIKES (posts)
  CREATE TABLE IF NOT EXISTS post_likes (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, post_id)
  );

  -- LIKES (comments)
  CREATE TABLE IF NOT EXISTS comment_likes (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, comment_id)
  );

  -- FOLLOWS
  CREATE TABLE IF NOT EXISTS follows (
    follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT    DEFAULT 'active',
    created_at   INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (follower_id, following_id)
  );

  -- NOTIFICATIONS
  CREATE TABLE IF NOT EXISTS notifications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    to_user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT    NOT NULL,
    post_id      INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    comment_id   INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    message      TEXT    DEFAULT '',
    is_read      INTEGER DEFAULT 0,
    created_at   INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  -- BOOKMARKS
  CREATE TABLE IF NOT EXISTS bookmarks (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000),
    PRIMARY KEY (user_id, post_id)
  );

  -- HASHTAGS
  CREATE TABLE IF NOT EXISTS hashtags (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tag        TEXT UNIQUE NOT NULL,
    post_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id INTEGER NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
  );

  -- DIRECT MESSAGES
  CREATE TABLE IF NOT EXISTS conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid       TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at    INTEGER DEFAULT 0,
    PRIMARY KEY (conversation_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid            TEXT UNIQUE NOT NULL,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content         TEXT    NOT NULL,
    is_read         INTEGER DEFAULT 0,
    created_at      INTEGER DEFAULT (strftime('%s','now') * 1000)
  );

  -- INDEXES
  CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON posts(user_id);
  CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
  CREATE INDEX IF NOT EXISTS idx_notifs_to_user   ON notifications(to_user_id, is_read);
  CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
  CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
  CREATE INDEX IF NOT EXISTS idx_messages_conv    ON messages(conversation_id);
`);

module.exports = db;
