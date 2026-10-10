// ============ SARTAROSH — o'g'il bolalar va ayollar saloni ============
(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Header scroll holati + progress ---------- */
  const header = $("#header");
  const onScroll = () => {
    header.classList.toggle("is-stuck", window.scrollY > 40);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty("--progress", (max > 0 ? (window.scrollY / max) * 100 : 0) + "%");
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- Mobil menyu ---------- */
  const burger = $("#burger");
  const mMenu = $("#m-menu");
  const toggleMenu = (force) => {
    const open = force !== undefined ? force : !mMenu.classList.contains("is-open");
    mMenu.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    document.body.classList.toggle("lock", open);
  };
  burger.addEventListener("click", () => toggleMenu());
  $$("#m-menu a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  /* ---------- Hero videosi ---------- */
  const heroVideo = $("#heroVideo");
  const heroToggle = $("#heroVideoToggle");
  if (heroVideo) {
    const tryPlay = () => {
      const p = heroVideo.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    tryPlay();
    heroToggle?.addEventListener("click", () => {
      if (heroVideo.paused) {
        tryPlay();
        heroToggle.textContent = "❙❙";
        heroToggle.setAttribute("aria-label", "Videoni to'xtatish");
      } else {
        heroVideo.pause();
        heroToggle.textContent = "▶";
        heroToggle.setAttribute("aria-label", "Videoni qayta ishga tushirish");
      }
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
      if (heroToggle) heroToggle.textContent = "▶";
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tryPlay();
    });
  }

  /* ---------- Galereya videolari ---------- */
  const vcards = $$("[data-video]");
  if (vcards.length) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pauseOthers = (keep) => {
      vcards.forEach((card) => {
        if (card === keep) return;
        const v = card.querySelector("video");
        if (v && !v.paused) {
          v.pause();
          card.classList.remove("is-playing");
        }
      });
    };
    const play = (card) => {
      const v = card.querySelector("video");
      if (!v) return;
      pauseOthers(card);
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      card.classList.add("is-playing");
    };
    const stop = (card) => {
      const v = card.querySelector("video");
      if (v && !v.paused) v.pause();
      card.classList.remove("is-playing");
    };
    vcards.forEach((card) => {
      const v = card.querySelector("video");
      if (!v) return;
      const toggle = () => (v.paused ? play(card) : stop(card));
      card.querySelector(".vcard__play")?.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
      card.addEventListener("click", toggle);
      if (!reduce) {
        card.addEventListener("mouseenter", () => {
          if (v.paused) play(card);
        });
        card.addEventListener("mouseleave", () => stop(card));
      }
    });
  }

  /* ---------- "Yozilish" tugmalari ---------- */
  const booking = $("#booking");
  $$("[data-book]").forEach((btn) =>
    btn.addEventListener("click", () => {
      toggleMenu(false);
      booking.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => $("#bookingForm input[name='name']")?.focus(), 500);
    })
  );

  /* ---------- Katalogdan tanlangan turmak (hairstyles.html → booking) ---------- */
  const params = new URLSearchParams(window.location.search);
  const pickedStyle = (params.get("style") || "").trim();
  const pickedService = (params.get("service") || "").trim();
  const pickedPrice = (params.get("price") || "").trim();
  const styleInput = $("#styleInput");
  const styleNote = $("#styleNote");
  const form = $("#bookingForm");

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

  /* ---------- Toast ---------- */
  const toast = $("#toast");
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 5000);
  };

  /* ---------- Bron qilish formasi ---------- */
  const note = $("#formNote");
  const dateInput = form?.querySelector('input[name="date"]');

  if (dateInput) {
    const today = new Date();
    const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dateInput.min = iso;
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
      form.querySelector(`[name="${field}"]`)?.classList.add("invalid");
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
        if (styleInput) styleInput.value = "";
        if (styleNote) styleNote.hidden = true;
        showToast(`Rahmat, ${name}! Yozilish qabul qilindi — ${date} kuni qo'ng'iroq qilamiz.`);
      })
      .catch((err) => {
        note.textContent = err.message || "Yuborib bo'lmadi, qayta urinib ko'ring.";
        note.classList.add("error");
      });
  });

  /* ---------- Cookies ---------- */
  const cookies = $("#cookies");
  if (!localStorage.getItem("sartarosh-cookie")) {
    setTimeout(() => cookies.classList.add("is-open"), 1400);
  }
  const hideCookies = (v) => {
    localStorage.setItem("sartarosh-cookie", v);
    cookies.classList.remove("is-open");
  };
  $("#cookie-yes")?.addEventListener("click", () => hideCookies("yes"));
  $("#cookie-no")?.addEventListener("click", () => hideCookies("no"));

  /* ---------- Scroll bilan paydo bo'lish ---------- */
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = (i % 4) * 0.07 + "s";
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("in"));
  }

  /* ---------- Footer yili ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
