/* Shared UI: theme, navigation, hymn player, modern YouTube panel, gift. Never autoplays. */
(function () {
  const STORAGE = {
    theme: "jesus-theme",
    volume: "jesus-volume",
    track: "jesus-track",
    gift: "jesus-gift-seen",
  };

  const HYMNS = [
    {
      id: "a-toi-la-gloire",
      title: "À toi la gloire",
      subtitle: "Mélodie de Haendel — orgue",
      src: "audio/a-toi-la-gloire.mp3",
    },
    {
      id: "amazing-grace",
      title: "Amazing Grace",
      subtitle: "Grâce infinie — cordes",
      src: "audio/amazing-grace.mp3",
    },
    {
      id: "quel-ami-fidele",
      title: "Quel ami fidèle et tendre",
      subtitle: "What a Friend We Have in Jesus",
      src: "audio/quel-ami-fidele.mp3",
    },
    {
      id: "plus-pres-de-toi",
      title: "Plus près de toi, mon Dieu",
      subtitle: "Nearer, My God, to Thee — orchestre",
      src: "audio/plus-pres-de-toi.mp3",
    },
  ];

  const YT_GEDEON = {
    id: "rrBUfTfi2Fc",
    title: "Gédéon (Vaillant héros)",
    artist: "Sony Diaz",
    watch: "https://www.youtube.com/watch?v=rrBUfTfi2Fc",
    channel: "https://www.youtube.com/@Sonydiaz777",
  };

  function asset(path) {
    const script = document.querySelector("script[src*='js/app.js']");
    const base = script ? new URL("../", script.src) : new URL("./", location.href);
    return new URL(path, base).href;
  }

  /* Theme */
  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
      try { localStorage.setItem(STORAGE.theme, theme); } catch (e) {}
    }
  }
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  function toggleTheme() {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
    syncThemeButton();
  }
  function syncThemeButton() {
    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    const dark = currentTheme() === "dark";
    btn.setAttribute("aria-label", dark ? "Passer au thème clair" : "Passer au thème sombre");
    btn.title = dark ? "Thème clair" : "Thème sombre";
    btn.innerHTML = dark
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>';
  }

  /* Nav */
  function initNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.getElementById("site-nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = !nav.classList.contains("is-open");
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
    }
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.addEventListener("click", toggleTheme);
    });
    syncThemeButton();
  }

  /* Player */
  let index = 0;
  let audio;

  function loadSavedIndex() {
    try {
      const n = parseInt(localStorage.getItem(STORAGE.track) || "0", 10);
      if (!isNaN(n) && n >= 0 && n < HYMNS.length) index = n;
    } catch (e) {}
  }

  function renderTrack() {
    const t = HYMNS[index];
    const title = document.querySelector("[data-player-title]");
    const sub = document.querySelector("[data-player-sub]");
    if (title) title.textContent = t.title;
    if (sub) sub.textContent = t.subtitle;
    if (audio) {
      const wasPlaying = !audio.paused;
      audio.src = asset(t.src);
      if (wasPlaying) audio.play().catch(() => {});
    }
    try { localStorage.setItem(STORAGE.track, String(index)); } catch (e) {}
  }

  function setPlaying(playing) {
    const btn = document.querySelector("[data-play]");
    if (!btn) return;
    btn.setAttribute("aria-label", playing ? "Pause" : "Lecture");
    btn.innerHTML = playing
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1"/><rect x="13.5" y="5" width="4.5" height="14" rx="1"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5L8 5.5z"/></svg>';
  }

  function playHymn() {
    if (!audio) return Promise.resolve();
    if (!audio.src) renderTrack();
    return audio.play().catch((err) => {
      console.warn("Lecture bloquée ou impossible :", err && err.message);
    });
  }

  function playPause() {
    if (!audio) return;
    if (!audio.src) renderTrack();
    if (audio.paused) playHymn();
    else audio.pause();
  }

  function initPlayer() {
    const root = document.querySelector("[data-player]");
    if (!root) return;
    loadSavedIndex();
    audio = root.querySelector("audio");
    if (!audio) {
      audio = document.createElement("audio");
      root.prepend(audio);
    }
    audio.setAttribute("playsinline", "");
    audio.preload = "none";

    let volume = 0.8;
    try {
      const v = parseFloat(localStorage.getItem(STORAGE.volume));
      if (!isNaN(v)) volume = Math.min(1, Math.max(0, v));
    } catch (e) {}
    audio.volume = volume;
    const slider = root.querySelector("[data-volume]");
    if (slider) {
      slider.value = String(volume);
      slider.addEventListener("input", () => {
        audio.volume = parseFloat(slider.value);
        try { localStorage.setItem(STORAGE.volume, slider.value); } catch (e) {}
      });
    }

    renderTrack();
    setPlaying(false);

    root.querySelector("[data-play]")?.addEventListener("click", playPause);
    root.querySelector("[data-prev]")?.addEventListener("click", () => {
      const keep = audio && !audio.paused;
      index = (index - 1 + HYMNS.length) % HYMNS.length;
      renderTrack();
      if (keep) playHymn();
    });
    root.querySelector("[data-next]")?.addEventListener("click", () => {
      const keep = audio && !audio.paused;
      index = (index + 1) % HYMNS.length;
      renderTrack();
      if (keep) playHymn();
    });

    audio.addEventListener("play", () => setPlaying(true));
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => {
      index = (index + 1) % HYMNS.length;
      renderTrack();
      playHymn();
    });
    audio.addEventListener("error", () => {
      const title = document.querySelector("[data-player-title]");
      if (title) title.textContent = "Cantique indisponible";
    });
  }

  /* Cantiques modernes — official YouTube embed, never hosted, never autoplay */
  function ensureModernIframe(box) {
    if (box.querySelector("iframe")) return;
    const iframe = document.createElement("iframe");
    iframe.src = "https://www.youtube-nocookie.com/embed/" + YT_GEDEON.id + "?rel=0&modestbranding=1&playsinline=1";
    iframe.title = YT_GEDEON.artist + " — " + YT_GEDEON.title;
    iframe.setAttribute("allow", "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("loading", "lazy");
    box.appendChild(iframe);
  }

  function closeModern() {
    const panel = document.getElementById("modern-panel");
    const btn = document.querySelector("[data-modern]");
    if (!panel) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    if (btn) btn.setAttribute("aria-expanded", "false");
    const iframe = panel.querySelector("iframe");
    if (iframe) iframe.src = iframe.src; /* stop playback without hosting the file */
  }

  function openModern() {
    const panel = document.getElementById("modern-panel");
    const btn = document.querySelector("[data-modern]");
    if (!panel) return;
    if (audio && !audio.paused) audio.pause();
    const box = panel.querySelector("[data-yt]");
    if (box) ensureModernIframe(box);
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function initModern() {
    const btn = document.querySelector("[data-modern]");
    const close = document.querySelector("[data-modern-close]");
    if (btn) {
      btn.addEventListener("click", () => {
        const panel = document.getElementById("modern-panel");
        if (panel && panel.classList.contains("is-open")) closeModern();
        else openModern();
      });
    }
    if (close) close.addEventListener("click", closeModern);
  }

  /* Gift for Luigi Jimenez */
  function shouldShowGift() {
    try {
      if (/(?:^|[?&])cadeau=1(?:&|$)/.test(location.search)) return true;
      return localStorage.getItem(STORAGE.gift) !== "1";
    } catch (e) { return true; }
  }

  function spawnConfetti(root) {
    const box = root.querySelector("[data-confetti]");
    if (!box) return;
    box.innerHTML = "";
    const colors = ["#E0B85A", "#F4E2B8", "#C9A14A", "#E8C4A8", "#ffffff", "#7A3B32"];
    const n = 20;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("i");
      const angle = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.4;
      const dist = 90 + Math.random() * 140;
      el.style.setProperty("--x", 42 + Math.random() * 16 + "%");
      el.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      el.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
      el.style.setProperty("--d", (Math.random() * 0.25) + "s");
      el.style.setProperty("--c", colors[i % colors.length]);
      box.appendChild(el);
    }
  }

  function markGiftSeen() {
    try { localStorage.setItem(STORAGE.gift, "1"); } catch (e) {}
    if (/(?:^|[?&])cadeau=1(?:&|$)/.test(location.search)) {
      const url = new URL(location.href);
      url.searchParams.delete("cadeau");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }

  function hideGift(overlay) {
    overlay.classList.remove("is-on", "is-opening", "is-open");
    document.documentElement.classList.remove("gift-pending");
    document.body.style.overflow = "";
    markGiftSeen();
  }

  function enterGift(overlay) {
    playHymn();
    hideGift(overlay);
  }

  function openGiftBox(overlay) {
    if (overlay.classList.contains("is-opening") || overlay.classList.contains("is-open")) return;
    spawnConfetti(overlay);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    overlay.classList.add("is-opening");
    playHymn(); /* user gesture */
    const reveal = () => {
      overlay.classList.add("is-open");
      const enter = overlay.querySelector("[data-gift-enter]");
      if (enter) enter.focus();
    };
    if (reduced) reveal();
    else setTimeout(reveal, 950);
  }

  function showGift() {
    const overlay = document.getElementById("gift-overlay");
    if (!overlay) return;
    overlay.classList.remove("is-opening", "is-open");
    overlay.classList.add("is-on");
    document.documentElement.classList.add("gift-pending");
    document.body.style.overflow = "hidden";
    const box = overlay.querySelector("[data-gift-box]");
    if (box) box.focus();
  }

  function initGift() {
    const overlay = document.getElementById("gift-overlay");
    if (!overlay) return;

    overlay.querySelector("[data-gift-box]")?.addEventListener("click", () => openGiftBox(overlay));
    overlay.querySelector("[data-gift-enter]")?.addEventListener("click", () => enterGift(overlay));

    document.querySelectorAll("[data-replay-gift]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        try { localStorage.removeItem(STORAGE.gift); } catch (err) {}
        closeModern();
        showGift();
      });
    });

    if (shouldShowGift()) showGift();
    else {
      document.documentElement.classList.remove("gift-pending");
      overlay.classList.remove("is-on");
    }
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    const script = document.querySelector("script[src*='js/app.js']");
    const swUrl = script ? new URL("../sw.js", script.src) : new URL("sw.js", location.href);
    navigator.serviceWorker.register(swUrl.href).catch(() => {});
  }

  window.JesusApp = { play: playHymn, showGift };

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initPlayer();
    initModern();
    initGift();
    registerSW();
  });
})();
