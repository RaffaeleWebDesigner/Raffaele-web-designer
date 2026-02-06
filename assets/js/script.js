// ====== CONFIG ======
const WHATSAPP_NUMBER_E164 = "+393898403642";
const WHATSAPP_MESSAGE =
  "Ciao Raffaele! Vorrei info per un sito web. Settore: ___. Obiettivo: ___. Tempistiche: ___.";

const FORM_ENDPOINT = ""; // opzionale (Formspree ecc.)
const FALLBACK_EMAIL = "layersulayer@gmail.com";

// ====== Helpers ======
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function buildWhatsAppLink() {
  const number = WHATSAPP_NUMBER_E164.replace(/\s/g, "").replace("+", "");
  const msg = encodeURIComponent(WHATSAPP_MESSAGE);
  return `https://wa.me/${number}?text=${msg}`;
}

function setWhatsAppLinks() {
  const link = buildWhatsAppLink();
  const w1 = $("#whatsappLink");
  const w2 = $("#whatsappLink2");
  const ws = $("#whatsappSticky");
  if (w1) w1.href = link;
  if (w2) w2.href = link;
  if (ws) ws.href = link;
}

function setYear() {
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
}

function mobileMenu() {
  const burger = $(".burger");
  const menu = $(".menu");
  if (!burger || !menu) return;

  burger.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    });
  });
}

function openEmailFallback(name, email, message) {
  const subject = encodeURIComponent("Richiesta sito web");
  const body = encodeURIComponent(
    `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}\n`
  );
  window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
}

function handleForm() {
  const form = $("#contactForm");
  const hint = $("#formHint");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    const name = (data.get("name") || "").toString().trim();
    const email = (data.get("email") || "").toString().trim();
    const message = (data.get("message") || "").toString().trim();

    if (FORM_ENDPOINT) {
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          body: data,
          headers: { Accept: "application/json" },
        });

        if (res.ok) {
          form.reset();
          if (hint) hint.textContent = "Messaggio inviato ✅ Ti rispondo il prima possibile.";
        } else {
          if (hint) hint.textContent = "Invio non riuscito. Apro la mail come fallback…";
          openEmailFallback(name, email, message);
        }
      } catch {
        if (hint) hint.textContent = "Invio non riuscito. Apro la mail come fallback…";
        openEmailFallback(name, email, message);
      }
      return;
    }

    openEmailFallback(name, email, message);
  });
}

function scrollProgress() {
  const bar = $("#progressBar");
  if (!bar) return;

  window.addEventListener("scroll", () => {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    bar.style.width = `${pct}%`;
  }, { passive: true });
}

function navActiveOnScroll() {
  const links = $$(".nav-link");
  const sections = ["servizi", "portfolio", "prezzi", "contatti"]
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (!links.length || !sections.length) return;

  const byId = {};
  links.forEach(a => { byId[a.getAttribute("href").replace("#","")] = a; });

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      links.forEach(a => a.classList.remove("active"));
      if (byId[id]) byId[id].classList.add("active");
    });
  }, { root: null, threshold: 0.45 });

  sections.forEach(s => obs.observe(s));
}

function previewTabs() {
  const area = $("#previewArea");
  const tabs = $$(".tab");
  if (!area || !tabs.length) return;

  const previews = {
    ciccarelli: "assets/img/ciccarelli.png",
    sottili: "assets/img/sottili.png",
  };

  tabs.forEach(t => {
    t.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("active"));
      t.classList.add("active");

      const key = t.getAttribute("data-preview");
      const src = previews[key] || previews.ciccarelli;

      // swap image
      area.innerHTML = `<img src="${src}" alt="Anteprima lavoro" loading="lazy">`;
    });
  });
}

// Init
setWhatsAppLinks();
setYear();
mobileMenu();
handleForm();
scrollProgress();
navActiveOnScroll();
previewTabs();
