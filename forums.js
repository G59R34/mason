(function () {
  const SUPABASE_URL = "https://hyehyfbnskiybdspkbxe.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_Spz2O3ITj_9Q7cT84pKG6w_2h4yOFyu";
  const CATEGORIES = ["general", "sessions", "flicks", "support"];
  const THREAD_LIMIT = 150;

  const sb = window.msSupabase || (window.msSupabase = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, storageKey: "mason_auth", storage: window.localStorage } }
  ));

  const els = {
    authState: document.getElementById("forumsAuthState"),
    status: document.getElementById("forumsStatus"),
    threadForm: document.getElementById("threadForm"),
    threadTitle: document.getElementById("threadTitle"),
    threadCategory: document.getElementById("threadCategory"),
    threadAuthor: document.getElementById("threadAuthor"),
    threadBody: document.getElementById("threadBody"),
    threadSearch: document.getElementById("threadSearch"),
    threadSort: document.getElementById("threadSort"),
    threadCategoryFilter: document.getElementById("threadCategoryFilter"),
    threadList: document.getElementById("threadList"),
    detailEmpty: document.getElementById("threadDetailEmpty"),
    detail: document.getElementById("threadDetail"),
    detailMeta: document.getElementById("threadDetailMeta"),
    detailBody: document.getElementById("threadDetailBody"),
    replyList: document.getElementById("replyList"),
    replyForm: document.getElementById("replyForm"),
    replyAuthor: document.getElementById("replyAuthor"),
    replyBody: document.getElementById("replyBody")
  };

  let currentUser = null;
  let threads = [];
  let selectedThreadID = null;
  let threadVotes = {};
  let repliesByThread = {};
  let replyVotesByThread = {};

  const guestKey = ensureGuestKey();

  function ensureGuestKey() {
    const key = "ms_forums_guest_key";
    let value = localStorage.getItem(key);
    if (!value) {
      value = "guest-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, value);
    }
    return value;
  }

  function voterKey() {
    return currentUser && currentUser.id ? currentUser.id : guestKey;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function prettyDate(value) {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  }

  function categoryLabel(value) {
    if (!value) return "General";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function setStatus(message, isError) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.style.color = isError ? "#f87171" : "";
  }

  function syncAuthStateUI() {
    if (!els.authState) return;
    if (currentUser && currentUser.id) {
      const display = currentUser.user_metadata && currentUser.user_metadata.full_name
        ? currentUser.user_metadata.full_name
        : (currentUser.email || "Signed in");
      els.authState.textContent = "Signed in: " + display;
      els.authState.className = "badge";
      els.threadAuthor.value = "";
      els.threadAuthor.disabled = true;
      els.threadAuthor.placeholder = "Signed-in posts are verified";
      els.replyAuthor.value = "";
      els.replyAuthor.disabled = true;
      els.replyAuthor.placeholder = "Signed-in replies are verified";
    } else {
      els.authState.textContent = "Guest mode";
      els.authState.className = "badge";
      els.threadAuthor.disabled = false;
      els.threadAuthor.placeholder = "Display name (guest only)";
      els.replyAuthor.disabled = false;
      els.replyAuthor.placeholder = "Display name (guest only)";
    }
  }

  async function refreshAuthState() {
    try {
      const { data } = await sb.auth.getUser();
      currentUser = data && data.user ? data.user : null;
    } catch (_) {
      currentUser = null;
    }
    syncAuthStateUI();
  }

  async function loadThreads() {
    const { data, error } = await sb
      .from("forums_threads")
      .select("id,title,body,category,author_name,owner,verified,locked,reply_count,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(THREAD_LIMIT);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("could not find the table") || msg.includes("relation") || msg.includes("forums_threads")) {
        setStatus("Forums tables are missing. Run forums_supabase_setup.sql in Supabase SQL editor.", true);
      } else {
        setStatus("Failed loading threads: " + (error.message || "Unknown error"), true);
      }
      threads = [];
      renderThreadList();
      renderSelectedThread();
      return;
    }

    threads = data || [];
    await loadThreadVotes();
    renderThreadList();

    if (!selectedThreadID && threads.length) {
      selectedThreadID = threads[0].id;
    } else if (selectedThreadID && !threads.find((t) => t.id === selectedThreadID)) {
      selectedThreadID = threads.length ? threads[0].id : null;
    }

    await renderSelectedThread();
    setStatus("");
  }

  async function loadThreadVotes() {
    const ids = threads.map((t) => t.id);
    threadVotes = {};
    if (!ids.length) return;

    const { data } = await sb
      .from("forums_votes")
      .select("thread_id,vote")
      .in("thread_id", ids);

    (data || []).forEach((row) => {
      if (!row.thread_id) return;
      threadVotes[row.thread_id] = (threadVotes[row.thread_id] || 0) + Number(row.vote || 0);
    });
  }

  async function loadReplies(threadID) {
    const { data, error } = await sb
      .from("forums_replies")
      .select("id,thread_id,body,author_name,owner,verified,created_at")
      .eq("thread_id", threadID)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus("Failed loading replies: " + (error.message || "Unknown error"), true);
      repliesByThread[threadID] = [];
      replyVotesByThread[threadID] = {};
      return;
    }

    repliesByThread[threadID] = data || [];
    await loadReplyVotes(threadID);
  }

  async function loadReplyVotes(threadID) {
    const replies = repliesByThread[threadID] || [];
    const ids = replies.map((r) => r.id);
    replyVotesByThread[threadID] = {};
    if (!ids.length) return;

    const { data } = await sb
      .from("forums_votes")
      .select("reply_id,vote")
      .in("reply_id", ids);

    (data || []).forEach((row) => {
      if (!row.reply_id) return;
      replyVotesByThread[threadID][row.reply_id] = (replyVotesByThread[threadID][row.reply_id] || 0) + Number(row.vote || 0);
    });
  }

  function filteredThreads() {
    const q = (els.threadSearch.value || "").trim().toLowerCase();
    const category = els.threadCategoryFilter.value || "all";
    const sort = els.threadSort.value || "recent";

    let rows = threads.filter((thread) => {
      const categoryMatch = category === "all" || thread.category === category;
      if (!categoryMatch) return false;
      if (!q) return true;
      const haystack = [thread.title, thread.body, thread.author_name, thread.category]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    rows = rows.slice().sort((a, b) => {
      if (sort === "top") {
        const av = threadVotes[a.id] || 0;
        const bv = threadVotes[b.id] || 0;
        if (bv !== av) return bv - av;
      }
      if (sort === "active") {
        const ar = Number(a.reply_count || 0);
        const br = Number(b.reply_count || 0);
        if (br !== ar) return br - ar;
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return rows;
  }

  function renderThreadList() {
    const rows = filteredThreads();
    if (!rows.length) {
      els.threadList.innerHTML = '<div class="forums-empty">No threads found.</div>';
      return;
    }
    els.threadList.innerHTML = rows.map((thread) => {
      const score = threadVotes[thread.id] || 0;
      const verified = !!(thread.verified || thread.owner);
      const active = selectedThreadID === thread.id ? "active" : "";
      const category = categoryLabel(thread.category || "general");
      const author = escapeHtml(thread.author_name || "Anonymous");
      return `
        <article class="forums-thread-item ${active}" data-thread-id="${thread.id}">
          <h3 class="forums-thread-title">${escapeHtml(thread.title)}</h3>
          <div class="forums-thread-meta">
            <span>${author}</span>
            ${verified ? '<span class="verified-badge">VERIFIED</span>' : ""}
            <span class="badge">${category}</span>
            <span>${prettyDate(thread.created_at)}</span>
          </div>
          <p class="muted" style="margin:8px 0 0;">${escapeHtml((thread.body || "").slice(0, 160))}${(thread.body || "").length > 160 ? "..." : ""}</p>
          <div class="forums-controls">
            <span class="badge">Score ${score}</span>
            <span class="badge">${Number(thread.reply_count || 0)} replies</span>
            ${thread.locked ? '<span class="badge">Locked</span>' : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  async function renderSelectedThread() {
    if (!selectedThreadID) {
      els.detailEmpty.style.display = "block";
      els.detail.style.display = "none";
      return;
    }

    const thread = threads.find((t) => t.id === selectedThreadID);
    if (!thread) {
      els.detailEmpty.style.display = "block";
      els.detail.style.display = "none";
      return;
    }

    if (!repliesByThread[selectedThreadID]) {
      await loadReplies(selectedThreadID);
    }

    els.detailEmpty.style.display = "none";
    els.detail.style.display = "block";

    const verified = !!(thread.verified || thread.owner);
    const score = threadVotes[thread.id] || 0;
    els.detailMeta.innerHTML = `
      <h2 style="margin:0 0 8px;">${escapeHtml(thread.title)}</h2>
      <div class="forums-thread-meta">
        <span>${escapeHtml(thread.author_name || "Anonymous")}</span>
        ${verified ? '<span class="verified-badge">VERIFIED</span>' : ""}
        <span class="badge">${categoryLabel(thread.category)}</span>
        <span>${prettyDate(thread.created_at)}</span>
      </div>
      <div class="forums-controls">
        <button type="button" class="forums-vote-btn" data-thread-vote="1">Upvote</button>
        <button type="button" class="forums-vote-btn down" data-thread-vote="-1">Downvote</button>
        <span class="badge">Score ${score}</span>
        ${thread.locked ? '<span class="badge">Thread locked</span>' : ""}
      </div>
    `;
    els.detailBody.textContent = thread.body || "";

    const replies = repliesByThread[selectedThreadID] || [];
    const votes = replyVotesByThread[selectedThreadID] || {};
    if (!replies.length) {
      els.replyList.innerHTML = '<div class="forums-empty">No replies yet.</div>';
    } else {
      els.replyList.innerHTML = replies.map((reply) => {
        const replyVerified = !!(reply.verified || reply.owner);
        const replyScore = votes[reply.id] || 0;
        return `
          <article class="forums-reply-item">
            <div class="forums-reply-meta">
              <span>${escapeHtml(reply.author_name || "Anonymous")}</span>
              ${replyVerified ? '<span class="verified-badge">VERIFIED</span>' : ""}
              <span>${prettyDate(reply.created_at)}</span>
            </div>
            <p style="margin:8px 0 0;white-space:pre-wrap;">${escapeHtml(reply.body || "")}</p>
            <div class="forums-controls">
              <button type="button" class="forums-vote-btn" data-reply-id="${reply.id}" data-reply-vote="1">Upvote</button>
              <button type="button" class="forums-vote-btn down" data-reply-id="${reply.id}" data-reply-vote="-1">Downvote</button>
              <span class="badge">Score ${replyScore}</span>
            </div>
          </article>
        `;
      }).join("");
    }

    els.replyBody.disabled = !!thread.locked;
    els.replyForm.querySelector("button[type='submit']").disabled = !!thread.locked;
  }

  function currentAuthorName(guestInput) {
    if (currentUser && currentUser.id) {
      if (currentUser.user_metadata && currentUser.user_metadata.full_name) return currentUser.user_metadata.full_name;
      if (currentUser.email) return currentUser.email;
      return "Member";
    }
    const guest = (guestInput || "").trim();
    return guest || "Guest";
  }

  async function createThread(event) {
    event.preventDefault();
    const title = (els.threadTitle.value || "").trim();
    const body = (els.threadBody.value || "").trim();
    const category = (els.threadCategory.value || "general").trim().toLowerCase();

    if (!title || !body) return;
    if (!CATEGORIES.includes(category)) {
      setStatus("Invalid category.", true);
      return;
    }

    const payload = {
      title,
      body,
      category,
      author_name: currentAuthorName(els.threadAuthor.value),
      verified: !!(currentUser && currentUser.id)
    };
    if (currentUser && currentUser.id) payload.owner = currentUser.id;

    const { error } = await sb.from("forums_threads").insert([payload]);
    if (error) {
      setStatus("Failed posting thread: " + (error.message || "Unknown error"), true);
      return;
    }

    els.threadForm.reset();
    syncAuthStateUI();
    setStatus("Thread posted.");
    await loadThreads();
  }

  async function createReply(event) {
    event.preventDefault();
    if (!selectedThreadID) return;
    const thread = threads.find((t) => t.id === selectedThreadID);
    if (!thread || thread.locked) return;

    const body = (els.replyBody.value || "").trim();
    if (!body) return;

    const payload = {
      thread_id: selectedThreadID,
      body,
      author_name: currentAuthorName(els.replyAuthor.value),
      verified: !!(currentUser && currentUser.id)
    };
    if (currentUser && currentUser.id) payload.owner = currentUser.id;

    const { error } = await sb.from("forums_replies").insert([payload]);
    if (error) {
      setStatus("Failed posting reply: " + (error.message || "Unknown error"), true);
      return;
    }

    els.replyForm.reset();
    syncAuthStateUI();
    setStatus("Reply posted.");
    repliesByThread[selectedThreadID] = null;
    await loadThreads();
  }

  async function voteThread(value) {
    if (!selectedThreadID) return;
    const vote = Number(value);
    if (vote !== 1 && vote !== -1) return;

    const payload = {
      thread_id: selectedThreadID,
      reply_id: null,
      voter_key: voterKey(),
      vote
    };
    if (currentUser && currentUser.id) payload.owner = currentUser.id;

    const { error } = await sb
      .from("forums_votes")
      .upsert(payload, { onConflict: "thread_id,voter_key" });

    if (error) {
      setStatus("Failed voting on thread: " + (error.message || "Unknown error"), true);
      return;
    }
    await loadThreads();
  }

  async function voteReply(replyID, value) {
    const vote = Number(value);
    if (!replyID || (vote !== 1 && vote !== -1)) return;

    const payload = {
      thread_id: null,
      reply_id: replyID,
      voter_key: voterKey(),
      vote
    };
    if (currentUser && currentUser.id) payload.owner = currentUser.id;

    const { error } = await sb
      .from("forums_votes")
      .upsert(payload, { onConflict: "reply_id,voter_key" });

    if (error) {
      setStatus("Failed voting on reply: " + (error.message || "Unknown error"), true);
      return;
    }
    repliesByThread[selectedThreadID] = null;
    await loadThreads();
  }

  function wireEvents() {
    sb.auth.onAuthStateChange(async () => {
      await refreshAuthState();
    });

    els.threadForm.addEventListener("submit", createThread);
    els.replyForm.addEventListener("submit", createReply);

    [els.threadSearch, els.threadCategoryFilter, els.threadSort].forEach((input) => {
      input.addEventListener("input", renderThreadList);
      input.addEventListener("change", renderThreadList);
    });

    els.threadList.addEventListener("click", async (event) => {
      const item = event.target.closest("[data-thread-id]");
      if (!item) return;
      selectedThreadID = item.getAttribute("data-thread-id");
      renderThreadList();
      await renderSelectedThread();
    });

    els.detail.addEventListener("click", async (event) => {
      const threadVote = event.target.getAttribute("data-thread-vote");
      if (threadVote) {
        await voteThread(threadVote);
        return;
      }
      const replyID = event.target.getAttribute("data-reply-id");
      const replyVote = event.target.getAttribute("data-reply-vote");
      if (replyID && replyVote) {
        await voteReply(replyID, replyVote);
      }
    });

    sb.channel("forums:threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "forums_threads" }, () => {
        loadThreads();
      })
      .subscribe();

    sb.channel("forums:replies")
      .on("postgres_changes", { event: "*", schema: "public", table: "forums_replies" }, () => {
        if (selectedThreadID) repliesByThread[selectedThreadID] = null;
        loadThreads();
      })
      .subscribe();

    sb.channel("forums:votes")
      .on("postgres_changes", { event: "*", schema: "public", table: "forums_votes" }, () => {
        if (selectedThreadID) repliesByThread[selectedThreadID] = null;
        loadThreads();
      })
      .subscribe();
  }

  (async function init() {
    wireEvents();
    await refreshAuthState();
    await loadThreads();
  })();
})();
