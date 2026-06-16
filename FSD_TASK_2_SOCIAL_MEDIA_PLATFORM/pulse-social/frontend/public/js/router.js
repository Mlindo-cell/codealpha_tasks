// ── ROUTER ────────────────────────────────────────────────────────────────────
const Router = (() => {
  let currentPage = 'feed';
  let pageData    = {};

  function show(page, data = {}) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidenav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page || (page === 'my-profile' && n.dataset.page === 'my-profile'));
    });
    const el = document.getElementById(`page-${page}`);
    if (!el) return;
    el.classList.add('active');
    currentPage = page;
    pageData    = data;
    window.scrollTo(0, 0);
  }

  function getCurrent() { return { page: currentPage, data: pageData }; }

  return { show, getCurrent };
})();
