(() => {
  "use strict";

  const VERSION = "GREEN-CONTACT-PRIMARY-UI-R1.1-REPLACEMENT-QA-FIX-20261002";
  window.__GREEN_CONTACT_PRIMARY_UI_R1__ = VERSION;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  function ensureStyle() {
    if (document.getElementById("green-contact-primary-ui-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-contact-primary-ui-r1-style";
    style.textContent = `
      /* Existing contact-primary HUMAN ACCEPTANCE lock */
      #contact-form label[data-green-primary-contact]{
        grid-column:1 / -1;
        display:flex !important;
        align-items:flex-start !important;
        gap:12px !important;
        min-height:auto !important;
        padding:14px 16px !important;
        border:1px solid #d7e4dc !important;
        border-radius:12px !important;
        background:#f7fbf8 !important;
        cursor:pointer;
      }
      #contact-form label[data-green-primary-contact] input[type="checkbox"]{
        appearance:auto !important;
        -webkit-appearance:checkbox !important;
        width:20px !important;
        height:20px !important;
        min-width:20px !important;
        max-width:20px !important;
        min-height:20px !important;
        margin:2px 0 0 !important;
        padding:0 !important;
        border:initial !important;
        border-radius:initial !important;
        box-shadow:none !important;
        accent-color:#177653;
        flex:0 0 20px !important;
      }
      #contact-form .green-primary-contact-copy{
        display:grid;
        gap:4px;
        line-height:1.45;
      }
      #contact-form .green-primary-contact-title{
        font-weight:800;
        color:#172d24;
      }
      #contact-form .green-primary-contact-help{
        font-size:13px;
        font-weight:500;
        color:#64776e;
      }

      /* REPLACEMENT-QA-FIX-R1:
         Make workflow action buttons visible even when the detail footer is narrow. */
      #dialog-footer{
        flex-wrap:wrap !important;
        align-items:center !important;
      }
      #replacement-actions{
        display:flex !important;
        flex-wrap:wrap !important;
        gap:10px !important;
        align-items:center !important;
        max-width:100%;
      }
      #replacement-actions .btn{
        flex:0 0 auto;
      }

      @media(max-width:760px){
        #replacement-actions{
          width:100%;
        }
        #replacement-actions .btn{
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function enhanceContactPrimary() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    const input = form.querySelector('input[name="isPrimary"]');
    if (!input) return;
    const label = input.closest("label");
    if (!label || label.dataset.greenPrimaryContact === VERSION) return;

    label.dataset.greenPrimaryContact = VERSION;
    Array.from(label.childNodes).forEach((node) => {
      if (node === input) return;
      node.remove();
    });

    const copy = document.createElement("span");
    copy.className = "green-primary-contact-copy";
    copy.innerHTML = `
      <span class="green-primary-contact-title">主担当にする</span>
      <span class="green-primary-contact-help">この連絡先を、この顧客の代表連絡先として使用します。</span>
    `;
    label.appendChild(copy);
  }

  async function refreshReplacementCandidates() {
    const title = $("#dialog-title")?.textContent?.trim() || "";
    if (title !== "交換を承認・代替植物を割当") return;

    const select = $('#replacement-approve-form select[name="newPlantAssetId"]');
    if (!select || select.dataset.greenFreshCandidates === VERSION) return;
    select.dataset.greenFreshCandidates = VERSION;

    const Green = window.Green;
    if (!Green?.api) return;

    const previous = select.value || "";
    try {
      const result = await Green.api("/api/admin/assets?type=plant&limit=500");
      const plants = result?.data?.plants || [];
      const candidates = plants.filter((item) =>
        ["inventory", "reserved", "reusable", "replacement_planned"].includes(item.asset_status)
      );

      const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
        "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;"
      }[char]));

      select.innerHTML =
        '<option value="">代替植物を選択</option>' +
        candidates.map((item) => {
          const label = `${item.display_name || item.asset_code}（${item.asset_code}）`;
          return `<option value="${esc(item.id)}">${esc(label)}</option>`;
        }).join("");

      if (previous && candidates.some((item) => item.id === previous)) {
        select.value = previous;
      }
    } catch (error) {
      delete select.dataset.greenFreshCandidates;
      console.warn("[DPRO GREEN] replacement candidate refresh failed", error);
    }
  }

  function translateReplacementOperationStatus() {
    const title = $("#dialog-title")?.textContent?.trim() || "";
    if (!title.startsWith("交換 RPL-")) return;

    const map = {
      planned: "予定",
      scheduled: "予定",
      loaded: "積込済み",
      in_progress: "作業中",
      working: "作業中",
      completed: "完了",
      cancelled: "取消"
    };

    $$(".owner-mini-item", $("#dialog-body") || document).forEach((item) => {
      const text = item.textContent.trim();
      const prefix = "作業状態：";
      if (!text.startsWith(prefix)) return;
      const raw = text.slice(prefix.length).trim();
      if (map[raw]) item.textContent = `${prefix}${map[raw]}`;
    });
  }

  function enforceReplacementStepButtons() {
    const title = $("#dialog-title")?.textContent?.trim() || "";
    if (!title.startsWith("交換 RPL-")) return;

    const statusText =
      $(".owner-detail-grid .owner-detail-item:first-child strong", $("#dialog-body") || document)
        ?.textContent?.trim() || "";

    const approve = $("#approve-replacement");
    const load = $("#load-replacement");
    const complete = $("#complete-replacement");

    // Keep the workflow sequential and easy to understand.
    if (statusText === "交換予定") {
      if (approve) approve.hidden = true;
      if (load) load.hidden = false;
      if (complete) complete.hidden = true;
    } else if (statusText === "積込済み") {
      if (approve) approve.hidden = true;
      if (load) load.hidden = true;
      if (complete) complete.hidden = false;
    } else if (statusText === "確認待ち" || statusText === "提案") {
      if (approve) approve.hidden = false;
      if (load) load.hidden = true;
      if (complete) complete.hidden = true;
    }
  }

  function enhanceReplacementDetail() {
    translateReplacementOperationStatus();
    enforceReplacementStepButtons();
  }

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ensureStyle();
      enhanceContactPrimary();
      enhanceReplacementDetail();
      refreshReplacementCandidates();
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once:true });
  } else {
    schedule();
  }

  new MutationObserver(schedule).observe(document.body, {
    childList:true,
    subtree:true,
    characterData:true
  });
})();