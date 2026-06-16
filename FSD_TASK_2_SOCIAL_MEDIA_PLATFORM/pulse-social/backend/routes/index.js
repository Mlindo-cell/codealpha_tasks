const router  = require('express').Router();
const auth    = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const authCtrl  = require('../controllers/authController');
const userCtrl  = require('../controllers/userController');
const postCtrl  = require('../controllers/postController');
const notifCtrl = require('../controllers/notifController');

// ── AUTH ──────────────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login',    authCtrl.login);
router.post('/auth/logout',   authCtrl.logout);
router.get('/auth/me',        auth.requireAuth, authCtrl.me);

// ── USERS ─────────────────────────────────────────────────────────────────────
router.get('/users/suggested',    auth.requireAuth, userCtrl.getSuggested);
router.get('/users/search',       auth.optionalAuth, userCtrl.search);
router.get('/users/:username',    auth.optionalAuth, userCtrl.getProfile);
router.put('/users/me',           auth.requireAuth, userCtrl.updateProfile);
router.post('/users/me/avatar',   auth.requireAuth, (req,res,next)=>{ req.uploadType='avatars'; next(); }, upload.single('avatar'), userCtrl.uploadAvatar);
router.post('/users/me/cover',    auth.requireAuth, (req,res,next)=>{ req.uploadType='covers'; next(); },  upload.single('cover'),  userCtrl.uploadCover);
router.post('/users/:id/follow',  auth.requireAuth, userCtrl.toggleFollow);
router.get('/users/:id/followers',auth.optionalAuth, userCtrl.getFollowers);
router.get('/users/:id/following',auth.optionalAuth, userCtrl.getFollowing);

// ── POSTS ─────────────────────────────────────────────────────────────────────
router.get('/posts/feed',          auth.requireAuth, postCtrl.getFeed);
router.get('/posts/explore',       auth.optionalAuth, postCtrl.getExplore);
router.get('/posts/bookmarks',     auth.requireAuth, postCtrl.getBookmarks);
router.get('/posts/search',        auth.optionalAuth, postCtrl.search);
router.get('/posts/trending',      postCtrl.getTrendingHashtags);
router.get('/posts/hashtag/:tag',  auth.optionalAuth, postCtrl.getByHashtag);
router.get('/posts/user/:userId',  auth.optionalAuth, postCtrl.getUserPosts);
router.get('/posts/user/:userId/liked', auth.optionalAuth, postCtrl.getUserLiked);
router.get('/posts/:id',           auth.optionalAuth, postCtrl.getPost);
router.post('/posts',              auth.requireAuth, (req,res,next)=>{ req.uploadType='posts'; next(); }, upload.single('media'), postCtrl.createPost);
router.post('/posts/:id/repost',   auth.requireAuth, postCtrl.repost);
router.put('/posts/:id',           auth.requireAuth, postCtrl.updatePost);
router.delete('/posts/:id',        auth.requireAuth, postCtrl.deletePost);
router.post('/posts/:id/like',     auth.requireAuth, postCtrl.toggleLike);
router.post('/posts/:id/bookmark', auth.requireAuth, postCtrl.toggleBookmark);
router.get('/posts/:id/comments',  auth.optionalAuth, postCtrl.getComments);
router.post('/posts/:id/comments', auth.requireAuth, postCtrl.addComment);
router.post('/comments/:id/like',  auth.requireAuth, postCtrl.toggleCommentLike);

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
router.get('/notifications',          auth.requireAuth, notifCtrl.getNotifications);
router.get('/notifications/unread',   auth.requireAuth, notifCtrl.getUnreadCount);
router.post('/notifications/read-all',auth.requireAuth, notifCtrl.markAllRead);
router.patch('/notifications/:id',    auth.requireAuth, notifCtrl.markRead);
router.delete('/notifications/:id',   auth.requireAuth, notifCtrl.deleteNotification);

// ── MESSAGES ──────────────────────────────────────────────────────────────────
router.get('/messages',               auth.requireAuth, notifCtrl.getConversations);
router.get('/messages/:id',           auth.requireAuth, notifCtrl.getMessages);
router.post('/messages',              auth.requireAuth, notifCtrl.sendMessage);

// ── HEALTH ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

module.exports = router;
