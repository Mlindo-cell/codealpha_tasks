// ── API CLIENT ────────────────────────────────────────────────────────────────
const API = (() => {
  async function req(method, url, body, isForm = false) {
    const opts = { method, credentials: 'include' };
    if (body && !isForm) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    } else if (isForm) {
      opts.body = body; // FormData
    }
    const res  = await fetch('/api' + url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  return {
    // AUTH
    register: d     => req('POST', '/auth/register', d),
    login:    d     => req('POST', '/auth/login',    d),
    logout:   ()    => req('POST', '/auth/logout'),
    me:       ()    => req('GET',  '/auth/me'),

    // USERS
    getProfile:    username => req('GET',  `/users/${username}`),
    updateProfile: data     => req('PUT',  '/users/me', data),
    uploadAvatar:  fd       => req('POST', '/users/me/avatar', fd, true),
    uploadCover:   fd       => req('POST', '/users/me/cover',  fd, true),
    followUser:    id       => req('POST', `/users/${id}/follow`),
    getFollowers:  id       => req('GET',  `/users/${id}/followers`),
    getFollowing:  id       => req('GET',  `/users/${id}/following`),
    getSuggested:  ()       => req('GET',  '/users/suggested'),
    searchUsers:   q        => req('GET',  `/users/search?q=${encodeURIComponent(q)}`),

    // POSTS
    getFeed:          (page=1) => req('GET', `/posts/feed?page=${page}`),
    getExplore:       (page=1) => req('GET', `/posts/explore?page=${page}`),
    getBookmarks:     ()       => req('GET', '/posts/bookmarks'),
    getUserPosts:     (id,p=1) => req('GET', `/posts/user/${id}?page=${p}`),
    getUserLiked:     id       => req('GET', `/posts/user/${id}/liked`),
    getPost:          id       => req('GET', `/posts/${id}`),
    getByHashtag:     tag      => req('GET', `/posts/hashtag/${tag}`),
    getTrending:      ()       => req('GET', '/posts/trending'),
    searchPosts:      q        => req('GET', `/posts/search?q=${encodeURIComponent(q)}`),
    createPost:       fd       => req('POST','/posts', fd, true),
    updatePost:       (id,d)   => req('PUT',  `/posts/${id}`, d),
    deletePost:       id       => req('DELETE',`/posts/${id}`),
    likePost:         id       => req('POST', `/posts/${id}/like`),
    bookmarkPost:     id       => req('POST', `/posts/${id}/bookmark`),
    repost:           id       => req('POST', `/posts/${id}/repost`),
    getComments:      id       => req('GET',  `/posts/${id}/comments`),
    addComment:       (id,d)   => req('POST', `/posts/${id}/comments`, d),
    likeComment:      id       => req('POST', `/comments/${id}/like`),

    // NOTIFICATIONS
    getNotifications: ()  => req('GET',  '/notifications'),
    getUnreadCount:   ()  => req('GET',  '/notifications/unread'),
    markAllRead:      ()  => req('POST', '/notifications/read-all'),

    // MESSAGES
    getConversations: ()      => req('GET',  '/messages'),
    getMessages:      id      => req('GET',  `/messages/${id}`),
    sendMessage:      data    => req('POST', '/messages', data),
  };
})();
