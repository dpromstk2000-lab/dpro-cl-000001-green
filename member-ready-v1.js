(() => {
  "use strict";

  const button = document.querySelector("#line-login");
  const errorBox = document.querySelector("#global-error");
  if (!button || !errorBox) return;

  const config = window.GREEN_CONFIG || {};
  const Green = window.Green || {};

  function showFriendlyError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior:"smooth", block:"center" });
  }

  async function friendlyLineLogin(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    Green.setBusy?.(button, true, "LINE確認中…");
    errorBox.hidden = true;

    try {
      if (!config.LIFF_ID) {
        throw new Error("LINE連携はこのデモでは設定されていません。下の「デモマイページを開く」から操作をご確認ください。");
      }
      if (!window.liff) {
        throw new Error("LINE接続を開始できませんでした。少し時間をおいて、もう一度お試しください。");
      }

      await window.liff.init({ liffId: config.LIFF_ID });

      if (!window.liff.isLoggedIn()) {
        window.liff.login({ redirectUri: location.href });
        return;
      }

      const idToken = window.liff.getIDToken();
      if (!idToken) {
        throw new Error("LINE本人確認を完了できませんでした。LINEからもう一度開いてお試しください。");
      }

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
      showFriendlyError(error?.message || "LINE本人確認を完了できませんでした。もう一度お試しください。");
    } finally {
      Green.setBusy?.(button, false);
    }
  }

  button.addEventListener("click", friendlyLineLogin, { capture:true });
})();