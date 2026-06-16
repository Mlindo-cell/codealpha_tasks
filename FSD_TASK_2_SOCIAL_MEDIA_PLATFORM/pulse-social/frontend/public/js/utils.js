// ── UTILS ─────────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60)  return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n/1000).toFixed(1) + 'K';
  return String(n || 0);
}

function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function setError(elId, msg) {
  const el = document.getElementById(elId);
  if (el) el.textContent = msg || '';
}

function avatarEl(user, size = 'md') {
  const el = document.createElement('div');
  el.className = `av av-${size} av-${user.color || 0}`;
  if (user.avatar) {
    const img = document.createElement('img');
    img.src = user.avatar;
    img.alt = user.name;
    img.onerror = () => { img.remove(); el.textContent = (user.name||'?')[0].toUpperCase(); };
    el.appendChild(img);
  } else {
    el.textContent = (user.name||'?')[0].toUpperCase();
  }
  return el;
}

function avatarHtml(user, size = 'md') {
  if (user.avatar) {
    return `<div class="av av-${size} av-${user.color||0}"><img src="${escHtml(user.avatar)}" alt="${escHtml(user.name)}" onerror="this.parentNode.innerHTML='${escHtml((user.name||'?')[0].toUpperCase())}'"></div>`;
  }
  return `<div class="av av-${size} av-${user.color||0}">${escHtml((user.name||'?')[0].toUpperCase())}</div>`;
}

function formatContent(text) {
  return escHtml(text)
    .replace(/#([a-zA-Z0-9_]+)/g, '<span class="post-hashtag" data-tag="$1">#$1</span>')
    .replace(/@([a-zA-Z0-9_]+)/g, '<span class="post-mention" data-user="$1">@$1</span>');
}

function loading() {
  return `<div class="loading-spinner"><div class="spinner"></div></div>`;
}

function emptyState(icon, title, sub = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div>${sub ? `<div class="empty-sub">${sub}</div>` : ''}</div>`;
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Click outside modal closes it
document.querySelectorAll('.modal-overlay').forEach(mo => {
  mo.addEventListener('click', e => { if (e.target === mo) closeModal(mo.id); });
});
