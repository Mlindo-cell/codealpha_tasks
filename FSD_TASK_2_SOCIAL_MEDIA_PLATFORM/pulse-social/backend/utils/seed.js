require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');

async function seed() {
  console.log('🌱 Seeding database...');
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) { console.log('✅ Already seeded. Skipping.'); return; }

  const hash = await bcrypt.hash('password123', 12);
  const now  = Date.now();

  const users = [
    { name: 'Alex Rivera',   username: 'alex',   email: 'alex@pulse.app',   bio: 'Designer & dreamer. Building beautiful things 🎨', color: 0 },
    { name: 'Morgan Cole',   username: 'morgan', email: 'morgan@pulse.app', bio: 'Full-stack dev. Coffee → Code → Repeat ☕',        color: 1 },
    { name: 'Jordan Kim',    username: 'jordan', email: 'jordan@pulse.app', bio: 'Photographer & traveler. Always chasing light 📷', color: 2 },
    { name: 'Sam Taylor',    username: 'sam',    email: 'sam@pulse.app',    bio: 'Music producer. Beats & vibes 🎵',                 color: 3 },
    { name: 'Casey Zhang',   username: 'casey',  email: 'casey@pulse.app',  bio: 'ML researcher. Teaching machines to dream 🤖',     color: 4 },
    { name: 'Riley Johnson', username: 'riley',  email: 'riley@pulse.app',  bio: 'Startup founder. Building the future 🚀',          color: 5 },
  ];

  const userIds = {};
  for (const u of users) {
    const r = db.prepare('INSERT INTO users (uuid,username,email,name,bio,password,color,is_verified) VALUES (?,?,?,?,?,?,?,?)')
                .run(uuidv4(), u.username, u.email, u.name, u.bio, hash, u.color, u.username === 'alex' ? 1 : 0);
    userIds[u.username] = r.lastInsertRowid;
  }

  const posts = [
    { userId: userIds.morgan, content: 'Just shipped a new feature that took 3 weeks to build. The PR diff was 1200 lines and I feel both proud and terrified 😅 #webdev #coding', at: now - 3600000 * 2 },
    { userId: userIds.jordan, content: 'Golden hour in the mountains today was absolutely surreal. Nature never disappoints 🏔️✨ #photography #travel', at: now - 3600000 * 5 },
    { userId: userIds.sam,    content: "New track dropping Friday. Been working on this one for months. Can't wait for you all to hear it 🎶 #music #producer", at: now - 3600000 * 8 },
    { userId: userIds.casey,  content: 'Fascinating paper out today on emergent reasoning in LLMs. The implications for agent systems are wild — thread coming soon 🧵 #ai #machinelearning', at: now - 3600000 * 12 },
    { userId: userIds.alex,   content: "Design principle I keep coming back to: if you have to explain it, it's not working yet. Simplicity is the hardest thing to achieve. #design #ux", at: now - 3600000 * 20 },
    { userId: userIds.riley,  content: 'Just closed our seed round! 18 months of grinding, 200+ investor meetings, and countless rejections. Worth every second 🙌 #startup #entrepreneurship', at: now - 3600000 * 28 },
    { userId: userIds.morgan, content: 'Hot take: most software bugs are actually communication bugs. The code does exactly what we told it to. #softwareengineering', at: now - 86400000 },
    { userId: userIds.alex,   content: 'Color theory is the most underrated skill in UI design. You can fix 80% of a bad design just by sorting out the palette. #design #ui', at: now - 86400000 * 2 },
  ];

  const postIds = [];
  for (const p of posts) {
    const r = db.prepare('INSERT INTO posts (uuid, user_id, content, created_at) VALUES (?,?,?,?)').run(uuidv4(), p.userId, p.content, p.at);
    postIds.push(r.lastInsertRowid);

    const tags = (p.content.match(/#[a-zA-Z0-9_]+/g) || []).map(t => t.slice(1).toLowerCase());
    for (const tag of tags) {
      let ht = db.prepare('SELECT id FROM hashtags WHERE tag=?').get(tag);
      if (!ht) { const r2 = db.prepare('INSERT INTO hashtags (tag, post_count) VALUES (?,1)').run(tag); ht = { id: r2.lastInsertRowid }; }
      else db.prepare('UPDATE hashtags SET post_count=post_count+1 WHERE id=?').run(ht.id);
      db.prepare('INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?,?)').run(r.lastInsertRowid, ht.id);
    }
  }

  const likes = [
    [userIds.alex, postIds[0]], [userIds.alex, postIds[1]], [userIds.alex, postIds[3]],
    [userIds.morgan, postIds[1]], [userIds.morgan, postIds[4]], [userIds.morgan, postIds[5]],
    [userIds.jordan, postIds[0]], [userIds.jordan, postIds[3]], [userIds.jordan, postIds[6]],
    [userIds.sam, postIds[4]], [userIds.sam, postIds[0]], [userIds.casey, postIds[1]],
    [userIds.casey, postIds[2]], [userIds.riley, postIds[3]], [userIds.riley, postIds[4]],
  ];
  for (const [uid, pid] of likes) {
    db.prepare('INSERT OR IGNORE INTO post_likes (user_id, post_id) VALUES (?,?)').run(uid, pid);
    db.prepare('UPDATE posts SET like_count = like_count + 1 WHERE id=?').run(pid);
  }

  const follows = [
    [userIds.alex, userIds.morgan], [userIds.alex, userIds.jordan], [userIds.alex, userIds.casey],
    [userIds.morgan, userIds.alex], [userIds.morgan, userIds.casey], [userIds.morgan, userIds.riley],
    [userIds.jordan, userIds.alex], [userIds.jordan, userIds.sam],
    [userIds.sam, userIds.jordan], [userIds.sam, userIds.casey],
    [userIds.casey, userIds.alex], [userIds.casey, userIds.morgan], [userIds.casey, userIds.riley],
    [userIds.riley, userIds.morgan], [userIds.riley, userIds.casey],
  ];
  for (const [frid, fgid] of follows) {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?,?)').run(frid, fgid);
  }

  db.prepare("INSERT INTO comments (uuid, post_id, user_id, content) VALUES (?,?,?,?)").run(uuidv4(), postIds[0], userIds.alex, 'That feeling when a massive PR finally gets merged 🙌');
  db.prepare("INSERT INTO comments (uuid, post_id, user_id, content) VALUES (?,?,?,?)").run(uuidv4(), postIds[0], userIds.casey, 'Always celebrate the big refactors!');
  db.prepare("INSERT INTO comments (uuid, post_id, user_id, content) VALUES (?,?,?,?)").run(uuidv4(), postIds[3], userIds.morgan, 'Link to the paper?');
  db.prepare("UPDATE posts SET comment_count=2 WHERE id=?").run(postIds[0]);
  db.prepare("UPDATE posts SET comment_count=1 WHERE id=?").run(postIds[3]);
  db.prepare("UPDATE users SET post_count=2 WHERE username='morgan'").run();
  db.prepare("UPDATE users SET post_count=2 WHERE username='alex'").run();
  db.prepare("UPDATE users SET post_count=1 WHERE username IN ('jordan','sam','casey','riley')").run();

  console.log('✅ Seeded! Login with any of: alex / morgan / jordan / sam / casey / riley');
  console.log('   Password: password123');
}

seed().catch(console.error);
