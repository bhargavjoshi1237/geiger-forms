/* Geiger Forms embed: <div data-geiger-form="slug" data-mode="inline|popup" data-button-text="…"></div><script src=".../embed.js" async></script> */
(function () {
  "use strict";
  if (window.GeigerForms && window.GeigerForms.__ready) return;

  var script = document.currentScript || (function () {
    var all = document.querySelectorAll('script[src*="embed.js"]');
    return all[all.length - 1];
  })();
  // Base URL = the script's directory, so a /forms mount prefix is preserved.
  var base = (function () {
    try {
      var url = new URL(script && script.src ? script.src : window.location.href, window.location.href);
      return url.origin + url.pathname.replace(/\/embed\.js$/, "");
    } catch (e) {
      return "";
    }
  })();
  var frames = [];
  var STYLE_ID = "geiger-forms-embed-style";

  function formUrl(slug, extra) {
    var qs = "embed=1";
    var current = new URLSearchParams(window.location.search);
    current.forEach(function (value, key) {
      if (/^utm_/i.test(key)) qs += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(value);
    });
    if (extra) qs += "&" + extra;
    return base + "/form/" + encodeURIComponent(slug) + "?" + qs;
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      ".gf-embed-frame{display:block;width:100%;border:0;background:transparent;transition:height .2s ease;min-height:120px}" +
      ".gf-embed-button{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;border:0;cursor:pointer;font:500 14px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;background:#111;color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)}" +
      ".gf-embed-button:hover{opacity:.9}.gf-embed-button:focus-visible{outline:2px solid #6366f1;outline-offset:2px}" +
      ".gf-embed-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;transition:opacity .2s ease}" +
      ".gf-embed-overlay.gf-open{opacity:1}" +
      ".gf-embed-modal{position:relative;width:100%;max-width:720px;max-height:calc(100vh - 32px);overflow:auto;border-radius:16px;background:transparent;box-shadow:0 24px 64px rgba(0,0,0,.45);transform:translateY(8px);transition:transform .2s ease}" +
      ".gf-embed-overlay.gf-open .gf-embed-modal{transform:none}" +
      ".gf-embed-close{position:absolute;top:10px;right:10px;z-index:1;width:32px;height:32px;border-radius:8px;border:0;cursor:pointer;background:rgba(127,127,127,.18);font:20px/1 system-ui,sans-serif;mix-blend-mode:difference;color:#fff}" +
      ".gf-embed-close:hover{background:rgba(127,127,127,.3)}";
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function createFrame(slug, title, extra) {
    var iframe = document.createElement("iframe");
    iframe.src = formUrl(slug, extra);
    iframe.className = "gf-embed-frame";
    iframe.title = title || "Form";
    iframe.loading = "lazy";
    iframe.setAttribute("allow", "clipboard-write; payment");
    iframe.setAttribute("allowtransparency", "true");
    iframe.style.height = "480px";
    frames.push(iframe);
    return iframe;
  }

  function mountInline(el, slug) {
    el.innerHTML = "";
    el.appendChild(createFrame(slug, el.getAttribute("data-title")));
  }

  function open(slug, options) {
    if (!slug) return;
    injectStyle();
    var overlay = document.createElement("div");
    overlay.className = "gf-embed-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    var modal = document.createElement("div");
    modal.className = "gf-embed-modal";
    var close = document.createElement("button");
    close.type = "button";
    close.className = "gf-embed-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML = "&times;";
    var iframe = createFrame(slug, options && options.title, "solid=1");
    iframe.loading = "eager";
    modal.appendChild(close);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    var previousOverflow = document.body.style.overflow;
    var previousFocus = document.activeElement;
    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.classList.add("gf-open");
      close.focus();
    });

    function dismiss() {
      overlay.classList.remove("gf-open");
      document.removeEventListener("keydown", onKey);
      frames = frames.filter(function (f) {
        return f !== iframe;
      });
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.body.style.overflow = previousOverflow;
        if (previousFocus && previousFocus.focus) previousFocus.focus();
      }, 200);
    }
    function onKey(e) {
      if (e.key === "Escape") dismiss();
    }
    close.addEventListener("click", dismiss);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) dismiss();
    });
    document.addEventListener("keydown", onKey);
    return { close: dismiss };
  }

  function mountPopup(el, slug) {
    injectStyle();
    var button = document.createElement("button");
    button.type = "button";
    button.className = "gf-embed-button";
    button.textContent = el.getAttribute("data-button-text") || "Open form";
    var color = el.getAttribute("data-button-color");
    if (color) button.style.background = color;
    button.addEventListener("click", function () {
      open(slug, { title: el.getAttribute("data-title") });
    });
    el.innerHTML = "";
    el.appendChild(button);
  }

  function mountAll(root) {
    var nodes = (root || document).querySelectorAll("[data-geiger-form]:not([data-gf-mounted])");
    injectStyle();
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var slug = el.getAttribute("data-geiger-form");
      if (!slug) continue;
      el.setAttribute("data-gf-mounted", "1");
      if ((el.getAttribute("data-mode") || "inline") === "popup") mountPopup(el, slug);
      else mountInline(el, slug);
    }
  }

  // Height + submit messages from the filler; matched to the posting iframe.
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string" || data.type.indexOf("geiger-form:") !== 0) return;
    for (var i = 0; i < frames.length; i++) {
      var frame = frames[i];
      if (frame.contentWindow !== event.source) continue;
      if (data.type === "geiger-form:height" && typeof data.height === "number") {
        frame.style.height = Math.max(120, Math.ceil(data.height)) + "px";
      } else if (data.type === "geiger-form:submitted") {
        frame.dispatchEvent(new CustomEvent("geiger-form:submitted", { bubbles: true, detail: { slug: data.slug, responseId: data.responseId } }));
      }
    }
  });

  window.GeigerForms = { __ready: true, open: open, mount: mountAll, url: formUrl };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { mountAll(); });
  else mountAll();
})();
