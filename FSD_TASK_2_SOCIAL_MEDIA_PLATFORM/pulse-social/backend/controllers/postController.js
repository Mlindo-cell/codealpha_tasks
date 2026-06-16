const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

function hydratePost(post, viewerId) {
  if (!post) return null;
  post.author    = db.prepare('SELECT id, uuid, username, name, avatar, color, is_verified FROM users WHERE id=?').get(post.user_id);
  post.is_liked  = viewerId ? !!db.prepare('SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?').get(viewerId, post.id) : false;
  post.is_bookmarked = viewerId ? !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id=? AND post_id=?').get(viewerId, post.id) : false;
  post.is_reposted   = viewerId ? !!db.prepare('SELECT 1 FROM posts WHERE user_id=? AND repost_of_id=?').get(viewerId, post.id) : false;
  if (post.repost_of_id) {
    const orig = db.prepare('SELECT * FROM posts WHERE id=?').get(post.repost_of_id);
    if (orig) {
      post.repost_of = hydratePost(orig, viewerId);
    }
  }
  if (post.reply_to_id) {
    post.reply_to = db.prepare(`
      SELECT p.id, p.content, u.username, u.name FROM posts p
      JOIN users u ON p.user_id = u.id WHERE p.id=?
    `).get(post.reply_to_id);
  }
  // Extract hashtags
  post.hashtags = db.prepare(`
    SELECT h.tag FROM hashtags h
    JOIN post_hashtags ph ON h.id = ph.hashtag_id WHERE ph.post_id=?
  `).all(post.id).map(h => h.tag);
  return post;
}

function extractHashtags(content) {
  const matches = content.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map(t => t.slice(1).toLowerCase()))];
}

function saveHashtags(postId, content) {
  const tags = extractHashtags(content);
  for (const tag of tags) {
    let ht = db.prepare('SELECT id FROM hashtags WHERE tag=?').get(tag);
    if (!ht) {
      const r = db.prepare('INSERT INTO hashtags (tag, post_count) VALUES (?,1)').run(tag);
      ht = { id: r.lastInsertRowid };
    } else {
      db.prepare('UPDATE hashtags SET post_count = post_count + 1 WHERE id=?').run(ht.id);
    }
    db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?,?)').run(postId, ht.id);
  }
}

// GET /api/posts/feed
exports.getFeed = (req, res) => {
  const uid    = req.user.id;
  const page   = parseInt(req.query.page) || 1;
  const limit  = 20;
  const offset = (page - 1) * limit;
  const posts  = db.prepare(`
    SELECT * FROM posts
    WHERE (user_id = ? OR user_id IN (SELECT following_id FROM follows WHERE follower_id=?))
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(uid, uid, limit, offset).map(p => hydratePost(p, uid));
  res.json({ posts, page, hasMore: posts.length === limit });
};

// GET /api/posts/explore
exports.getExplore = (req, res) => {
  const uid    = req.user?.id;
  const page   = parseInt(req.query.page) || 1;
  const limit  = 20;
  const offset = (page - 1) * limit;
  const posts  = db.prepare(`
    SELECT * FROM posts ORDER BY (like_count * 2 + comment_count + view_count) DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset).map(p => hydratePost(p, uid));
  res.json({ posts, page, hasMore: posts.length === limit });
};

// GET /api/posts/hashtag/:tag
exports.getByHashtag = (req, res) => {
  const uid  = req.user?.id;
  const tag  = req.params.tag.toLowerCase();
  const posts = db.prepare(`
    SELECT p.* FROM posts p
    JOIN post_hashtags ph ON p.id = ph.post_id
    JOIN hashtags h ON ph.hashtag_id = h.id
    WHERE h.tag = ? ORDER BY p.created_at DESC LIMIT 30
  `).all(tag).map(p => hydratePost(p, uid));
  res.json({ posts, tag });
};

