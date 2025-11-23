
document.addEventListener('DOMContentLoaded', function () {
  // Storage keys
  const LS_USERS = 'fl_users_v3';
  const LS_CURRENT = 'fl_current_v3';
  const LS_POSTS = 'fl_posts_v3';

  // Elements
  const loginBtnTop = document.getElementById('loginBtnTop');
  const profileBtn = document.getElementById('profileBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const leftName = document.getElementById('leftName');
  const leftAvatar = document.getElementById('leftAvatar');

  const authOverlay = document.getElementById('authOverlay');
  const authTitle = document.getElementById('authTitle');
  const authName = document.getElementById('authName');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authSubmit = document.getElementById('authSubmit');
  const authSwitch = document.getElementById('authSwitch');

  const composerText = document.getElementById('composerText');
  const composerImage = document.getElementById('composerImage');
  const composerFile = document.getElementById('composerFile');
  const publishBtn = document.getElementById('publishBtn');
  const postsContainer = document.getElementById('postsContainer');
  const notice = document.getElementById('notice');
  const globalSearch = document.getElementById('globalSearch');
  const sortSelect = document.getElementById('sortSelect');
  const filterSelect = document.getElementById('filterSelect');
  const mobileSearchBtn = document.getElementById('mobileSearchBtn');
  const filterStatus = document.getElementById('filterStatus');
  const searchModal = document.getElementById('searchModal');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const mobileSearchClose = document.getElementById('mobileSearchClose');
  const editModal = document.getElementById('editModal');
  const editTextarea = document.getElementById('editTextarea');
  const editCancel = document.getElementById('editCancel');
  const editSave = document.getElementById('editSave');
  const mainApp = document.getElementById('mainApp');
  const searchBox = document.querySelector('.topbar .search');
  // profile modal elements (added in HTML)
  const profileModal = document.getElementById('profileModal');
  const profileNameInput = document.getElementById('profileName');
  const profileSave = document.getElementById('profileSave');
  const profileCancel = document.getElementById('profileCancel');
  const themeToggle = document.getElementById('themeToggle');
  const reactorsTooltip = document.getElementById('reactorsTooltip');

  // State
  let users = JSON.parse(localStorage.getItem(LS_USERS) || '[]');
  let currentUser = JSON.parse(localStorage.getItem(LS_CURRENT) || 'null');
  let posts = JSON.parse(localStorage.getItem(LS_POSTS) || '[]');
  if (!Array.isArray(posts)) posts = [];
  let mode = 'login'; // or 'signup'
  const LS_SORT = 'fl_sort_v1';
  const LS_FILTER = 'fl_filter_v1';
  const LS_THEME = 'fl_theme_v1';
  // transient: id of last-created post for animation
  var lastCreatedId = null;
  // transient: last reaction to animate (set before render, applied after DOM created)
  var lastReactionTrigger = null;

  // Helpers
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  function save() { localStorage.setItem(LS_USERS, JSON.stringify(users)); localStorage.setItem(LS_CURRENT, JSON.stringify(currentUser)); localStorage.setItem(LS_POSTS, JSON.stringify(posts)); }
  function el(tag, cls) { const d = document.createElement(tag); if (cls) d.className = cls; return d; }

  // Auth UI (open/close are defined below to also update buttons)
  // update submit and switch button text when opening auth
  function openAuth(m = 'login') { mode = m; authOverlay.classList.remove('hidden'); authTitle.innerText = m === 'login' ? 'Log in' : 'Create an account'; authName.classList.toggle('hidden', m === 'login'); if (authSubmit) authSubmit.innerText = m === 'login' ? 'Login' : 'Create account'; if (authSwitch) authSwitch.innerText = m === 'login' ? 'Signup' : 'Login'; }
  // close handler (also used by close button)
  function closeAuth() { authOverlay.classList.add('hidden'); }

  loginBtnTop.addEventListener('click', function () { openAuth('login'); });
  authSwitch.addEventListener('click', function () { openAuth(mode === 'login' ? 'signup' : 'login'); });
  // close icon in auth
  var authCloseBtn = document.getElementById('authClose');
  if (authCloseBtn) authCloseBtn.addEventListener('click', function () { closeAuth(); });

  authSubmit.addEventListener('click', function () {
    const email = authEmail.value.trim().toLowerCase();
    const pw = authPassword.value;
    if (mode === 'login') {
      const found = users.find(function (u) { return u.email === email && u.password === pw; });
      if (!found) { alert('Invalid credentials'); return; }
      currentUser = { id: found.id, name: found.name, email: found.email, avatar: found.avatar || '' };
      save(); applyAuthState(); closeAuth();
    } else {
      const name = authName.value.trim();
      if (!name || !email || !pw) { alert('Complete all fields'); return; }
      if (users.some(function (u) { return u.email === email; })) { alert('Email already registered'); return; }
      const u = { id: uid(), name: name, email: email, password: pw, avatar: '' };
      users.push(u);
      currentUser = { id: u.id, name: u.name, email: u.email, avatar: '' };
      save(); applyAuthState(); closeAuth();
    }
    authName.value = authEmail.value = authPassword.value = '';
  });

  logoutBtn.addEventListener('click', function () { currentUser = null; save(); applyAuthState(); });

  function applyAuthState() {
    if (currentUser) {
      loginBtnTop.classList.add('hidden'); profileBtn.classList.remove('hidden'); logoutBtn.classList.remove('hidden');
      leftName.innerText = currentUser.name; leftAvatar.innerText = currentUser.name.charAt(0).toUpperCase(); notice.innerText = ''; mainApp.classList.remove('hidden');
    } else {
      loginBtnTop.classList.remove('hidden'); profileBtn.classList.add('hidden'); logoutBtn.classList.add('hidden');
      leftName.innerText = 'Guest'; leftAvatar.innerText = 'U'; notice.innerText = 'Note: Login required to enable full functionality.'; mainApp.classList.add('hidden'); openAuth('login');
    }
    renderPosts();
  }

  // File upload to base64
  let pendingImageBase64 = '';
  composerFile.addEventListener('change', function (e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function (ev) { pendingImageBase64 = ev.target.result; composerImage.value = ''; notice.innerText = 'Image ready — click Post to publish'; };
    reader.readAsDataURL(f);
  });

  // Post creation
  function createPost(text, imageBase64OrUrl) {
    const authorId = currentUser ? currentUser.id : 'anon';
    const authorName = currentUser ? currentUser.name : 'Guest';
    const p = { id: uid(), authorId: authorId, authorName: authorName, text: text, image: imageBase64OrUrl || '', createdAt: Date.now(), likes: 0, likedBy: [], reactions: {}, comments: [] };
    posts.unshift(p);
    lastCreatedId = p.id;
    save(); renderPosts(); pendingImageBase64 = '';
  }

  publishBtn.addEventListener('click', function () {
    if (!currentUser) { openAuth('login'); return; }
    const text = composerText.value.trim(); const imageUrl = composerImage.value.trim();
    if (!text && !imageUrl && !pendingImageBase64) { alert('Write something or add an image'); return; }
    createPost(text, pendingImageBase64 || imageUrl);
    composerText.value = composerImage.value = '';
    composerFile.value = null;
    notice.innerText = '';
    try { showToast('Post published'); } catch (e) {}
  });

  // Reactions and comments
  // Map of reaction keys to emoji + label
  var REACTION_MAP = {
    like: { emoji: '👍', label: 'Like' },
    love: { emoji: '❤️', label: 'Love' },
    haha: { emoji: '😂', label: 'Haha' },
    wow: { emoji: '😮', label: 'Wow' },
    sad: { emoji: '😢', label: 'Sad' },
    angry: { emoji: '😡', label: 'Angry' }
  };
  var REACTIONS = Object.keys(REACTION_MAP);

  // Add or toggle a reaction. Users can have at most one reaction per post.
  function addReaction(postId, reaction) {
    if (!currentUser) { openAuth('login'); return; }
    var p = posts.find(function (x) { return x.id === postId; }); if (!p) return;
    p.reactions = p.reactions || {};
    // ensure arrays exist
    REACTIONS.forEach(function (r) { p.reactions[r] = p.reactions[r] || []; });
    // find existing reaction by this user
    var prev = null;
    REACTIONS.forEach(function (r) { if (p.reactions[r].indexOf(currentUser.id) !== -1) prev = r; });
    if (prev === reaction) {
      // toggle off
      var i = p.reactions[reaction].indexOf(currentUser.id); if (i !== -1) p.reactions[reaction].splice(i, 1);
    } else {
      // remove from previous
      if (prev) { var ii = p.reactions[prev].indexOf(currentUser.id); if (ii !== -1) p.reactions[prev].splice(ii, 1); }
      // add to new
      if (p.reactions[reaction].indexOf(currentUser.id) === -1) p.reactions[reaction].push(currentUser.id);
    }
    // maintain compatibility fields: likes & likedBy reflect 'like' reaction
    p.likedBy = p.reactions['like'] || [];
    p.likes = p.likedBy.length;
    // record this reaction to trigger pop animation after render
    save();
    lastReactionTrigger = { postId: postId, reaction: reaction };
    renderPosts();
  }

  function addComment(postId, text) { if (!currentUser) { openAuth('login'); return; } var p = posts.find(function (x) { return x.id === postId; }); if (!p) return; p.comments = p.comments || []; p.comments.push({ id: uid(), authorId: currentUser.id, authorName: currentUser.name, text: text, createdAt: Date.now() }); save(); renderPosts(); }

  // legacy toggleLike kept for compatibility: route through addReaction('like')
  function toggleLike(postId) { if (!currentUser) { openAuth('login'); return; } addReaction(postId, 'like'); }

  function deletePost(postId) { var p = posts.find(function (x) { return x.id === postId; }); if (!p) return; if (!currentUser || p.authorId !== currentUser.id) { if (!confirm('You are not the author. Remove anyway?')) return; } posts = posts.filter(function (x) { return x.id !== postId; }); save(); renderPosts(); }

  function editPost(postId) { var p = posts.find(function (x) { return x.id === postId; }); if (!p) return; if (!currentUser || p.authorId !== currentUser.id) { alert('Only author can edit'); return; } var txt = prompt('Edit post text', p.text); if (txt === null) return; p.text = txt; save(); renderPosts(); }

  // Modal-based edit flow
  var editingPostId = null;
  function openEditModal(postId) {
    var p = posts.find(function (x) { return x.id === postId; }); if (!p) return; if (!currentUser || p.authorId !== currentUser.id) { alert('Only author can edit'); return; }
    editingPostId = postId; editTextarea.value = p.text || ''; editModal.classList.add('active');
  }
  function closeEditModal() { editingPostId = null; editModal.classList.remove('active'); editTextarea.value = ''; }
  editCancel.addEventListener('click', function () { closeEditModal(); });
  editSave.addEventListener('click', function () { if (!editingPostId) return; var p = posts.find(function (x) { return x.id === editingPostId; }); if (!p) return; p.text = editTextarea.value.trim(); save(); closeEditModal(); renderPosts(); });

  // Replace old editPost usage with modal opener
  function editPost(postId) { openEditModal(postId); }

  // Render
  function renderPosts() {
    postsContainer.innerHTML = '';
    // Work on a shallow copy
    var items = posts.slice();

    // Apply filter select
    var filter = (filterSelect && filterSelect.value) || 'all';
    if (filter === 'withImage') { items = items.filter(function (p) { return p.image; }); }
    else if (filter === 'mine') { items = items.filter(function (p) { return currentUser && p.authorId === currentUser.id; }); }

    // Apply search
    var query = globalSearch.value.trim().toLowerCase();
    if (query) {
      items = items.filter(function (p) { return (p.text || '').toLowerCase().includes(query) || (p.authorName || '').toLowerCase().includes(query); });
    }

    // Apply sort
    var sort = (sortSelect && sortSelect.value) || 'latest';
    if (sort === 'latest') { items.sort(function (a, b) { return b.createdAt - a.createdAt; }); }
    else if (sort === 'oldest') { items.sort(function (a, b) { return a.createdAt - b.createdAt; }); }
    else if (sort === 'most_liked') { items.sort(function (a, b) { return (b.likes || 0) - (a.likes || 0); }); }

    if (items.length === 0) { var c = el('div', 'card'); c.innerHTML = '<div style="color:var(--muted)">No posts yet — be the first!</div>'; postsContainer.appendChild(c); return; }

    items.forEach(function (p) {
      var node = el('div', 'post');
      node.setAttribute('data-id', p.id);
      // animate newly created post
      try { if (lastCreatedId && p.id === lastCreatedId) node.className = 'post new-post'; } catch (e) {}
      var avatar = el('div', 'avatar2'); avatar.innerText = p.authorName ? p.authorName.charAt(0).toUpperCase() : 'U';
      var body = el('div', 'post-body');
      var meta = el('div', 'meta'); meta.innerHTML = '<div style="display:flex;flex-direction:column"><div class="name">' + escapeHtml(p.authorName) + '</div><div style="font-size:12px;color:var(--muted)">' + timeAgo(p.createdAt) + '</div></div>';
      var text = el('div'); text.style.marginTop = '8px'; text.innerText = p.text || '';
      body.appendChild(meta); body.appendChild(text);
      if (p.image) { var im = document.createElement('img'); im.className = 'content-img'; im.src = p.image; im.onerror = function () { im.style.display = 'none'; }; body.appendChild(im); }

      var actions = el('div', 'actions');
      // reactions summary (emoji + count)
      var reactionsSummary = el('div'); reactionsSummary.style.display = 'flex'; reactionsSummary.style.gap = '6px';
      if (p.reactions) {
        REACTIONS.forEach(function (r) {
          var arr = p.reactions[r] || [];
          if (arr.length > 0) {
            var chip = el('div');
              chip.className = 'reaction-chip';
            chip.style.fontSize = '13px';
            chip.style.padding = '6px 8px';
            chip.style.borderRadius = '999px';
            chip.style.background = '#f7fafc';
            chip.style.display = 'flex';
            chip.style.alignItems = 'center';
            chip.style.gap = '6px';
            chip.innerHTML = '<span style="font-size:15px">' + (REACTION_MAP[r] ? REACTION_MAP[r].emoji : '') + '</span><span style="font-size:13px;color:var(--muted)">' + arr.length + '</span>';
            // annotate for tooltip + animation
            chip.dataset.postId = p.id;
            chip.dataset.reaction = r;
            chip.onclick = function (e) { showReactorsTooltip(p.id, r, e.currentTarget); };
            reactionsSummary.appendChild(chip);
          }
        });
      }
      if (reactionsSummary.children.length > 0) body.appendChild(reactionsSummary);

      // determine current user's reaction (if any)
      var userReaction = null;
      try { if (currentUser && p.reactions) { REACTIONS.forEach(function (r) { if ((p.reactions[r] || []).indexOf(currentUser.id) !== -1) userReaction = r; }); } } catch (e) {}

      // primary reaction button shows user's reaction emoji if present
  var likeBtn = el('div', 'action');
  // compute total reactions across all reaction types (better UX than only counting 'like')
  var totalReacts = 0;
  try { REACTIONS.forEach(function (rr) { totalReacts += (p.reactions && p.reactions[rr] ? p.reactions[rr].length : 0); }); } catch (e) { totalReacts = p.likes || 0; }
  var likeCount = totalReacts || (p.likes || 0);
  likeBtn.innerHTML = '<span style="font-size:15px">' + (userReaction ? (REACTION_MAP[userReaction].emoji) : REACTION_MAP['like'].emoji) + '</span> <span>' + likeCount + '</span>';
  likeBtn.onclick = function () { addReaction(p.id, 'like'); };
  likeBtn.dataset.postId = p.id;
  likeBtn.dataset.reaction = 'like';

      var reactBtn = el('div', 'action'); reactBtn.innerHTML = '<span style="font-size:15px">' + (REACTION_MAP['love'].emoji) + '</span> React';
      var reactBox = el('div'); reactBox.className = 'reactions'; reactBox.style.display = 'none';
      // build emoji picker
      REACTIONS.forEach(function (r) {
        var b = el('div', 'reaction');
        b.title = REACTION_MAP[r].label;
        b.style.fontSize = '16px';
        b.style.padding = '6px';
        b.style.cursor = 'pointer';
        b.innerText = REACTION_MAP[r].emoji;
        b.onclick = function () { addReaction(p.id, r); reactBox.style.display = 'none'; };
        b.dataset.postId = p.id;
        b.dataset.reaction = r;
        reactBox.appendChild(b);
      });
      reactBtn.onclick = function () { reactBox.style.display = reactBox.style.display === 'none' ? 'flex' : 'none'; };

      var commentBtn = el('div', 'action'); commentBtn.innerText = '💬 Comment';
  var editBtn = el('div', 'action'); editBtn.innerText = '✏️ Edit'; editBtn.onclick = function () { editPost(p.id); };
      var delBtn = el('div', 'action'); delBtn.innerText = '🗑️ Delete'; delBtn.onclick = function () { deletePost(p.id); };

      actions.appendChild(likeBtn); actions.appendChild(reactBtn); actions.appendChild(reactBox); actions.appendChild(commentBtn); actions.appendChild(editBtn); actions.appendChild(delBtn);
      body.appendChild(actions);

      var commentsDiv = el('div', 'comments');
      var commentList = el('div');
      if (p.comments && p.comments.length > 0) { p.comments.forEach(function (c) { var cm = el('div', 'comment'); cm.innerHTML = '<div class="avatar" style="width:36px;height:36px;border-radius:8px;font-size:14px">' + escapeHtml((c.authorName || 'U').charAt(0)) + '</div><div><div style="font-weight:700;font-size:13px">' + escapeHtml(c.authorName) + '</div><div style="font-size:13px;color:var(--muted)">' + escapeHtml(c.text) + '</div><div style="font-size:11px;color:var(--muted)">' + timeAgo(c.createdAt) + '</div></div>'; commentList.appendChild(cm); }); }
      commentsDiv.appendChild(commentList);

      var commentForm = el('div'); commentForm.style.display = 'flex'; commentForm.style.gap = '8px'; commentForm.style.marginTop = '8px'; var commentInput = el('input'); commentInput.placeholder = 'Write a comment...'; commentInput.style.flex = '1'; var commentSubmit = el('button', 'btn'); commentSubmit.innerText = 'Reply'; commentSubmit.onclick = function () { var txt = commentInput.value.trim(); if (!txt) { alert('Write a comment'); return; } addComment(p.id, txt); commentInput.value = ''; };
      commentForm.appendChild(commentInput); commentForm.appendChild(commentSubmit);
      commentsDiv.appendChild(commentForm);

      node.appendChild(avatar); node.appendChild(body); body.appendChild(commentsDiv);
      postsContainer.appendChild(node);
    });
    // if a reaction just occurred, apply pop animation to the matching element
    try {
      if (lastReactionTrigger && lastReactionTrigger.postId) {
        var pid = lastReactionTrigger.postId;
        var react = lastReactionTrigger.reaction;
        var sel = '[data-post-id]';
        var elMatch = document.querySelector('[data-post-id="' + pid + '"][data-reaction="' + react + '"]') || document.querySelector('[data-post-id="' + pid + '"] [data-reaction="' + react + '"]');
        if (elMatch) {
          elMatch.classList.add('pop');
          setTimeout(function () { elMatch.classList.remove('pop'); }, 420);
        }
      }
    } catch (e) {}
    // clear the transient animation triggers
    lastReactionTrigger = null;
    // clear the transient animation id after render so animation only runs once
    lastCreatedId = null;
  }

  // Helpers for reactors tooltip
  function getReactorNames(postId, reaction) {
    var p = posts.find(function (x) { return x.id === postId; });
    if (!p || !p.reactions) return [];
    var list = p.reactions[reaction] || [];
    var names = list.map(function (id) {
      var u = users.find(function (x) { return x.id === id; });
      if (u) return u.name;
      if (currentUser && currentUser.id === id) return currentUser.name;
      return 'Someone';
    });
    return names;
  }

  var tooltipHideTimer = null;
  function showReactorsTooltip(postId, reaction, targetEl) {
    try {
      if (!reactorsTooltip) return;
      // toggle: if same tooltip is visible, hide it
      try {
        if (reactorsTooltip.classList.contains('show') && reactorsTooltip.dataset.postId === postId && reactorsTooltip.dataset.reaction === reaction) { hideReactorsTooltip(); return; }
      } catch (e) {}
      var names = getReactorNames(postId, reaction);
      if (!names || names.length === 0) {
        reactorsTooltip.innerHTML = '<div class="names">No reactions yet</div>';
      } else {
        var title = (REACTION_MAP[reaction] && REACTION_MAP[reaction].label) ? REACTION_MAP[reaction].label : 'Reactions';
        reactorsTooltip.innerHTML = '<div class="title">' + escapeHtml(title) + '</div><div class="names">' + escapeHtml(names.join(', ')) + '</div>';
      }
  // record current target for toggle checks
  reactorsTooltip.dataset.postId = postId;
  reactorsTooltip.dataset.reaction = reaction;
  // position near target
      var rect = targetEl.getBoundingClientRect();
      var tooltipRect = reactorsTooltip.getBoundingClientRect();
      // center horizontally above the target
      var left = rect.left + (rect.width / 2) - (Math.min(260, tooltipRect.width) / 2);
      var top = rect.top - (tooltipRect.height || 40) - 10;
      // keep inside viewport
      left = Math.max(8, Math.min(left, window.innerWidth - 8 - 260));
      if (top < 8) top = rect.bottom + 12; // drop below if not enough space above
      reactorsTooltip.style.left = left + 'px';
      reactorsTooltip.style.top = top + 'px';
      reactorsTooltip.classList.add('show'); reactorsTooltip.setAttribute('aria-hidden', 'false');
      if (tooltipHideTimer) clearTimeout(tooltipHideTimer);
      tooltipHideTimer = setTimeout(hideReactorsTooltip, 3000);
    } catch (e) { }
  }

  function hideReactorsTooltip() {
    try { if (!reactorsTooltip) return; reactorsTooltip.classList.remove('show'); reactorsTooltip.setAttribute('aria-hidden', 'true'); } catch (e) {}
    if (tooltipHideTimer) { clearTimeout(tooltipHideTimer); tooltipHideTimer = null; }
  }

  // hide tooltip on outside click
  document.addEventListener('click', function (e) {
    try {
      if (!reactorsTooltip) return;
      if (e.target && (e.target.closest('[data-reaction]') || e.target.closest('.reactors-tooltip'))) return;
      hideReactorsTooltip();
    } catch (e) {}
  });

  function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function timeAgo(ts) { var d = new Date(ts); var diff = Math.floor((Date.now() - d) / 1000); if (diff < 60) return diff + 's ago'; if (diff < 3600) return Math.floor(diff / 60) + 'm ago'; if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'; return d.toLocaleString(); }

  // Init sample data
  if (posts.length === 0) { posts = [{ id: uid(), authorId: 'sys', authorName: 'Community', text: 'Welcome to FaceLike — fixed & complete demo! Login to post, react, comment and upload images.', image: '', createdAt: Date.now() - 3600 * 1000, likes: 0, likedBy: [], reactions: {}, comments: [] }]; save(); }

  // Search
  globalSearch.addEventListener('input', function () { renderPosts(); });

  // initialize sort/filter from localStorage
  try {
    var savedSort = localStorage.getItem(LS_SORT);
    var savedFilter = localStorage.getItem(LS_FILTER);
    if (sortSelect && savedSort) sortSelect.value = savedSort;
    if (filterSelect && savedFilter) filterSelect.value = savedFilter;
  } catch (e) { }

  // Helper to keep the visible filter status in sync
  function updateFilterStatus() {
    if (!filterStatus || !filterSelect) return;
    var map = { all: 'All posts', withImage: 'With images', mine: 'My posts' };
    try { filterStatus.innerText = map[filterSelect.value] || filterSelect.value; } catch (e) {}
  }
  updateFilterStatus();

  // Wire up filter pills (buttons) to control the select and keep active state
  var filterPillButtons = Array.prototype.slice.call(document.querySelectorAll('.filter-pills .pill'));
  function updateFilterPills() {
    try {
      var val = (filterSelect && filterSelect.value) || 'all';
      filterPillButtons.forEach(function (b) { if (!b) return; if (b.getAttribute('data-filter') === val) b.classList.add('active'); else b.classList.remove('active'); });
    } catch (e) {}
  }
  updateFilterPills();
  filterPillButtons.forEach(function (b) { if (!b) return; b.addEventListener('click', function () { var v = b.getAttribute('data-filter'); if (!v || !filterSelect) return; filterSelect.value = v; try { localStorage.setItem(LS_FILTER, v); } catch (e) {} updateFilterStatus(); updateFilterPills(); renderPosts(); }); });

  // Sort & filter handlers (persist selection)
  if (sortSelect) sortSelect.addEventListener('change', function () { try { localStorage.setItem(LS_SORT, sortSelect.value); } catch (e) {} renderPosts(); });
  if (filterSelect) filterSelect.addEventListener('change', function () { try { localStorage.setItem(LS_FILTER, filterSelect.value); } catch (e) {} updateFilterStatus(); updateFilterPills(); renderPosts(); });

  // Wire up sort pills
  var sortPillButtons = Array.prototype.slice.call(document.querySelectorAll('.sort-pills .sort-pill'));
  function updateSortPills() {
    try {
      var sv = (sortSelect && sortSelect.value) || 'latest';
      sortPillButtons.forEach(function (b) { if (!b) return; if (b.getAttribute('data-sort') === sv) b.classList.add('active'); else b.classList.remove('active'); });
    } catch (e) {}
  }
  updateSortPills();
  sortPillButtons.forEach(function (b) { if (!b) return; b.addEventListener('click', function () { var v = b.getAttribute('data-sort'); if (!v) return; if (sortSelect) sortSelect.value = v; try { localStorage.setItem(LS_SORT, v); } catch (e) {} updateSortPills(); renderPosts(); }); });

  // Initial state
  applyAuthState();

  // Theme init: apply saved theme or default
  try {
    var savedTheme = localStorage.getItem(LS_THEME) || 'light';
    if (savedTheme === 'dark') document.body.classList.add('dark');
    if (themeToggle) {
      themeToggle.innerText = document.body.classList.contains('dark') ? '☀️' : '🌙';
      // Add smooth transitions on toggle to body and main elements
      themeToggle.addEventListener('click', function () {
        // temporarily add class to trigger transition if missing
        var body = document.body;
        body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
        var mainApp = document.getElementById('mainApp');
        if (mainApp) mainApp.style.transition = 'background-color 0.4s ease, color 0.4s ease';

        body.classList.toggle('dark');
        var isDark = body.classList.contains('dark');

        try { localStorage.setItem(LS_THEME, isDark ? 'dark' : 'light'); } catch (e) {}

        themeToggle.innerText = isDark ? '☀️' : '🌙';

        // Clear the inline styles after transition duration
        setTimeout(function () {
          body.style.transition = '';
          if (mainApp) mainApp.style.transition = '';
        }, 500);
      });
    }
  } catch (e) {}

  // Mobile search: toggle topbar search visibility on small screens
  if (mobileSearchBtn) {
    mobileSearchBtn.addEventListener('click', function () {
      if (!searchBox) return;
      searchBox.classList.toggle('mobile-open');
      var inp = searchBox.querySelector('input');
      if (searchBox.classList.contains('mobile-open') && inp) { setTimeout(function () { inp.focus(); }, 60); }
    });
  }
  // Keep modal controls as a fallback
  if (mobileSearchClose) {
    mobileSearchClose.addEventListener('click', function () { if (!searchModal) return; searchModal.classList.remove('active'); });
  }
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', function () { globalSearch.value = mobileSearchInput.value; renderPosts(); });
    mobileSearchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { if (searchModal) searchModal.classList.remove('active'); } });
  }

  // Profile modal handlers
  if (profileBtn) {
    profileBtn.addEventListener('click', function () {
      if (!currentUser) { openAuth('login'); return; }
      if (!profileModal) return;
      profileNameInput.value = currentUser.name || '';
      profileModal.classList.add('active');
    });
  }
  if (profileCancel) profileCancel.addEventListener('click', function () { if (!profileModal) return; profileModal.classList.remove('active'); });
  if (profileSave) profileSave.addEventListener('click', function () {
    if (!currentUser) return; var v = (profileNameInput.value || '').trim(); if (!v) return alert('Name cannot be empty'); currentUser.name = v; var u = users.find(function (x) { return x.id === currentUser.id; }); if (u) u.name = v; save(); applyAuthState(); if (profileModal) profileModal.classList.remove('active');
  });

  // Lightbox handlers
  var lightboxModal = document.getElementById('lightboxModal');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');
  var lightboxDownload = document.getElementById('lightboxDownload');
  var lightboxShare = document.getElementById('lightboxShare');
  var lightboxImageList = [];
  var lightboxIndex = -1;

  // Toast element
  var toastEl = document.getElementById('toast');

  function showToast(message, ms) {
    try {
      if (!toastEl) return;
      toastEl.classList.remove('hidden');
      toastEl.innerText = message || '';
      setTimeout(function () { toastEl.classList.add('show'); }, 10);
      var t = ms || 2200;
      setTimeout(function () { toastEl.classList.remove('show'); setTimeout(function () { if (toastEl) toastEl.classList.add('hidden'); }, 250); }, t);
    } catch (e) { /* ignore */ }
  }
  function openLightbox(src) {
    if (!lightboxModal || !lightboxImg) return;
    // build list of images from posts in current order
    try {
      lightboxImageList = posts.filter(function (p) { return p.image; }).map(function (p) { return p.image; });
      lightboxIndex = lightboxImageList.indexOf(src);
      if (lightboxIndex === -1) lightboxIndex = 0;
    } catch (e) { lightboxImageList = [src]; lightboxIndex = 0; }
    lightboxImg.src = lightboxImageList[lightboxIndex] || src;
    lightboxModal.classList.add('active');
    // attach keyboard handler
    document.addEventListener('keydown', handleLightboxKeys);
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    if (lightboxImg) lightboxImg.src = '';
    // detach keyboard
    document.removeEventListener('keydown', handleLightboxKeys);
  }
  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  // close on overlay click
  if (lightboxModal) lightboxModal.addEventListener('click', function (e) { if (e.target === lightboxModal) closeLightbox(); });

  // delegate clicks on post images to open the lightbox
  postsContainer.addEventListener('click', function (e) {
    var t = e.target || e.srcElement;
    if (t && t.classList && t.classList.contains('content-img')) { openLightbox(t.src); }
  });

  // lightbox actions: download & share
  if (lightboxDownload) {
    lightboxDownload.addEventListener('click', function () {
      try {
        var url = lightboxImg && lightboxImg.src;
        if (!url) return; var a = document.createElement('a'); a.href = url; a.download = 'image'; document.body.appendChild(a); a.click(); a.remove();
      } catch (e) { showToast('Download failed'); }
    });
  }
  if (lightboxShare) {
    lightboxShare.addEventListener('click', function () {
      try {
        var url = lightboxImg && lightboxImg.src;
        if (!url) return;
        if (navigator.share) {
          navigator.share({ title: 'Shared image', text: 'Check out this image', url: url }).catch(function () {});
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () { showToast('Image URL copied to clipboard'); }, function () { showToast('Copy failed'); });
        } else {
          showToast('Share not supported');
        }
      } catch (e) { showToast('Share failed'); }
    });
  }

  // keyboard navigation for lightbox
  function handleLightboxKeys(ev) {
    if (!lightboxModal || !lightboxModal.classList.contains('active')) return;
    var k = ev.key || ev.keyCode;
    if (k === 'Escape' || k === 'Esc' || k === 27) { closeLightbox(); }
    else if (k === 'ArrowRight' || k === 39) { // next
      if (lightboxImageList.length <= 1) return; lightboxIndex = Math.min(lightboxImageList.length - 1, lightboxIndex + 1); if (lightboxImg) lightboxImg.src = lightboxImageList[lightboxIndex]; }
    else if (k === 'ArrowLeft' || k === 37) { // prev
      if (lightboxImageList.length <= 1) return; lightboxIndex = Math.max(0, lightboxIndex - 1); if (lightboxImg) lightboxImg.src = lightboxImageList[lightboxIndex]; }
  }

  // Debug
  window._FaceLike = { users: users, posts: posts, currentUser: currentUser };
});