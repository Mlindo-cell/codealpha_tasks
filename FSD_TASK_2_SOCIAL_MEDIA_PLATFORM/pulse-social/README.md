# 🌍 Pulse Social — Full-Stack Social Media Platform

A production-grade social media platform built with **Node.js**, **Express.js**, **SQLite**, and vanilla **HTML/CSS/JavaScript**.

---

## 🚀 Quick Start

### Requirements
- Node.js v18+ → https://nodejs.org

### 1. Install
```bash
cd pulse-social
npm install
```

### 2. Seed demo data
```bash
npm run seed
```

### 3. Start server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 4. Open
```
http://localhost:3000
```

---

## 👤 Demo Accounts

All accounts use password: **`password123`**

| Username | Name          | Role         |
|----------|---------------|--------------|
| alex     | Alex Rivera   | ✓ Verified   |
| morgan   | Morgan Cole   | Developer    |
| jordan   | Jordan Kim    | Photographer |
| sam      | Sam Taylor    | Music        |
| casey    | Casey Zhang   | AI Research  |
| riley    | Riley Johnson | Startup      |

---

## ✨ Full Feature List

### Authentication
- Register with name, username, email, bio, password
- Login with username or email
- Secure sessions (7-day cookies)
- Password hashing with bcrypt (12 rounds)

### User Profiles
- Avatar upload with image processing
- Cover photo upload
- Display name, bio, website, location
- Follower / Following counts
- Post count
- Verified badge system
- Edit profile modal
- Profile tabs: Posts / Liked

