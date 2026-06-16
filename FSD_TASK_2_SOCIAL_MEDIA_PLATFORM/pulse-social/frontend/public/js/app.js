// ── STATE ─────────────────────────────────────────────────────────────────────
const State = { currentUser: null, feedPage: 1, notifInterval: null };

// ── BOOT ──────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    const { user } = await API.me();
    State.currentUser = user;
    showApp();
  } catch {
    showAuth();
  }
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  updateTopnavAvatar();
  updateSidebarProfile();
  loadFeed();
  loadSuggested();
  loadTrending();
  pollNotifications();
  Router.show('feed');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('login-form').style.display    = tab === 'login'    ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  });
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  setError('login-error', '');
  const fd = new FormData(e.target);
  try {
    const { user } = await API.login({ login: fd.get('login'), password: fd.get('password') });
    State.currentUser = user;
    showApp();
  } catch(err) { setError('login-error', err.message); }
});

document.getElementById('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  setError('reg-error', '');
  const fd = new FormData(e.target);
  try {
    const { user } = await API.register({ name:fd.get('name'), username:fd.get('username'), email:fd.get('email'), bio:fd.get('bio'), password:fd.get('password') });
    State.currentUser = user;
    showApp();
  } catch(err) { setError('reg-error', err.message); }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await API.logout();
  State.currentUser = null;
  clearInterval(State.notifInterval);
  showAuth();
});

