(() => {
  "use strict";

  const VERSION = "GREEN-REPLACEMENT-CANDIDATE-FIX-R1.1-20260916";
  if (!/\/owner\.html$/.test(location.pathname)) return;

  document.documentElement.dataset.greenReplacementCandidateFix = VERSION;

  const CONDITION_LABELS = Object.freeze({
    good: "良好",
    observe: "経過観察",
    replacement_candidate: "交換候補",
    replacement_required: "交換必要",
    pest_found: "害虫あり",
    disease_suspected: "病気疑い",
    damaged: "破損",
    customer_confirmation_required: "顧客確認必要",
  });
  const LABEL_TO_CONDITION = Object.freeze(
    Object.fromEntries(Object.entries(CONDITION_LABELS).map(([code, label]) => [label, code]))
  );

  let plantPromise = null;
  let lastReplacementId = "";
  let lastReplacementStatus = "";
  const originalFetch = window.fetch.bind(window);

  function pathOf(urlLike) {
    try { return new URL(String(urlLike), location.href).pathname; }
    catch { return ""; }
  }

  function addDays(value, days) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setDate(date.getDate() + days);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function patchCareBody(path, init) {
    if (path !== "/api/admin/care" || String(init?.method || "GET").toUpperCase() !== "POST") return init;
    if (typeof init?.body !== "string" || !init.body.trim().startsWith("{")) return init;
    try {
      const json = JSON.parse(init.body);
      const mapped = LABEL_TO_CONDITION[String(json.initialCondition || "")];
      if (!mapped) return init;
      json.initialCondition = mapped;
      return { ...init, body: JSON.stringify(json) };
    } catch {
      return init;
    }
  }

  window.fetch = async function greenOperationQaFetch(input, init = undefined) {
    const url = typeof input === "string" ? input : input?.url;
    const path = pathOf(url);
    const nextInit = patchCareBody(path, init);
    const response = await originalFetch(input, nextInit);

    if (String(nextInit?.method || "GET").toUpperCase() === "GET") {
      const match = path.match(/^\/api\/admin\/replacements\/([0-9a-f-]{36})$/i);
      if (match) {
        response.clone().json().then((payload) => {
          lastReplacementId = match[1];
          lastReplacementStatus = String(payload?.data?.request?.status || "");
          queueMicrotask(improveDialog);
          setTimeout(improveDialog, 0);
          setTimeout(improveDialog, 80);
        }).catch(() => {});
      }
    }
    return response;
  };

  async function loadPlants() {
    if (!window.Green?.api) throw new Error("GREEN APIの準備が完了していません。");
    if (!plantPromise) {
      plantPromise = window.Green.api("/api/admin/assets?type=plant&limit=500")
        .then((result) => result?.data?.plants || [])
        .catch((error) => {
          plantPromise = null;
          throw error;
        });
    }
    return plantPromise;
  }

  function isAllowedCandidate(item, currentSelectedId) {
    if (!item || item.is_active === false) return false;
    if (String(item.current_location_type || "") !== "warehouse") return false;
    if (["inventory", "reusable"].includes(String(item.asset_status || ""))) return true;
    return Boolean(currentSelectedId)
      && String(item.id || "") === currentSelectedId
      && String(item.asset_status || "") === "replacement_planned";
  }

  function setNote(form, text, isError = false) {
    const select = form.elements.newPlantAssetId;
    const label = select?.closest("label");
    if (!label) return;
    let note = label.querySelector(".green-replacement-candidate-note");
    if (!note) {
      note = document.createElement("small");
      note.className = "green-replacement-candidate-note";
      label.append(note);
    }
    note.textContent = text;
    note.style.display = "block";
    note.style.marginTop = "6px";
    note.style.lineHeight = "1.5";
    note.style.color = isError ? "#a12622" : "#52635d";
  }

  async function filterApprovalCandidates(form) {
    if (!form || form.dataset.greenReplacementCandidateFix === VERSION) return;

    const select = form.elements.newPlantAssetId;
    const saveButton = document.querySelector("#save-replacement-approval");
    if (!select) return;

    form.dataset.greenReplacementCandidateFix = "loading";
    if (saveButton) saveButton.disabled = true;
    select.disabled = true;
    setNote(form, "安全な代替植物候補を確認しています…");

    const currentSelectedId = String(select.value || "");

    try {
      const plants = await loadPlants();
      const allowedIds = new Set(
        plants
          .filter((item) => isAllowedCandidate(item, currentSelectedId))
          .map((item) => String(item.id || ""))
          .filter(Boolean)
      );

      Array.from(select.options).forEach((option) => {
        if (option.value && !allowedIds.has(String(option.value))) option.remove();
      });

      if (currentSelectedId && !allowedIds.has(currentSelectedId)) select.value = "";

      form.dataset.greenReplacementCandidateFix = VERSION;
      select.disabled = false;
      if (saveButton) saveButton.disabled = false;
      setNote(form, "倉庫にあり、未予約の「在庫」「再利用可」の植物だけを表示しています。");
    } catch (error) {
      Array.from(select.options).forEach((option) => {
        if (option.value) option.remove();
      });
      select.value = "";
      select.disabled = true;
      if (saveButton) saveButton.disabled = true;
      form.dataset.greenReplacementCandidateFix = "failed";
      setNote(form, "代替植物候補を安全に確認できませんでした。再読み込みしてから操作してください。", true);
      window.Green?.toast?.(error?.message || "代替植物候補を確認できませんでした。", "error");
    }
  }

  function ensureUxStyle() {
    if (document.querySelector("style[data-green-operation-qa-fix]")) return;
    const style = document.createElement("style");
    style.dataset.greenOperationQaFix = VERSION;
    style.textContent = `
      .owner-dialog .owner-form-grid label.owner-check {
        display:flex !important;
        align-items:center !important;
        justify-content:flex-start !important;
        gap:10px !important;
        min-height:46px;
      }
      .owner-dialog .owner-check input[type="checkbox"] {
        width:18px !important;
        min-width:18px !important;
        height:18px !important;
        min-height:18px !important;
        padding:0 !important;
        margin:0 !important;
        flex:0 0 18px;
        accent-color:var(--green-800);
      }
    `;
    document.head.append(style);
  }

  function normalizeDateInputs() {
    document.querySelectorAll('#owner-dialog input[type="date"], #owner-dialog input[type="datetime-local"]').forEach((input) => {
      input.lang = "en-CA";
      input.dataset.greenDateLocaleFix = VERSION;
    });
  }

  function guardReplacementActions() {
    if (!lastReplacementStatus) return;
    const approve = document.querySelector("#approve-replacement");
    const load = document.querySelector("#load-replacement");
    const complete = document.querySelector("#complete-replacement");

    const canApprove = ["proposed", "review_required", "replacement_allocating", "approved"].includes(lastReplacementStatus);
    const canLoad = ["approved", "scheduled", "replacement_allocating"].includes(lastReplacementStatus);
    const canComplete = lastReplacementStatus === "loaded";

    if (approve && !canApprove) approve.remove();
    if (load && !canLoad) load.remove();
    if (complete && !canComplete) complete.remove();
  }

  function localizeCareCondition() {
    const form = document.querySelector("#care-form");
    const field = form?.querySelector('[name="initialCondition"]');
    if (!field || field.dataset.greenConditionLocalized === VERSION) return;
    const code = String(field.value || "").trim();
    const label = CONDITION_LABELS[code];
    if (!label) return;
    field.value = label;
    field.dataset.greenConditionCode = code;
    field.dataset.greenConditionLocalized = VERSION;
  }

  function fillNextCheckDates() {
    const careForm = document.querySelector("#care-form");
    if (careForm) {
      const start = careForm.querySelector('[name="startedOn"]');
      const next = careForm.querySelector('[name="nextCheckOn"]');
      if (start?.value && next && !next.value) next.value = addDays(start.value, 7);
    }
    const logForm = document.querySelector("#care-log-form");
    if (logForm) {
      const logged = logForm.querySelector('[name="loggedOn"]');
      const next = logForm.querySelector('[name="nextCheckOn"]');
      if (logged?.value && next && !next.value) next.value = addDays(logged.value, 7);
    }
  }

  function updateCompletionComment() {
    const form = document.querySelector("#replacement-complete-form");
    const field = form?.querySelector('[name="customerComment"]');
    if (!field || field.dataset.greenCompletionCommentFixed === VERSION) return;
    const text = String(field.value || "").trim();
    if (text === "植物の状態を確認し、より良い状態を保つため交換を予定しています。") {
      field.value = "植物の状態を確認し、より良い状態を保つため、本日交換を行いました。";
    }
    field.dataset.greenCompletionCommentFixed = VERSION;
  }

  async function hydrateCarePlantIfNeeded() {
    const form = document.querySelector("#care-form");
    const select = form?.querySelector('[name="plantAssetId"]');
    if (!form || !select || select.value || !lastReplacementId) return;
    if (form.dataset.greenCareHydrating === "1" || form.dataset.greenCareHydrated === VERSION) return;

    form.dataset.greenCareHydrating = "1";
    try {
      const result = await window.Green?.api?.(`/api/admin/replacements/${lastReplacementId}`);
      const request = result?.data?.request || {};
      const oldAsset = result?.data?.oldAsset || request.oldAsset;
      if (oldAsset?.id) {
        let option = Array.from(select.options).find((item) => String(item.value) === String(oldAsset.id));
        if (!option) {
          option = document.createElement("option");
          option.value = oldAsset.id;
          option.textContent = `${oldAsset.display_name || oldAsset.asset_name || oldAsset.asset_code || "回収植物"} (${oldAsset.asset_code || ""})`.trim();
          select.append(option);
        }
        select.value = oldAsset.id;
      }
      form.dataset.greenCareHydrated = VERSION;
    } catch {
      form.dataset.greenCareHydrated = "failed";
    } finally {
      delete form.dataset.greenCareHydrating;
    }
  }

  function improveDialog() {
    ensureUxStyle();
    normalizeDateInputs();
    guardReplacementActions();
    localizeCareCondition();
    fillNextCheckDates();
    updateCompletionComment();
    hydrateCarePlantIfNeeded();
  }

  function apply() {
    const form = document.querySelector("#replacement-approve-form");
    if (form && form.dataset.greenReplacementCandidateFix !== VERSION && form.dataset.greenReplacementCandidateFix !== "loading") {
      filterApprovalCandidates(form);
    }
    improveDialog();
  }

  const dialog = document.querySelector("#owner-dialog");
  if (dialog) {
    const observer = new MutationObserver(apply);
    observer.observe(dialog, { childList: true, subtree: true });
  }

  apply();
  console.info(`[DPRO GREEN] ${VERSION} active`);
})();