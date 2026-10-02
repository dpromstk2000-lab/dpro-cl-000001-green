(() => {
  "use strict";

  const VERSION = "GREEN-MEMBER-READY-R2-LIFF-SESSION-RESET-20261002";
  const lineButton = document.querySelector("#line-login");
  const logoutButton = document.querySelector("#logout");
  const loginPanel = document.querySelector("#login-panel");
  const portal = document.querySelector("#portal");
  const errorBox = document.querySelector("#global-error");
  if (!lineButton || !logoutButton || !loginPanel || !portal || !errorBox) return;

  const config = window.GREEN_CONFIG || {};
  const Green = window.Green || {};

  function showFriendlyError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior:"smooth", block:"center" });
  }

  function cleanCurrentUrl() {
    const url = new URL(location.href);
    [...url.searchParams.keys()].forEach((key) => {
      if (key.startsWith("liff.")) url.searchParams.delete(key);
    });
    return url.href;
  }

  function syncLogoutVisibility() {
    // ログイン画面ではログアウトを出さない。ポータル表示中だけ表示。
    logoutButton.hidden = portal.hidden || !loginPanel.hidden;
  }

  async function initLiff() {
    if (!config.LIFF_ID) {
      throw new Error("LINE連携設定を確認できません。");
    }
    if (!window.liff) {
      throw new Error("LINE接続を開始できませんでした。少し時間をおいて、もう一度お試しください。");
    }
    await window.liff.init({ liffId: config.LIFF_ID });
  }

  function clearDproMemberSession() {
    Green.setCsrfToken?.(null);
    Green.setSessionToken?.("member", null);
  }

  async function freshLineLogin() {
    await initLiff();
    clearDproMemberSession();
    try {
      if (window.liff.isLoggedIn()) window.liff.logout();
    } catch {}
    window.liff.login({ redirectUri: cleanCurrentUrl() });
  }

  async function friendlyLineLogin(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    Green.setBusy?.(lineButton, true, "LINE確認中…");
    errorBox.hidden = true;

    try {
      await initLiff();

      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: cleanCurrentUrl() });
        return;
      }

      const idToken = window.liff.getIDToken();
      if (!idToken) {
        await freshLineLogin();
        return;
      }

      try {
        const response = await Green.api("/api/member/login", {
          method:"POST",
          json:{
            mode:"line",
            facilityCode:config.FACILITY_CODE,
            idToken
          }
        });

        Green.setCsrfToken?.(response?.data?.csrfToken || null);
        location.reload();
      } catch (error) {
        // DPRO側ログアウトだけ行われ、LIFF側の古いIDトークンが残った場合は
        // LINEログイン自体をやり直して新しいIDトークンを取得する。
        if (error?.code === "invalid_line_id_token") {
          await freshLineLogin();
          return;
        }
        throw error;
      }
    } catch (error) {
      showFriendlyError(error?.message || "LINE本人確認を完了できませんでした。もう一度お試しください。");
    } finally {
      Green.setBusy?.(lineButton, false);
      syncLogoutVisibility();
    }
  }

  async function friendlyLogout(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    Green.setBusy?.(logoutButton, true, "ログアウト中…");
    errorBox.hidden = true;

    try {
      try {
        await Green.api("/api/member/logout", { method:"POST", json:{} });
      } catch {
        // DPROセッションが既に失効していても、LINE側ログアウトは続行する。
      }

      clearDproMemberSession();

      try {
        await initLiff();
        if (window.liff.isLoggedIn()) window.liff.logout();
      } catch {
        // LIFF初期化に失敗してもDPRO側ログアウトは成立させる。
      }

      location.replace(cleanCurrentUrl());
    } finally {
      Green.setBusy?.(logoutButton, false);
    }
  }

  lineButton.addEventListener("click", friendlyLineLogin, { capture:true });
  logoutButton.addEventListener("click", friendlyLogout, { capture:true });

  const observer = new MutationObserver(syncLogoutVisibility);
  observer.observe(loginPanel, { attributes:true, attributeFilter:["hidden"] });
  observer.observe(portal, { attributes:true, attributeFilter:["hidden"] });

  document.documentElement.dataset.greenMemberReady = VERSION;
  syncLogoutVisibility();
})();