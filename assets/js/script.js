// =========================================================
//  CONFIGURAZIONE — modifica qui i tuoi dati
// =========================================================
const CONFIG = {
  whatsapp: "393898403642",          // numero con prefisso internazionale, senza + e spazi
  whatsappMessage: "Ciao Raffaele! Vorrei informazioni per un sito web.",
  email: "layersulayer@gmail.com",
  // Endpoint opzionale per ricevere il modulo senza aprire l'app email
  // (es. Formspree: "https://formspree.io/f/xxxxxxx"). Lascia vuoto per usare l'email.
  formEndpoint: "",
};

// =========================================================
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const waLink = (text = CONFIG.whatsappMessage) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

/* ---------- link contatti ---------- */
function setupContactLinks() {
  $$(".js-whatsapp").forEach((a) => (a.href = waLink()));
  $$(".js-email").forEach((a) => (a.href = `mailto:${CONFIG.email}`));
  $$(".js-email-text").forEach((el) => (el.textContent = CONFIG.email));
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}

/* ---------- header, barra di avanzamento, CTA mobile ---------- */
function setupScroll() {
  const header = $("#header");
  const progress = $(".progress");
  const mobileCta = $("#mobileCta");
  const hero = $(".hero");
  const contact = $("#contatti");
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("is-scrolled", y > 10);
    if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (mobileCta && hero && contact) {
      const pastHero = y > hero.offsetHeight * 0.6;
      const atContact = contact.getBoundingClientRect().top < window.innerHeight * 0.8;
      mobileCta.classList.toggle("is-visible", pastHero && !atContact);
    }
    ticking = false;
  };

  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  update();
}

