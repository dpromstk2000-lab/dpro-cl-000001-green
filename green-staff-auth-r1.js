(() => {
  "use strict";

  const VERSION = "GREEN-STAFF-AUTH-OWNER-R1.0-20261001";
  if (window.__DPRO_GREEN_STAFF_AUTH_OWNER_R1__) return;
  window.__DPRO_GREEN_STAFF_AUTH_OWNER_R1__ = VERSION;

  const $all = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function visible(node) {
    if (!node) return false;
    const style = getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function findStaffAddButton() {
    return $all("button").find((button) =>
      visible(button) && /スタッフ追加/.test(button.textContent || "")
    ) || null;
  }

  function ensureStyle() {
    if (document.getElementById("green-staff-auth-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-staff-auth-r1-style";
    style.textContent = `
      #green-staff-auth-code-dialog{border:0;border-radius:20px;padding:0;max-width:640px;width:min(92vw,640px);box-shadow:0 24px 70px rgba(0,0,0,.25)}
      #green-staff-auth-code-dialog::backdrop{background:rgba(12,29,24,.42)}
      .green-staff-auth-shell{padding:0;background:#fff}
      .green-staff-auth-head{display:flex;justify-content:space-between;align-items:center;padding:24px 26px;border-bottom:1px solid #dbe5df}
      .green-staff-auth-head small{display:block;color:#2c8a68;letter-spacing:.18em;font-weight:800;margin-bottom:6px}
      .green-staff-auth-head h2{margin:0;font-size:24px}
      .green-staff-auth-close{border:0;background:#f0f4f1;border-radius:50%;width:42px;height:42px;font-size:28px;cursor:pointer}
      .green-staff-auth-body{padding:24px 26px;display:grid;gap:16px}
      .green-staff-auth-body label{display:grid;gap:7px;font-weight:700}
      .green-staff-auth-body select,.green-staff-auth-body input{min-height:48px;border:1px solid #cad9d0;border-radius:12px;padding:0 14px;font:inherit}
      .green-staff-auth-note{background:#edf7f1;border:1px solid #d4ebdd;border-radius:12px;padding:12px 14px;line-height:1.6}
      .green-staff-auth-code-row{display:grid;grid-template-columns:1fr auto;gap:8px}
      .green-staff-auth-actions{display:flex;justify-content:flex-end;gap:10px;padding:18px 26px;border-top:1px solid #dbe5df}
      .green-staff-auth-actions button{min-height:44px;padding:0 18px;border-radius:10px;border:1px solid #9fb2a8;background:#fff;font-weight:700;cursor:pointer}
      .green-staff-auth-actions .primary{background:#167653;color:#fff;border-color:#167653}
      #green-staff-login-code-button{margin-right:10px}
      @media(max-width:640px){.green-staff-auth-code-row{grid-template-columns:1fr}.green-staff-auth-actions{position:sticky;bottom:0;background:#fff}}
    `;
    document.head.append(style);
  }

  function ensureDialog() {
    ensureStyle();
    let dialog = document.getElementById("green-staff-auth-code-dialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "green-staff-auth-code-dialog";
    dialog.innerHTML = `
      <div class="green-staff-auth-shell">
        <header class="green-staff-auth-head">
          <div><small>STAFF LOGIN</small><h2>スタッフログインコード設定</h2></div>
          <button type="button" class="green-staff-auth-close" aria-label="閉じる">×</button>
        </header>
        <form id="green-staff-auth-form">
          <div class="green-staff-auth-body">
            <div class="green-staff-auth-note">
              スタッフ本人が「本日の巡回」画面へ入るためのコードです。<br>
              保存後はコードそのものを再表示しません。必要な場合は新しいコードへ再設定してください。
            </div>
            <label>スタッフ
              <select name="staffId" required></select>
            </label>
            <label>ログインコード
              <span class="green-staff-auth-code-row">
                <input name="code" type="password" inputmode="numeric" minlength="4" maxlength="12" pattern="[0-9]{4,12}" required autocomplete="new-password" placeholder="4〜12桁の数字">
                <button type="button" id="green-staff-auth-generate">6桁を自動生成</button>
              </span>
            </label>
            <label>確認用ログインコード
              <input name="confirmCode" type="password" inputmode="numeric" minlength="4" maxlength="12" pattern="[0-9]{4,12}" required autocomplete="new-password" placeholder="同じコードをもう一度入力">
            </label>
            <div id="green-staff-auth-message" role="status"></div>
          </div>
          <footer class="green-staff-auth-actions">
            <button type="button" data-auth-close>取消</button>
            <button type="submit" class="primary">保存</button>
          </footer>
        </form>
      </div>
    `;
    document.body.append(dialog);

    const close = () => dialog.close();
    dialog.querySelector(".green-staff-auth-close").addEventListener("click", close);
    dialog.querySelector("[data-auth-close]").addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });

    dialog.querySelector("#green-staff-auth-generate").addEventListener("click", () => {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const form = dialog.querySelector("#green-staff-auth-form");
      form.code.value = code;
      form.confirmCode.value = code;
      form.code.type = "text";
      form.confirmCode.type = "text";
      dialog.querySelector("#green-staff-auth-message").textContent = `生成しました：${code}（スタッフへ安全に共有してください）`;
    });

    dialog.querySelector("#green-staff-auth-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('button[type="submit"]');
      const message = dialog.querySelector("#green-staff-auth-message");
      const staffId = form.staffId.value;
      const code = form.code.value.trim();
      const confirmCode = form.confirmCode.value.trim();

      message.textContent = "";
      if (!/^[0-9]{4,12}$/.test(code)) {
        message.textContent = "ログインコードは4〜12桁の数字で入力してください。";
        return;
      }
      if (code !== confirmCode) {
        message.textContent = "確認用ログインコードが一致しません。";
        return;
      }

      submit.disabled = true;
      submit.textContent = "保存中…";
      try {
        const result = await window.Green.api(`/api/admin/staff/${encodeURIComponent(staffId)}/login-code`, {
          method: "POST",
          json: { code, confirmCode }
        });
        const staffCode = result?.data?.staffCode || "";
        message.innerHTML = `<strong>設定しました。</strong> スタッフコード ${esc(staffCode)} で本番ログインできます。`;
        window.Green.toast?.("スタッフのログインコードを設定しました。", "success");
        form.code.value = "";
        form.confirmCode.value = "";
        setTimeout(() => dialog.close(), 900);
      } catch (error) {
        message.textContent = `${error.message || "設定できませんでした。"}${error.requestId ? `（確認番号：${error.requestId}）` : ""}`;
      } finally {
        submit.disabled = false;
        submit.textContent = "保存";
      }
    });

    return dialog;
  }

  async function openCodeDialog() {
    if (!window.Green?.api) return;
    const dialog = ensureDialog();
    const form = dialog.querySelector("#green-staff-auth-form");
    const select = form.staffId;
    const message = dialog.querySelector("#green-staff-auth-message");
    message.textContent = "スタッフ情報を読み込んでいます…";
    select.innerHTML = '<option value="">読み込み中…</option>';
    dialog.showModal();

    try {
      const result = await window.Green.api("/api/admin/staff");
      const items = (result?.data?.items || []).filter((item) => item.status === "active");
      select.innerHTML = `<option value="">スタッフを選択</option>${items.map((item) =>
        `<option value="${esc(item.id)}">${esc(item.display_name)}（${esc(item.staff_code)}）</option>`
      ).join("")}`;
      message.textContent = items.length
        ? "対象スタッフを選び、本人用ログインコードを設定してください。"
        : "有効なスタッフがありません。先にスタッフを登録してください。";
    } catch (error) {
      message.textContent = error.message || "スタッフ情報を読み込めませんでした。";
    }
  }

  function enhanceStaffManagement() {
    const addButton = findStaffAddButton();
    if (!addButton) return;
    if (document.getElementById("green-staff-login-code-button")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.id = "green-staff-login-code-button";
    button.className = addButton.className;
    button.textContent = "ログインコード設定";
    button.addEventListener("click", openCodeDialog);

    addButton.parentElement.insertBefore(button, addButton);
  }

  let queued = false;
  const scheduleEnhance = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhanceStaffManagement();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnhance, { once: true });
  } else {
    scheduleEnhance();
  }

  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true });
})();