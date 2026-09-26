(() => {
  "use strict";

  const VERSION = "GREEN-LINE-ACCESS-MEMBER-R1-20260916";
  const STORAGE_KEY = "dpro_green_line_access_request_r1";

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[c]));

  function installStyle() {
    if (document.getElementById("green-line-access-member-style")) return;
    const style = document.createElement("style");
    style.id = "green-line-access-member-style";
    style.textContent = `
      .gla-member-box{margin-top:16px;padding-top:16px;border-top:1px solid #d7e4dc}
      .gla-member-toggle{width:100%;min-height:44px;border:1px solid #b8d1c2;border-radius:12px;background:#f2f8f4;color:#154b39;font-weight:900;cursor:pointer}
      .gla-member-toggle:disabled{opacity:.55;cursor:not-allowed}
      .gla-member-form{display:grid;gap:10px;margin-top:12px;padding:13px;border:1px solid #d4e2da;border-radius:12px;background:#fbfdfc}
      .gla-member-form[hidden]{display:none}.gla-member-form label{display:grid;gap:5px;font-size:12px;font-weight:800;color:#2f4f43}
      .gla-member-form input{min-height:42px;border:1px solid #c7d8ce;border-radius:9px;padding:8px 10px;font:inherit;background:#fff}
      .gla-member-actions{display:flex;gap:8px;flex-wrap:wrap}.gla-member-actions button{flex:1;min-width:140px}
      .gla-member-status{margin-top:10px;padding:10px 11px;border-radius:10px;background:#eef7f1;color:#254e3d;font-size:12px;line-height:1.6}
      .gla-member-status.pending{background:#fff6dd;color:#725113}.gla-member-status.error{background:#fff0f0;color:#842d2d}
      .gla-member-help{margin:8px 0 0;color:#667b70;font-size:11px;line-height:1.6}
    `;
    document.head.append(style);
  }

  function saveDraft() {
    const box = document.getElementById("green-line-access-member");
    if (!box) return;
    const data = {
      customerNumber: box.querySelector("#gla-member-number")?.value || "",
      contactName: box.querySelector("#gla-member-name")?.value || "",
      phoneLast4: box.querySelector("#gla-member-phone4")?.value || "",
      open: !box.querySelector("#gla-member-form")?.hidden,
    };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }

  function restoreDraft() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }

  function setStatus(message, kind = "") {
    const el = document.getElementById("gla-member-status");
    if (!el) return;
    el.hidden = !message;
    el.className = `gla-member-status${kind ? ` ${kind}` : ""}`;
    el.innerHTML = message ? esc(message).replace(/\n/g, "<br>") : "";
  }

  async function ensureLineIdToken() {
    const config = window.GREEN_CONFIG || {};
    if (!config.LIFF_ID) throw new Error("LINE本番接続後に利用できる機能です。");
    if (!window.liff) throw new Error("LINE画面を読み込めませんでした。");
    await window.liff.init({ liffId: config.LIFF_ID });
    if (!window.liff.isLoggedIn()) {
      saveDraft();
      window.liff.login({ redirectUri: location.href });
      return null;
    }
    const token = window.liff.getIDToken();
    if (!token) throw new Error("LINE本人確認情報を取得できませんでした。");
    return token;
  }

  async function requestAccess() {
    const box = document.getElementById("green-line-access-member");
    const button = box.querySelector("#gla-member-submit");
    const customerNumber = box.querySelector("#gla-member-number").value.trim();
    const contactName = box.querySelector("#gla-member-name").value.trim();
    const phoneLast4 = box.querySelector("#gla-member-phone4").value.trim();
    if (!customerNumber || !contactName) {
      setStatus("お客様番号とお名前を入力してください。", "error");
      return;
    }
    if (phoneLast4 && !/^\d{4}$/.test(phoneLast4)) {
      setStatus("電話番号の下4桁は数字4桁で入力してください。", "error");
      return;
    }
    button.disabled = true;
    setStatus("LINE本人確認中…");
    try {
      const idToken = await ensureLineIdToken();
      if (!idToken) return;
      const result = await window.Green.api("/api/member/link-request", {
        method: "POST",
        json: {
          facilityCode: window.GREEN_CONFIG.FACILITY_CODE,
          idToken,
          customerNumber,
          contactName,
          phoneLast4: phoneLast4 || null,
        },
      });
      setStatus(result.data?.message || "利用申請を受け付けました。事業者の承認後にマイページを開けます。", result.data?.status === "pending" ? "pending" : "");
      saveDraft();
    } catch (error) {
      setStatus(error.message || "利用申請を送信できませんでした。", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function checkStatus() {
    const button = document.getElementById("gla-member-status-check");
    button.disabled = true;
    setStatus("申請状況を確認中…");
    try {
      const idToken = await ensureLineIdToken();
      if (!idToken) return;
      const result = await window.Green.api("/api/member/link-status", {
        method: "POST",
        json: { facilityCode: window.GREEN_CONFIG.FACILITY_CODE, idToken },
      });
      const data = result.data || {};
      if (data.status === "verified") {
        setStatus(`承認済みです。上の「LINEで本人確認して開く」からマイページを開けます。${data.customer?.displayName ? `\n利用先：${data.customer.displayName}` : ""}`);
      } else if (data.status === "pending") {
        setStatus("承認待ちです。事業者の承認後にマイページを利用できます。", "pending");
      } else if (data.status === "revoked") {
        setStatus("現在は閲覧権限が解除されています。再度利用する場合は、下のフォームから申請してください。", "error");
      } else if (data.status === "blocked") {
        setStatus("このLINEアカウントでは利用できません。事業者へお問い合わせください。", "error");
      } else {
        setStatus("まだ利用申請されていません。下のフォームから申請してください。");
      }
    } catch (error) {
      setStatus(error.message || "申請状況を確認できませんでした。", "error");
    } finally {
      button.disabled = false;
    }
  }

  function install() {
    const card = document.querySelector("#login-panel .login-card");
    if (!card || document.getElementById("green-line-access-member")) return false;
    const draft = restoreDraft();
    const lineReady = Boolean(window.GREEN_CONFIG?.LIFF_ID);
    const box = document.createElement("div");
    box.id = "green-line-access-member";
    box.className = "gla-member-box";
    box.innerHTML = `
      <button id="gla-member-toggle" class="gla-member-toggle" type="button"${lineReady ? "" : " disabled"}>
        ${lineReady ? "初めての方｜利用先を登録・申請" : "初回利用登録｜LINE接続後に利用"}
      </button>
      <p class="gla-member-help">LINEを友だち追加しただけでは、お客様情報は表示されません。利用申請後、事業者が確認・承認した担当者だけが閲覧できます。</p>
      <div id="gla-member-form" class="gla-member-form" ${draft.open && lineReady ? "" : "hidden"}>
        <label>お客様番号<input id="gla-member-number" autocomplete="off" value="${esc(draft.customerNumber || "")}" placeholder="例：CUS-..."></label>
        <label>お名前<input id="gla-member-name" autocomplete="name" value="${esc(draft.contactName || "")}" placeholder="担当者名"></label>
        <label>登録電話番号の下4桁（任意）<input id="gla-member-phone4" inputmode="numeric" maxlength="4" value="${esc(draft.phoneLast4 || "")}" placeholder="1234"></label>
        <div class="gla-member-actions">
          <button id="gla-member-submit" class="button button-primary" type="button">利用申請を送る</button>
          <button id="gla-member-status-check" class="button button-secondary" type="button">申請状況を確認</button>
        </div>
        <div id="gla-member-status" class="gla-member-status" hidden></div>
      </div>`;
    card.append(box);

    box.querySelector("#gla-member-toggle").addEventListener("click", () => {
      const form = box.querySelector("#gla-member-form");
      form.hidden = !form.hidden;
      saveDraft();
    });
    box.querySelector("#gla-member-submit").addEventListener("click", requestAccess);
    box.querySelector("#gla-member-status-check").addEventListener("click", checkStatus);
    box.querySelectorAll("input").forEach((input) => input.addEventListener("input", saveDraft));

    document.documentElement.dataset.greenLineAccessMember = VERSION;
    return true;
  }

  function boot() {
    installStyle();
    if (!install()) {
      const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();