/* ---------- menu mobile ---------- */
function setupMenu() {
  const burger = $(".burger");
  const menu = $("#menu");
  if (!burger || !menu) return;

  const setOpen = (open) => {
    menu.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
  };

  burger.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("is-open") && !menu.contains(e.target) && !burger.contains(e.target)) setOpen(false);
  });
  window.addEventListener("resize", () => { if (window.innerWidth > 820) setOpen(false); }, { passive: true });

  // evidenzia la sezione corrente
  const links = $$("a[href^='#']:not(.btn)", menu);
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if (!("IntersectionObserver" in window) || !sections.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${en.target.id}`));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => io.observe(s));
}

/* ---------- parola che ruota nel titolo ---------- */
function setupRotator() {
  const rotator = $(".rotator");
  const words = $$(".rotator-word");
  if (words.length < 2 || reducedMotion) return;
  let i = 0;
  // la larghezza segue la parola attiva, così il titolo non ha buchi
  const fit = () => { rotator.style.width = `${words[i].offsetWidth}px`; };
  fit();
  window.addEventListener("resize", fit, { passive: true });
  if (document.fonts) document.fonts.ready.then(fit);
  setInterval(() => {
    if (document.hidden) return;
    const current = words[i];
    i = (i + 1) % words.length;
    current.classList.remove("is-active");
    current.classList.add("is-leaving");
    words[i].classList.remove("is-leaving");
    words[i].classList.add("is-active");
    fit();
    setTimeout(() => current.classList.remove("is-leaving"), 650);
  }, 2400);
}

/* ---------- demo interattiva ---------- */
const DEMO_THEMES = {
  food:   { url: "trattoriadagino.it",  logo: "Da Gino",        kicker: "Dal 1987 · Napoli",     title: "Cucina di casa, come una volta.", btn: "Prenota un tavolo",  emoji: "🍝", cards: ["Menù", "Orari", "Dove siamo"],          toast: "“Avete posto stasera per 4?”" },
  beauty: { url: "salonearia.it",       logo: "Aria Hair",      kicker: "Hair & Beauty studio",  title: "Il tuo momento di bellezza.",     btn: "Prenota online",     emoji: "✂️", cards: ["Servizi", "Listino", "Prenota"],        toast: "“Sabato alle 10 c'è posto?”" },
  gym:    { url: "ironlabgym.it",       logo: "IRON LAB",       kicker: "Functional training",   title: "Allenati. Supera i limiti.",      btn: "Prova gratuita",     emoji: "🏋️", cards: ["Corsi", "Abbonamenti", "Trainer"],      toast: "“Vorrei la prova gratuita!”" },
  bnb:    { url: "bbilglicine.it",      logo: "Il Glicine",     kicker: "B&B · Costiera",        title: "Svegliati con vista mare.",       btn: "Verifica disponibilità", emoji: "🌿", cards: ["Camere", "Colazione", "Dintorni"], toast: "“Libero dal 12 al 15 agosto?”" },
};

function setupDemo() {
  const demo = $("#demo");
  if (!demo) return;
  const browser = $(".browser", demo);
  const site = $(".site", demo);
  const tabs = $$(".demo-tab", demo);
  const urlText = $(".url-text", demo);
  const toast = $(".toast", demo);
  const els = {
    logo: $(".site-logo", demo), kicker: $(".site-kicker", demo), title: $(".site-title", demo),
    btn: $(".site-btn", demo), emoji: $(".site-emoji", demo), cards: $$(".site-card b", demo),
    toast: $(".toast-text", demo),
  };
  const order = Object.keys(DEMO_THEMES);
  let current = "food";
  let autoTimer = null;
  let typeTimer = null;
  let toastTimer = null;
  let switchTimer = null;
  let inView = true;
  let userTook = false;

  const typeUrl = (text) => {
    clearInterval(typeTimer);
    if (reducedMotion) { urlText.textContent = text; return; }
    let n = 0;
    urlText.textContent = "";
    typeTimer = setInterval(() => {
      urlText.textContent = text.slice(0, ++n);
      if (n >= text.length) clearInterval(typeTimer);
    }, 45);
  };

  const showToast = () => {
    clearTimeout(toastTimer);
    toast.classList.remove("is-visible");
    toastTimer = setTimeout(() => toast.classList.add("is-visible"), reducedMotion ? 0 : 1300);
  };

  const apply = (key) => {
    const t = DEMO_THEMES[key];
    if (!t) return;
    current = key;
    tabs.forEach((b) => {
      const on = b.dataset.theme === key;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
    });

    clearTimeout(switchTimer);
    site.classList.add("is-building");
    toast.classList.remove("is-visible");
    typeUrl(t.url);

    switchTimer = setTimeout(() => {
      browser.dataset.theme = key;
      els.logo.textContent = t.logo;
      els.kicker.textContent = t.kicker;
      els.title.textContent = t.title;
      els.btn.textContent = t.btn;
      els.emoji.textContent = t.emoji;
      els.cards.forEach((c, i) => (c.textContent = t.cards[i]));
      els.toast.textContent = t.toast;
      // forza il reflow così l'animazione riparte
      void site.offsetWidth;
      site.classList.remove("is-building");
      showToast();
    }, reducedMotion ? 0 : 380);
  };

  const next = () => apply(order[(order.indexOf(current) + 1) % order.length]);

  const startAuto = () => {
    stopAuto();
    if (userTook || reducedMotion) return;
    autoTimer = setInterval(() => { if (inView && !document.hidden) next(); }, 4800);
  };
  const stopAuto = () => clearInterval(autoTimer);

  tabs.forEach((b) => {
    b.addEventListener("click", () => {
      userTook = true;
      stopAuto();
      if (b.dataset.theme !== current) apply(b.dataset.theme);
    });
    b.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const idx = (tabs.indexOf(b) + dir + tabs.length) % tabs.length;
      tabs[idx].focus();
      tabs[idx].click();
    });
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { inView = en.isIntersecting; }, { threshold: 0.2 }).observe(demo);
  }

  // inclinazione 3D al passaggio del mouse
  if (canHover && !reducedMotion) {
    demo.addEventListener("pointermove", (e) => {
      const r = browser.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      browser.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    demo.addEventListener("pointerleave", () => { browser.style.transform = ""; });
  }

  showToast();
  startAuto();
}

/* ---------- luce che segue il mouse sulle card ---------- */
function setupSpotlight() {
  if (!canHover) return;
  $$(".spot").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ---------- comparsa allo scroll ---------- */
function setupReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in", "seen"));
    return;
  }
  // piccolo ritardo a cascata per gli elementi fratelli
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 6) * 70}ms`;
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add("is-in", "seen");
      io.unobserve(el);
      // a fine animazione restituisce all'elemento le sue transizioni (hover ecc.)
      const delay = parseFloat(el.style.transitionDelay) || 0;
      setTimeout(() => {
        el.classList.remove("reveal", "is-in");
        el.style.transitionDelay = "";
      }, 950 + delay);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  items.forEach((el) => io.observe(el));
}

