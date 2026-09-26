/**
 * DPRO CUSTOMER HERO V3.0
 * Shared customer-facing hero with safe owner-config override and automatic title fitting.
 */
(() => {
  "use strict";

  const VERSION = "DPRO-CUSTOMER-HERO-3.0-20260808";
  const LIMITS = Object.freeze({ eyebrow: 24, title: 30, badge: 30, lead: 70 });

  const text = (value, max) => {
    const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    return normalized.length > max ? `${normalized.slice(0, Math.max(0, max - 1))}…` : normalized;
  };

  const validUrl = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, document.baseURI);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const baseConfig = () => {
    const raw = window.DPRO_CUSTOMER_HERO_CONFIG || {};
    return {
      enabled: raw.enabled !== false,
      desktopImage: validUrl(raw.desktopImage),
      mobileImage: validUrl(raw.mobileImage),
      eyebrow: text(raw.eyebrow, LIMITS.eyebrow),
      title: text(raw.title, LIMITS.title),
      badge: text(raw.badge, LIMITS.badge),
      lead: text(raw.lead, LIMITS.lead),
      alt: text(raw.alt || "店舗イメージ", 60),
    };
  };

  const fetchOwnerOverride = async () => {
    const app = window.GREEN_CONFIG || {};
    if (!app.API_BASE) return null;
    try {
      const response = await fetch(`${app.API_BASE}/api/public/customer-hero`, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload?.data?.hero || null;
    } catch {
      return null;
    }
  };

  const mergedConfig = async () => {
    const base = baseConfig();
    const remote = await fetchOwnerOverride();
    if (!remote?.configured) return base;

    const image = validUrl(remote.image);
    return {
      ...base,
      enabled: typeof remote.enabled === "boolean" ? remote.enabled : base.enabled,
      desktopImage: image || base.desktopImage,
      mobileImage: image || base.mobileImage || base.desktopImage,
      title: text(remote.title, LIMITS.title) || base.title,
      lead: text(remote.lead, LIMITS.lead) || base.lead,
    };
  };

  let titleFitObserver = null;

  const fitTitle = (heading, root) => {
    if (!heading || !root || !root.isConnected) return;

    const mobile = matchMedia("(max-width: 620px)").matches;
    const maxFont = mobile ? 40 : 62;
    const minFont = mobile ? 28 : 32;
    const targetLines = 3;

    heading.style.maxWidth = "none";
    heading.style.width = "100%";
    heading.style.overflowWrap = "normal";
    heading.style.wordBreak = "normal";
    heading.style.textWrap = "balance";

    let size = maxFont;
    heading.style.fontSize = `${size}px`;

    const lineCount = () => {
      const style = getComputedStyle(heading);
      const lineHeight = parseFloat(style.lineHeight) || (size * 1.18);
      const height = heading.getBoundingClientRect().height;
      return lineHeight > 0 ? height / lineHeight : 1;
    };

    let attempts = 0;
    while (size > minFont && lineCount() > targetLines + 0.08 && attempts < 20) {
      size -= 2;
      heading.style.fontSize = `${size}px`;
      attempts += 1;
    }

    heading.dataset.dproHeroFit = size < maxFont ? "fitted" : "default";
    heading.dataset.dproHeroFontSize = String(size);
  };

  const installTitleFit = (heading, root) => {
    const run = () => requestAnimationFrame(() => fitTitle(heading, root));
    run();
    if (document.fonts?.ready) document.fonts.ready.then(run).catch(() => {});

    if ("ResizeObserver" in window) {
      titleFitObserver?.disconnect();
      titleFitObserver = new ResizeObserver(run);
      titleFitObserver.observe(root);
    } else {
      window.addEventListener("resize", run, { passive: true });
    }
  };

  const setMode = (root, luminance) => {
    let mode = "standard";
    if (Number.isFinite(luminance)) {
      if (luminance >= 0.70) mode = "strong";
      else if (luminance <= 0.30) mode = "soft";
    }
    root.dataset.dproHeroOverlay = mode;
  };

  const sampleLuminance = (img, root) => {
    try {
      const canvas = document.createElement("canvas");
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return setMode(root, NaN);

      const sw = img.naturalWidth || 1;
      const sh = img.naturalHeight || 1;
      const isMobile = matchMedia("(max-width: 620px)").matches;
      const sx = 0;
      const sy = isMobile ? Math.floor(sh * 0.48) : 0;
      const sampleW = isMobile ? sw : Math.max(1, Math.floor(sw * 0.58));
      const sampleH = isMobile ? Math.max(1, sh - sy) : sh;
      ctx.drawImage(img, sx, sy, sampleW, sampleH, 0, 0, size, size);
      const pixels = ctx.getImageData(0, 0, size, size).data;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 16) {
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        sum += (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
        count += 1;
      }
      setMode(root, count ? sum / count : NaN);
    } catch {
      setMode(root, NaN);
    }
  };

  const render = async () => {
    const host = document.querySelector("[data-dpro-customer-hero]");
    if (!host) return;
    const cfg = await mergedConfig();
    host.replaceChildren();
    host.dataset.dproCustomerHeroVersion = VERSION;

    if (!cfg.enabled || !cfg.desktopImage) {
      host.hidden = true;
      return;
    }
    host.hidden = false;

    const root = document.createElement("section");
    root.className = "dpro-customer-hero";
    root.dataset.dproHeroOverlay = "standard";
    root.setAttribute("aria-label", "店舗・サービスのご案内");

    const picture = document.createElement("picture");
    picture.className = "dpro-customer-hero__media";
    if (cfg.mobileImage) {
      const source = document.createElement("source");
      source.media = "(max-width: 620px)";
      source.srcset = cfg.mobileImage;
      picture.appendChild(source);
    }
    const img = document.createElement("img");
    img.src = cfg.desktopImage;
    img.alt = cfg.alt;
    img.decoding = "async";
    img.fetchPriority = "high";
    img.addEventListener("load", () => sampleLuminance(img, root), { once: true });
    picture.appendChild(img);

    const shade = document.createElement("div");
    shade.className = "dpro-customer-hero__shade";
    shade.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "dpro-customer-hero__copy";

    if (cfg.eyebrow) {
      const eyebrow = document.createElement("p");
      eyebrow.className = "dpro-customer-hero__eyebrow";
      eyebrow.textContent = cfg.eyebrow;
      copy.appendChild(eyebrow);
    }
    let titleHeading = null;
    if (cfg.title) {
      const h = document.createElement("h1");
      h.textContent = cfg.title;
      copy.appendChild(h);
      titleHeading = h;
    }
    if (cfg.badge) {
      const badge = document.createElement("strong");
      badge.className = "dpro-customer-hero__badge";
      badge.textContent = cfg.badge;
      copy.appendChild(badge);
    }
    if (cfg.lead) {
      const lead = document.createElement("p");
      lead.className = "dpro-customer-hero__lead";
      lead.textContent = cfg.lead;
      copy.appendChild(lead);
    }

    root.append(picture, shade, copy);
    host.appendChild(root);
    if (titleHeading) installTitleFit(titleHeading, root);
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { void render(); }, { once: true });
  else void render();

  window.DPRO_CUSTOMER_HERO = Object.freeze({ version: VERSION, render, limits: LIMITS });
})();