// ── AVATAR / SIDEBAR PROFILE ──────────────────────────────────────────────────
function updateTopnavAvatar() {
  const u  = State.currentUser;
  const el = document.getElementById('topnav-avatar');
  el.className = `topnav-avatar av-${u.color}`;
  if (u.avatar) {
    el.innerHTML = `<img src="${u.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  } else {
    el.textContent = (u.name||'?')[0].toUpperCase();
  }
  el.addEventListener('click', () => navigateProfile(u.username));
}

function updateSidebarProfile() {
  const u  = State.currentUser;
  document.getElementById('sidebar-profile').innerHTML = `
    <div class="sidebar-profile-inner" data-navigate-user="${escHtml(u.username)}">
      ${avatarHtml(u,'sm')}
      <div class="sidebar-profile-info">
        <div class="sidebar-profile-name">${escHtml(u.name)}</div>
        <div class="sidebar-profile-handle">@${escHtml(u.username)}</div>
      </div>
    </div>`;
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
document.querySelectorAll('[data-page]').forEach(el => {
  el.addEventListener('click', e => {
    const page = el.dataset.page;
    if (page === 'my-profile') { navigateProfile(State.currentUser.username); return; }
    navigate(page);
  });
});

function navigate(page) {
  Router.show(page);
  if (page === 'feed')          loadFeed(true);
  if (page === 'explore')       loadExplore();
  if (page === 'notifications') loadNotifications();
  if (page === 'bookmarks')     loadBookmarks();
  if (page === 'messages')      loadConversations();
}

function navigateProfile(username) {
  Router.show('profile');
  document.getElementById('nav-profile')?.classList.add('active');
  loadProfile(username);
}

function navigatePost(postId) {
  Router.show('post');
  loadSinglePost(postId);
}

function navigateHashtag(tag) {
  Router.show('hashtag');
  document.getElementById('hashtag-title').textContent = '#' + tag;
  loadHashtag(tag);
}

document.getElementById('post-back-btn').addEventListener('click', () => history.back() || navigate('feed'));

// ── DELEGATED EVENTS ──────────────────────────────────────────────────────────
document.body.addEventListener('click', async e => {
  const t = e.target;

  // Navigate user
  const userTrigger = t.closest('[data-navigate-user]');
  if (userTrigger && !t.closest('button')) {
    const u = userTrigger.dataset.navigateUser;
    if (u) { navigateProfile(u); return; }
  }

  // Navigate post
  if (t.closest('[data-navigate-post]') && !t.closest('button')) {
    const pid = t.closest('[data-navigate-post]').dataset.navigatePost;
    if (pid) { navigatePost(pid); return; }
  }

  // Hashtag
  const ht = t.closest('.post-hashtag');
  if (ht) { navigateHashtag(ht.dataset.tag); return; }

  // Lightbox
  const lb = t.closest('[data-lightbox]');
  if (lb) { openLightbox(lb.dataset.lightbox); return; }

  // Like post
  const likeBtn = t.closest('[data-action="like"]');
  if (likeBtn) {
    const card   = likeBtn.closest('.post-card');
    const postId = card?.dataset.postId;
    if (!postId) return;
    try {
      const { liked, like_count } = await API.likePost(postId);
      likeBtn.classList.toggle('liked', liked);
      const svg = likeBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', liked ? 'currentColor' : 'none');
      const countEl = document.querySelector(`.like-count-${postId}`);
      if (countEl) countEl.textContent = formatNum(like_count);
      if (liked) likeBtn.classList.add('like-anim');
      setTimeout(() => likeBtn.classList.remove('like-anim'), 400);
    } catch(err) { showToast(err.message); }
    return;
  }

  // Comment toggle
  const commentBtn = t.closest('[data-action="comment"]');
  if (commentBtn) {
    const card   = commentBtn.closest('.post-card');
    const postId = card?.dataset.postId;
    if (postId) toggleComments(postId);
    return;
  }

  // Repost
  const repostBtn = t.closest('[data-action="repost"]');
  if (repostBtn) {
    const card   = repostBtn.closest('.post-card');
    const postId = card?.dataset.postId;
    if (!postId) return;
    try {
      const { reposted } = await API.repost(postId);
      repostBtn.classList.toggle('reposted', reposted);
      showToast(reposted ? 'Reposted!' : 'Repost removed');
      const countEl = document.querySelector(`.repost-count-${postId}`);
      if (countEl) {
        const cur = parseInt(countEl.textContent) || 0;
        countEl.textContent = formatNum(reposted ? cur + 1 : Math.max(0, cur - 1));
      }
    } catch(err) { showToast(err.message); }
    return;
  }

  // Bookmark
  const bmBtn = t.closest('[data-action="bookmark"]');
  if (bmBtn) {
    const card   = bmBtn.closest('.post-card');
    const postId = card?.dataset.postId;
    if (!postId) return;
    try {
      const { bookmarked } = await API.bookmarkPost(postId);
      bmBtn.classList.toggle('bookmarked', bookmarked);
      const svg = bmBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', bookmarked ? 'currentColor' : 'none');
      showToast(bookmarked ? '🔖 Bookmarked!' : 'Bookmark removed');
    } catch(err) { showToast(err.message); }
    return;
  }

  // More menu (delete/edit)
  const moreBtn = t.closest('[data-action="more"]');
  if (moreBtn) {
    const card   = moreBtn.closest('.post-card');
    const postId = card?.dataset.postId;
    if (!postId) return;
    showPostMenu(moreBtn, postId, card);
    return;
  }

  // Follow toggle
  const followBtn = t.closest('[data-follow-toggle]');
  if (followBtn) {
    const uid = parseInt(followBtn.dataset.followId);
    if (!uid) return;
    try {
      const { following } = await API.followUser(uid);
      document.querySelectorAll(`[data-follow-id="${uid}"][data-follow-toggle]`).forEach(b => {
        b.textContent = following ? 'Following' : 'Follow';
        b.className   = `btn-follow ${following ? 'following' : ''}`;
      });
      showToast(following ? 'Following!' : 'Unfollowed');
      loadSuggested();
    } catch(err) { showToast(err.message); }
    return;
  }

  // Like comment
  const likeCommentBtn = t.closest('.like-comment-btn');
  if (likeCommentBtn) {
    const cid = likeCommentBtn.dataset.commentId;
    try {
      const { liked } = await API.likeComment(cid);
      likeCommentBtn.classList.toggle('liked', liked);
      const svg = likeCommentBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', liked ? 'currentColor' : 'none');
    } catch {}
    return;
  }

  // Click on post card body (navigate to post)
  const postCard = t.closest('.post-card');
  if (postCard && !t.closest('button') && !t.closest('.comments-section') && !t.closest('[data-navigate-user]') && !t.closest('.post-hashtag')) {
    const postId = postCard.dataset.postId;
    if (postId) navigatePost(postId);
  }
});

// ── FEED ──────────────────────────────────────────────────────────────────────
async function loadFeed(reset = false) {
  if (reset) State.feedPage = 1;
  const container = document.getElementById('feed-list');
  if (reset || State.feedPage === 1) container.innerHTML = loading();

  // Inline compose
  document.getElementById('inline-compose').innerHTML = `
    <div class="inline-compose-box">
      ${avatarHtml(State.currentUser,'md')}
      <div style="flex:1">
        <textarea class="inline-compose-text" id="inline-compose-text" placeholder="What's happening?" maxlength="500" rows="2"></textarea>
        <div class="inline-compose-footer">
          <label style="color:var(--accent);cursor:pointer" for="inline-media-input">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <input type="file" id="inline-media-input" accept="image/*" style="display:none">
          </label>
          <span style="font-size:12px;color:var(--text3)" id="inline-char">500</span>
          <button class="btn-primary sm" id="inline-post-btn">Post</button>
        </div>
        <div id="inline-preview"></div>
      </div>
    </div>`;
  bindInlineCompose();

  try {
    const { posts, hasMore } = await API.getFeed(State.feedPage);
    if (reset || State.feedPage === 1) container.innerHTML = '';
    if (!posts.length && State.feedPage === 1) {
      container.innerHTML = emptyState('📡', 'Your feed is empty', 'Follow some people to see their posts!');
    } else {
      container.insertAdjacentHTML('beforeend', posts.map(p => Components.postCard(p, State.currentUser.id)).join(''));
    }
    const lm = document.getElementById('feed-load-more');
    if (lm) { lm.style.display = hasMore ? 'block' : 'none'; State.feedPage++; }
  } catch(err) {
    container.innerHTML = emptyState('⚠️', 'Could not load feed', err.message);
  }
}

document.getElementById('feed-load-more')?.addEventListener('click', () => loadFeed(false));

// ── INLINE COMPOSE ────────────────────────────────────────────────────────────
let inlineMediaFile = null;

function bindInlineCompose() {
  const ta  = document.getElementById('inline-compose-text');
  const btn = document.getElementById('inline-post-btn');
  const counter = document.getElementById('inline-char');
  const fileInput = document.getElementById('inline-media-input');
  const preview   = document.getElementById('inline-preview');

  ta?.addEventListener('input', () => {
    const rem = 500 - ta.value.length;
    if (counter) counter.textContent = rem;
    if (btn) btn.disabled = ta.value.trim().length === 0;
  });

  fileInput?.addEventListener('change', () => {
    inlineMediaFile = fileInput.files[0];
    if (inlineMediaFile) {
      const url = URL.createObjectURL(inlineMediaFile);
      preview.innerHTML = `<img src="${url}" style="max-height:160px;border-radius:8px;margin-top:8px;object-fit:cover">`;
    }
  });

  btn?.addEventListener('click', async () => {
    const content = ta?.value.trim();
    if (!content) return;
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      const fd = new FormData();
      fd.append('content', content);
      if (inlineMediaFile) fd.append('media', inlineMediaFile);
      const { post } = await API.createPost(fd);
      ta.value = ''; if (counter) counter.textContent = '500';
      if (preview) preview.innerHTML = '';
      inlineMediaFile = null;
      const container = document.getElementById('feed-list');
      const empty = container.querySelector('.empty-state');
      if (empty) container.innerHTML = '';
      container.insertAdjacentHTML('afterbegin', Components.postCard(post, State.currentUser.id));
      showToast('✓ Posted!');
    } catch(err) { showToast(err.message); }
    finally { btn.disabled = false; btn.textContent = 'Post'; }
  });
}

// ── COMPOSE MODAL ─────────────────────────────────────────────────────────────
let composeMediaFile = null;

document.getElementById('compose-btn').addEventListener('click', () => {
  const av = document.getElementById('compose-modal-avatar');
  av.className = `compose-avatar av-${State.currentUser.color}`;
  av.textContent = State.currentUser.name[0].toUpperCase();
  document.getElementById('compose-text').value = '';
  document.getElementById('compose-counter').textContent = '500';
  document.getElementById('compose-preview').innerHTML = '';
  document.getElementById('compose-error').textContent = '';
  composeMediaFile = null;
  openModal('compose-modal');
  setTimeout(() => document.getElementById('compose-text').focus(), 100);
});

document.getElementById('compose-close').addEventListener('click', () => closeModal('compose-modal'));

document.getElementById('compose-text').addEventListener('input', function() {
  const rem = 500 - this.value.length;
  const counter = document.getElementById('compose-counter');
  counter.textContent = rem;
  counter.className = 'char-counter' + (rem < 0 ? ' over' : rem < 50 ? ' warn' : '');
});

document.getElementById('compose-media-input').addEventListener('change', function() {
  composeMediaFile = this.files[0];
  if (composeMediaFile) {
    const url = URL.createObjectURL(composeMediaFile);
    document.getElementById('compose-preview').innerHTML = `<img src="${url}">`;
  }
});

document.getElementById('submit-post-btn').addEventListener('click', async () => {
  const content = document.getElementById('compose-text').value.trim();
  if (!content) { setError('compose-error', 'Write something first'); return; }
  const btn = document.getElementById('submit-post-btn');
  btn.disabled = true; btn.textContent = 'Posting…';
  try {
    const fd = new FormData();
    fd.append('content', content);
    if (composeMediaFile) fd.append('media', composeMediaFile);
    const { post } = await API.createPost(fd);
    closeModal('compose-modal');
    showToast('✓ Posted!');
    if (Router.getCurrent().page === 'feed') {
      const container = document.getElementById('feed-list');
      container.insertAdjacentHTML('afterbegin', Components.postCard(post, State.currentUser.id));
    }
  } catch(err) { setError('compose-error', err.message); }
  finally { btn.disabled = false; btn.textContent = 'Post'; }
});

// ── POST MENU ─────────────────────────────────────────────────────────────────
function showPostMenu(btn, postId, card) {
  document.querySelector('.dropdown')?.remove();
  const menu = document.createElement('div');
  menu.className = 'dropdown';
  menu.style.cssText = 'position:absolute;right:0;top:100%;z-index:400';
  menu.innerHTML = `
    <div class="dropdown-item" data-action="edit-post">Edit Post</div>
    <div class="dropdown-item danger" data-action="delete-post">Delete Post</div>`;
  btn.parentNode.style.position = 'relative';
  btn.parentNode.appendChild(menu);

  menu.querySelector('[data-action="delete-post"]').addEventListener('click', async () => {
    menu.remove();
    if (!confirm('Delete this post?')) return;
    try {
      await API.deletePost(postId);
      card.remove();
      showToast('Post deleted');
    } catch(err) { showToast(err.message); }
  });

  menu.querySelector('[data-action="edit-post"]').addEventListener('click', () => {
    menu.remove();
    const contentEl = card.querySelector('.post-content');
    const oldText   = contentEl?.innerText || '';
    contentEl.innerHTML = `<textarea style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px;color:var(--text);font-size:15px;resize:none;outline:none;font-family:inherit" rows="3">${escHtml(oldText)}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn-primary sm" id="save-edit-btn">Save</button>
        <button class="btn-ghost sm" id="cancel-edit-btn">Cancel</button>
      </div>`;
    contentEl.querySelector('#cancel-edit-btn').addEventListener('click', () => { contentEl.innerHTML = formatContent(oldText); });
    contentEl.querySelector('#save-edit-btn').addEventListener('click', async () => {
      const newContent = contentEl.querySelector('textarea').value.trim();
      if (!newContent) return;
      try {
        const { post } = await API.updatePost(postId, { content: newContent });
        contentEl.innerHTML = formatContent(post.content) + (post.is_edited ? '<div class="post-edited">· edited</div>' : '');
        showToast('Post updated');
      } catch(err) { showToast(err.message); }
    });
  });

  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

// ── COMMENTS ──────────────────────────────────────────────────────────────────
async function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;
  const isOpen = section.classList.contains('open');
  if (!isOpen) {
    section.classList.add('open');
    section.innerHTML = loading();
    try {
      const { comments } = await API.getComments(postId);
      section.innerHTML = `
        <div>${comments.map(c => Components.commentItem(c, State.currentUser.id)).join('') || '<p style="color:var(--text3);font-size:13px;padding:8px 0">No comments yet</p>'}</div>
        <div class="comment-input-row">
          <div class="av av-sm av-${State.currentUser.color}">${State.currentUser.name[0].toUpperCase()}</div>
          <textarea id="ci-${postId}" placeholder="Write a comment…" rows="1"></textarea>
          <button class="btn-primary sm" data-submit-comment="${postId}">Reply</button>
        </div>`;
      const ci = document.getElementById(`ci-${postId}`);
      ci?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(postId); } });
      section.querySelector(`[data-submit-comment="${postId}"]`)?.addEventListener('click', () => submitComment(postId));
    } catch { section.innerHTML = '<p style="color:var(--text3);padding:8px">Could not load comments</p>'; }
  } else {
    section.classList.remove('open');
  }
}

async function submitComment(postId) {
  const input = document.getElementById(`ci-${postId}`);
  if (!input?.value.trim()) return;
  try {
    const { comment } = await API.addComment(postId, { content: input.value });
    const list = document.querySelector(`#comments-${postId} > div`);
    if (list) list.insertAdjacentHTML('beforeend', Components.commentItem(comment, State.currentUser.id));
    input.value = '';
    const countEl = document.querySelector(`.comment-count-${postId}`);
    if (countEl) countEl.textContent = formatNum(parseInt(countEl.textContent) + 1);
  } catch(err) { showToast(err.message); }
}