### Posts
- Create posts (up to 500 characters)
- Image/media attachments
- Edit your own posts
- Delete your own posts
- Hashtag detection and linking (#tag)
- @mention detection
- Reply to posts (threaded)
- Repost system
- View count tracking
- Pagination (20 posts per page)

### Likes & Bookmarks
- Like / unlike posts with animated heart
- Like comments
- Bookmark / save posts
- Bookmarks page

### Comments
- Add comments on posts
- Nested replies on comments
- Like comments
- Real-time comment count update

### Follow System
- Follow / unfollow users
- Followers list modal
- Following list modal
- Suggested users (sorted by popularity)

### Feed
- Home feed (posts from people you follow + yours)
- Explore feed (trending by engagement score)
- Hashtag feed (#tag pages)
- Infinite scroll / load more
- Inline compose box on home feed

### Search
- Live search dropdown (users + posts)
- Search users by name or username
- Search posts by content

### Notifications
- Like notifications
- Comment notifications
- Follow notifications
- Repost notifications
- Reply notifications
- Unread badge counter
- Mark all as read
- Auto-polling every 30 seconds

### Direct Messages
- Conversation list
- Real-time messaging UI
- Unread message count
- Start new conversations
- Message bubbles (yours vs theirs)

### Trending
- Trending hashtags (by post count)
- Click hashtag to see all posts

### Other
- Image lightbox (click to zoom)
- Post dropdown menu (edit/delete)
- Rate limiting (100 req/min general, 10 req/min auth)
- Helmet security headers
- Responsive design (mobile, tablet, desktop)
- Dark theme throughout

---

## 🗂 Project Structure

```
pulse-social/
├── backend/
│   ├── server.js                  ← Express app, middleware, startup
│   ├── config/
│   │   └── database.js            ← SQLite schema (8 tables), indexes
│   ├── controllers/
│   │   ├── authController.js      ← register, login, logout, me
│   │   ├── userController.js      ← profile, follow, search, upload
│   │   ├── postController.js      ← CRUD, feed, like, bookmark, repost, comments
│   │   └── notifController.js     ← notifications + messages
│   ├── middleware/
│   │   ├── auth.js                ← requireAuth, optionalAuth
│   │   └── upload.js              ← Multer file upload config
│   ├── routes/
│   │   └── index.js               ← All 35+ API routes
│   ├── utils/
│   │   └── seed.js                ← Demo data seeder
│   └── uploads/
│       ├── avatars/               ← User profile photos
│       ├── covers/                ← Cover photos
│       └── posts/                 ← Post media
├── frontend/
│   └── public/
│       ├── index.html             ← SPA shell
│       ├── css/
│       │   ├── main.css           ← Layout, auth, typography, responsive
│       │   └── components.css     ← Post cards, comments, modals, buttons
│       └── js/
│           ├── api.js             ← All fetch calls to backend
│           ├── utils.js           ← Helpers: escHtml, timeAgo, avatarHtml
│           ├── components.js      ← HTML component builders
│           ├── router.js          ← SPA page router
│           └── app.js             ← Main controller: events, pages, state
├── data/                          ← Auto-created: pulse.db + sessions.db
├── .env                           ← Environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint             | Description        |
|--------|----------------------|--------------------|
| POST   | /api/auth/register   | Create account     |
| POST   | /api/auth/login      | Login              |
| POST   | /api/auth/logout     | Logout             |
| GET    | /api/auth/me         | Current user       |

### Users
| Method | Endpoint                    | Description          |
|--------|-----------------------------|----------------------|
| GET    | /api/users/suggested        | Suggested to follow  |
| GET    | /api/users/search?q=        | Search users         |
| GET    | /api/users/:username        | Get profile          |
| PUT    | /api/users/me               | Update profile       |
| POST   | /api/users/me/avatar        | Upload avatar        |
| POST   | /api/users/me/cover         | Upload cover photo   |
| POST   | /api/users/:id/follow       | Toggle follow        |
| GET    | /api/users/:id/followers    | Get followers        |
| GET    | /api/users/:id/following    | Get following        |

### Posts
| Method | Endpoint                       | Description          |
|--------|--------------------------------|----------------------|
| GET    | /api/posts/feed                | Home feed            |
| GET    | /api/posts/explore             | Explore feed         |
| GET    | /api/posts/bookmarks           | My bookmarks         |
| GET    | /api/posts/search?q=           | Search posts         |
| GET    | /api/posts/trending            | Trending hashtags    |
| GET    | /api/posts/hashtag/:tag        | Posts by hashtag     |
| GET    | /api/posts/user/:userId        | User posts           |
| GET    | /api/posts/user/:userId/liked  | User liked posts     |
| GET    | /api/posts/:id                 | Single post          |
| POST   | /api/posts                     | Create post          |
| PUT    | /api/posts/:id                 | Edit post            |
| DELETE | /api/posts/:id                 | Delete post          |
| POST   | /api/posts/:id/like            | Toggle like          |
| POST   | /api/posts/:id/bookmark        | Toggle bookmark      |
| POST   | /api/posts/:id/repost          | Toggle repost        |
| GET    | /api/posts/:id/comments        | Get comments         |
| POST   | /api/posts/:id/comments        | Add comment          |
| POST   | /api/comments/:id/like         | Like comment         |

### Notifications
| Method | Endpoint                        | Description         |
|--------|---------------------------------|---------------------|
| GET    | /api/notifications              | All notifications   |
| GET    | /api/notifications/unread       | Unread count        |
| POST   | /api/notifications/read-all     | Mark all read       |

### Messages
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| GET    | /api/messages     | All conversations    |
| GET    | /api/messages/:id | Get messages         |
| POST   | /api/messages     | Send message         |

---

## 🗄 Database Schema

```sql
users               — id, uuid, username, email, name, bio, website, location,
                      avatar, cover_photo, password, color, is_verified, is_private,
                      post_count, created_at, updated_at

posts               — id, uuid, user_id, content, media, media_type,
                      reply_to_id, repost_of_id, like_count, comment_count,
                      repost_count, view_count, is_edited, created_at

comments            — id, uuid, post_id, user_id, content, like_count,
                      parent_id, created_at

post_likes          — user_id, post_id (composite PK)
comment_likes       — user_id, comment_id (composite PK)

follows             — follower_id, following_id (composite PK), status

notifications       — id, to_user_id, from_user_id, type, post_id,
                      comment_id, message, is_read, created_at

bookmarks           — user_id, post_id (composite PK)

hashtags            — id, tag, post_count
post_hashtags       — post_id, hashtag_id

conversations       — id, uuid, created_at
conversation_members — conversation_id, user_id, last_read_at
messages            — id, uuid, conversation_id, sender_id, content,
                      is_read, created_at
```

---

## 🛠 Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Node.js + Express.js                            |
| Database   | SQLite (better-sqlite3) — WAL mode              |
| Auth       | bcryptjs + express-session + connect-sqlite3    |
| Security   | helmet + express-rate-limit                     |
| Uploads    | multer                                          |
| Frontend   | HTML5 + CSS3 (custom) + Vanilla JS (SPA)        |
| Fonts      | Google Fonts (Syne + DM Sans)                   |

---

## 🔧 Environment Variables (.env)

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=change-this-to-a-long-random-string
DB_PATH=./data/pulse.db
UPLOAD_DIR=./backend/uploads
MAX_FILE_SIZE_MB=5
APP_NAME=Pulse
APP_URL=http://localhost:3000
```

---

## 🚀 Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Change `SESSION_SECRET` to a long random string
3. Use a process manager: `npm install -g pm2 && pm2 start backend/server.js`
4. Put behind nginx reverse proxy with HTTPS
5. For scale: swap SQLite → PostgreSQL
