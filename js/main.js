/* COPHIR site behaviour. No dependencies. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Configuration ----------
     Form delivery. By default forms POST to the current page, which is what
     Netlify Forms expects. To use another service (Formspree, Basin, a custom
     endpoint…), set FORM_ENDPOINT to its URL. If delivery fails, the visitor is
     offered a pre-filled email to CONTACT_EMAIL instead. */
  var FORM_ENDPOINT = "";
  var CONTACT_EMAIL = "contact@cophir.com";

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- Page changes always start at the top ----------
     Browsers (and some embedded previews) can restore the previous scroll
     position after a navigation. Every new page opens at its top unless the
     link targets a #section. */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  function toTop() {
    if (location.hash && location.hash.length > 1 && location.hash !== "#review") return;
    window.scrollTo(0, 0);
    try { doc.scrollIntoView({ block: "start" }); } catch (e) {}
  }
  toTop();
  window.addEventListener("pageshow", function (e) { if (e.persisted) toTop(); });

  /* ---------- Language ---------- */
  var FR = window.COPHIR_FR || { strings: {}, titles: {}, svg: {} };
  var originals = new Map();
  var originalTitle = document.title;
  var lang = "en";

  var UI = {
    en: {
      required: "Please fill in this field.",
      email: "Please enter a valid email address.",
      url: "Please enter a full web address, starting with https://",
      sending: "Sending…",
      ok: "Thank you. We have received your message and will review the fit before coming back to you.",
      fallback: "Online sending is not available right now. Your email app should open with your answers pre-filled: just press send. If it does not open, write to us at",
      fallbackFile: "Please attach your document to the email.",
      openMenu: "Open menu",
      closeMenu: "Close menu"
    },
    fr: {
      required: "Merci de remplir ce champ.",
      email: "Merci d'indiquer une adresse e-mail valide.",
      url: "Merci d'indiquer une adresse web complète, commençant par https://",
      sending: "Envoi…",
      ok: "Merci. Nous avons bien reçu votre message et étudierons l'adéquation avant de revenir vers vous.",
      fallback: "L'envoi en ligne n'est pas disponible pour le moment. Votre messagerie devrait s'ouvrir avec vos réponses pré-remplies : il suffit d'envoyer. Si elle ne s'ouvre pas, écrivez-nous à",
      fallbackFile: "Merci de joindre votre document à l'e-mail.",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu"
    }
  };
  function t(k) { return (UI[lang] || UI.en)[k]; }

  function setLang(next) {
    lang = next === "fr" ? "fr" : "en";
    doc.lang = lang;
    document.querySelectorAll("[data-t]").forEach(function (el) {
      var k = el.getAttribute("data-t");
      if (!originals.has(el)) originals.set(el, el.innerHTML);
      if (lang === "fr" && FR.strings[k]) el.innerHTML = FR.strings[k];
      else el.innerHTML = originals.get(el);
    });
    document.querySelectorAll("[data-svg-t]").forEach(function (el) {
      if (!el.dataset.en) el.dataset.en = el.textContent;
      var k = el.getAttribute("data-svg-t");
      el.textContent = lang === "fr" && FR.svg[k] ? FR.svg[k] : el.dataset.en;
    });
    var page = body.getAttribute("data-page");
    document.title = lang === "fr" && FR.titles[page] ? FR.titles[page] : originalTitle;
    document.querySelectorAll("[data-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    var burger = document.querySelector(".burger");
    if (burger) burger.setAttribute("aria-label", t(body.classList.contains("menu-open") ? "closeMenu" : "openMenu"));
    store("cophir-lang", lang);
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  document.querySelectorAll("[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });
  var saved = store("cophir-lang");
  var browserFr = (navigator.language || "").toLowerCase().indexOf("fr") === 0;
  setLang(saved || (browserFr ? "fr" : "en"));

  /* ---------- Header + mobile menu ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() { header.classList.toggle("is-scrolled", window.scrollY > 24); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var burger = document.querySelector(".burger");
  var menu = document.getElementById("mobile-menu");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", t(open ? "closeMenu" : "openMenu"));
    menu.setAttribute("aria-hidden", String(!open));
    body.style.overflow = open ? "hidden" : "";
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1100) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && body.classList.contains("menu-open")) setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    doc.classList.add("js-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          en.target.querySelectorAll("[data-count]").forEach(countUp);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) {
      // anything already on screen at load is shown immediately
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      else io.observe(el);
    });
  }

  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var end = parseFloat(el.getAttribute("data-count"));
    var start = performance.now();
    var dur = 1400;
    (function frame(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased);
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }

  /* ---------- VSL: inline player that floats while you scroll ----------
     The film starts in place. If the visitor scrolls away while it plays, it
     docks in a small player in the corner and keeps playing until they pause,
     close it or it ends. Scrolling back to the section puts it back in place. */
  var vslFrame = document.querySelector("[data-vsl]");
  if (vslFrame) {
    var player = vslFrame.querySelector("[data-vsl-player]");
    var video = player.querySelector("video");
    var inView = true;
    var dismissed = false;
    function dock() {
      var float = !inView && !dismissed && !video.paused && !video.ended;
      if (float === player.classList.contains("is-floating")) return;
      player.classList.toggle("is-floating", float);
      vslFrame.classList.toggle("has-floating", float);
    }
    vslFrame.querySelector("[data-vsl-play]").addEventListener("click", function () {
      dismissed = false;
      player.hidden = false;
      vslFrame.classList.add("is-playing");
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
      video.focus();
    });
    player.querySelector("[data-vsl-close]").addEventListener("click", function () {
      dismissed = true;
      video.pause();
      dock();
    });
    player.querySelector("[data-vsl-back]").addEventListener("click", function () {
      vslFrame.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
    // Subtitles: if the <track> cannot be loaded (e.g. a host serving .vtt with the
    // wrong type), read the file ourselves and add the cues.
    var trackEl = video.querySelector("track");
    if (trackEl) {
      trackEl.addEventListener("error", function () {
        if (!window.VTTCue || video.dataset.cuesLoaded) return;
        video.dataset.cuesLoaded = "1";
        fetch(trackEl.getAttribute("src")).then(function (r) { return r.text(); }).then(function (txt) {
          var tt = video.addTextTrack("subtitles", trackEl.label || "Français", trackEl.srclang || "fr");
          var sec = function (t) { var p = t.trim().split(":"); return p.length === 3 ? +p[0] * 3600 + +p[1] * 60 + parseFloat(p[2]) : +p[0] * 60 + parseFloat(p[1]); };
          txt.replace(/\r/g, "").split(/\n\n+/).forEach(function (block) {
            var lines = block.split("\n");
            var i = lines.findIndex(function (l) { return l.indexOf("-->") > -1; });
            if (i < 0) return;
            var t = lines[i].split("-->");
            tt.addCue(new VTTCue(sec(t[0]), sec(t[1].trim().split(" ")[0]), lines.slice(i + 1).join("\n")));
          });
          tt.mode = "showing";
        }).catch(function () {});
      });
    }
    video.addEventListener("play", function () { dismissed = false; dock(); });
    video.addEventListener("ended", function () { dismissed = true; dock(); });
    // a pause keeps the mini player on screen so the visitor can resume; closing removes it
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        dock();
      }, { threshold: 0.25 }).observe(vslFrame);
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && player.classList.contains("is-floating")) { dismissed = true; video.pause(); dock(); }
    });
  }

  /* ---------- Subtle motion: hero parallax + 3D tilt on cards ---------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!reduceMotion) {
    var heroImg = document.querySelector(".hero__media img");
    if (heroImg) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = Math.min(window.scrollY, 900);
          heroImg.style.setProperty("--parallax", (y * 0.18).toFixed(1) + "px");
          ticking = false;
        });
      }, { passive: true });
    }
    if (finePointer) {
      document.querySelectorAll("[data-tilt]").forEach(function (el) {
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width - 0.5;
          var y = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
          el.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
          el.style.setProperty("--mx", ((x + 0.5) * 100).toFixed(1) + "%");
          el.style.setProperty("--my", ((y + 0.5) * 100).toFixed(1) + "%");
        });
        el.addEventListener("pointerleave", function () {
          el.style.setProperty("--rx", "0deg");
          el.style.setProperty("--ry", "0deg");
        });
      });
    }
  }

  /* ---------- Contact: form switcher ---------- */
  var tabs = document.querySelectorAll(".switch__opt");
  function showForm(id) {
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-form") === id;
      tab.setAttribute("aria-selected", String(on));
      document.getElementById(tab.getAttribute("data-form")).hidden = !on;
    });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      showForm(tab.getAttribute("data-form"));
      if (history.replaceState) history.replaceState(null, "", "#" + tab.getAttribute("data-form"));
    });
  });
  function fromHash() {
    var h = location.hash.replace("#", "");
    if (h === "capabilities") showForm("capabilities");
    else if (h === "opportunity" || h === "business") {
      showForm("opportunity");
      var enquiry = document.getElementById("opp-enquiry");
      if (enquiry) enquiry.value = h === "business" ? "Beyond one deal: discuss the business" : "Opportunity";
    }
    if (h && document.getElementById("forms")) {
      setTimeout(function () {
        document.getElementById("forms").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      }, 60);
    }
  }
  if (tabs.length) { fromHash(); window.addEventListener("hashchange", fromHash); }

  /* ---------- Forms: validation + delivery ---------- */
  function validate(form) {
    var ok = true, firstBad = null;
    form.querySelectorAll("input, textarea").forEach(function (input) {
      if (input.type === "hidden" || input.closest(".hp")) return;
      var field = input.closest(".field");
      if (!field) return;
      var msg = "";
      var v = input.value.trim();
      if (input.required && !v) msg = t("required");
      else if (v && input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = t("email");
      else if (v && input.type === "url" && !/^https?:\/\/\S+\.\S+/.test(v)) msg = t("url");
      field.classList.toggle("is-invalid", !!msg);
      field.querySelector(".err").textContent = msg;
      input.setAttribute("aria-invalid", String(!!msg));
      if (msg) { ok = false; firstBad = firstBad || input; }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  function mailtoFallback(form, status) {
    var lines = [];
    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, textarea");
      var label = field.querySelector("label");
      if (!input || input.type === "file" || !input.value.trim()) return;
      lines.push(label.textContent.trim() + ": " + input.value.trim());
    });
    var hasFile = Array.prototype.some.call(form.querySelectorAll('input[type="file"]'), function (f) { return f.files && f.files.length; });
    var subject = "COPHIR website – " + (form.id === "capabilities" ? "Capabilities" : "Opportunity");
    var href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n\n"));
    status.className = "form__status form__status--info";
    status.innerHTML = t("fallback") + ' <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + "</a>." + (hasFile ? " " + t("fallbackFile") : "");
    status.hidden = false;
    window.location.href = href;
  }

  document.querySelectorAll("form.form").forEach(function (form) {
    form.querySelectorAll("input, textarea").forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && field.classList.contains("is-invalid")) { field.classList.remove("is-invalid"); field.querySelector(".err").textContent = ""; }
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form__status");
      status.hidden = true;
      if (!validate(form)) return;
      var btn = form.querySelector('button[type="submit"]');
      var label = btn.querySelector("span");
      var prev = label.innerHTML;
      btn.disabled = true;
      label.textContent = t("sending");
      var endpoint = FORM_ENDPOINT || location.pathname;
      fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          status.className = "form__status form__status--ok";
          status.textContent = t("ok");
          status.hidden = false;
          form.reset();
        })
        .catch(function () { mailtoFallback(form, status); })
        .then(function () {
          btn.disabled = false;
          label.innerHTML = prev;
          status.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        });
    });
  });

  /* ---------- Misc ---------- */
  // Review mode: add #review to any URL to highlight content still marked [TO CONFIRM] in the brief.
  if (location.hash === "#review" || /[?&]review\b/.test(location.search)) doc.classList.add("review");
})();
