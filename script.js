// ============ SARTAROSH — interaktivlik ============

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* ---------- Header scroll holati ---------- */
const header = $("#header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Mobil menyu ---------- */
const burger = $("#burger");
const nav = $("#nav");

const closeNav = () => {
  nav.classList.remove("is-open");
  burger.classList.remove("is-open");
  burger.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
};

burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
});

$$(".nav__link").forEach((link) => link.addEventListener("click", closeNav));

/* ---------- Orqa fon videosini boshqarish ---------- */
const video = $("#heroVideo");
const toggle = $("#videoToggle");

// Ba'zi qurilmalarda autoplay bloklanadi — yana urinamiz
const tryPlay = () => {
  if (!video) return;
  const p = video.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
};
tryPlay();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tryPlay();
});

if (video && toggle) {
  toggle.addEventListener("click", () => {
    if (video.paused) {
      tryPlay();
      toggle.textContent = "❙❙";
      toggle.setAttribute("aria-label", "Videoni to'xtatish");
    } else {
      video.pause();
      toggle.textContent = "▶";
      toggle.setAttribute("aria-label", "Videoni qayta ishga tushirish");
    }
  });
}

// "Harakat kamaytirish" sozlamasi yoqilgan bo'lsa — videoni to'xtatamiz
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
if (reduceMotion.matches && video) {
  video.removeAttribute("autoplay");
  video.pause();
  if (toggle) toggle.textContent = "▶";
}
reduceMotion.addEventListener?.("change", (e) => {
  if (e.matches && video) {
    video.pause();
    if (toggle) toggle.textContent = "▶";
  }
});

/* ---------- Scroll bilan paydo bo'lish ---------- */
const revealEls = $$(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("visible"));
}

/* ---------- Toast ---------- */
const toast = $("#toast");
let toastTimer;
const showToast = (msg) => {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4500);
};

/* ---------- Bron qilish formasi ---------- */
const form = $("#bookingForm");
const note = $("#formNote");
const dateInput = form?.querySelector('input[name="date"]');

// Sana uchun bugundan boshlangan cheklov
if (dateInput) {
  const today = new Date();
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  dateInput.min = iso;
}

/* ---------- Katalogdan tanlangan soch (hairstyles.html → booking) ---------- */
const params = new URLSearchParams(window.location.search);
const pickedStyle = (params.get("style") || "").trim();
const pickedService = (params.get("service") || "").trim();
const pickedPrice = (params.get("price") || "").trim();
const styleInput = $("#styleInput");
const styleNote = $("#styleNote");

if (styleInput && pickedStyle) {
  styleInput.value = pickedPrice ? `${pickedStyle} — ${pickedPrice}` : pickedStyle;
  if (styleNote) styleNote.hidden = false;
}

if (form && pickedService) {
  const serviceSel = form.querySelector('select[name="service"]');
  if (serviceSel && [...serviceSel.options].some((o) => o.value === pickedService)) {
    serviceSel.value = pickedService;
  }
}

form?.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = new FormData(form);
  const name = (data.get("name") || "").toString().trim();
  const phone = (data.get("phone") || "").toString().trim();
  const date = (data.get("date") || "").toString();

  $$(".invalid", form).forEach((el) => el.classList.remove("invalid"));

  let ok = true;
  const mark = (field) => {
    const input = form.querySelector(`[name="${field}"]`);
    input?.classList.add("invalid");
    ok = false;
  };

  if (name.length < 2) mark("name");
  if (phone.replace(/\D/g, "").length < 9) mark("phone");
  if (!date) mark("date");

  if (!ok) {
    note.textContent = "Iltimos, maydonlarni to'g'ri to'ldiring.";
    note.classList.add("error");
    return;
  }

  note.classList.remove("error");
  note.textContent = "Yuborilmoqda...";

  // Server orqali Telegram botga yuboriladi
  fetch("/api/booking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  })
    .then(async (r) => {
      const out = await r.json().catch(() => ({}));
      if (!r.ok || !out.ok) throw new Error(out.error || "Xatolik yuz berdi");

      note.textContent = "";
      form.reset();
      showToast(
        `Rahmat, ${name}! Bron qabul qilindi — ${date} kuni operator qo'ng'iroq qiladi.`
      );
    })
    .catch((err) => {
      note.textContent = err.message || "Yuborib bo'lmadi, qayta urinib ko'ring.";
      note.classList.add("error");
    });
});

/* ---------- Footer yili ---------- */
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
