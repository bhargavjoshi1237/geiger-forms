/* Geiger Forms embed: <div data-geiger-form="slug" data-mode="inline|popup|slider|side-tab|popover|fullscreen"></div><script src=".../embed.js" async></script> */
(function () {
  "use strict";
  if (window.GeigerForms && window.GeigerForms.__ready) return;

  var script = document.currentScript || (function () {
    var all = document.querySelectorAll('script[src*="embed.js"]');
    return all[all.length - 1];
  })();
  // Base URL = the script's directory, so a /forms mount prefix is preserved; its origin is the only one messages are accepted from.
  var base = "";
  var baseOrigin = window.location.origin;
  try {
    var src = new URL(script && script.src ? script.src : window.location.href, window.location.href);
    base = src.origin + src.pathname.replace(/\/embed\.js$/, "");
    baseOrigin = src.origin;
  } catch (e) {
    // Unresolvable script URL: fall back to same-origin relative paths.
  }
  var STYLE_ID = "geiger-forms-embed-style";
  var SHOWN = "gf-embed-shown:";
  var SUBMITTED = "gf-embed-submitted:";
  var DIALOG_MODES = { popup: 1, slider: 1, "side-tab": 1, popover: 1, fullscreen: 1 };
  // The filler's control params (mirrors RESERVED in components/forms/filler/session.js): never inherited from the host page.
  var RESERVED = ["t", "resume", "edit", "paid", "r", "embed", "embed_origin", "solid", "variant", "ref", "preview"];
  var SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON_CHAT = SVG + '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var ICON_CLOSE = SVG + '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var frames = [];
  var openStack = [];
  var lock = { count: 0, overflow: "", padding: "" };

  // Storage that tolerates blocked or disabled storage; omit `value` to read.
  function store(kind, key, value) {
    try {
      var s = kind === "session" ? window.sessionStorage : window.localStorage;
      if (value === undefined) return s.getItem(key);
      s.setItem(key, value);
    } catch (e) {
      // Private mode or sandboxed page: behave as if nothing was stored.
    }
    return null;
  }

  function number(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  function has(list, item) {
    return list.indexOf(item) >= 0;
  }

  // "all" or a list of lower-cased host-page params to forward (UTM tags are always forwarded).
  function inheritList(value) {
    if (!value) return null;
    var text = String(Array.isArray(value) ? value.join(",") : value).toLowerCase().trim();
    return text === "all" ? "all" : text.split(/[\s,]+/).filter(Boolean);
  }

  // Form URL: embed flags and host origin, forwarded host-page params, then explicit params (hidden fields / prefill), which can't change the embed flags.
  function formUrl(slug, params, inherit) {
    var qs = new URLSearchParams({ embed: "1", embed_origin: window.location.origin });
    new URLSearchParams(window.location.search).forEach(function (value, key) {
      var k = key.toLowerCase();
      if (has(RESERVED, k) || qs.has(key)) return;
      if (/^utm_/.test(k) || inherit === "all" || (inherit && has(inherit, k))) qs.set(key, value);
    });
    if (typeof params === "string") params = Object.fromEntries(new URLSearchParams(params));
    Object.keys(params || {}).forEach(function (key) {
      var k = key.toLowerCase();
      if (k !== "embed" && k !== "embed_origin" && params[key] != null && params[key] !== "") qs.set(key, String(params[key]));
    });
    return base + "/form/" + encodeURIComponent(slug) + "?" + qs.toString();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var font = "font:500 14px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;";
    var css =
      ".gf-embed-frame{display:block;width:100%;border:0;background:transparent;transition:height .2s ease;min-height:120px}" +
      ".gf-embed-button{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;border:0;cursor:pointer;" + font + "background:#111;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)}" +
      ".gf-embed-tab{position:fixed;top:50%;right:0;z-index:99999;padding:14px 10px;border:0;border-radius:0 8px 8px 0;cursor:pointer;writing-mode:vertical-rl;transform:translateY(-50%) rotate(180deg);" + font + "background:#111;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.2)}" +
      ".gf-embed-tab.gf-left{right:auto;left:0;border-radius:8px 0 0 8px}" +
      ".gf-embed-bubble{position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;align-items:center;justify-content:center;width:56px;height:56px;padding:0;border:0;border-radius:50%;cursor:pointer;background:#111;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25)}" +
      ".gf-embed-bubble.gf-left{right:auto;left:20px}" +
      ".gf-embed-button:hover,.gf-embed-tab:hover,.gf-embed-bubble:hover{opacity:.9}" +
      ".gf-embed-button:focus-visible,.gf-embed-tab:focus-visible,.gf-embed-bubble:focus-visible,.gf-embed-close:focus-visible{outline:2px solid #6366f1;outline-offset:2px}" +
      ".gf-embed-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;transition:opacity .2s ease}" +
      ".gf-embed-modal{position:relative;width:100%;max-width:var(--gf-width,720px);max-height:calc(100vh - 32px);overflow:auto;border-radius:16px;background:transparent;box-shadow:0 24px 64px rgba(0,0,0,.45);transform:translateY(8px);transition:transform .2s ease}" +
      ".gf-slider,.gf-fullscreen{padding:0}" +
      ".gf-slider{justify-content:flex-end;background:rgba(0,0,0,.35);backdrop-filter:none}" +
      ".gf-slider.gf-left{justify-content:flex-start}" +
      ".gf-slider .gf-embed-modal,.gf-fullscreen .gf-embed-modal{height:100%;max-height:none;overflow:hidden;border-radius:0;background:#fff}" +
      ".gf-slider .gf-embed-modal{max-width:var(--gf-width,420px);transform:translateX(100%);transition:transform .25s ease}" +
      ".gf-slider.gf-left .gf-embed-modal{transform:translateX(-100%)}" +
      ".gf-fullscreen .gf-embed-modal{max-width:none;box-shadow:none}" +
      ".gf-embed-popover{position:fixed;right:20px;bottom:88px;z-index:100000;width:min(var(--gf-width,380px),calc(100vw - 40px));max-height:calc(100vh - 120px);overflow:auto;border-radius:16px;background:#fff;box-shadow:0 24px 64px rgba(0,0,0,.35);opacity:0;transform:translateY(12px) scale(.98);transform-origin:bottom right;transition:opacity .2s ease,transform .2s ease}" +
      ".gf-embed-popover.gf-left{right:auto;left:20px;transform-origin:bottom left}" +
      ".gf-embed-overlay.gf-open,.gf-embed-popover.gf-open{opacity:1}" +
      ".gf-embed-overlay.gf-open .gf-embed-modal,.gf-embed-popover.gf-open{transform:none}" +
      ".gf-embed-overlay[hidden],.gf-embed-popover[hidden]{display:none}" +
      ".gf-embed-close{position:absolute;top:10px;right:10px;z-index:1;width:32px;height:32px;border-radius:8px;border:0;cursor:pointer;background:rgba(127,127,127,.18);font:20px/1 system-ui,sans-serif;mix-blend-mode:difference;color:#fff}" +
      ".gf-embed-close:hover{background:rgba(127,127,127,.3)}" +
      ".gf-embed-guard{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}" +
      "@media (prefers-color-scheme:dark){.gf-slider .gf-embed-modal,.gf-fullscreen .gf-embed-modal,.gf-embed-popover{background:#111}}" +
      "@media (max-width:640px){.gf-slider .gf-embed-modal{max-width:none}.gf-embed-popover,.gf-embed-popover.gf-left{left:0;right:0;bottom:0;width:auto;max-height:85vh;border-radius:16px 16px 0 0;transform-origin:bottom center}}" +
      "@media (prefers-reduced-motion:reduce){.gf-embed-frame,.gf-embed-overlay,.gf-embed-modal,.gf-embed-popover{transition:none}}";
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function node(tag, className) {
    var el = document.createElement(tag);
    el.className = className;
    return el;
  }

  function createFrame(url, title, height) {
    var iframe = node("iframe", "gf-embed-frame");
    iframe.src = url;
    iframe.title = title || "Form";
    iframe.setAttribute("allow", "clipboard-write; payment");
    iframe.setAttribute("allowtransparency", "true");
    iframe.style.height = height;
    return iframe;
  }

  // Applies a custom launcher colour with readable text on top.
  function paint(el, color) {
    if (!color) return;
    el.style.background = color;
    var hex = /^#([0-9a-f]{6})$/i.exec(color);
    if (!hex) return;
    var n = parseInt(hex[1], 16);
    el.style.color = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? "#111" : "#fff";
  }

  // Locks page scroll while a modal is open, padding for the scrollbar so the page doesn't shift.
  function lockScroll(on) {
    var body = document.body;
    if (on && lock.count++ === 0) {
      var gap = window.innerWidth - document.documentElement.clientWidth;
      lock.overflow = body.style.overflow;
      lock.padding = body.style.paddingRight;
      body.style.overflow = "hidden";
      if (gap > 0) body.style.paddingRight = parseFloat(getComputedStyle(body).paddingRight) + gap + "px";
    } else if (!on && --lock.count === 0) {
      body.style.overflow = lock.overflow;
      body.style.paddingRight = lock.padding;
    }
  }

  function guard(onFocus) {
    var el = node("span", "gf-embed-guard");
    el.tabIndex = 0;
    el.addEventListener("focus", onFocus);
    return el;
  }

  // A popup, slider, fullscreen or popover surface; DOM and iframe are created on first open.
  function createDialog(cfg) {
    var modal = cfg.mode !== "popover";
    var fill = cfg.mode === "slider" || cfg.mode === "fullscreen";
    var side = cfg.position === "left" ? " gf-left" : "";
    var root = null;
    var panel, closeBtn, endGuard, record;
    var isOpen = false;
    var submitted = false;
    var returnFocus = null;
    var hideTimer = 0;
    var autoCloseTimer = 0;
    var api = { open: show, close: hide, toggle: function (opener) { if (isOpen) hide(); else show(opener); } };

    function build() {
      injectStyle();
      panel = node("div", modal ? "gf-embed-modal" : "gf-embed-popover" + side);
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", String(modal));
      panel.setAttribute("aria-label", cfg.title || "Form");
      if (cfg.width) panel.style.setProperty("--gf-width", cfg.width + "px");
      closeBtn = node("button", "gf-embed-close");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.innerHTML = "&times;";
      closeBtn.addEventListener("click", hide);
      panel.appendChild(closeBtn);
      root = panel;
      if (modal) {
        // Focus trap: tabbing past either end wraps back into the dialog.
        panel.insertBefore(guard(function () { (record ? record.iframe : closeBtn).focus(); }), closeBtn);
        endGuard = guard(function () { closeBtn.focus(); });
        panel.appendChild(endGuard);
        root = node("div", "gf-embed-overlay gf-" + cfg.mode + side);
        root.addEventListener("click", function (e) {
          if (e.target === root) hide();
        });
        root.appendChild(panel);
      }
      root.hidden = true;
      document.body.appendChild(root);
    }

    function attachFrame() {
      var url = formUrl(cfg.slug, Object.assign({}, cfg.params, { solid: "1" }), cfg.inherit);
      record = { iframe: createFrame(url, cfg.title, fill ? "100%" : "480px"), slug: cfg.slug, fill: fill, onSubmit: onSubmit, onEscape: hide };
      panel.insertBefore(record.iframe, endGuard || null);
      frames.push(record);
    }

    function dropFrame() {
      frames.splice(frames.indexOf(record), 1);
      panel.removeChild(record.iframe);
      record = null;
      submitted = false;
    }

    function onSubmit() {
      submitted = true;
      if (cfg.autoClose > 0) autoCloseTimer = setTimeout(hide, cfg.autoClose * 1000);
    }

    // `opener` is where focus returns on close (Safari doesn't focus clicked buttons); defaults to the focused element.
    function show(opener) {
      if (isOpen) return;
      if (!root) build();
      if (!record) attachFrame();
      clearTimeout(hideTimer);
      isOpen = true;
      returnFocus = opener || document.activeElement;
      openStack.push(api);
      if (modal) lockScroll(true);
      root.hidden = false;
      void root.offsetWidth;
      root.classList.add("gf-open");
      closeBtn.focus({ preventScroll: true });
      if (cfg.onToggle) cfg.onToggle(true, false);
    }

    function hide() {
      if (!isOpen) return;
      var done = submitted;
      isOpen = false;
      clearTimeout(autoCloseTimer);
      openStack.splice(openStack.indexOf(api), 1);
      if (modal) lockScroll(false);
      root.classList.remove("gf-open");
      // After a submission the next open starts a fresh form; one-off API dialogs are removed entirely.
      hideTimer = setTimeout(function () {
        root.hidden = true;
        if (record && (done || cfg.once)) dropFrame();
        if (cfg.once) {
          root.parentNode.removeChild(root);
          root = null;
        }
      }, 200);
      if (returnFocus && returnFocus.focus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
      if (cfg.onToggle) cfg.onToggle(false, done);
    }

    return api;
  }

  function capped(cfg) {
    if (cfg.hideAfterSubmit && store("local", SUBMITTED + cfg.slug)) return true;
    if (cfg.frequency === "session") return Boolean(store("session", SHOWN + cfg.slug));
    if (cfg.frequency === "days") return Date.now() - Number(store("local", SHOWN + cfg.slug)) < cfg.frequencyDays * 864e5;
    return false;
  }

  function markShown(cfg) {
    if (cfg.frequency === "session") store("session", SHOWN + cfg.slug, "1");
    else if (cfg.frequency === "days") store("local", SHOWN + cfg.slug, String(Date.now()));
  }

  // Delay, scroll-depth and exit-intent triggers; the first to fire opens the dialog, at most once per page view.
  function autoOpen(cfg, open) {
    var stops = [];
    function stop() {
      while (stops.length) stops.pop()();
    }
    function fire() {
      if (openStack.length) return;
      stop();
      if (!capped(cfg)) open();
    }
    function listen(target, type, fn) {
      target.addEventListener(type, fn, { passive: true });
      stops.push(function () {
        target.removeEventListener(type, fn, { passive: true });
      });
    }
    if (capped(cfg)) return stop;
    if (has(cfg.triggers, "delay")) {
      var timer = setTimeout(fire, cfg.delay * 1000);
      stops.push(function () {
        clearTimeout(timer);
      });
    }
    if (has(cfg.triggers, "scroll")) {
      listen(window, "scroll", function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        if (max > 0 && (window.scrollY / max) * 100 >= cfg.scroll) fire();
      });
    }
    // Exit intent needs a hovering pointer, so it's a no-op on touch devices.
    if (has(cfg.triggers, "exit") && window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      listen(document, "mouseout", function (e) {
        if (!e.relatedTarget && e.clientY <= 0) fire();
      });
    }
    return stop;
  }

  function readConfig(el) {
    var get = function (name) {
      return el.getAttribute("data-" + name) || "";
    };
    var params = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name.indexOf("data-param-") === 0) params[attr.name.slice(11)] = attr.value;
    }
    var selector = get("open-selector");
    try {
      if (selector) document.querySelector(selector);
    } catch (e) {
      selector = "";
    }
    return {
      slug: get("geiger-form"),
      mode: get("mode") || "inline",
      title: get("title"),
      buttonText: get("button-text"),
      buttonColor: get("button-color"),
      position: get("position"),
      width: number(get("width"), 0),
      triggers: (get("trigger") || "click").toLowerCase().split(/[\s,]+/),
      delay: number(get("delay"), 5),
      scroll: number(get("scroll"), 50),
      frequency: get("frequency") || "always",
      frequencyDays: number(get("frequency-days"), 7),
      hideAfterSubmit: el.hasAttribute("data-hide-after-submit") && !/^(false|0)$/i.test(get("hide-after-submit")),
      autoClose: number(get("auto-close"), 0),
      openSelector: selector,
      params: params,
      inherit: inheritList(get("inherit-params")),
    };
  }

  function mountInline(el, cfg) {
    var iframe = createFrame(formUrl(cfg.slug, cfg.params, cfg.inherit), cfg.title, "480px");
    iframe.loading = "lazy";
    frames.push({ iframe: iframe, slug: cfg.slug });
    el.appendChild(iframe);
  }

  // Dialog modes: a launcher (in-place button, edge tab or corner bubble), an optional selector, and automatic triggers.
  function mountDialog(el, cfg) {
    var floating = cfg.mode === "side-tab" || cfg.mode === "popover";
    var launcher = null;
    var stopAuto = function () {};
    var dialog = createDialog(Object.assign({}, cfg, {
      mode: cfg.mode === "side-tab" ? "slider" : cfg.mode,
      onToggle: function (open, submitted) {
        if (open) {
          stopAuto();
          markShown(cfg);
        }
        if (!launcher) return;
        if (cfg.mode === "popover") {
          launcher.setAttribute("aria-expanded", String(open));
          launcher.innerHTML = open ? ICON_CLOSE : ICON_CHAT;
        }
        if (!open && submitted && floating && cfg.hideAfterSubmit) {
          launcher.parentNode.removeChild(launcher);
          launcher = null;
        }
      },
    }));
    var done = cfg.hideAfterSubmit && store("local", SUBMITTED + cfg.slug);
    if (floating ? !done : has(cfg.triggers, "click") && !cfg.openSelector) {
      launcher = node("button", cfg.mode === "popover" ? "gf-embed-bubble" : cfg.mode === "side-tab" ? "gf-embed-tab" : "gf-embed-button");
      launcher.type = "button";
      launcher.setAttribute("aria-haspopup", "dialog");
      if (cfg.mode === "popover") {
        launcher.setAttribute("aria-label", cfg.buttonText || "Open form");
        launcher.setAttribute("aria-expanded", "false");
        launcher.innerHTML = ICON_CHAT;
      } else {
        launcher.textContent = cfg.buttonText || (cfg.mode === "side-tab" ? "Feedback" : "Open form");
      }
      if (floating && cfg.position === "left") launcher.classList.add("gf-left");
      paint(launcher, cfg.buttonColor);
      launcher.addEventListener("click", function () {
        dialog.toggle(launcher);
      });
      (floating ? document.body : el).appendChild(launcher);
    }
    if (cfg.openSelector) {
      document.addEventListener("click", function (e) {
        var target = e.target.closest ? e.target.closest(cfg.openSelector) : null;
        if (target) {
          e.preventDefault();
          dialog.open(target);
        }
      });
    }
    if (!done) stopAuto = autoOpen(cfg, dialog.open);
  }

  function mountAll(root) {
    var nodes = (root || document).querySelectorAll("[data-geiger-form]:not([data-gf-mounted])");
    injectStyle();
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var cfg = readConfig(el);
      if (!cfg.slug) continue;
      el.setAttribute("data-gf-mounted", "1");
      el.innerHTML = "";
      if (DIALOG_MODES[cfg.mode]) mountDialog(el, cfg);
      else mountInline(el, cfg);
    }
  }

  // Opens a form in a popup (default), slider, popover or fullscreen dialog; returns { close }.
  function open(slug, options) {
    if (!slug) return;
    var o = options || {};
    var dialog = createDialog({
      slug: slug,
      mode: o.mode === "side-tab" ? "slider" : DIALOG_MODES[o.mode] ? o.mode : "popup",
      title: o.title,
      width: number(o.width, 0),
      position: o.position,
      params: o.params,
      inherit: inheritList(o.inheritParams),
      autoClose: number(o.autoClose, 0),
      once: true,
    });
    dialog.open();
    return { close: dialog.close };
  }

  // Height, submit and Escape messages, accepted only from this script's origin and matched to the posting iframe.
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (event.origin !== baseOrigin || !data || typeof data.type !== "string") return;
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      if (frame.iframe.contentWindow !== event.source) continue;
      if (data.type === "geiger-form:height" && typeof data.height === "number") {
        if (!frame.fill) frame.iframe.style.height = Math.max(120, Math.ceil(data.height)) + "px";
      } else if (data.type === "geiger-form:submitted") {
        store("local", SUBMITTED + frame.slug, "1");
        frame.iframe.dispatchEvent(new CustomEvent("geiger-form:submitted", { bubbles: true, detail: { slug: frame.slug, responseId: data.responseId || null, outcome: data.outcome || null } }));
        if (frame.onSubmit) frame.onSubmit();
      } else if (data.type === "geiger-form:escape" && frame.onEscape) {
        frame.onEscape();
      }
      return;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openStack.length) openStack[openStack.length - 1].close();
  });

  window.GeigerForms = { __ready: true, open: open, mount: mountAll, url: formUrl };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mountAll(); });
  else mountAll();
})();
