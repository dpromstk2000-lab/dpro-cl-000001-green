(() => {
  "use strict";
  const VERSION = "GREEN-PUBLIC-CANDIDATE-R1.4-20260916";
  const { api, uploadPhoto, compressImage, uuid, toast, setBusy, renderError } = window.Green;
  const config = window.GREEN_CONFIG;
  const form = document.querySelector("#inquiry-form");
  const submitButton = document.querySelector("#submit-button");
  const errorBox = document.querySelector("#form-error");
  const completion = document.querySelector("#completion");
  const photoInput = document.querySelector("#photos");
  const preview = document.querySelector("#photo-preview");
  const categoryCards = [...document.querySelectorAll("[data-category]")];
  let selectedFiles = [];


  const CANDIDATE_SLOT_VERSION = "GREEN-CANDIDATE-SLOT-R1.0-20260916";

  function ensureCandidateSlotStyles() {
    if (document.querySelector(`style[data-green-candidate-slot="${CANDIDATE_SLOT_VERSION}"]`)) return;
    const style = document.createElement("style");
    style.dataset.greenCandidateSlot = CANDIDATE_SLOT_VERSION;
    style.textContent = `
      .green-candidate-slot {
        display:grid;
        grid-template-columns:minmax(0,1.25fr) minmax(128px,.75fr);
        gap:8px;
        width:100%;
      }
      .green-candidate-date,
      .green-candidate-time {
        width:100%;
        min-width:0;
      }
      .green-candidate-native {
        display:none !important;
      }
      @media (max-width:560px) {
        .green-candidate-slot { grid-template-columns:1fr; }
      }
    `;
    document.head.append(style);
  }

  function tokyoNowParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    return Object.fromEntries(parts.map((part) => [part.type, part.value]));
  }

  function nextHalfHourTokyoValue() {
    const now = new Date();
    const p = tokyoNowParts(now);
    const base = new Date(Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      0,
      0
    ));

    const minute = Number(p.minute);
    let rounded = minute < 30 ? 30 : 60;
    if ((minute === 0 || minute === 30) && now.getSeconds() === 0 && now.getMilliseconds() === 0) {
      rounded = minute;
    }
    base.setUTCMinutes(rounded);

    return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}T${String(base.getUTCHours()).padStart(2, "0")}:${String(base.getUTCMinutes()).padStart(2, "0")}`;
  }

  function isValidFutureCandidate(value) {
    if (!value) return true;
    const candidate = String(value);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:(?:00|30)$/.test(candidate)) return false;

    const time = candidate.slice(11, 16);
    const allowed =
      (time >= "09:00" && time <= "18:30") ||
      time === "19:00";
    if (!allowed) return false;

    return candidate >= nextHalfHourTokyoValue();
  }

  function candidateTimeOptions(dateValue, selected = "") {
    const minimum = nextHalfHourTokyoValue();
    const options = ['<option value="">時刻を選択</option>'];
    for (let hour = 9; hour <= 19; hour += 1) {
      const minutes = hour === 19 ? [0] : [0, 30];
      for (const minute of minutes) {
        const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const combined = dateValue ? `${dateValue}T${time}` : "";
        const disabled = Boolean(dateValue && combined < minimum);
        options.push(
          `<option value="${time}"${time === selected ? " selected" : ""}${disabled ? " disabled" : ""}>${time}</option>`
        );
      }
    }
    return options.join("");
  }

  function syncCandidateNative(input, dateInput, timeSelect, { report = false } = {}) {
    const dateValue = dateInput.value;
    const timeValue = timeSelect.value;
    dateInput.setCustomValidity("");
    timeSelect.setCustomValidity("");

    if (!dateValue && !timeValue) {
      input.value = "";
      return true;
    }

    if (!dateValue || !timeValue) {
      input.value = "";
      const target = !dateValue ? dateInput : timeSelect;
      target.setCustomValidity("日付と時刻を両方選択してください。");
      if (report) target.reportValidity();
      return false;
    }

    const combined = `${dateValue}T${timeValue}`;
    if (!isValidFutureCandidate(combined)) {
      input.value = "";
      timeSelect.setCustomValidity("現地確認候補は9:00〜19:00の30分単位で、現在より後の時刻を選択してください。");
      if (report) timeSelect.reportValidity();
      return false;
    }

    input.value = combined;
    input.min = nextHalfHourTokyoValue();
    input.step = "1800";
    return true;
  }

  function refreshCandidateTimeOptions(input) {
    const widget = input.closest(".green-candidate-slot");
    const dateInput = widget?.querySelector(".green-candidate-date");
    const timeSelect = widget?.querySelector(".green-candidate-time");
    if (!dateInput || !timeSelect) return;

    const oldTime = timeSelect.value;
    const minimum = nextHalfHourTokyoValue();
    dateInput.min = minimum.slice(0, 10);
    input.min = minimum;
    input.step = "1800";
    timeSelect.innerHTML = candidateTimeOptions(dateInput.value, oldTime);

    if (oldTime && timeSelect.value !== oldTime) {
      timeSelect.value = "";
    }
    syncCandidateNative(input, dateInput, timeSelect);
  }

  function installCandidateSlot(input) {
    if (!input) return;
    if (input.dataset.greenCandidateSlot === CANDIDATE_SLOT_VERSION) {
      refreshCandidateTimeOptions(input);
      return;
    }

    ensureCandidateSlotStyles();

    const currentValue = String(input.value || "");
    const initialDate = currentValue.slice(0, 10);
    const initialTime = currentValue.slice(11, 16);

    const wrapper = document.createElement("span");
    wrapper.className = "green-candidate-slot";
    wrapper.dataset.greenCandidateSlot = CANDIDATE_SLOT_VERSION;

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "green-candidate-date";
    dateInput.setAttribute("aria-label", "現地確認希望日");
    dateInput.value = initialDate;

    const timeSelect = document.createElement("select");
    timeSelect.className = "green-candidate-time";
    timeSelect.setAttribute("aria-label", "現地確認希望時刻");

    input.dataset.greenCandidateSlot = CANDIDATE_SLOT_VERSION;
    input.classList.add("green-candidate-native");
    input.min = nextHalfHourTokyoValue();
    input.step = "1800";

    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(dateInput, timeSelect, input);

    refreshCandidateTimeOptions(input);
    if (initialTime) {
      timeSelect.value = initialTime;
      syncCandidateNative(input, dateInput, timeSelect);
    }

    dateInput.addEventListener("focus", () => refreshCandidateTimeOptions(input));
    dateInput.addEventListener("pointerdown", () => refreshCandidateTimeOptions(input));
    dateInput.addEventListener("change", () => {
      refreshCandidateTimeOptions(input);
      syncCandidateNative(input, dateInput, timeSelect, { report: true });
    });

    timeSelect.addEventListener("focus", () => refreshCandidateTimeOptions(input));
    timeSelect.addEventListener("change", () => {
      syncCandidateNative(input, dateInput, timeSelect, { report: true });
    });
  }

  function installPublicCandidateSlots() {
    ["candidate1", "candidate2", "candidate3"].forEach((name) => {
      installCandidateSlot(form?.elements?.[name] || null);
    });
  }

  function validateCandidateSlots({ report = false } = {}) {
    let valid = true;
    ["candidate1", "candidate2", "candidate3"].forEach((name) => {
      const input = form?.elements?.[name] || null;
      const widget = input?.closest(".green-candidate-slot");
      const dateInput = widget?.querySelector(".green-candidate-date");
      const timeSelect = widget?.querySelector(".green-candidate-time");
      if (!input || !dateInput || !timeSelect) return;
      if (!syncCandidateNative(input, dateInput, timeSelect, { report })) valid = false;
    });
    return valid;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char]);
  }

  async function initialize() {
    bindEvents();
    prefillTracking();
    installPublicCandidateSlots();
    try {
      const [facilityResponse, servicesResponse] = await Promise.all([
        api("/api/public/facility"), api("/api/public/services"),
      ]);
      document.querySelectorAll("[data-facility-name]").forEach((node) => { node.textContent = facilityResponse.data.facilityName; });
      const serviceCount = servicesResponse.data.services?.length || 0;
      document.querySelector("#service-note").textContent = `${serviceCount}種類のご相談に対応しています。金額の確定ではなく、まず状況をお聞きする受付フォームです。`;
    } catch (error) {
      document.querySelector("#service-note").textContent = "フォームはご利用いただけます。送信時に事業所接続を確認します。";
    }
  }

  function bindEvents() {
    categoryCards.forEach((card) => card.addEventListener("click", () => selectCategory(card.dataset.category)));
    document.querySelector("#inquiry-category").addEventListener("change", (event) => selectCategory(event.target.value, false));
    photoInput.addEventListener("change", handlePhotoSelection);
    form.addEventListener("submit", handleSubmit);
    document.querySelector("#new-inquiry").addEventListener("click", resetForm);
  }

  function selectCategory(value, syncSelect = true) {
    categoryCards.forEach((card) => card.classList.toggle("is-selected", card.dataset.category === value));
    if (syncSelect) document.querySelector("#inquiry-category").value = value;
  }

  function prefillTracking() {
    const params = new URLSearchParams(location.search);
    form.elements.pageUrl.value = location.href;
    form.elements.utmSource.value = params.get("utm_source") || "";
    form.elements.utmMedium.value = params.get("utm_medium") || "";
    form.elements.utmCampaign.value = params.get("utm_campaign") || "";
  }

  async function handlePhotoSelection() {
    errorBox.hidden = true;
    const candidates = [...photoInput.files].slice(0, config.MAX_PHOTOS || 4);
    try {
      selectedFiles = [];
      for (const file of candidates) selectedFiles.push(await compressImage(file));
      renderPreviews();
      if (photoInput.files.length > candidates.length) toast(`写真は最大${candidates.length}枚までです。`, "warning");
    } catch (error) {
      renderError(errorBox, error);
    }
  }

  function renderPreviews() {
    preview.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "photo-preview-item";
      const image = document.createElement("img");
      image.src = URL.createObjectURL(file);
      image.alt = `選択写真 ${index + 1}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "photo-remove";
      button.textContent = "削除";
      button.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        renderPreviews();
      });
      item.append(image, button);
      preview.append(item);
    });
  }

  function buildPayload() {
    const data = new FormData(form);
    const category = String(data.get("inquiryCategory") || "");
    if (category === "photo_consultation" && !selectedFiles.length) throw new Error("写真で相談する場合は、写真を1枚以上選択してください。");

    if (!validateCandidateSlots({ report: true })) {
      throw new Error("現地確認候補は、9:00〜19:00の30分単位で正しく選択してください。");
    }

    const candidateValues = [data.get("candidate1"), data.get("candidate2"), data.get("candidate3")]
      .filter(Boolean)
      .map(String);
    if (candidateValues.some((value) => !isValidFutureCandidate(value))) {
      throw new Error("現地確認候補は、9:00〜19:00の30分単位で現在より後の時刻を選択してください。");
    }

    return {
      facilityCode: config.FACILITY_CODE,
      source: document.body.dataset.source || "website",
      companyName: data.get("companyName"),
      contactName: data.get("contactName"),
      phone: data.get("phone"),
      email: data.get("email"),
      postalCode: data.get("postalCode"),
      address: data.get("address"),
      inquiryCategory: category,
      siteType: data.get("siteType"),
      desiredCount: data.get("desiredCount") || null,
      desiredSize: data.get("desiredSize"),
      desiredStartPeriod: data.get("desiredStartPeriod"),
      siteCheckCandidates: candidateValues,
      preferredContactMethod: data.get("preferredContactMethod"),
      inquiryText: data.get("inquiryText"),
      consent: data.get("consent") === "on",
      website: data.get("website"),
      pageUrl: data.get("pageUrl"),
      utm: { source: data.get("utmSource"), medium: data.get("utmMedium"), campaign: data.get("utmCampaign") },
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    errorBox.hidden = true;
    if (!form.reportValidity()) return;
    setBusy(submitButton, true, "受付中…");
    try {
      const payload = buildPayload();
      const response = await api("/api/public/inquiries", { method: "POST", json: payload, idempotencyKey: uuid() });
      const { inquiryId, receptionNumber, uploadToken } = response.data;
      for (let index = 0; index < selectedFiles.length; index += 1) {
        submitButton.textContent = `写真を保存中 ${index + 1}/${selectedFiles.length}`;
        await uploadPhoto(`/api/public/inquiries/${inquiryId}/photos`, selectedFiles[index], uploadToken, `相談写真 ${index + 1}`);
      }
      form.hidden = true;
      document.querySelector("#reception-number").textContent = receptionNumber;
      document.querySelector("#duplicate-note").hidden = !response.data.duplicateCandidate;
      completion.hidden = false;
      completion.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      renderError(errorBox, error);
      errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      setBusy(submitButton, false);
    }
  }

  function resetForm() {
    form.reset();
    selectedFiles = [];
    renderPreviews();
    completion.hidden = true;
    form.hidden = false;
    prefillTracking();
    installPublicCandidateSlots();
    ["candidate1","candidate2","candidate3"].forEach((name) => refreshCandidateTimeOptions(form.elements[name]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  initialize();

  async function loadPublicSiteProfile() {
    const region = document.querySelector("#public-announcements");
    if (!region) return;
    try {
      const response = await Green.api("/api/public/site-profile?target=public_form");
      const profile = response.data || {};
      document.querySelectorAll("[data-facility-name]").forEach((node) => {
        if (profile.facilityName) node.textContent = profile.facilityName;
      });
      const items = profile.announcements || [];
      region.hidden = items.length === 0;
      region.innerHTML = items.map((item) =>
        `<article class="green12-public-notice${item.isImportant ? " is-important" : ""}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.body).replace(/\n/g,"<br>")}</p>${item.period ? `<small>${escapeHtml(item.period)}</small>` : ""}</article>`
      ).join("");
    } catch (error) {
      console.warn(`[DPRO GREEN] ${VERSION} public announcement load failed`, error);
      region.hidden = true;
    }
  }

  loadPublicSiteProfile();
  console.info(`[DPRO GREEN] ${VERSION} active`);
})();