// GET /api/posts/user/:userId
exports.getUserPosts = (req, res) => {
  const uid    = req.user?.id;
  const page   = parseInt(req.query.page) || 1;
  const limit  = 20;
  const offset = (page - 1) * limit;
  const posts  = db.prepare(`
    SELECT * FROM posts WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(req.params.userId, limit, offset).map(p => hydratePost(p, uid));
  res.json({ posts, page, hasMore: posts.length === limit });
};

// GET /api/posts/user/:userId/liked
exports.getUserLiked = (req, res) => {
  const uid   = req.user?.id;
  const posts = db.prepare(`
    SELECT p.* FROM posts p
    JOIN post_likes pl ON p.id = pl.post_id
    WHERE pl.user_id = ? ORDER BY pl.created_at DESC LIMIT 30
  `).all(req.params.userId).map(p => hydratePost(p, uid));
  res.json({ posts });
};

// GET /api/posts/bookmarks
exports.getBookmarks = (req, res) => {
  const uid   = req.user.id;
  const posts = db.prepare(`
    SELECT p.* FROM posts p
    JOIN bookmarks b ON p.id = b.post_id
    WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 30
  `).all(uid).map(p => hydratePost(p, uid));
  res.json({ posts });
};

// GET /api/posts/:id
exports.getPost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=? OR uuid=?').get(req.params.id, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  db.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id=?').run(post.id);
  res.json({ post: hydratePost(post, req.user?.id) });
};

// POST /api/posts
exports.createPost = (req, res) => {
  const { content, reply_to_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  if (content.length > 500) return res.status(400).json({ error: 'Max 500 characters' });

  const uuid = uuidv4();
  const media = req.file ? `/uploads/posts/${req.file.filename}` : null;
  const mediaType = req.file ? req.file.mimetype.split('/')[0] : null;

  const result = db.prepare(`
    INSERT INTO posts (uuid, user_id, content, media, media_type, reply_to_id)
    VALUES (?,?,?,?,?,?)
  `).run(uuid, req.user.id, content.trim(), media, mediaType, reply_to_id || null);

  if (reply_to_id) {
    db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id=?').run(reply_to_id);
    const parent = db.prepare('SELECT user_id FROM posts WHERE id=?').get(reply_to_id);
    if (parent && parent.user_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (to_user_id, from_user_id, type, post_id, message) VALUES (?,?,?,?,?)').run(
        parent.user_id, req.user.id, 'reply', reply_to_id, 'replied to your post'
      );
    }
  }

  saveHashtags(result.lastInsertRowid, content);
  db.prepare('UPDATE users SET post_count = post_count + 1 WHERE id=?').run(req.user.id);

  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json({ post: hydratePost(post, req.user.id) });
};

// POST /api/posts/:id/repost
exports.repost = (req, res) => {
  const origPost = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!origPost) return res.status(404).json({ error: 'Post not found' });

  const existing = db.prepare('SELECT id FROM posts WHERE user_id=? AND repost_of_id=?').get(req.user.id, origPost.id);
  if (existing) {
    db.prepare('DELETE FROM posts WHERE id=?').run(existing.id);
    db.prepare('UPDATE posts SET repost_count = MAX(0, repost_count - 1) WHERE id=?').run(origPost.id);
    return res.json({ reposted: false });
  }

  const uuid   = uuidv4();
  const result = db.prepare(`
    INSERT INTO posts (uuid, user_id, content, repost_of_id)
    VALUES (?,?,?,?)
  `).run(uuid, req.user.id, origPost.content, origPost.id);
  db.prepare('UPDATE posts SET repost_count = repost_count + 1 WHERE id=?').run(origPost.id);

  if (origPost.user_id !== req.user.id) {
    db.prepare('INSERT INTO notifications (to_user_id, from_user_id, type, post_id, message) VALUES (?,?,?,?,?)').run(
      origPost.user_id, req.user.id, 'repost', origPost.id, 'reposted your post'
    );
  }
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(result.lastInsertRowid);
  res.json({ reposted: true, post: hydratePost(post, req.user.id) });
};

// PUT /api/posts/:id
exports.updatePost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  db.prepare('UPDATE posts SET content=?, is_edited=1, updated_at=? WHERE id=?').run(content.trim(), Date.now(), post.id);
  const updated = db.prepare('SELECT * FROM posts WHERE id=?').get(post.id);
  res.json({ post: hydratePost(updated, req.user.id) });
};

// DELETE /api/posts/:id
exports.deletePost = (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM posts WHERE id=?').run(post.id);
  db.prepare('UPDATE users SET post_count = MAX(0, post_count - 1) WHERE id=?').run(req.user.id);
  res.json({ ok: true });
};

// POST /api/posts/:id/like
exports.toggleLike = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;
  const post   = db.prepare('SELECT * FROM posts WHERE id=?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const exists = db.prepare('SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?').get(userId, postId);
  if (exists) {
    db.prepare('DELETE FROM post_likes WHERE user_id=? AND post_id=?').run(userId, postId);
    db.prepare('UPDATE posts SET like_count = MAX(0, like_count - 1) WHERE id=?').run(postId);
    const count = db.prepare('SELECT like_count FROM posts WHERE id=?').get(postId).like_count;
    return res.json({ liked: false, like_count: count });
  }
  db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?,?)').run(userId, postId);
  db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id=?').run(postId);
  if (post.user_id !== userId) {
    db.prepare('INSERT INTO notifications (to_user_id, from_user_id, type, post_id, message) VALUES (?,?,?,?,?)').run(
      post.user_id, userId, 'like', postId, 'liked your post'
    );
  }
  const count = db.prepare('SELECT like_count FROM posts WHERE id=?').get(postId).like_count;
  res.json({ liked: true, like_count: count });
};

// POST /api/posts/:id/bookmark
exports.toggleBookmark = (req, res) => {
  const postId = parseInt(req.params.id);
  const userId = req.user.id;
  const exists = db.prepare('SELECT 1 FROM bookmarks WHERE user_id=? AND post_id=?').get(userId, postId);
  if (exists) {
    db.prepare('DELETE FROM bookmarks WHERE user_id=? AND post_id=?').run(userId, postId);
    return res.json({ bookmarked: false });
  }
  db.prepare('INSERT INTO bookmarks (user_id, post_id) VALUES (?,?)').run(userId, postId);
  res.json({ bookmarked: true });
};

// GET /api/posts/:id/comments
exports.getComments = (req, res) => {
  const uid      = req.user?.id;
  const comments = db.prepare(`
    SELECT c.*, u.username, u.name, u.avatar, u.color, u.is_verified
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ? AND c.parent_id IS NULL
    ORDER BY c.created_at ASC LIMIT 50
  `).all(req.params.id).map(c => ({
    ...c,
    is_liked: uid ? !!db.prepare('SELECT 1 FROM comment_likes WHERE user_id=? AND comment_id=?').get(uid, c.id) : false,
    replies: db.prepare(`
      SELECT c2.*, u.username, u.name, u.avatar, u.color FROM comments c2
      JOIN users u ON c2.user_id = u.id WHERE c2.parent_id=? ORDER BY c2.created_at ASC
    `).all(c.id)
  }));
  res.json({ comments });
};

// POST /api/posts/:id/comments
exports.addComment = (req, res) => {
  const postId    = parseInt(req.params.id);
  const { content, parent_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const uuid   = uuidv4();
  const result = db.prepare(`
    INSERT INTO comments (uuid, post_id, user_id, content, parent_id) VALUES (?,?,?,?,?)
  `).run(uuid, postId, req.user.id, content.trim(), parent_id || null);

  if (!parent_id) {
    db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id=?').run(postId);
  }
  if (post.user_id !== req.user.id) {
    db.prepare('INSERT INTO notifications (to_user_id, from_user_id, type, post_id, comment_id, message) VALUES (?,?,?,?,?,?)').run(
      post.user_id, req.user.id, 'comment', postId, result.lastInsertRowid, 'commented on your post'
    );
  }
  const comment = db.prepare(`
    SELECT c.*, u.username, u.name, u.avatar, u.color, u.is_verified
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id=?
  `).get(result.lastInsertRowid);
  res.status(201).json({ comment: { ...comment, replies: [], is_liked: false } });
};

// POST /api/posts/comments/:id/like
exports.toggleCommentLike = (req, res) => {
  const commentId = parseInt(req.params.id);
  const userId    = req.user.id;
  const exists    = db.prepare('SELECT 1 FROM comment_likes WHERE user_id=? AND comment_id=?').get(userId, commentId);
  if (exists) {
    db.prepare('DELETE FROM comment_likes WHERE user_id=? AND comment_id=?').run(userId, commentId);
    db.prepare('UPDATE comments SET like_count = MAX(0, like_count - 1) WHERE id=?').run(commentId);
    return res.json({ liked: false });
  }
  db.prepare('INSERT INTO comment_likes (user_id, comment_id) VALUES (?,?)').run(userId, commentId);
  db.prepare('UPDATE comments SET like_count = like_count + 1 WHERE id=?').run(commentId);
  res.json({ liked: true });
};

// GET /api/posts/trending/hashtags
exports.getTrendingHashtags = (req, res) => {
  const tags = db.prepare('SELECT tag, post_count FROM hashtags ORDER BY post_count DESC LIMIT 10').all();
  res.json({ hashtags: tags });
};

// GET /api/posts/search?q=
exports.search = (req, res) => {
  const q     = `%${req.query.q || ''}%`;
  const uid   = req.user?.id;
  const posts = db.prepare('SELECT * FROM posts WHERE content LIKE ? ORDER BY created_at DESC LIMIT 20').all(q).map(p => hydratePost(p, uid));
  res.json({ posts });
};
