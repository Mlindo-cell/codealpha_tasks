// ── COMPONENTS ────────────────────────────────────────────────────────────────

const Components = {

  postCard(post, currentUserId) {
    const isOwn   = post.user_id === currentUserId;
    const isRepost = !!post.repost_of_id;

    return `
    <div class="post-card${post.reply_to_id ? ' reply' : ''}" data-post-id="${post.id}">
      ${isRepost ? `
        <div class="repost-banner">
          ${avatarHtml(post.author,'sm')}
          <span><strong>${escHtml(post.author.name)}</strong> reposted</span>
        </div>
        <div class="repost-card" data-navigate-post="${post.repost_of?.id||''}">
          ${post.repost_of ? this._postBody(post.repost_of, currentUserId, true) : '<span style="color:var(--text3)">Original post deleted</span>'}
        </div>
      ` : this._postBody(post, currentUserId, false)}
      <div class="post-actions" data-post-id="${post.id}">
        <button class="btn-icon comment-btn" data-action="comment" title="Comment">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span class="action-count comment-count-${post.id}">${formatNum(post.comment_count)}</span>
        </button>
        <button class="btn-icon repost-btn ${post.is_reposted?'reposted':''}" data-action="repost" title="Repost">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          <span class="action-count repost-count-${post.id}">${formatNum(post.repost_count)}</span>
        </button>
        <button class="btn-icon like-btn ${post.is_liked?'liked':''}" data-action="like" title="Like">
          <svg width="16" height="16" fill="${post.is_liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span class="action-count like-count-${post.id}">${formatNum(post.like_count)}</span>
        </button>
        <button class="btn-icon bookmark-btn ${post.is_bookmarked?'bookmarked':''}" data-action="bookmark" title="Bookmark">
          <svg width="16" height="16" fill="${post.is_bookmarked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
        ${isOwn ? `
        <button class="btn-icon more-btn" data-action="more" title="More" style="margin-left:auto">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
        </button>` : ''}
      </div>
      <div class="comments-section" id="comments-${post.id}"></div>
    </div>`;
  },

  _postBody(post, currentUserId, compact) {
    const author = post.author || {};
    return `
      <div class="post-header">
        <div class="${compact?'av av-sm':'post-avatar'} av-${author.color||0}" data-navigate-user="${escHtml(author.username||'')}">
          ${author.avatar ? `<img src="${escHtml(author.avatar)}" onerror="this.parentNode.textContent='${escHtml((author.name||'?')[0].toUpperCase())}'">` : escHtml((author.name||'?')[0].toUpperCase())}
        </div>
        <div class="post-meta">
          <div class="post-author-row">
            <span class="post-author" data-navigate-user="${escHtml(author.username||'')}">${escHtml(author.name||'Unknown')}</span>
            ${author.is_verified ? '<span class="verified" title="Verified">✓</span>' : ''}
            <span class="post-handle">@${escHtml(author.username||'')}</span>
            <span class="post-dot">·</span>
            <span class="post-time">${timeAgo(post.created_at)}</span>
          </div>
          ${post.reply_to ? `<div class="post-reply-to">↩ Replying to <a data-navigate-user="${escHtml(post.reply_to.username||'')}">@${escHtml(post.reply_to.username||'')}</a></div>` : ''}
        </div>
      </div>
      ${post.is_edited ? '<div class="post-edited">· edited</div>' : ''}
      <div class="post-content">${formatContent(post.content||'')}</div>
      ${post.media ? `<div class="post-media"><img src="${escHtml(post.media)}" alt="Post media" data-lightbox="${escHtml(post.media)}"></div>` : ''}
    `;
  },

  commentItem(c, currentUserId) {
    return `
    <div class="comment-item" data-comment-id="${c.id}">
      <div class="av av-sm av-${c.color||0}" data-navigate-user="${escHtml(c.username||'')}" style="cursor:pointer">
        ${c.avatar ? `<img src="${escHtml(c.avatar)}" onerror="this.parentNode.textContent='${escHtml((c.name||'?')[0].toUpperCase())}'">` : escHtml((c.name||'?')[0].toUpperCase())}
      </div>
      <div class="comment-body">
        <div class="comment-author" data-navigate-user="${escHtml(c.username||'')}">
          ${escHtml(c.name||'')} ${c.is_verified?'<span class="verified">✓</span>':''} <span style="color:var(--text3);font-weight:400">@${escHtml(c.username||'')}</span>
        </div>
        <div class="comment-text">${escHtml(c.content||'')}</div>
        <div class="comment-footer">
          <span class="comment-time">${timeAgo(c.created_at)}</span>
          <button class="btn-icon like-comment-btn ${c.is_liked?'liked':''}" data-comment-id="${c.id}" style="padding:2px 6px;font-size:12px">
            <svg width="12" height="12" fill="${c.is_liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>${formatNum(c.like_count||0)}</span>
          </button>
        </div>
        ${c.replies && c.replies.length ? `
          <div class="replies-section">
            ${c.replies.map(r => `
              <div class="comment-item" style="margin-bottom:10px">
                <div class="av av-sm av-${r.color||0}" style="cursor:pointer" data-navigate-user="${escHtml(r.username||'')}">
                  ${r.avatar?`<img src="${escHtml(r.avatar)}">`:escHtml((r.name||'?')[0].toUpperCase())}
                </div>
                <div class="comment-body">
                  <div class="comment-author" data-navigate-user="${escHtml(r.username||'')}">${escHtml(r.name||'')} <span style="color:var(--text3);font-weight:400">@${escHtml(r.username||'')}</span></div>
                  <div class="comment-text">${escHtml(r.content||'')}</div>
                  <div class="comment-footer"><span class="comment-time">${timeAgo(r.created_at)}</span></div>
                </div>
              </div>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
  },

  notificationItem(n) {
    const icons = { like:'♥', comment:'💬', follow:'👤', repost:'🔁', reply:'↩', message:'✉️' };
    const iconClasses = { like:'like', comment:'comment', follow:'follow', repost:'repost', reply:'comment', message:'follow' };
    return `
    <div class="notif-item ${n.is_read?'':'unread'}" data-notif-id="${n.id}">
      <div class="notif-icon ${iconClasses[n.type]||''}">
        <div class="av av-sm av-${n.color||0}">
          ${n.avatar?`<img src="${escHtml(n.avatar)}">`:escHtml((n.name||'?')[0].toUpperCase())}
        </div>
      </div>
      <div class="notif-body">
        <div class="notif-text">
          <strong data-navigate-user="${escHtml(n.username||'')}">${escHtml(n.name||'')}</strong>
          ${escHtml(n.message||n.type)}
        </div>
        <div class="notif-time">${timeAgo(n.created_at)}</div>
      </div>
      <span style="font-size:20px">${icons[n.type]||'🔔'}</span>
    </div>`;
  },

  suggestUser(user, isFollowing) {
    return `
    <div class="suggest-item">
      <div class="av av-sm av-${user.color||0}" data-navigate-user="${escHtml(user.username||'')}">
        ${user.avatar?`<img src="${escHtml(user.avatar)}">`:escHtml((user.name||'?')[0].toUpperCase())}
      </div>
      <div class="suggest-info">
        <div class="suggest-name" data-navigate-user="${escHtml(user.username||'')}">
          ${escHtml(user.name||'')} ${user.is_verified?'<span class="verified">✓</span>':''}
        </div>
        <div class="suggest-handle">@${escHtml(user.username||'')}</div>
      </div>
      <button class="btn-follow ${isFollowing?'following':''}" data-follow-id="${user.id}" data-follow-toggle>
        ${isFollowing?'Following':'Follow'}
      </button>
    </div>`;
  },

  userRow(user, isFollowing) {
    return `
    <div class="user-card">
      <div class="av av-md av-${user.color||0}" data-navigate-user="${escHtml(user.username||'')}">
        ${user.avatar?`<img src="${escHtml(user.avatar)}">`:escHtml((user.name||'?')[0].toUpperCase())}
      </div>
      <div class="user-card-info">
        <div class="user-card-name" data-navigate-user="${escHtml(user.username||'')}">
          ${escHtml(user.name||'')} ${user.is_verified?'<span class="verified">✓</span>':''}
        </div>
        <div class="user-card-handle">@${escHtml(user.username||'')}</div>
        ${user.bio?`<div class="user-card-bio">${escHtml(user.bio)}</div>`:''}
      </div>
      ${user.id !== State.currentUser?.id ? `
        <button class="btn-follow ${isFollowing?'following':''}" data-follow-id="${user.id}" data-follow-toggle>
          ${isFollowing?'Following':'Follow'}
        </button>` : ''}
    </div>`;
  },
};