// ── EXPLORE ───────────────────────────────────────────────────────────────────
async function loadExplore() {
  const container = document.getElementById('explore-list');
  container.innerHTML = loading();
  try {
    const { posts } = await API.getExplore();
    container.innerHTML = posts.length
      ? posts.map(p => Components.postCard(p, State.currentUser.id)).join('')
      : emptyState('🌍', 'Nothing here yet');
  } catch(err) { container.innerHTML = emptyState('⚠️', 'Error loading', err.message); }
}

// ── SINGLE POST ───────────────────────────────────────────────────────────────
async function loadSinglePost(postId) {
  const container = document.getElementById('single-post-content');
  container.innerHTML = loading();
  try {
    const { post } = await API.getPost(postId);
    const { comments } = await API.getComments(postId);
    container.innerHTML = `
      ${Components.postCard(post, State.currentUser.id)}
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div class="comment-input-row">
          ${avatarHtml(State.currentUser,'sm')}
          <textarea id="single-comment-input" placeholder="Write a comment…" rows="2" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 12px;color:var(--text);font-size:14px;resize:none;outline:none;font-family:inherit"></textarea>
          <button class="btn-primary sm" id="single-comment-btn">Reply</button>
        </div>
      </div>
      <div id="single-comments-list">
        ${comments.map(c => Components.commentItem(c, State.currentUser.id)).join('') || '<div style="padding:20px;color:var(--text3);text-align:center;font-size:14px">No comments yet. Be first!</div>'}
      </div>`;

    document.getElementById('single-comment-btn').addEventListener('click', async () => {
      const input = document.getElementById('single-comment-input');
      if (!input?.value.trim()) return;
      try {
        const { comment } = await API.addComment(postId, { content: input.value });
        const list = document.getElementById('single-comments-list');
        list.insertAdjacentHTML('beforeend', Components.commentItem(comment, State.currentUser.id));
        input.value = '';
        showToast('Comment posted!');
      } catch(err) { showToast(err.message); }
    });
  } catch { container.innerHTML = emptyState('⚠️', 'Post not found'); }
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
async function loadProfile(username) {
  const container = document.getElementById('profile-content');
  container.innerHTML = loading();
  try {
    const { user } = await API.getProfile(username);
    const { posts } = await API.getUserPosts(user.id);
    const isOwn      = user.id === State.currentUser.id;
    const isFollowing = user.is_following;

    container.innerHTML = `
      <div class="profile-banner">
        ${user.cover_photo ? `<img src="${escHtml(user.cover_photo)}" alt="Cover">` : ''}
        <div class="profile-banner-overlay"></div>
      </div>
      <div class="profile-info-wrap">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar av-${user.color}">${user.avatar?`<img src="${escHtml(user.avatar)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:escHtml((user.name||'?')[0].toUpperCase())}</div>
          <div class="profile-actions">
            ${isOwn
              ? `<button class="btn-ghost sm" id="edit-profile-btn">Edit Profile</button>
                 <label class="btn-ghost sm" for="cover-upload" style="cursor:pointer">Change Cover
                   <input type="file" id="cover-upload" accept="image/*" style="display:none">
                 </label>
                 <label class="btn-ghost sm" for="avatar-upload" style="cursor:pointer">Change Photo
                   <input type="file" id="avatar-upload" accept="image/*" style="display:none">
                 </label>`
              : `<button class="btn-follow ${isFollowing?'following':''}" data-follow-id="${user.id}" data-follow-toggle id="profile-follow-btn">
                   ${isFollowing?'Following':'Follow'}
                 </button>`
            }
          </div>
        </div>
        <div class="profile-name">${escHtml(user.name)} ${user.is_verified?'<span class="verified" title="Verified">✓</span>':''}</div>
        <div class="profile-handle">@${escHtml(user.username)}</div>
        ${user.bio?`<div class="profile-bio">${escHtml(user.bio)}</div>`:''}
        <div class="profile-meta">
          ${user.location?`<span class="profile-meta-item">📍 ${escHtml(user.location)}</span>`:''}
          ${user.website?`<span class="profile-meta-item">🔗 <a href="${escHtml(user.website)}" target="_blank" style="color:var(--accent)">${escHtml(user.website)}</a></span>`:''}
        </div>
        <div class="profile-stats">
          <div class="profile-stat"><span class="stat-num">${formatNum(user.post_count)}</span><span class="stat-label">Posts</span></div>
          <div class="profile-stat" id="show-followers"><span class="stat-num">${formatNum(user.follower_count)}</span><span class="stat-label">Followers</span></div>
          <div class="profile-stat" id="show-following"><span class="stat-num">${formatNum(user.following_count)}</span><span class="stat-label">Following</span></div>
        </div>
      </div>
      <div class="profile-tabs">
        <div class="profile-tab active" data-tab="posts">Posts</div>
        <div class="profile-tab" data-tab="liked">Liked</div>
      </div>
      <div id="profile-posts-list">${posts.map(p => Components.postCard(p, State.currentUser.id)).join('') || emptyState('✦','No posts yet')}</div>`;

    // Profile tabs
    container.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        container.querySelectorAll('.profile-tab').forEach(t => t.classList.toggle('active', t === tab));
        const list = document.getElementById('profile-posts-list');
        list.innerHTML = loading();
        if (tab.dataset.tab === 'posts') {
          const { posts: ps } = await API.getUserPosts(user.id);
          list.innerHTML = ps.map(p => Components.postCard(p, State.currentUser.id)).join('') || emptyState('✦','No posts');
        } else {
          const { posts: ps } = await API.getUserLiked(user.id);
          list.innerHTML = ps.map(p => Components.postCard(p, State.currentUser.id)).join('') || emptyState('♥','No liked posts');
        }
      });
    });

    // Edit profile
    if (isOwn) {
      document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
        const form = document.getElementById('edit-profile-form');
        form.elements.name.value     = State.currentUser.name || '';
        form.elements.bio.value      = State.currentUser.bio  || '';
        form.elements.website.value  = State.currentUser.website || '';
        form.elements.location.value = State.currentUser.location || '';
        openModal('edit-profile-modal');
      });

      document.getElementById('avatar-upload')?.addEventListener('change', async function() {
        const fd = new FormData(); fd.append('avatar', this.files[0]);
        try { const { avatar } = await API.uploadAvatar(fd); State.currentUser.avatar = avatar; showToast('Photo updated!'); loadProfile(username); } catch(err) { showToast(err.message); }
      });
      document.getElementById('cover-upload')?.addEventListener('change', async function() {
        const fd = new FormData(); fd.append('cover', this.files[0]);
        try { await API.uploadCover(fd); showToast('Cover updated!'); loadProfile(username); } catch(err) { showToast(err.message); }
      });
    }

    // Followers / Following modals
    container.querySelector('#show-followers')?.addEventListener('click', async () => {
      const { users } = await API.getFollowers(user.id);
      showUserListModal('Followers', users);
    });
    container.querySelector('#show-following')?.addEventListener('click', async () => {
      const { users } = await API.getFollowing(user.id);
      showUserListModal('Following', users);
    });

  } catch(err) { container.innerHTML = emptyState('⚠️','Profile not found', err.message); }
}

// Edit profile form
document.getElementById('edit-profile-form').addEventListener('submit', async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { user } = await API.updateProfile({ name:fd.get('name'), bio:fd.get('bio'), website:fd.get('website'), location:fd.get('location') });
    State.currentUser = { ...State.currentUser, ...user };
    closeModal('edit-profile-modal');
    updateTopnavAvatar(); updateSidebarProfile();
    loadProfile(user.username);
    showToast('Profile updated!');
  } catch(err) { setError('edit-profile-error', err.message); }
});
document.getElementById('edit-profile-close').addEventListener('click', () => closeModal('edit-profile-modal'));

// Simple user list modal
function showUserListModal(title, users) {
  const existing = document.getElementById('user-list-modal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'user-list-modal';
  overlay.innerHTML = `
    <div class="modal" style="max-height:80vh;overflow-y:auto">
      <div class="modal-header"><h2>${escHtml(title)}</h2><button class="modal-close" onclick="this.closest('.modal-overlay').remove();document.body.style.overflow=''">✕</button></div>
      <div style="padding:8px 0">${users.length ? users.map(u => Components.userRow(u, u.is_following)).join('') : emptyState('👤','No users')}</div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; } });
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
async function loadNotifications() {
  const container = document.getElementById('notifications-list');
  container.innerHTML = loading();
  try {
    const { notifications } = await API.getNotifications();
    await API.markAllRead();
    updateNotifBadge(0);
    container.innerHTML = notifications.length
      ? notifications.map(n => Components.notificationItem(n)).join('')
      : emptyState('🔔','No notifications yet');
  } catch { container.innerHTML = emptyState('⚠️','Could not load notifications'); }
}

