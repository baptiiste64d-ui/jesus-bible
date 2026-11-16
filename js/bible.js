/* Louis Segond 1910 reader: books, chapters, search, last position. */
(function () {
  const KEYS = {
    pos: "jesus-last",
    font: "jesus-font-size",
  };

  const script = document.querySelector("script[src*='js/bible.js']");
  const root = script ? new URL("../", script.src) : new URL("./", location.href);
  const booksUrl = new URL("data/books.json", root).href;

  let manifest = null;
  let currentBook = null;
  let currentId = "John";
  let currentChapter = 1;
  let searchCache = new Map();

  function byId(id) { return manifest.books.find((b) => b.id === id); }
  function bySlug(slug) {
    const s = slug.toLowerCase();
    return manifest.books.find((b) => b.slug === s || b.abbr.toLowerCase() === s || b.name.toLowerCase() === s || b.id.toLowerCase() === s);
  }

  function parseHash() {
    const raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return null;
    const parts = raw.split(".");
    const book = bySlug(parts[0] || "");
    if (!book) return null;
    const chapter = Math.max(1, parseInt(parts[1] || "1", 10) || 1);
    const verse = parts[2] ? parseInt(parts[2], 10) : null;
    return { id: book.id, chapter, verse };
  }

  function setHash(id, chapter, verse, replace) {
    const book = byId(id);
    if (!book) return;
    let h = "#" + book.slug + "." + chapter;
    if (verse) h += "." + verse;
    if (replace) history.replaceState(null, "", h);
    else if (location.hash !== h) history.pushState(null, "", h);
  }

  function savePos(verse, scroll) {
    try {
      localStorage.setItem(KEYS.pos, JSON.stringify({
        id: currentId,
        chapter: currentChapter,
        verse: verse || null,
        scroll: typeof scroll === "number" ? scroll : window.scrollY,
      }));
    } catch (e) {}
  }

  function loadPos() {
    try { return JSON.parse(localStorage.getItem(KEYS.pos) || "null"); }
    catch (e) { return null; }
  }

  async function loadBook(id) {
    const url = new URL("data/lsg/" + id + ".json", root).href;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Livre introuvable");
    return res.json();
  }

  function applyFont(size) {
    const clamped = Math.min(28, Math.max(16, size));
    document.documentElement.style.setProperty("--scripture-size", clamped / 16 + "rem");
    try { localStorage.setItem(KEYS.font, String(clamped)); } catch (e) {}
    const label = document.querySelector("[data-font-label]");
    if (label) label.textContent = clamped + " px";
  }

  function initFont() {
    let size = 19;
    try {
      const n = parseInt(localStorage.getItem(KEYS.font) || "19", 10);
      if (!isNaN(n)) size = n;
    } catch (e) {}
    applyFont(size);
    document.querySelector("[data-font-minus]")?.addEventListener("click", () => {
      const n = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--scripture-size")) * 16;
      applyFont((n || 19) - 1);
    });
    document.querySelector("[data-font-plus]")?.addEventListener("click", () => {
      const n = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--scripture-size")) * 16;
      applyFont((n || 19) + 1);
    });
  }

  function renderChapter(verseToHighlight) {
    const bookMeta = byId(currentId);
    const ch = currentBook.chapters.find((c) => c.c === currentChapter) || currentBook.chapters[0];
    currentChapter = ch.c;
    const reader = document.getElementById("reader");
    const title = bookMeta.name + " " + ch.c;
    document.title = title + " — Louis Segond 1910";
    document.querySelector("[data-picker]") && (document.querySelector("[data-picker]").textContent = title);

    const verses = ch.v.map((v) => {
      const id = "v" + v.n;
      const mark = verseToHighlight && v.n === verseToHighlight ? " is-target" : "";
      return '<span class="verse' + mark + '" id="' + id + '"><sup class="vn">' + v.n + "</sup>" + escapeHtml(v.t) + "</span>";
    }).join("");

    const prev = prevLoc();
    const next = nextLoc();
    reader.innerHTML =
      "<h1>" + escapeHtml(bookMeta.name) + "</h1>" +
      '<p class="meta">Chapitre ' + ch.c + " · Louis Segond 1910 · domaine public</p>" +
      '<div class="scripture">' + verses + "</div>" +
      '<div class="chapter-nav">' +
        (prev ? '<a class="btn btn-ghost" href="#' + prev.hash + '">← ' + prev.label + "</a>" : "<span></span>") +
        (next ? '<a class="btn btn-ghost" href="#' + next.hash + '">' + next.label + " →</a>" : "<span></span>") +
      "</div>";

    document.getElementById("search-results") && (document.getElementById("search-results").hidden = true);
    reader.hidden = false;

    if (verseToHighlight) {
      const el = document.getElementById("v" + verseToHighlight);
      if (el) setTimeout(() => el.scrollIntoView({ block: "center" }), 50);
    } else {
      window.scrollTo(0, 0);
    }
    savePos(verseToHighlight || null, 0);
  }

  function prevLoc() {
    const book = byId(currentId);
    if (currentChapter > 1) {
      return { hash: book.slug + "." + (currentChapter - 1), label: book.name + " " + (currentChapter - 1) };
    }
    const i = manifest.books.findIndex((b) => b.id === currentId);
    if (i > 0) {
      const p = manifest.books[i - 1];
      return { hash: p.slug + "." + p.chapters, label: p.name + " " + p.chapters };
    }
    return null;
  }
  function nextLoc() {
    const book = byId(currentId);
    if (currentChapter < book.chapters) {
      return { hash: book.slug + "." + (currentChapter + 1), label: book.name + " " + (currentChapter + 1) };
    }
    const i = manifest.books.findIndex((b) => b.id === currentId);
    if (i < manifest.books.length - 1) {
      const n = manifest.books[i + 1];
      return { hash: n.slug + ".1", label: n.name + " 1" };
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function openLoc(id, chapter, verse, replaceHash) {
    const book = byId(id);
    if (!book) return;
    currentChapter = Math.min(book.chapters, Math.max(1, chapter || 1));
    if (!currentBook || currentId !== id) {
      currentId = id;
      const status = document.getElementById("status");
      if (status) { status.hidden = false; status.textContent = "Chargement de " + book.name + "…"; }
      try {
        currentBook = await loadBook(id);
      } catch (e) {
        if (status) status.textContent = "Impossible de charger ce livre. Vérifiez votre connexion.";
        return;
      }
      if (status) status.hidden = true;
    }
    setHash(currentId, currentChapter, verse, replaceHash);
    renderChapter(verse || null);
  }

  /* Drawer */
  function openDrawer() {
    const d = document.getElementById("book-drawer");
    d.classList.add("is-open");
    d.setAttribute("aria-hidden", "false");
    renderBookList("AT");
    const filter = document.getElementById("book-filter");
    if (filter) { filter.value = ""; filter.focus(); }
  }
  function closeDrawer() {
    const d = document.getElementById("book-drawer");
    d.classList.remove("is-open");
    d.setAttribute("aria-hidden", "true");
  }

  function renderBookList(testament, query) {
    const q = (query || "").trim().toLowerCase();
    const list = document.getElementById("book-grid");
    const books = manifest.books.filter((b) => {
      if (testament && b.testament !== testament) return false;
      if (!q) return true;
      return (b.name + " " + b.abbr + " " + b.slug).toLowerCase().includes(q);
    });
    list.innerHTML = books.map((b) =>
      '<button type="button" data-open-book="' + b.id + '"' +
      (b.id === currentId ? ' aria-current="true"' : "") + ">" +
      escapeHtml(b.name) + "</button>"
    ).join("");
    document.querySelectorAll("[data-testament]").forEach((t) => {
      t.setAttribute("aria-pressed", String(t.getAttribute("data-testament") === testament));
    });
    renderChapterButtons();
  }

  function renderChapterButtons() {
    const book = byId(currentId);
    const box = document.getElementById("chapter-list");
    if (!book || !box) return;
    box.innerHTML = Array.from({ length: book.chapters }, (_, i) => {
      const n = i + 1;
      return '<button type="button" data-open-ch="' + n + '"' +
        (n === currentChapter ? ' aria-current="true"' : "") + ">" + n + "</button>";
    }).join("");
  }

  /* Search */
  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  async function searchAll(query) {
    const q = normalize(query);
    if (q.length < 2) return [];
    const results = [];
    const status = document.getElementById("status");
    for (let i = 0; i < manifest.books.length; i++) {
      const meta = manifest.books[i];
      if (!searchCache.has(meta.id)) {
        if (status) { status.hidden = false; status.textContent = "Recherche dans " + meta.name + "…"; }
        try { searchCache.set(meta.id, await loadBook(meta.id)); }
        catch (e) { continue; }
      }
      const book = searchCache.get(meta.id);
      for (const ch of book.chapters) {
        for (const v of ch.v) {
          if (normalize(v.t).includes(q)) {
            results.push({ id: meta.id, slug: meta.slug, name: meta.name, c: ch.c, n: v.n, t: v.t });
            if (results.length >= 80) {
              if (status) status.hidden = true;
              return results;
            }
          }
        }
      }
    }
    if (status) status.hidden = true;
    return results;
  }

  function showResults(query, results) {
    const box = document.getElementById("search-results");
    const reader = document.getElementById("reader");
    reader.hidden = true;
    box.hidden = false;
    if (!results.length) {
      box.innerHTML = "<h1>Recherche</h1><p>Aucun verset trouvé pour « " + escapeHtml(query) + " ».</p>";
      return;
    }
    box.innerHTML = "<h1>Recherche</h1><p>" + results.length + (results.length >= 80 ? "+" : "") +
      " résultat" + (results.length > 1 ? "s" : "") + " pour « " + escapeHtml(query) + " ».</p><ol>" +
      results.map((r) =>
        '<li><a href="#' + r.slug + "." + r.c + "." + r.n + '"><span class="s-ref">' +
        escapeHtml(r.name) + " " + r.c + ", " + r.n + '</span><span class="s-text">' +
        escapeHtml(r.t) + "</span></a></li>"
      ).join("") + "</ol>";
  }

  async function onHash() {
    const loc = parseHash();
    if (loc) await openLoc(loc.id, loc.chapter, loc.verse, true);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initFont();
    const status = document.getElementById("status");
    try {
      manifest = await fetch(booksUrl).then((r) => r.json());
    } catch (e) {
      if (status) { status.hidden = false; status.textContent = "Impossible de charger la liste des livres."; }
      return;
    }

    document.querySelector("[data-picker]")?.addEventListener("click", openDrawer);
    document.getElementById("drawer-close")?.addEventListener("click", closeDrawer);
    document.getElementById("book-drawer")?.addEventListener("click", (e) => {
      if (e.target.id === "book-drawer") closeDrawer();
    });
    document.querySelectorAll("[data-testament]").forEach((btn) => {
      btn.addEventListener("click", () => renderBookList(btn.getAttribute("data-testament"), document.getElementById("book-filter").value));
    });
    document.getElementById("book-filter")?.addEventListener("input", (e) => {
      const q = e.target.value;
      renderBookList(q ? null : (document.querySelector('[data-testament][aria-pressed="true"]')?.getAttribute("data-testament") || "AT"), q);
    });
    document.getElementById("book-grid")?.addEventListener("click", async (e) => {
      const id = e.target.getAttribute("data-open-book");
      if (!id) return;
      currentId = id;
      renderChapterButtons();
      await openLoc(id, 1, null, false);
      // keep drawer open to pick a chapter, unless book has 1 chapter
      if (byId(id).chapters === 1) closeDrawer();
    });
    document.getElementById("chapter-list")?.addEventListener("click", async (e) => {
      const n = e.target.getAttribute("data-open-ch");
      if (!n) return;
      await openLoc(currentId, parseInt(n, 10), null, false);
      closeDrawer();
    });

    const form = document.getElementById("search-form");
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = (form.querySelector("input").value || "").trim();
      if (q.length < 2) return;
      const results = await searchAll(q);
      showResults(q, results);
    });

    window.addEventListener("hashchange", onHash);
    window.addEventListener("pagehide", () => savePos(null, window.scrollY));

    const fromHash = parseHash();
    if (fromHash) {
      await openLoc(fromHash.id, fromHash.chapter, fromHash.verse, true);
    } else {
      const last = loadPos();
      if (last && byId(last.id)) {
        await openLoc(last.id, last.chapter, last.verse, true);
        if (last.scroll && !last.verse) window.scrollTo(0, last.scroll);
      } else {
        await openLoc("John", 1, null, true);
      }
    }
  });
})();
