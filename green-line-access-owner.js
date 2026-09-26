(() => {
  "use strict";

  const VERSION = "GREEN-LINE-ACCESS-OWNER-R1-20260916";
  const STATUS_ORDER = { pending: 0, verified: 1, revoked: 2, blocked: 3 };
  const STATUS_LABEL = { pending: "承認待ち", verified: "利用中", revoked: "解除済み", blocked: "利用停止" };
  const SCOPE_LABEL = { all_sites: "全拠点", selected_sites: "指定拠点のみ" };

  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[c]));

  function toast(message, type = "success") {
    if (window.Green?.toast) window.Green.toast(message, type);
    else window.alert(message);
  }

  function installStyle() {
    if (document.getElementById("green-line-access-style")) return;
    const style = document.createElement("style");
    style.id = "green-line-access-style";
    style.textContent = `
      #green-line-access-dialog{width:min(1040px,calc(100% - 24px));max-height:90vh;border:0;border-radius:20px;padding:0;box-shadow:0 24px 70px rgba(18,56,45,.25)}
      #green-line-access-dialog::backdrop{background:rgba(13,34,27,.52)}
      .gla-head{position:sticky;top:0;z-index:2;display:flex;gap:16px;align-items:flex-start;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #d8e5dd;background:#fff}
      .gla-head h2{margin:3px 0 0;color:#12382d;font-size:24px}.gla-head p{margin:6px 0 0;color:#60736a;font-size:13px}
      .gla-close{border:1px solid #cbdad1;background:#f5faf7;border-radius:10px;padding:9px 12px;font-weight:800;cursor:pointer}
      .gla-body{padding:18px 22px 24px;background:#f5f8f6}.gla-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      .gla-filter,.gla-refresh{min-height:40px;border:1px solid #cbdad1;background:#fff;border-radius:10px;padding:8px 11px;font:inherit}
      .gla-summary{margin-left:auto;color:#52685e;font-size:12px;align-self:center}
      .gla-list{display:grid;gap:12px}.gla-card{border:1px solid #d4e1d9;border-radius:16px;background:#fff;padding:16px}
      .gla-card.is-pending{border-color:#e2c37f;background:#fffdf8}.gla-row{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
      .gla-title{font-weight:900;color:#12382d;font-size:16px}.gla-meta{margin-top:4px;color:#60736a;font-size:12px}.gla-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#eaf4ee;color:#205d46}
      .gla-badge.pending{background:#fff1cf;color:#7a5611}.gla-badge.revoked{background:#f3eeee;color:#765151}.gla-badge.blocked{background:#f9e5e5;color:#8b2e2e}
      .gla-request{margin-top:12px;padding:11px 12px;border-radius:12px;background:#f5f8f6;font-size:12px;color:#3f574c}.gla-request strong{color:#12382d}
      .gla-controls{display:grid;grid-template-columns:minmax(180px,.7fr) minmax(220px,1fr);gap:12px;margin-top:14px}.gla-field label{display:block;margin-bottom:5px;font-size:11px;font-weight:900;color:#355247}
      .gla-field select{width:100%;min-height:40px;border:1px solid #cbdad1;border-radius:9px;padding:7px;background:#fff}
      .gla-sites{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:10px;border:1px solid #dce7e1;border-radius:10px;background:#fbfdfc}
      .gla-sites label{display:flex;gap:7px;align-items:flex-start;font-size:12px}.gla-sites.is-disabled{opacity:.48;pointer-events:none}
      .gla-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.gla-btn{border:0;border-radius:10px;padding:9px 12px;font-weight:900;cursor:pointer}.gla-btn.primary{background:#1e6a52;color:#fff}.gla-btn.secondary{background:#eaf4ee;color:#164c3a}.gla-btn.danger{background:#f7eaea;color:#8d3030}
      .gla-empty{padding:36px 18px;text-align:center;color:#64786e;border:1px dashed #cbdad1;border-radius:14px;background:#fff}
      @media(max-width:680px){.gla-controls{grid-template-columns:1fr}.gla-sites{grid-template-columns:1fr}.gla-summary{width:100%;margin-left:0}}
    `;
    document.head.append(style);
  }

  function ensureDialog() {
    let dialog = document.getElementById("green-line-access-dialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "green-line-access-dialog";
    dialog.innerHTML = `
      <div class="gla-head">
        <div><small>LINE CUSTOMER ACCESS</small><h2>LINE閲覧者管理</h2><p>お客様からの利用申請を承認し、閲覧できる拠点を設定します。</p></div>
        <button class="gla-close" type="button">閉じる</button>
      </div>
      <div class="gla-body">
        <div class="gla-toolbar">
          <select id="gla-status-filter" class="gla-filter" aria-label="状態で絞り込み">
            <option value="">すべて</option><option value="pending">承認待ち</option><option value="verified">利用中</option><option value="revoked">解除済み</option>
          </select>
          <button id="gla-refresh" class="gla-refresh" type="button">再読み込み</button>
          <span id="gla-summary" class="gla-summary"></span>
        </div>
        <div id="gla-list" class="gla-list"><div class="gla-empty">読み込み中…</div></div>
      </div>`;
    document.body.append(dialog);
    dialog.querySelector(".gla-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector("#gla-status-filter").addEventListener("change", load);
    dialog.querySelector("#gla-refresh").addEventListener("click", load);
    return dialog;
  }

  function installMenu() {
    const nav = document.querySelector(".owner-nav");
    if (!nav || document.getElementById("green-line-access-menu")) return false;
    const button = document.createElement("button");
    button.type = "button";
    button.id = "green-line-access-menu";
    button.innerHTML = "<span>閲</span>LINE閲覧者";
    button.setAttribute("aria-label", "LINEお客様閲覧者を管理");
    button.title = "お客様マイページのLINE閲覧申請・権限を管理";
    button.addEventListener("click", async () => {
      const dialog = ensureDialog();
      if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
      await load();
    });
    const messageButton = nav.querySelector('[data-view="messages"]');
    if (messageButton?.nextSibling) nav.insertBefore(button, messageButton.nextSibling);
    else nav.append(button);
    return true;
  }

  function currentSelection(card, item) {
    const scope = card.querySelector("[data-gla-scope]").value;
    const contactId = card.querySelector("[data-gla-contact]").value || null;
    const siteIds = [...card.querySelectorAll("[data-gla-site]:checked")].map((el) => el.value);
    return { accessScope: scope, contactId, siteIds };
  }

  function syncSiteEnabled(card) {
    const scope = card.querySelector("[data-gla-scope]")?.value;
    const sites = card.querySelector(".gla-sites");
    if (sites) sites.classList.toggle("is-disabled", scope !== "selected_sites");
  }

  function renderItem(item) {
    const status = item.status || "pending";
    const customer = item.customer || {};
    const req = item.request || {};
    const selected = new Set(item.selectedSiteIds || []);
    const contacts = (item.contacts || []).map((c) =>
      `<option value="${esc(c.id)}"${c.id === item.contactId ? " selected" : ""}>${esc(c.name)}${c.department ? `｜${esc(c.department)}` : ""}</option>`
    ).join("");
    const sites = (item.sites || []).map((s) =>
      `<label><input type="checkbox" data-gla-site value="${esc(s.id)}"${selected.has(s.id) ? " checked" : ""}> <span>${esc(s.siteName)}${s.siteCode ? `（${esc(s.siteCode)}）` : ""}</span></label>`
    ).join("") || "<span>登録済み拠点がありません。</span>";
    const requestBits = [
      req.lineDisplayName ? `LINE表示名：${esc(req.lineDisplayName)}` : "",
      req.contactName ? `申請者名：${esc(req.contactName)}` : "",
      req.phoneLast4 ? `電話下4桁：${esc(req.phoneLast4)}` : "",
    ].filter(Boolean).join(" ／ ");

    return `
      <article class="gla-card is-${esc(status)}" data-gla-id="${esc(item.id)}">
        <div class="gla-row">
          <div><div class="gla-title">${esc(customer.displayName || "顧客情報")}</div><div class="gla-meta">お客様番号：${esc(customer.customerNumber || "—")} ／ 申請：${esc(req.requestedAt || item.createdAt || "—")}</div></div>
          <span class="gla-badge ${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>
        </div>
        <div class="gla-request"><strong>${requestBits || "申請者情報は未入力です。"}</strong><br>友だち追加だけでは閲覧できません。ここで承認した担当者だけがマイページへ入れます。</div>
        <div class="gla-controls">
          <div class="gla-field"><label>顧客側の連絡先</label><select data-gla-contact><option value="">紐付けなし</option>${contacts}</select></div>
          <div class="gla-field"><label>閲覧範囲</label><select data-gla-scope><option value="all_sites"${item.accessScope !== "selected_sites" ? " selected" : ""}>全拠点</option><option value="selected_sites"${item.accessScope === "selected_sites" ? " selected" : ""}>指定拠点のみ</option></select></div>
          <div class="gla-sites">${sites}</div>
        </div>
        <div class="gla-actions">
          <button class="gla-btn primary" type="button" data-gla-approve>${status === "verified" ? "権限を更新" : "承認する"}</button>
          ${status === "verified" || status === "pending" ? '<button class="gla-btn danger" type="button" data-gla-revoke>解除・却下</button>' : ""}
        </div>
      </article>`;
  }

  async function load() {
    const dialog = ensureDialog();
    const list = dialog.querySelector("#gla-list");
    const filter = dialog.querySelector("#gla-status-filter").value;
    list.innerHTML = '<div class="gla-empty">読み込み中…</div>';
    try {
      const result = await window.Green.api(`/api/admin/member-access${filter ? `?status=${encodeURIComponent(filter)}` : ""}`);
      const items = [...(result.data?.items || [])].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      dialog.querySelector("#gla-summary").textContent = `${items.length}件`;
      list.innerHTML = items.length ? items.map(renderItem).join("") : '<div class="gla-empty">該当するLINE閲覧者はありません。</div>';
      list.querySelectorAll(".gla-card").forEach((card) => {
        syncSiteEnabled(card);
        card.querySelector("[data-gla-scope]")?.addEventListener("change", () => syncSiteEnabled(card));
        card.querySelector("[data-gla-approve]")?.addEventListener("click", () => approve(card));
        card.querySelector("[data-gla-revoke]")?.addEventListener("click", () => revoke(card));
      });
    } catch (error) {
      list.innerHTML = `<div class="gla-empty">${esc(error.message || "読み込みに失敗しました。")}</div>`;
    }
  }

  async function approve(card) {
    const id = card.dataset.glaId;
    const payload = currentSelection(card);
    if (payload.accessScope === "selected_sites" && !payload.siteIds.length) {
      toast("指定拠点を1件以上選択してください。", "error");
      return;
    }
    const button = card.querySelector("[data-gla-approve]");
    button.disabled = true;
    try {
      await window.Green.api(`/api/admin/member-access/${id}/approve`, { method: "POST", json: payload });
      toast("LINE閲覧権限を保存しました。", "success");
      await load();
    } catch (error) {
      toast(error.message || "承認できませんでした。", "error");
    } finally {
      button.disabled = false;
    }
  }

  async function revoke(card) {
    const id = card.dataset.glaId;
    if (!window.confirm("この担当者のLINE閲覧を解除しますか？")) return;
    const button = card.querySelector("[data-gla-revoke]");
    button.disabled = true;
    try {
      await window.Green.api(`/api/admin/member-access/${id}/revoke`, { method: "POST", json: {} });
      toast("LINE閲覧権限を解除しました。", "success");
      await load();
    } catch (error) {
      toast(error.message || "解除できませんでした。", "error");
    } finally {
      button.disabled = false;
    }
  }

  function boot() {
    installStyle();
    ensureDialog();
    if (!installMenu()) {
      const observer = new MutationObserver(() => { if (installMenu()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    document.documentElement.dataset.greenLineAccessOwner = VERSION;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();