document.getElementById('mark-all-read-btn').addEventListener('click', async () => {
  await API.markAllRead();
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  updateNotifBadge(0);
  showToast('All marked as read');
});

function updateNotifBadge(count) {
  const badges = [document.getElementById('notif-badge'), document.getElementById('side-notif-badge'), document.getElementById('msg-badge')];
  badges.forEach(b => { if (!b) return; b.textContent = count; b.style.display = count > 0 ? 'flex' : 'none'; });
}

async function pollNotifications() {
  try {
    const { count } = await API.getUnreadCount();
    updateNotifBadge(count);
  } catch {}
  State.notifInterval = setTimeout(pollNotifications, 30000);
}

// ── BOOKMARKS ─────────────────────────────────────────────────────────────────
async function loadBookmarks() {
  const container = document.getElementById('bookmarks-list');
  container.innerHTML = loading();
  try {
    const { posts } = await API.getBookmarks();
    container.innerHTML = posts.length
      ? posts.map(p => Components.postCard(p, State.currentUser.id)).join('')
      : emptyState('🔖', 'No bookmarks yet', 'Save posts to read them later');
  } catch { container.innerHTML = emptyState('⚠️','Could not load bookmarks'); }
}

// ── HASHTAG ───────────────────────────────────────────────────────────────────
async function loadHashtag(tag) {
  const container = document.getElementById('hashtag-list');
  container.innerHTML = loading();
  try {
    const { posts } = await API.getByHashtag(tag);
    container.innerHTML = posts.length
      ? posts.map(p => Components.postCard(p, State.currentUser.id)).join('')
      : emptyState('#', `No posts with #${tag} yet`);
  } catch { container.innerHTML = emptyState('⚠️','Error loading'); }
}

