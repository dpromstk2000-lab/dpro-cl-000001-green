/** DPRO CUSTOMER HERO / OWNER EASY SETTINGS V2.0 */
(() => {
  "use strict";
  const VERSION = "DPRO-CUSTOMER-HERO-ADMIN-2.0-20260808";
  const $ = (selector, root = document) => root.querySelector(selector);
  const defaults = () => window.GREEN_CONFIG?.CUSTOMER_HERO || {};
  let loaded = false;
  let loading = false;

  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, document.baseURI);
      return url.protocol === "https:" ? url.href : "";
    } catch { return ""; }
  }

  function makePanel() {
    if ($("#customer-hero-owner-panel")) return $("#customer-hero-owner-panel");
    const form = $("#facility-settings-form");
    if (!form) return null;
    const section = document.createElement("section");
    section.id = "customer-hero-owner-panel";
    section.className = "customer-hero-owner-panel";
    section.innerHTML = `
      <div class="customer-hero-owner-head">
        <div>
          <p class="customer-hero-owner-kicker">CUSTOMER PAGE</p>
          <h3>お客様マイページのトップ写真</h3>
          <p>お客様が最初に見る写真・キャッチコピー・説明文だけを簡単に変更できます。</p>
        </div>
        <span class="customer-hero-owner-chip">簡単設定</span>
      </div>
      <div id="customer-hero-owner-status" class="customer-hero-owner-status" aria-live="polite">設定を読み込みます。</div>
      <div class="customer-hero-owner-grid">
        <div class="customer-hero-owner-fields">
          <label class="customer-hero-owner-toggle"><input id="customer-hero-enabled" type="checkbox"><span>トップ写真を表示する</span></label>
          <label>写真URL <span class="customer-hero-owner-help">空欄ならDPRO標準写真</span>
            <input id="customer-hero-image" type="url" inputmode="url" placeholder="https://..." maxlength="1200" autocomplete="off">
          </label>
          <label>キャッチコピー <span class="customer-hero-owner-help"><b id="customer-hero-title-count">0</b>/30</span>
            <input id="customer-hero-title" type="text" maxlength="30" placeholder="空間に、やすらぎと品格を。">
          </label>
          <label>説明文 <span class="customer-hero-owner-help"><b id="customer-hero-lead-count">0</b>/70</span>
            <textarea id="customer-hero-lead" rows="3" maxlength="70" placeholder="設置植物・次回訪問・作業報告・ご相談を、ひとつの画面で。"></textarea>
          </label>
          <div class="customer-hero-owner-actions">
            <button id="customer-hero-save" class="button button-primary" type="button">ヒーロー設定を保存</button>
            <button id="customer-hero-reset" class="button button-secondary" type="button">標準表示に戻す</button>
            <a id="customer-hero-open" class="button button-ghost" href="member.html?demo=1&v=CUSTOMER-HERO-2" target="_blank" rel="noopener">お客様画面で確認</a>
          </div>
        </div>
        <div class="customer-hero-owner-preview-wrap">
          <p class="customer-hero-owner-preview-label">プレビュー</p>
          <div id="customer-hero-owner-preview" class="customer-hero-owner-preview">
            <img id="customer-hero-preview-image" alt="トップ写真プレビュー">
            <div class="customer-hero-owner-preview-shade"></div>
            <div class="customer-hero-owner-preview-copy">
              <small>${String(defaults().eyebrow || "CUSTOMER PORTAL")}</small>
              <strong id="customer-hero-preview-title"></strong>
              <span>${String(defaults().badge || "ご利用中のお客様専用マイページ")}</span>
              <p id="customer-hero-preview-lead"></p>
            </div>
          </div>
        </div>
      </div>`;
    form.append(section);
    bind(section);
    renderPreview();
    return section;
  }

  function displayValue(remote, key, fallbackKey) {
    if (remote?.configured && remote[key] !== null && remote[key] !== undefined && String(remote[key]).trim() !== "") return String(remote[key]);
    return String(defaults()[fallbackKey] || "");
  }

  function applyRemote(remote) {
    const cfg = defaults();
    $("#customer-hero-enabled").checked = remote?.configured && typeof remote.enabled === "boolean" ? remote.enabled : cfg.enabled !== false;
    $("#customer-hero-image").value = remote?.configured ? String(remote.image || "") : "";
    $("#customer-hero-title").value = remote?.configured ? String(remote.title || "") : "";
    $("#customer-hero-lead").value = remote?.configured ? String(remote.lead || "") : "";
    updateCounts();
    renderPreview();
  }

  function updateCounts() {
    const title = $("#customer-hero-title");
    const lead = $("#customer-hero-lead");
    if (title) $("#customer-hero-title-count").textContent = title.value.length;
    if (lead) $("#customer-hero-lead-count").textContent = lead.value.length;
  }

  function renderPreview() {
    const panel = $("#customer-hero-owner-panel");
    if (!panel) return;
    const cfg = defaults();
    const enabled = $("#customer-hero-enabled")?.checked !== false;
    const image = safeUrl($("#customer-hero-image")?.value) || safeUrl(cfg.desktopImage);
    const title = String($("#customer-hero-title")?.value || "").trim() || String(cfg.title || "");
    const lead = String($("#customer-hero-lead")?.value || "").trim() || String(cfg.lead || "");
    const preview = $("#customer-hero-owner-preview");
    const img = $("#customer-hero-preview-image");
    if (img && image) img.src = image;
    if (img) img.hidden = !image;
    $("#customer-hero-preview-title").textContent = title;
    $("#customer-hero-preview-lead").textContent = lead;
    preview.classList.toggle("is-disabled", !enabled);
  }

  function setStatus(message, type = "info") {
    const el = $("#customer-hero-owner-status");
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
  }

  async function load() {
    if (loading || !window.Green?.api) return;
    loading = true;
    setStatus("保存済み設定を確認しています。", "info");
    try {
      const result = await window.Green.api("/api/admin/customer-hero");
      applyRemote(result.data?.hero || null);
      loaded = true;
      setStatus(result.data?.hero?.configured ? "保存済み設定を表示しています。" : "現在はDPRO標準表示です。", "success");
    } catch (error) {
      applyRemote(null);
      setStatus(error?.code === "unauthorized" ? "管理画面へログインすると設定できます。" : "設定を読み込めませんでした。標準表示をプレビューしています。", "warning");
    } finally { loading = false; }
  }

  async function save() {
    if (!window.Green?.api) return;
    const button = $("#customer-hero-save");
    const imageRaw = String($("#customer-hero-image").value || "").trim();
    if (imageRaw && !safeUrl(imageRaw)) {
      setStatus("写真URLは https:// で始まる公開URLを入力してください。", "error");
      $("#customer-hero-image").focus();
      return;
    }
    const payload = {
      enabled: $("#customer-hero-enabled").checked,
      image: imageRaw,
      title: $("#customer-hero-title").value.trim(),
      lead: $("#customer-hero-lead").value.trim(),
    };
    window.Green.setBusy?.(button, true, "保存中…");
    try {
      const result = await window.Green.api("/api/admin/customer-hero", {
        method: "PATCH",
        json: payload,
        idempotencyKey: crypto.randomUUID?.() || `hero-${Date.now()}`,
      });
      applyRemote(result.data?.hero || payload);
      loaded = true;
      setStatus("保存しました。お客様マイページへ反映されます。", "success");
      window.Green.toast?.("お客様マイページのトップ表示を保存しました。", "success");
    } catch (error) {
      setStatus(error?.message || "保存できませんでした。", "error");
    } finally { window.Green.setBusy?.(button, false); }
  }

  function resetFields() {
    $("#customer-hero-enabled").checked = defaults().enabled !== false;
    $("#customer-hero-image").value = "";
    $("#customer-hero-title").value = "";
    $("#customer-hero-lead").value = "";
    updateCounts();
    renderPreview();
    setStatus("DPRO標準表示に戻す内容です。「ヒーロー設定を保存」で確定します。", "info");
  }

  function bind(panel) {
    panel.addEventListener("input", (event) => {
      if (event.target.matches("#customer-hero-image,#customer-hero-title,#customer-hero-lead,#customer-hero-enabled")) {
        updateCounts(); renderPreview();
      }
    });
    panel.addEventListener("change", renderPreview);
    $("#customer-hero-save", panel).addEventListener("click", save);
    $("#customer-hero-reset", panel).addEventListener("click", resetFields);
  }

  function panelIsVisible() {
    const panel = $('[data-view-panel="facility-settings"]');
    return panel && !panel.hidden;
  }

  function install() {
    const panel = makePanel();
    if (!panel) return false;
    const target = $('[data-view-panel="facility-settings"]');
    if (target) {
      const observer = new MutationObserver(() => {
        if (!target.hidden && !loading) void load();
      });
      observer.observe(target, { attributes: true, attributeFilter: ["hidden"] });
    }
    document.addEventListener("click", (event) => {
      if (event.target.closest?.('[data-view="facility-settings"]')) setTimeout(() => { void load(); }, 80);
    }, true);
    if (panelIsVisible()) setTimeout(() => { void load(); }, 150);
    return true;
  }

  function boot(attempt = 0) {
    if (install()) return;
    if (attempt < 40) setTimeout(() => boot(attempt + 1), 150);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => boot(), { once: true });
  else boot();

  window.DPRO_CUSTOMER_HERO_ADMIN = Object.freeze({ version: VERSION, reload: load, preview: renderPreview, get loaded() { return loaded; } });
})();
