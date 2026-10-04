(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-ATLAS-IMAGE-MANAGER-R1.0-20261004";
  if (window.__DPRO_GREEN_ATLAS_IMAGE_MANAGER__) return;
  window.__DPRO_GREEN_ATLAS_IMAGE_MANAGER__ = VERSION;

  const $ = (s, r = document) => r.querySelector(s);
  let decoratedForm = null;
  let loadToken = 0;

  function installStyle() {
    if ($("#green-atlas-image-manager-style")) return;
    const style = document.createElement("style");
    style.id = "green-atlas-image-manager-style";
    style.textContent = `
      .green-atlas-image-manager{grid-column:1/-1;border:1px solid #d6e3dc;border-radius:16px;background:#f8fbf9;padding:14px;display:grid;gap:12px}
      .green-atlas-image-manager__head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}
      .green-atlas-image-manager__head strong{display:block;color:#174c35;font-size:15px}
      .green-atlas-image-manager__head small{display:block;color:#617169;margin-top:3px;line-height:1.6}
      .green-atlas-image-manager__body{display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start}
      .green-atlas-image-manager__preview{width:150px;aspect-ratio:3/4;border-radius:13px;overflow:hidden;background:#f2f4f2;border:1px solid #d7dfda;display:grid;place-items:center}
      .green-atlas-image-manager__preview img{width:100%;height:100%;object-fit:contain;background:#fff}
      .green-atlas-image-manager__empty{font-size:12px;color:#7a8780;padding:12px;text-align:center;line-height:1.55}
      .green-atlas-image-manager__actions{display:grid;gap:9px}
      .green-atlas-image-manager__actions input[type=file]{width:100%}
      .green-atlas-image-manager__candidate{display:none;grid-template-columns:92px minmax(0,1fr);gap:10px;align-items:center;padding:9px;border:1px dashed #b7c9bf;border-radius:12px;background:#fff}
      .green-atlas-image-manager__candidate.is-visible{display:grid}
      .green-atlas-image-manager__candidate img{width:92px;aspect-ratio:3/4;object-fit:contain;border-radius:9px;background:#f6f6f3}
      .green-atlas-image-manager__buttons{display:flex;gap:8px;flex-wrap:wrap}
      .green-atlas-image-manager__buttons button{min-height:40px}
      .green-atlas-image-manager__status{font-size:12px;color:#4f6258;line-height:1.6}
      .green-atlas-image-manager__status.is-error{color:#a12b2b}
      @media(max-width:680px){.green-atlas-image-manager__body{grid-template-columns:1fr}.green-atlas-image-manager__preview{width:min(180px,55vw)}}
    `;
    document.head.append(style);
  }

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  function kindFromForm(form) {
    if (form?.id === "species-form") return "species";
    if (form?.id === "container-model-form") return "container";
    return null;
  }

  function codeFromForm(form, kind) {
    return String(form?.elements?.[kind === "species" ? "speciesCode" : "modelCode"]?.value || "").trim();
  }

  async function currentItem(form, kind) {
    const code = codeFromForm(form, kind);
    if (!code) return null;
    const path = kind === "species" ? "/api/admin/plant-species" : "/api/admin/container-models";
    const result = await window.Green.api(path);
    const items = result?.data?.items || [];
    const key = kind === "species" ? "species_code" : "model_code";
    return items.find((item) => String(item?.[key] || "").trim() === code) || null;
  }

  function imageUrl(item) {
    return String(item?.metadata?.atlas_image_url || "").trim();
  }

  function history(item) {
    return Array.isArray(item?.metadata?.atlas_image_history) ? item.metadata.atlas_image_history.filter((x) => x?.url) : [];
  }

  function managerHtml(item, kind) {
    const url = imageUrl(item);
    const canEdit = Boolean(item?.id);
    const hasHistory = history(item).length > 0;
    const label = kind === "species" ? "植物図鑑" : "鉢図鑑";
    return `
      <section class="green-atlas-image-manager" data-atlas-image-manager data-kind="${esc(kind)}" data-id="${esc(item?.id || "")}">
        <div class="green-atlas-image-manager__head">
          <div><strong>${label}の写真</strong><small>ここで変更すると、保存後にホームページの「植物・鉢図鑑」へ自動反映されます。</small></div>
          <span class="owner-code-badge">自動連動</span>
        </div>
        <div class="green-atlas-image-manager__body">
          <div class="green-atlas-image-manager__preview" data-atlas-current>
            ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="現在の図鑑写真"></a>` : `<div class="green-atlas-image-manager__empty">現在の図鑑写真は未設定です。</div>`}
          </div>
          <div class="green-atlas-image-manager__actions">
            ${canEdit ? `
              <label>新しい写真を選択
                <input type="file" data-atlas-file accept="image/jpeg,image/png,image/webp">
              </label>
              <div class="green-atlas-image-manager__candidate" data-atlas-candidate>
                <img data-atlas-candidate-img alt="変更予定の写真">
                <div><strong>変更前プレビュー</strong><div class="green-atlas-image-manager__status">この写真でよければ「この写真に変更」を押してください。</div></div>
              </div>
              <div class="green-atlas-image-manager__buttons">
                <button type="button" class="btn btn--primary" data-atlas-save disabled>この写真に変更</button>
                <button type="button" class="btn btn--secondary" data-atlas-restore ${hasHistory ? "" : "disabled"}>1つ前の写真に戻す</button>
              </div>
              <div class="green-atlas-image-manager__status" data-atlas-status>JPEG / PNG / WebP。選択画像は自動圧縮して保存します。</div>
            ` : `<div class="green-atlas-image-manager__status">先に基本情報を登録し、もう一度編集画面を開くと写真を設定できます。</div>`}
          </div>
        </div>
      </section>`;
  }

  async function decorate(form) {
    if (!form || !window.Green?.api || !window.Green?.compressImage) return;
    if (decoratedForm === form && form.querySelector("[data-atlas-image-manager]")) return;
    const kind = kindFromForm(form);
    if (!kind) return;
    const token = ++loadToken;
    let item = null;
    try { item = await currentItem(form, kind); } catch (_) {}
    if (token !== loadToken || !form.isConnected) return;
    form.querySelector("[data-atlas-image-manager]")?.remove();
    form.insertAdjacentHTML("beforeend", managerHtml(item, kind));
    decoratedForm = form;
    bind(form, item, kind);
  }

  function bind(form, item, kind) {
    const panel = form.querySelector("[data-atlas-image-manager]");
    if (!panel || !item?.id) return;
    const input = panel.querySelector("[data-atlas-file]");
    const save = panel.querySelector("[data-atlas-save]");
    const restore = panel.querySelector("[data-atlas-restore]");
    const candidate = panel.querySelector("[data-atlas-candidate]");
    const candidateImg = panel.querySelector("[data-atlas-candidate-img]");
    const status = panel.querySelector("[data-atlas-status]");
    let selectedFile = null;
    let objectUrl = "";

    const setStatus = (message, error = false) => {
      status.textContent = message;
      status.classList.toggle("is-error", error);
    };

    input?.addEventListener("change", () => {
      const file = input.files?.[0] || null;
      selectedFile = file;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = file ? URL.createObjectURL(file) : "";
      if (file && candidateImg) candidateImg.src = objectUrl;
      candidate?.classList.toggle("is-visible", Boolean(file));
      save.disabled = !file;
      setStatus(file ? `${file.name} を選択しました。まだ保存されていません。` : "写真を選択してください。");
    });

    save?.addEventListener("click", async () => {
      if (!selectedFile) return;
      if (!confirm("この写真を図鑑の新しい写真として保存しますか？ホームページにも自動反映されます。")) return;
      save.disabled = true;
      restore.disabled = true;
      setStatus("写真を最適化して保存しています…");
      try {
        const compressed = await window.Green.compressImage(selectedFile, { maxEdge: 1600, quality: 0.86 });
        const data = new FormData();
        data.append("file", compressed, compressed.name || "atlas-photo.jpg");
        const base = kind === "species" ? "/api/admin/plant-species" : "/api/admin/container-models";
        const result = await window.Green.api(`${base}/${item.id}/atlas-image`, { method: "POST", body: data });
        const nextUrl = result?.data?.imageUrl || result?.data?.item?.metadata?.atlas_image_url || "";
        if (nextUrl) panel.querySelector("[data-atlas-current]").innerHTML = `<a href="${esc(nextUrl)}" target="_blank" rel="noopener"><img src="${esc(nextUrl)}" alt="現在の図鑑写真"></a>`;
        item = result?.data?.item || item;
        input.value = "";
        selectedFile = null;
        candidate?.classList.remove("is-visible");
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = "";
        save.disabled = true;
        restore.disabled = history(item).length === 0;
        setStatus("保存しました。ホームページの図鑑にも自動反映されます。");
        window.Green.toast("図鑑写真を更新しました。HPにも自動反映されます。", "success");
      } catch (error) {
        save.disabled = false;
        restore.disabled = history(item).length === 0;
        setStatus(error.message || "写真を保存できませんでした。", true);
        window.Green.toast(error.message || "図鑑写真を保存できませんでした。", "error");
      }
    });

    restore?.addEventListener("click", async () => {
      if (restore.disabled) return;
      if (!confirm("図鑑写真を1つ前の写真に戻しますか？ホームページにも自動反映されます。")) return;
      save.disabled = true;
      restore.disabled = true;
      setStatus("1つ前の写真に戻しています…");
      try {
        const base = kind === "species" ? "/api/admin/plant-species" : "/api/admin/container-models";
        const result = await window.Green.api(`${base}/${item.id}/atlas-image/restore`, { method: "POST", json: {} });
        const nextUrl = result?.data?.imageUrl || result?.data?.item?.metadata?.atlas_image_url || "";
        if (nextUrl) panel.querySelector("[data-atlas-current]").innerHTML = `<a href="${esc(nextUrl)}" target="_blank" rel="noopener"><img src="${esc(nextUrl)}" alt="現在の図鑑写真"></a>`;
        item = result?.data?.item || item;
        restore.disabled = history(item).length === 0;
        setStatus("1つ前の写真に戻しました。ホームページにも自動反映されます。");
        window.Green.toast("図鑑写真を元に戻しました。", "success");
      } catch (error) {
        restore.disabled = history(item).length === 0;
        setStatus(error.message || "写真を元に戻せませんでした。", true);
        window.Green.toast(error.message || "図鑑写真を元に戻せませんでした。", "error");
      }
    });
  }

  function scan() {
    const form = $("#species-form") || $("#container-model-form");
    if (form) void decorate(form);
    else decoratedForm = null;
  }

  installStyle();
  [0, 100, 300, 800].forEach((ms) => setTimeout(scan, ms));
  const observer = new MutationObserver(() => setTimeout(scan, 30));
  observer.observe($("#dialog-body") || document.body, { childList: true, subtree: true });
})();
