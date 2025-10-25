/* Main JS to add interactivity and simple animations across pages (no backend)
   Features:
   - Global: active sidebar, header search filter, notifications toast, theme toggle, mobile sidebar toggle
   - Widgets: quick draft (localStorage), tasks delete/toggle, progress bars animate, table sort
   - Pages: settings persistence, widget visibility, courses modal/enroll, friends remove, files upload simulate, plans select
   - UI: toasts, confirm modal, ripple, scroll reveal, count-up numbers
*/
(function () {
  "use strict";

  // ---------- Utils ----------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const on = (el, ev, handler, opts) =>
    el && el.addEventListener(ev, handler, opts);
  const delegate = (root, selector, type, handler) => {
    on(root, type, (e) => {
      const t = e.target.closest(selector);
      if (t && root.contains(t)) handler(e, t);
    });
  };
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const fmt = (n) => n.toLocaleString();

  // Storage
  const PFX = "felopateer:";
  const save = (key, value) =>
    localStorage.setItem(PFX + key, JSON.stringify(value));
  const load = (key, fallback = null) => {
    try {
      const v = localStorage.getItem(PFX + key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };

  // ---------- UI elements ----------
  // Toasts
  const ensureToastHost = () => {
    let host = $("#toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      document.body.appendChild(host);
    }
    return host;
  };
  const toast = (msg, type = "info", timeout = 2600) => {
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    }, timeout);
  };

  // Confirm modal
  const ensureModalHost = () => {
    let host = $("#modal-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "modal-host";
      document.body.appendChild(host);
    }
    return host;
  };
  const confirmModal = (
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel"
  ) =>
    new Promise((resolve) => {
      const host = ensureModalHost();
      const wrap = document.createElement("div");
      wrap.className = "modal-overlay show";
      wrap.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">${message}</div>
        <div class="modal-actions">
          <button class="btn btn-secondary">${cancelText}</button>
          <button class="btn btn-primary">${confirmText}</button>
        </div>
      </div>`;
      host.appendChild(wrap);
      const close = (ok) => {
        wrap.classList.remove("show");
        wrap.addEventListener(
          "transitionend",
          () => {
            wrap.remove();
            resolve(ok);
          },
          { once: true }
        );
      };
      delegate(wrap, ".modal-close, .btn-secondary", "click", () =>
        close(false)
      );
      delegate(wrap, ".btn-primary", "click", () => close(true));
      on(wrap, "click", (e) => {
        if (e.target === wrap) close(false);
      });
      on(document, "keydown", function esc(e) {
        if (e.key === "Escape") {
          close(false);
          document.removeEventListener("keydown", esc);
        }
      });
    });

  // Ripple effect
  const addRipple = (el) => {
    if (!el) return;
    el.classList.add("ripple-container");
    on(el, "click", (e) => {
      const rect = el.getBoundingClientRect();
      const circle = document.createElement("span");
      const d = Math.max(rect.width, rect.height);
      circle.style.width = circle.style.height = d + "px";
      circle.style.left = e.clientX - rect.left - d / 2 + "px";
      circle.style.top = e.clientY - rect.top - d / 2 + "px";
      circle.className = "ripple";
      el.appendChild(circle);
      circle.addEventListener("animationend", () => circle.remove());
    });
  };

  // Scroll reveal
  const revealOnScroll = (targets = []) => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("reveal-show");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
  };

  // Progress bar animation
  const animateProgressBars = (root = document) => {
    const spans = $$(".progress > span", root).filter(
      (s) => !s.dataset.animated
    );
    if (!spans.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const s = en.target;
            s.dataset.animated = "1";
            const target = parseInt(
              (s.getAttribute("style") || "").match(/width:\s*(\d+)%/i)?.[1] ||
                "0",
              10
            );
            s.style.width = "0%";
            s.style.transition = "width 1.2s ease";
            requestAnimationFrame(() => {
              s.style.width = clamp(target, 0, 100) + "%";
            });
            io.unobserve(s);
          }
        });
      },
      { threshold: 0.2 }
    );
    spans.forEach((s) => io.observe(s));
  };

  // Count up numbers for visible stats
  const countUp = (el, target, duration = 1200) => {
    const start = performance.now();
    const from = parseInt(el.textContent.replace(/[^0-9]/g, "") || "0", 10);
    const to = parseInt(String(target).replace(/[^0-9]/g, "") || "0", 10);
    const step = (ts) => {
      const p = clamp((ts - start) / duration, 0, 1);
      const v = Math.round(from + (to - from) * p);
      el.textContent = fmt(v);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // ---------- Global behaviors ----------
  const highlightActiveSidebar = () => {
    const path = (
      location.pathname.split("/").pop() || "index.html"
    ).toLowerCase();
    $$(".sidebar a").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      a.classList.toggle("active", href === path);
    });
  };

  const setupHeaderSearch = () => {
    const input = $('.head .search input[type="search"]');
    if (!input) return;

    // Optimized: query only when needed, cache text on first use
    let cache = null;
    const buildCache = () => {
      const items = [
        ...$$(".widget-shape"),
        ...$$(".projects-page .project"),
        ...$$(".courses-page .course"),
        ...$$(".friends-page .friend"),
        ...$$(".files-page .files-content .file"),
        ...$$("table tbody tr"),
        ...$$(".news-row"),
        ...$$(".task-row"),
      ].filter(Boolean);
      return items.map((el) => ({
        el,
        text: el.textContent.toLowerCase().replace(/\s+/g, " ").trim(),
      }));
    };

    // Debounce helper (reduces filtering calls on rapid typing)
    let debounceTimer;
    const debounce = (fn, delay = 150) => {
      return (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fn(...args), delay);
      };
    };

    const filter = () => {
      if (!cache) cache = buildCache();
      const q = input.value.trim().toLowerCase();
      if (!q) {
        // Show all if empty
        cache.forEach(({ el }) => (el.style.display = ""));
        return;
      }
      // Optimized: batch style updates and use requestAnimationFrame for smoother UI
      requestAnimationFrame(() => {
        cache.forEach(({ el, text }) => {
          el.style.display = text.includes(q) ? "" : "none";
        });
      });
    };

    on(input, "input", debounce(filter, 150));
  };

  const setupNotifications = () => {
    delegate(document, ".head .notification", "click", () =>
      toast("No new notifications")
    );
  };

  // (Removed) Floating theme and menu toggles

  // Site closed banner if enabled in settings
  const setupMaintenanceBanner = () => {
    const siteCtrl = load("settings:siteControl", {
      enabled: true,
      message: "",
    });
    const existing = $("#maintenance-banner");
    if (existing) existing.remove();
    if (!siteCtrl.enabled) {
      const b = document.createElement("div");
      b.id = "maintenance-banner";
      b.innerHTML = `<strong>Maintenance:</strong> ${
        siteCtrl.message || "The site is currently under maintenance."
      }`;
      document.body.prepend(b);
    }
  };

  // ---------- Index page widgets ----------
  const setupQuickDraft = () => {
    const form = $(".quick-draft form");
    if (!form) return;
    const title = form.querySelector('input[type="text"]');
    const body = form.querySelector("textarea");
    on(form, "submit", (e) => {
      e.preventDefault();
      const drafts = load("drafts", []);
      const data = {
        id: Date.now(),
        title: title.value.trim(),
        body: body.value.trim(),
      };
      if (!data.title && !data.body) return toast("Draft is empty", "warn");
      drafts.unshift(data);
      save("drafts", drafts.slice(0, 20));
      title.value = "";
      body.value = "";
      toast("Draft saved");
    });
  };

  const setupTasks = () => {
    const root = $(".latest-tasks");
    if (!root) return;
    // Delete
    delegate(root, ".task-row .delete", "click", async (e, btn) => {
      const row = btn.closest(".task-row");
      if (!row || row.classList.contains("done")) return;
      const ok = await confirmModal(
        "Delete task",
        "Are you sure you want to delete this task?"
      );
      if (ok) {
        row.style.opacity = "0";
        row.style.transform = "translateX(-10px)";
        row.addEventListener("transitionend", () => row.remove(), {
          once: true,
        });
        row.style.transition = "opacity .25s ease, transform .25s ease";
      }
    });
    // Toggle done
    delegate(root, ".task-row .info", "click", (e, info) => {
      const row = info.closest(".task-row");
      row.classList.toggle("done");
    });
  };

  const setupTableSort = () => {
    const table = $(".projects table");
    if (!table) return;
    const thead = table.tHead;
    if (!thead) return;
    $$("td", thead.rows[0]).forEach((cell, idx) => {
      cell.style.cursor = "pointer";
      on(cell, "click", () => {
        const tbody = table.tBodies[0];
        const rows = Array.from(tbody.rows);
        const asc = !(cell.dataset.asc === "1");
        rows.sort((a, b) => {
          const av = a.cells[idx].textContent.trim();
          const bv = b.cells[idx].textContent.trim();
          const an = parseFloat(av.replace(/[^0-9.\-]/g, ""));
          const bn = parseFloat(bv.replace(/[^0-9.\-]/g, ""));
          const bothNum = !isNaN(an) && !isNaN(bn);
          let cmp = bothNum ? an - bn : av.localeCompare(bv);
          if (!asc) cmp = -cmp;
          return cmp;
        });
        cell.dataset.asc = asc ? "1" : "0";
        rows.forEach((r) => tbody.appendChild(r));
      });
    });
  };

  const setupCountUps = () => {
    // Tickets stats and Top Search counts
    const nums = [
      ...$$(".tickets .box .d-block.c-black.fw-bold.fs-25"),
      ...$$(".search-items .items span.bg-eee"),
    ];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const el = en.target;
            const target = el.textContent;
            countUp(el, target, 1000);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.6 }
    );
    nums.forEach((el) => io.observe(el));
  };

  // ---------- Settings page ----------
  const setupSettings = () => {
    const page = $(".settings-page");
    if (!page) return;

    // Site Control
    const siteToggle = $(".site-control .toggle-checkbox", page);
    const siteMsg = $(".site-control .close-message", page);
    const siteState = load("settings:siteControl", {
      enabled: true,
      message: "",
    });
    if (siteToggle) siteToggle.checked = !!siteState.enabled;
    if (siteMsg) siteMsg.value = siteState.message || "";
    on(siteToggle, "change", () => {
      save("settings:siteControl", {
        enabled: siteToggle.checked,
        message: siteMsg?.value || "",
      });
      toast(siteToggle.checked ? "Site opened" : "Site closed");
    });
    on(siteMsg, "input", () =>
      save("settings:siteControl", {
        enabled: siteToggle?.checked !== false,
        message: siteMsg.value,
      })
    );

    // General Info
    const first = $("#first", page),
      last = $("#last", page),
      email = $("#email", page);
    const general = load("settings:general", {
      first: "",
      last: "",
      email: email?.value || "",
    });
    if (first) first.value = general.first || "";
    if (last) last.value = general.last || "";
    if (email) email.value = general.email || email.value || "";
    [first, last].forEach((inp) =>
      on(inp, "input", () =>
        save("settings:general", {
          first: first?.value || "",
          last: last?.value || "",
          email: email?.value || "",
        })
      )
    );
    const changeEmail = $(".general-info a.c-blue", page);
    if (changeEmail && email) {
      on(changeEmail, "click", (e) => {
        e.preventDefault();
        const dis = email.disabled;
        email.disabled = !dis;
        if (!email.disabled) email.focus();
        toast(email.disabled ? "Email locked" : "Email editable");
      });
      on(email, "blur", () => {
        save("settings:general", {
          first: first?.value || "",
          last: last?.value || "",
          email: email.value,
        });
        email.disabled = true;
        toast("Email saved");
      });
    }

    // Social
    const socialInputs = $$(".social-info input", page);
    const social = load(
      "settings:social",
      socialInputs.reduce(
        (a, inp) => ((a[inp.placeholder.split(" ")[0].toLowerCase()] = ""), a),
        {}
      )
    );
    socialInputs.forEach((inp) => {
      inp.value = social[inp.placeholder.split(" ")[0].toLowerCase()] || "";
      on(inp, "input", () => {
        social[inp.placeholder.split(" ")[0].toLowerCase()] = inp.value;
        save("settings:social", social);
      });
    });

    // Widgets Control (applies on Dashboard)
    const widgetsMap = {
      one: ".quick-draft",
      two: ".targets",
      three: ".tickets",
      four: ".latest-news",
      five: ".latest-tasks",
      six: ".search-items",
    };
    const widgetsState = load("settings:widgets", {});
    Object.entries(widgetsMap).forEach(([id, sel]) => {
      const ch = $("#" + id, page);
      if (!ch) return;
      ch.checked = widgetsState[id] !== false; // default true
      on(ch, "change", () => {
        widgetsState[id] = ch.checked;
        save("settings:widgets", widgetsState);
        toast("Widget visibility saved");
      });
    });

    // Backup Manager
    const timeRadios = $$('.backup-manager .time input[type="radio"]', page);
    const serversRadios = $$('.backup-manager input[name="servers"]', page);
    const backup = load("settings:backup", {
      time: "daily",
      server: "server-two",
    });
    timeRadios.forEach((r) => {
      r.checked = r.id === backup.time;
      on(r, "change", () => {
        if (r.checked) {
          backup.time = r.id;
          save("settings:backup", backup);
          toast("Backup time: " + r.id);
        }
      });
    });
    serversRadios.forEach((r) => {
      r.checked = r.id === backup.server;
      on(r, "change", () => {
        if (r.checked) {
          backup.server = r.id;
          save("settings:backup", backup);
          toast("Backup server: " + r.id);
        }
      });
    });
  };

  // Apply widget visibility on Dashboard (based on settings)
  const applyDashboardWidgetVisibility = () => {
    const root = $(".wrapper");
    if (!root) return;
    const widgetsState = load("settings:widgets", {});
    const map = {
      one: ".quick-draft",
      two: ".targets",
      three: ".tickets",
      four: ".latest-news",
      five: ".latest-tasks",
      six: ".search-items",
    };
    Object.entries(map).forEach(([id, sel]) => {
      const el = $(sel);
      if (el) el.style.display = widgetsState[id] === false ? "none" : "";
    });
  };

  // ---------- Courses page ----------
  const setupCourses = () => {
    const cards = $$(".courses-page .course");
    if (!cards.length) return;
    const enrolled = new Set(load("courses:enrolled", []));

    cards.forEach((card, idx) => {
      const title = card.querySelector("h4")?.textContent.trim() || "Course";
      // Badge for enrolled
      const badge = document.createElement("span");
      badge.className = "chip enrolled-badge";
      badge.textContent = "Enrolled";
      if (enrolled.has(title)) card.appendChild(badge);
      // Open info modal
      delegate(card, ".info .title", "click", () => {
        const desc =
          card.querySelector(".description")?.textContent.trim() || "";
        const price =
          card
            .querySelector(".info .fa-dollar-sign")
            ?.parentElement?.textContent.trim() || "";
        confirmModal(
          title,
          `${desc}<br/><br/><strong>${price}</strong>`,
          enrolled.has(title) ? "Unenroll" : "Enroll",
          "Close"
        ).then((ok) => {
          if (!ok) return;
          if (enrolled.has(title)) {
            enrolled.delete(title);
            toast("Unenrolled");
          } else {
            enrolled.add(title);
            toast("Enrolled");
          }
          save("courses:enrolled", Array.from(enrolled));
          if (enrolled.has(title)) card.appendChild(badge);
          else badge.remove();
        });
      });
    });
  };

  // ---------- Friends page ----------
  const setupFriends = () => {
    const root = $(".friends-page");
    if (!root) return;

    // Remove contact icons
    $$(".friend .contact", root).forEach((el) => el.remove());

    // Profile popup (no ripple)
    delegate(root, ".info a.bg-blue", "click", async (e, a) => {
      e.preventDefault();
      e.stopPropagation();

      const card = a.closest(".friend");
      if (!card) return;

      const name = card.querySelector("h4")?.textContent.trim() || "Friend";
      const role =
        card.querySelector("p.c-grey")?.textContent.trim() || "No role";
      const imgSrc = card.querySelector("img")?.src || "";
      const friendsCount =
        card
          .querySelector(".icons div:nth-child(1) span")
          ?.textContent.trim() || "0";
      const projectsCount =
        card
          .querySelector(".icons div:nth-child(2) span")
          ?.textContent.trim() || "0";
      const articlesCount =
        card
          .querySelector(".icons div:nth-child(3) span")
          ?.textContent.trim() || "0";
      const joined =
        card.querySelector(".info .c-grey")?.textContent.trim() || "Unknown";
      const isVip = card.querySelector(".vip") !== null;

      const popup = document.createElement("div");
      popup.className = "modal-overlay show";
      popup.innerHTML = `
        <div class="modal friend-popup">
          <div class="modal-header">
            <h3>Profile</h3>
            <button class="modal-close" aria-label="Close">×</button>
          </div>
          <div class="modal-body" style="text-align: center;">
            <img src="${imgSrc}" alt="${name}" style="width: 100px; height: 100px; border-radius: 50%; margin-bottom: 15px;">
            <h3 style="margin: 0 0 5px;">${name}</h3>
            <p style="color: #888; margin: 0 0 15px;">${role}</p>
            ${
              isVip
                ? '<span style="color: #f59e0b; font-weight: bold;">VIP</span>'
                : ""
            }
            <div style="margin-top: 20px; text-align: left; padding: 0 20px;">
              <p><i class="fa-regular fa-face-smile fa-fw"></i> <strong>Friends:</strong> ${friendsCount}</p>
              <p><i class="fa-solid fa-code-commit fa-fw"></i> <strong>Projects:</strong> ${projectsCount}</p>
              <p><i class="fa-regular fa-newspaper fa-fw"></i> <strong>Articles:</strong> ${articlesCount}</p>
              <p><i class="fa-regular fa-calendar fa-fw"></i> <strong>${joined}</strong></p>
            </div>
          </div>
        </div>`;

      const host = ensureModalHost();
      host.appendChild(popup);

      const close = () => {
        popup.classList.remove("show");
        popup.addEventListener("transitionend", () => popup.remove(), {
          once: true,
        });
      };

      delegate(popup, ".modal-close", "click", close);
      on(popup, "click", (ev) => {
        if (ev.target === popup) close();
      });
      on(document, "keydown", function esc(ev) {
        if (ev.key === "Escape") {
          close();
          document.removeEventListener("keydown", esc);
        }
      });
    });

    // Remove button (no ripple, smooth effect, no localStorage)
    delegate(root, ".info a.bg-red", "click", async (e, a) => {
      e.preventDefault();
      e.stopPropagation();

      const card = a.closest(".friend");
      if (!card) return;

      const name =
        card.querySelector("h4")?.textContent.trim() || "this friend";
      const ok = await confirmModal("Remove Friend", `Remove ${name}?`);
      if (ok) {
        card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";
        setTimeout(() => card.remove(), 400);
        toast("Friend removed");
      }
    });
  };

  // ---------- Files page ----------
  const setupFiles = () => {
    const page = $(".files-page");
    if (!page) return;
    const uploadBtn = $(".files-stats .upload", page);
    if (!uploadBtn) return;
    // Hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.style.display = "none";
    document.body.appendChild(input);
    on(uploadBtn, "click", (e) => {
      e.preventDefault();
      input.click();
    });
    const grid = $(".files-content", page);
    const makeCard = (file) => {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const icon = ["pdf", "avi", "eps", "psd", "dll", "png"].includes(ext)
        ? ext
        : "pdf";
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + "MB";
      const today = new Date();
      const date = `${today.getDate().toString().padStart(2, "0")}/${(
        today.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${today.getFullYear()}`;
      const card = document.createElement("div");
      card.className = "file bg-white p-10 rad-10 reveal";
      card.innerHTML = `
        <i class="fa-solid fa-download c-grey p-absolute"></i>
        <div class="icon text-c"><img class="mt-15 mb-15" src="images/${icon}.svg" alt=""/></div>
        <div class="text-c mb-10 fs-14">${file.name}</div>
        <p class="c-grey fs-13">You</p>
        <div class="info between-flex mt-10 pt-10 fs-13 c-grey"><span>${date}</span><span>${sizeMB}</span></div>`;
      return card;
    };
    on(input, "change", () => {
      if (!input.files || !input.files.length) return;
      const frag = document.createDocumentFragment();
      Array.from(input.files).forEach((f) => frag.appendChild(makeCard(f)));
      grid.prepend(frag);
      toast(input.files.length + " file(s) uploaded");
      revealOnScroll($$(".file.reveal", grid));
      input.value = "";
    });
    delegate(page, ".file .fa-download", "click", (e, i) => {
      const name =
        i
          .closest(".file")
          ?.querySelector(".text-c.mb-10")
          ?.textContent.trim() || "file";
      toast("Downloaded " + name);
    });
  };

  // ---------- Plans page ----------
  const setupPlans = () => {
    const root = $(".plans-page");
    if (!root) return;
    let current = load("plans:current", "Premium");
    const renderBadges = () => {
      $$(".plans-page .plan").forEach((p) =>
        p.classList.toggle(
          "current-plan",
          p.querySelector(".top h2")?.textContent.trim() === current
        )
      );
      // Add/Remove note paragraph for current plan
      $$(".plans-page .plan").forEach((p) => {
        const title = p.querySelector(".top h2")?.textContent.trim();
        // Prefer an existing empty note paragraph if present, else create
        let note =
          p.querySelector(".current-note") || p.querySelector("p.text-c");
        if (title === current) {
          if (!note) {
            note = document.createElement("p");
            p.appendChild(note);
          }
          note.className = "current-note c-grey m-0 mt-15 text-c";
          note.textContent = "This Is Your Current Plan";
        } else if (note) note.remove();
      });
    };
    const updateJoinButtons = () => {
      $$(".plans-page .plan").forEach((p) => {
        const title = p.querySelector(".top h2")?.textContent.trim();
        let btn = p.querySelector("a.btn-shape");
        const isCurrent = title === current;

        // If this is the current plan, hide its Join button
        if (isCurrent) {
          if (btn) btn.style.display = "none";
          return;
        }

        // Not the current plan: ensure a Join button is present and visible
        if (!btn) {
          btn = document.createElement("a");
          btn.href = "#";
          // Pick color to match card theme
          const colorClass = p.classList.contains("green")
            ? "bg-green"
            : p.classList.contains("blue")
            ? "bg-blue"
            : p.classList.contains("orange")
            ? "bg-orange"
            : "bg-blue";
          btn.className = `btn-shape ${colorClass} c-white d-block w-fit mt-15`;
          btn.textContent = "Join";
          p.appendChild(btn);
        }
        btn.style.display = "";
      });
    };
    renderBadges();
    updateJoinButtons();
    delegate(root, ".plan a.btn-shape", "click", (e, a) => {
      e.preventDefault();
      const plan = a
        .closest(".plan")
        ?.querySelector(".top h2")
        ?.textContent.trim();
      if (!plan) return;
      if (plan === current) {
        toast("Already on " + plan);
        return;
      }
      confirmModal(
        "Switch Plan",
        `Switch to ${plan}?`,
        "Switch",
        "Cancel"
      ).then((ok) => {
        if (!ok) return;
        current = plan;
        save("plans:current", current);
        toast("Plan updated to " + current);
        renderBadges();
        updateJoinButtons();
      });
    });
  };

  // ---------- Misc animations and event wiring ----------
  const wireRipples = () => {
    [
      ...$$(
        ".visit, .plans-page .plan a, .head .notification, .files-stats .upload"
      ),
    ].forEach(addRipple);
  };

  const wireReveals = () => {
    const candidates = [
      ...$$(".widget-shape"),
      ...$$(".projects-page .project"),
      ...$$(".courses-page .course"),
      ...$$(".friends-page .friend"),
      ...$$(".files-page .files-content .file"),
      ...$$(".plans-page .plan"),
    ];
    candidates.forEach((el) => el.classList.add("reveal"));
    revealOnScroll(candidates);
    animateProgressBars(document);
  };

  // (Removed) Dark theme support

  // Init
  const init = () => {
    highlightActiveSidebar();
    setupHeaderSearch();
    setupNotifications();
    setupMaintenanceBanner();

    // Page specifics
    setupQuickDraft();
    setupTasks();
    setupTableSort();
    setupCountUps();
    setupSettings();
    applyDashboardWidgetVisibility();
    setupCourses();
    setupFriends();
    setupFiles();
    setupPlans();

    wireRipples();
    wireReveals();
    // (Removed) applyThemeVars
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