// ── MESSAGES ──────────────────────────────────────────────────────────────────
async function loadConversations() {
  const container = document.getElementById('conv-list');
  container.innerHTML = loading();
  try {
    const { conversations } = await API.getConversations();
    if (!conversations.length) {
      container.innerHTML = emptyState('💬','No conversations yet');
      return;
    }
    container.innerHTML = conversations.map(c => {
      const other = c.members[0] || {};
      return `<div class="conv-item" data-conv-id="${c.id}" data-other-id="${other.id}">
        ${avatarHtml(other,'sm')}
        <div class="conv-info">
          <div class="conv-name">${escHtml(other.name||'Unknown')}</div>
          <div class="conv-preview">${escHtml(c.last_message||'No messages yet')}</div>
        </div>
        ${c.unread_count > 0 ? `<span class="conv-unread">${c.unread_count}</span>` : ''}
      </div>`;
    }).join('');
    container.querySelectorAll('.conv-item').forEach(item => {
      item.addEventListener('click', () => loadMessages(item.dataset.convId, item.dataset.otherId));
    });
  } catch { container.innerHTML = emptyState('⚠️','Error loading'); }
}

async function loadMessages(convId, otherId) {
  const pane = document.getElementById('msg-pane');
  pane.innerHTML = loading();
  try {
    const { messages } = await API.getMessages(convId);
    const other = messages.find(m => m.sender_id != State.currentUser.id);
    pane.innerHTML = `
      <div class="msg-header">${other ? escHtml(other.name||'') : 'Conversation'}</div>
      <div class="msg-list" id="msg-list">
        ${messages.map(m => `
          <div class="msg-bubble ${m.sender_id === State.currentUser.id ? 'mine' : 'theirs'}" title="${timeAgo(m.created_at)}">
            ${escHtml(m.content)}
          </div>`).join('') || '<div style="text-align:center;color:var(--text3);font-size:13px;margin:auto">Say hello!</div>'}
      </div>
      <div class="msg-input-row">
        <input type="text" id="msg-input" placeholder="Message…" autocomplete="off">
        <button class="btn-primary sm" id="msg-send-btn">Send</button>
      </div>`;
    const list = document.getElementById('msg-list');
    list.scrollTop = list.scrollHeight;
    const input = document.getElementById('msg-input');
    const sendBtn = document.getElementById('msg-send-btn');
    async function sendMsg() {
      const content = input.value.trim();
      if (!content) return;
      input.value = '';
      try {
        const { message } = await API.sendMessage({ conversation_id: convId, to_user_id: parseInt(otherId), content });
        list.insertAdjacentHTML('beforeend', `<div class="msg-bubble mine">${escHtml(message.content)}</div>`);
        list.scrollTop = list.scrollHeight;
      } catch(err) { showToast(err.message); }
    }
    sendBtn.addEventListener('click', sendMsg);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
  } catch { pane.innerHTML = emptyState('⚠️','Could not load messages'); }
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
let searchTimer;
document.getElementById('global-search').addEventListener('input', async function() {
  clearTimeout(searchTimer);
  const q   = this.value.trim();
  const dd  = document.getElementById('search-dropdown');
  if (!q) { dd.classList.remove('open'); return; }

  searchTimer = setTimeout(async () => {
    try {
      const [userRes, postRes] = await Promise.all([API.searchUsers(q), API.searchPosts(q)]);
      let html = '';
      userRes.users.slice(0,4).forEach(u => {
        html += `<div class="search-drop-item" data-navigate-user="${escHtml(u.username)}">
          ${avatarHtml(u,'sm')} <div><div style="font-size:13px;font-weight:600">${escHtml(u.name)}</div><div style="font-size:12px;color:var(--text3)">@${escHtml(u.username)}</div></div></div>`;
      });
      postRes.posts.slice(0,3).forEach(p => {
        html += `<div class="search-drop-item" data-navigate-post="${p.id}">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;color:var(--text3)"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
          <span style="font-size:13px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(p.content.slice(0,60))}…</span></div>`;
      });
      if (!html) html = '<div style="padding:12px 16px;font-size:13px;color:var(--text3)">No results found</div>';
      dd.innerHTML = html;
      dd.classList.add('open');
      dd.querySelectorAll('[data-navigate-user]').forEach(el => el.addEventListener('click', () => { navigateProfile(el.dataset.navigateUser); dd.classList.remove('open'); this.value = ''; }));
      dd.querySelectorAll('[data-navigate-post]').forEach(el => el.addEventListener('click', () => { navigatePost(el.dataset.navigatePost); dd.classList.remove('open'); this.value = ''; }));
    } catch {}
  }, 350);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-bar')) document.getElementById('search-dropdown').classList.remove('open');
});

// ── SUGGESTED USERS ───────────────────────────────────────────────────────────
async function loadSuggested() {
  const container = document.getElementById('suggested-users');
  try {
    const { users } = await API.getSuggested();
    container.innerHTML = users.length
      ? users.slice(0,5).map(u => Components.suggestUser(u, false)).join('')
      : '<p style="font-size:13px;color:var(--text3)">You follow everyone!</p>';
  } catch {}
}

// ── TRENDING ──────────────────────────────────────────────────────────────────
async function loadTrending() {
  const container = document.getElementById('trending-tags');
  try {
    const { hashtags } = await API.getTrending();
    container.innerHTML = hashtags.length
      ? hashtags.map(h => `<div class="trend-item" data-tag="${escHtml(h.tag)}"><div class="trend-tag">#${escHtml(h.tag)}</div><div class="trend-count">${formatNum(h.post_count)} posts</div></div>`).join('')
      : '<p style="font-size:13px;color:var(--text3)">No trending topics yet</p>';
    container.querySelectorAll('.trend-item').forEach(el => el.addEventListener('click', () => navigateHashtag(el.dataset.tag)));
  } catch {}
}

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
function openLightbox(src) {
  const lb  = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  lb.classList.add('open');
}
document.getElementById('lightbox')?.addEventListener('click', function(e) {
  if (e.target === this || e.target.id === 'lightbox-close') this.classList.remove('open');
});
document.getElementById('lightbox-close')?.addEventListener('click', () => document.getElementById('lightbox').classList.remove('open'));

// ── START ─────────────────────────────────────────────────────────────────────
boot();
