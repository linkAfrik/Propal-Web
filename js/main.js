/* COPHIR site behaviour. No dependencies. */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Configuration ----------
     Form delivery: forms POST to contact.php at the site root (PHP hosting such
     as Infomaniak), which emails the request to contact@cophir.com. If delivery
     fails, the visitor is offered a pre-filled email to CONTACT_EMAIL instead. */
  var FORM_ENDPOINT = "/contact.php";
  var CONTACT_EMAIL = "contact@cophir.com";

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function session(key, val) {
    try {
      if (val === undefined) { var v = sessionStorage.getItem(key); sessionStorage.removeItem(key); return v; }
      sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function jumpTop() {
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); }
  }

  /* ---------- Language ----------
     English and French are separate static pages (/ and /fr/). The EN/FR
     switch is a plain link; the choice is remembered. A first visit to the
     English home from a French-language browser is sent to the French home. */
  var lang = (doc.lang || "en").slice(0, 2);
  document.querySelectorAll("[data-lang-link]").forEach(function (a) {
    a.addEventListener("click", function () { store("cophir-lang", a.getAttribute("data-lang-link")); });
  });
  if (lang === "en" && body.getAttribute("data-page") === "home" && !store("cophir-lang") &&
      (navigator.language || "").toLowerCase().indexOf("fr") === 0) {
    var frHome = document.querySelector('[data-lang-link="fr"]');
    if (frHome) { store("cophir-lang", "fr"); location.replace(frHome.href); return; }
  }

  var UI = {
    en: {
      required: "Please fill in this field.",
      email: "Please enter a valid email address.",
      url: "Please enter a full web address, starting with https://",
      sending: "Sending…",
      ok: "Thank you. We have received your message and will review the fit before coming back to you.",
      fallback: "Online sending is not available right now. Your email app should open with your answers pre-filled: just press send. If it does not open, write to us at",
      openMenu: "Open menu",
      closeMenu: "Close menu"
    },
    fr: {
      required: "Veuillez renseigner ce champ.",
      email: "Veuillez saisir une adresse e-mail valide.",
      url: "Indiquez une adresse complète, commençant par https://",
      sending: "Envoi en cours…",
      ok: "Merci. Votre message a bien été reçu. Nous allons évaluer sa pertinence avant de revenir vers vous.",
      fallback: "L'envoi en ligne n'est pas disponible pour le moment. Votre application e-mail devrait s'ouvrir avec vos réponses déjà renseignées : il vous suffit de cliquer sur envoyer. Si elle ne s'ouvre pas, écrivez-nous directement à",
      openMenu: "Ouvrir le menu",
      closeMenu: "Fermer le menu"
    }
  };
  function t(k) { return (UI[lang] || UI.en)[k]; }

  /* ---------- Every page change lands at the top ----------
     Browsers, and some embedded previews, can carry the scroll position over
     to the next page. Before leaving we reset the current page to the top,
     and on arrival we hold the new page at the top until the visitor scrolls
     (unless the link targets a #section). */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    var href = a.getAttribute("href");
    if (!/\.html(\?|$)/.test(href) && href !== "./" && href !== "../") return;   // internal page, no #anchor
    session("cophir-nav-top", "1");
    jumpTop();
  }, true);
  var hasTarget = location.hash && location.hash.length > 1 && location.hash !== "#review";
  if (!hasTarget) {
    var userMoved = false;
    var stopHold = function () { userMoved = true; };
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, stopHold, { passive: true, once: true }); });
    var hold = function () { if (!userMoved && window.scrollY !== 0) jumpTop(); };
    session("cophir-nav-top");
    jumpTop();
    [0, 60, 150, 300, 600, 1000, 1600].forEach(function (ms) { setTimeout(hold, ms); });
    window.addEventListener("load", hold);
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted && !hasTarget) jumpTop(); });

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
    burger.setAttribute("aria-label", t("openMenu"));
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
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(frame);
    })(start);
  }

  /* ---------- VSL ----------
     The film plays in place and keeps playing (with sound) while the visitor
     scrolls; it never covers the page. Picture-in-picture stays available
     from the player's own controls. */
  var vslFrame = document.querySelector("[data-vsl]");
  if (vslFrame) {
    var player = vslFrame.querySelector("[data-vsl-player]");
    var video = player.querySelector("video");
    var unmuteBtn = vslFrame.querySelector("[data-vsl-unmute]");
    var engaged = false;          // the visitor chose to watch with sound
    var showPlayer = function () {
      player.hidden = false;
      vslFrame.classList.add("is-playing");
    };
    var playWithSound = function (fromStart) {
      engaged = true;
      if (fromStart) video.currentTime = 0;
      video.muted = false;
      showPlayer();
      unmuteBtn.hidden = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    };
    // Browsers only allow silent autoplay: the film starts muted, with French
    // subtitles, when the section comes into view; the "Turn sound on" button
    // restarts it from the beginning with sound.
    var autoplay = function () {
      if (engaged || !video.paused) return;
      video.muted = true;
      var p = video.play();
      if (p && p.then) {
        p.then(function () { showPlayer(); unmuteBtn.hidden = false; }).catch(function () {});
      }
    };
    vslFrame.querySelector("[data-vsl-play]").addEventListener("click", function () { playWithSound(false); video.focus(); });
    unmuteBtn.addEventListener("click", function () { playWithSound(true); });
    // The "Watch the film" band: start from the beginning, with sound, and bring the film into view.
    var watchBtn = document.querySelector("[data-vsl-watch]");
    if (watchBtn) {
      watchBtn.addEventListener("click", function () {
        playWithSound(true);
        var r = vslFrame.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) {
          vslFrame.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        }
      });
    }
    video.addEventListener("volumechange", function () {
      if (!video.muted && !engaged) { engaged = true; unmuteBtn.hidden = true; }
    });
    if ("IntersectionObserver" in window && !reduceMotion) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) autoplay();
        else if (!engaged && !video.paused) video.pause();   // a silent preview stops when out of view
      }, { threshold: 0.5 }).observe(vslFrame);
    }
    // Subtitles: if the <track> cannot be loaded (a host serving .vtt with the
    // wrong type), read the file ourselves and add the cues.
    var trackEl = video.querySelector("track");
    if (trackEl) {
      trackEl.addEventListener("error", function () {
        if (!window.VTTCue || video.dataset.cuesLoaded) return;
        video.dataset.cuesLoaded = "1";
        fetch(trackEl.getAttribute("src")).then(function (r) { return r.text(); }).then(function (txt) {
          var tt = video.addTextTrack("subtitles", trackEl.label || "Français", trackEl.srclang || "fr");
          var sec = function (s) { var p = s.trim().split(":"); return p.length === 3 ? +p[0] * 3600 + +p[1] * 60 + parseFloat(p[2]) : +p[0] * 60 + parseFloat(p[1]); };
          txt.replace(/\r/g, "").split(/\n\n+/).forEach(function (block) {
            var lines = block.split("\n");
            var i = lines.findIndex(function (l) { return l.indexOf("-->") > -1; });
            if (i < 0) return;
            var c = lines[i].split("-->");
            tt.addCue(new VTTCue(sec(c[0]), sec(c[1].trim().split(" ")[0]), lines.slice(i + 1).join("\n")));
          });
          tt.mode = "showing";
        }).catch(function () {});
      });
    }
  }

  /* ---------- Hero sectors slider: duplicate the list so the loop is seamless ---------- */
  var track = document.querySelector("[data-sector-track]");
  if (track) {
    Array.prototype.slice.call(track.children).forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.querySelector("a").setAttribute("tabindex", "-1");
      track.appendChild(c);
    });
  }

  /* ---------- "What is missing" chips light up one after another ---------- */
  var sides = document.querySelector(".sides");
  if (sides && !reduceMotion) {
    var lists = Array.prototype.slice.call(sides.querySelectorAll(".missing"));
    var steps = [];
    var longest = Math.max.apply(null, lists.map(function (l) { return l.children.length; }));
    for (var k = 0; k < longest; k++) {
      lists.forEach(function (l) { if (l.children[k]) steps.push(l.children[k]); });
    }
    var idx = -1, timer = null;
    var tick = function () {
      if (idx >= 0) steps[idx].classList.remove("is-lit");
      idx = (idx + 1) % steps.length;
      steps[idx].classList.add("is-lit");
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !timer) { tick(); timer = setInterval(tick, 1300); }
        else if (!en[0].isIntersecting && timer) { clearInterval(timer); timer = null; }
      }, { threshold: 0.35 }).observe(sides);
    }
  }

  /* ---------- Subtle motion: hero parallax + 3D tilt on cards ---------- */
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!reduceMotion) {
    var heroImg = document.querySelector(".hero__media");
    if (heroImg) {
      var ticking = false;
      window.addEventListener("scroll", function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          heroImg.style.setProperty("--parallax", (Math.min(window.scrollY, 900) * 0.18).toFixed(1) + "px");
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
    var subject = "COPHIR website – " + (form.id === "capabilities" ? "Capabilities" : "Opportunity");
    var href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n\n"));
    status.className = "form__status form__status--info";
    status.innerHTML = t("fallback") + ' <a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + "</a>.";
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
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  // Review mode: add #review to any URL to highlight content still marked [TO CONFIRM] in the brief.
  if (location.hash === "#review" || /[?&]review\b/.test(location.search)) doc.classList.add("review");
})();
