(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const Green = window.Green;
  const config = window.GREEN_CONFIG;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

  async function restore() {
    try {
      const response = await Green.api("/api/admin/session");
      Green.setCsrfToken(response.data.csrfToken);
      show();
      await run();
    } catch {
      loginView();
    }
  }

  function loginView() {
    $("#check-login").hidden = false;
    $("#check-app").hidden = true;
  }

  function show() {
    $("#check-login").hidden = true;
    $("#check-app").hidden = false;
  }

  async function login(event) {
    event.preventDefault();
    try {
      const response = await Green.api("/api/admin/login", {
        method: "POST",
        json: {
          facilityCode: $("#check-facility").value,
          code: $("#check-code").value,
        },
      });
      Green.setCsrfToken(response.data.csrfToken);
      $("#check-code").value = "";
      show();
      await run();
    } catch (error) {
      Green.renderError($("#check-login-error"), error);
    }
  }

  async function logout() {
    try {
      await Green.api("/api/admin/logout", { method: "POST", json: {} });
    } catch {}
    Green.setCsrfToken(null);
    loginView();
  }

  async function fetchSystemCheckResult() {
    const headers = new Headers();

    // GREEN common stores the admin bearer token in sessionStorage.
    // Keep cookie transport too, so this diagnostic call works with either
    // currently supported session transport.
    try {
      const token = sessionStorage.getItem("green_admin_session_token");
      if (token) headers.set("Authorization", `Bearer ${token}`);
    } catch {}

    const response = await fetch(`${config.API_BASE}/api/admin/system-check`, {
      method: "GET",
      credentials: "include",
      headers,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({
      ok: false,
      error: "invalid_response",
      message: "システム検査のAPI応答を読み取れませんでした。",
    }));

    // System Check is a diagnostic endpoint.
    // The Worker intentionally returns HTTP 409 when one or more checks fail.
    // The diagnostic data must still be rendered so the operator can see
    // exactly what failed instead of only seeing a generic request error.
    if (payload && payload.data) return payload;

    const error = new Error(
      payload?.message || `システム検査を取得できませんでした（HTTP ${response.status}）。`
    );
    error.code = payload?.error || "system_check_request_failed";
    error.requestId = payload?.requestId || null;
    throw error;
  }

  async function run() {
    try {
      const payload = await fetchSystemCheckResult();
      if (payload.data) {
        render(payload.data);
      } else {
        throw new Error(payload.message || "検査結果を取得できません。");
      }
      await checkPages();
    } catch (error) {
      Green.toast(
        `${error.message}${error.requestId ? `（確認番号：${error.requestId}）` : ""}`,
        "error"
      );
    }
  }

  function render(data) {
    const stats = [
      ["検査件数", data.total],
      ["合格", data.passed],
      ["失敗", data.failed],
      ["警告", data.warnings],
    ];
    $("#check-summary").innerHTML = stats.map(([label, value]) =>
      `<div class="check-stat"><small>${label}</small><strong>${value}</strong></div>`
    ).join("");

    $("#check-list").innerHTML = (data.checks || []).map((item) =>
      `<div class="check-item" data-status="${item.status}">` +
        `<span class="check-dot"></span>` +
        `<div><strong>${esc(item.label)}</strong>` +
          `${item.detail !== null ? `<small>${esc(typeof item.detail === "string" ? item.detail : JSON.stringify(item.detail))}</small>` : ""}` +
        `</div>` +
        `<span class="check-badge">${item.status === "pass" ? "合格" : item.status === "fail" ? "失敗" : "警告"}</span>` +
      `</div>`
    ).join("");

    $("#demo-result").textContent = data.demoPrepared
      ? "デモ基本データは準備済みです。"
      : "未準備です。下の操作で準備してください。";
  }

  async function prepare() {
    if (!$("#demo-confirmed").checked || $("#demo-text").value.trim().toUpperCase() !== "DEMO") {
      Green.toast("確認チェックと確認文字DEMOが必要です。", "error");
      return;
    }
    if (!confirm("デモ事業所の基本データを準備します。実行しますか？")) return;

    const button = $("#demo-prepare");
    Green.setBusy(button, true, "準備中…");
    try {
      const response = await Green.api("/api/admin/demo/prepare", {
        method: "POST",
        json: { confirmed: true, confirmation: "DEMO" },
      });
      $("#demo-result").textContent = `準備完了：${JSON.stringify(response.data.counts || {})}`;
      Green.toast("デモ基本データを準備しました。", "success");
      await run();
    } catch (error) {
      Green.toast(error.message, "error");
    } finally {
      Green.setBusy(button, false);
    }
  }

  async function checkPages() {
    const files = [
      "index.html",
      "member.html",
      "owner.html",
      "owner-ipad.html",
      "staff.html",
      "system-check.html",
      "config.js",
    ];
    const rows = [];
    for (const file of files) {
      try {
        const response = await fetch(file, { cache: "no-store" });
        rows.push([file, response.ok, response.status]);
      } catch {
        rows.push([file, false, "通信失敗"]);
      }
    }

    $("#page-checks").innerHTML = rows.map(([file, ok, status]) =>
      `<div class="page-check"><span>${esc(file)}</span>` +
      `<strong data-ok="${ok}">${ok ? "表示正常" : `失敗 ${status}`}</strong></div>`
    ).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#check-facility").value = config.FACILITY_CODE;
    $("#check-login-form").addEventListener("submit", login);
    $("#check-clear").addEventListener("click", () => $("#check-code").value = "");
    $("#check-rerun").addEventListener("click", run);
    $("#demo-prepare").addEventListener("click", prepare);
    $("#check-logout").addEventListener("click", logout);
    restore();
  });
})();