/* ---------- pulsanti dei prezzi → preseleziona il modulo ---------- */
function setupPlanButtons() {
  const select = $("#f-plan");
  if (!select) return;
  $$("[data-plan]").forEach((btn) =>
    btn.addEventListener("click", () => { select.value = btn.dataset.plan; })
  );
}

/* ---------- modulo contatti ---------- */
function setupForm() {
  const form = $("#contactForm");
  if (!form) return;
  const msg = $("#formMsg");
  const submit = $("button[type='submit']", form);

  const say = (text, type = "") => {
    msg.className = `form-msg${type ? ` is-${type}` : ""}`;
    msg.innerHTML = text;
  };

  const validate = () => {
    let firstBad = null;
    $$("input[required], textarea[required]", form).forEach((input) => {
      const ok = input.type === "checkbox" ? input.checked : input.value.trim() !== "" && input.checkValidity();
      const wrap = input.closest(".field, .check");
      if (wrap) wrap.classList.toggle("has-error", !ok);
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok && !firstBad) firstBad = input;
    });
    return firstBad;
  };

  form.addEventListener("input", (e) => {
    const wrap = e.target.closest(".has-error");
    if (wrap) { wrap.classList.remove("has-error"); e.target.removeAttribute("aria-invalid"); }
  });
  form.addEventListener("change", (e) => {
    if (e.target.type === "checkbox" && e.target.checked) e.target.closest(".check")?.classList.remove("has-error");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bad = validate();
    if (bad) {
      say(bad.type === "checkbox" ? "Per continuare accetta l'informativa privacy." : "Controlla i campi evidenziati.", "err");
      bad.focus();
      return;
    }

    const data = new FormData(form);
    const name = data.get("name").toString().trim();
    const email = data.get("email").toString().trim();
    const plan = data.get("plan").toString();
    const message = data.get("message").toString().trim();
    const summary = `Nome: ${name}\nEmail: ${email}\nInteresse: ${plan}\n\n${message}`;
    const waAlt = `<a href="${waLink(`Ciao Raffaele!\n\n${summary}`)}" target="_blank" rel="noopener">inviala su WhatsApp</a>`;

    if (CONFIG.formEndpoint) {
      submit.disabled = true;
      say("Invio in corso…");
      try {
        const res = await fetch(CONFIG.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        say("Richiesta inviata! Ti rispondo al più presto. 🚀", "ok");
      } catch {
        say(`Invio non riuscito. Riprova o ${waAlt}.`, "err");
      } finally {
        submit.disabled = false;
      }
      return;
    }

    // Nessun servizio esterno: apre l'app email con il messaggio già pronto
    const subject = encodeURIComponent(`Richiesta sito web — ${name}`);
    window.location.href = `mailto:${CONFIG.email}?subject=${subject}&body=${encodeURIComponent(summary)}`;
    say(`Si sta aprendo la tua app email con il messaggio pronto. Non si apre? ${waAlt}.`, "ok");
  });
}

/* ---------- avvio ---------- */
setupContactLinks();
setupScroll();
setupMenu();
setupRotator();
setupDemo();
setupSpotlight();
setupReveal();
setupPlanButtons();
setupForm();
