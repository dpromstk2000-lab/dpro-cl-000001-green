(() => {
  "use strict";

  const config = window.GREEN_CONFIG;
  if (!config?.API_BASE) throw new Error("GREEN_CONFIG.API_BASE is required");

  const SESSION_TYPES = Object.freeze(["admin", "staff", "member"]);
  const state = { csrfToken: null, sessionTokens: Object.create(null) };

  function storageKey(type) {
    return `green_${type}_session_token`;
  }

  function readSessionToken(type) {
    try { return sessionStorage.getItem(storageKey(type)) || null; } catch { return null; }
  }

  function setSessionToken(type, value) {
    if (!SESSION_TYPES.includes(type)) return;
    state.sessionTokens[type] = value || null;
    try {
      if (value) sessionStorage.setItem(storageKey(type), value);
      else sessionStorage.removeItem(storageKey(type));
    } catch {}
  }

  function inferSessionType(path) {
    const match = String(path || "").match(/^\/api\/(admin|staff|member)(?:\/|$)/);
    return match ? match[1] : null;
  }

  for (const type of SESSION_TYPES) state.sessionTokens[type] = readSessionToken(type);

  function uuid() {
    return crypto.randomUUID ? crypto.randomUUID() : `green-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function api(path, options = {}) {
    const autoDemo = new URLSearchParams(location.search).get("demo") === "1"
      && config.FACILITY_CODE === "dpro_green_rental_demo";

    // READY V1.0: In explicit demo mode, restore by demo login directly.
    // This avoids an expected 401 /session probe being left as a red Console error.
    // Production URLs (without ?demo=1) keep the existing /session restore flow unchanged.
    if (autoDemo && options.skipDemoRestore !== true && path === "/api/admin/session") {
      return api("/api/admin/login", {
        method: "POST",
        json: { facilityCode: config.FACILITY_CODE, code: "1234" },
        skipDemoRestore: true,
      });
    }
    if (autoDemo && options.skipDemoRestore !== true && path === "/api/staff/session") {
      return api("/api/staff/login", {
        method: "POST",
        json: {
          facilityCode: config.FACILITY_CODE,
          staffCode: "DEMO-YAMAMOTO",
          code: "1234",
        },
        skipDemoRestore: true,
      });
    }

    const headers = new Headers(options.headers || {});
    if (options.json !== undefined) headers.set("Content-Type", "application/json");
    if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);
    const sessionType = options.sessionType || inferSessionType(path);
    const sessionToken = sessionType ? state.sessionTokens[sessionType] : null;
    if (sessionToken && !headers.has("Authorization") && !String(path).endsWith("/login")) {
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }
    if (state.csrfToken && !["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase())) {
      headers.set("X-CSRF-Token", state.csrfToken);
    }
    const response = await fetch(`${config.API_BASE}${path}`, {
      method: options.method || "GET",
      credentials: "include",
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    });
    const payload = await response.json().catch(() => ({ ok: false, error: "invalid_response", message: "API応答を読み取れませんでした。" }));
    if (!response.ok || payload.ok === false) {
      if (sessionType && (response.status === 401 || String(path).endsWith("/logout"))) setSessionToken(sessionType, null);
      const error = new Error(payload.message || "処理に失敗しました。");
      error.code = payload.error || "request_failed";
      error.details = payload.details || payload.fields || null;
      error.requestId = payload.requestId || null;
      throw error;
    }
    if (sessionType && String(path).endsWith("/login") && payload.data?.sessionToken) {
      setSessionToken(sessionType, payload.data.sessionToken);
    }
    if (sessionType && String(path).endsWith("/logout")) setSessionToken(sessionType, null);
    return payload;
  }

  async function uploadPhoto(path, file, uploadToken, caption = "") {
    const form = new FormData();
    form.append("file", file, file.name || "photo.jpg");
    if (caption) form.append("caption", caption);
    return api(path, { method: "POST", headers: { "X-Upload-Token": uploadToken }, body: form });
  }

  async function compressImage(file, options = {}) {
    const maxEdge = options.maxEdge || config.MAX_IMAGE_EDGE || 1600;
    const quality = options.quality || config.JPEG_QUALITY || 0.82;
    if (!file.type.startsWith("image/")) throw new Error("画像ファイルを選択してください。");
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("画像を圧縮できませんでした。")), "image/jpeg", quality);
    });
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  }

  function setCsrfToken(value) {
    state.csrfToken = value || null;
  }

  function formatDate(value, options = {}) {
    if (!value) return "未設定";
    const date = new Date(value.length === 10 ? `${value}T00:00:00+09:00` : value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric", ...options }).format(date);
  }

  function formatTime(value) {
    if (!value) return "時間未定";
    return String(value).slice(0, 5);
  }

  function statusLabel(status) {
    const labels = {
      new: "新着", contacted: "連絡済み", active: "利用中", paused: "休止中", ended: "終了",
      scheduled: "予定", change_pending: "変更確認中", cancellation_requested: "解約申出", removal_scheduled: "撤去予定",
      not_started: "未開始", arrived: "到着", working: "作業中", completed: "完了", unavailable: "訪問できず",
      revisit_required: "再訪問必要", cancelled: "取消", open: "受付済み", reviewing: "確認中", action_planned: "対応予定",
      resolved: "対応済み", closed: "完了", draft: "下書き", published: "公開済み",
    };
    return labels[status] || status || "未設定";
  }

  function toast(message, type = "info") {
    let region = document.querySelector("#toast-region");
    if (!region) {
      region = document.createElement("div");
      region.id = "toast-region";
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      document.body.append(region);
    }
    const item = document.createElement("div");
    item.className = `toast toast-${type}`;
    item.textContent = message;
    region.append(item);
    setTimeout(() => item.remove(), 4600);
  }

  function setBusy(button, busy, label = "送信中…") {
    if (!button) return;
    if (busy) {
      button.dataset.originalLabel = button.textContent;
      button.textContent = label;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      button.textContent = button.dataset.originalLabel || button.textContent;
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }

  function renderError(container, error) {
    if (!container) return;
    container.hidden = false;
    container.textContent = `${error.message}${error.requestId ? `（確認番号：${error.requestId}）` : ""}`;
  }

  window.Green = Object.freeze({
    api, uploadPhoto, compressImage, setCsrfToken, setSessionToken, uuid, formatDate, formatTime, statusLabel, toast, setBusy, renderError,
  });
})();
