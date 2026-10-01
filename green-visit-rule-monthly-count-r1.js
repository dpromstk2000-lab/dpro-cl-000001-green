(() => {
  "use strict";

  const VERSION = "GREEN-VISIT-RULE-MONTHLY-COUNT-R1.0-20261001";
  if (window.__DPRO_GREEN_VISIT_RULE_MONTHLY_COUNT_R1__) return;
  window.__DPRO_GREEN_VISIT_RULE_MONTHLY_COUNT_R1__ = VERSION;

  const WEEK_PRESETS = {
    1: [2],
    2: [1, 3],
    3: [1, 3, 5],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4, 5]
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"
    }[ch]));
  }

  function isVisitRuleDialog() {
    return document.querySelector("#dialog-kicker")?.textContent?.trim() === "VISIT RULE";
  }

  function findDirectLabel(form, inputName) {
    const input = form.querySelector(`[name="${inputName}"]`);
    return input?.closest("label") || null;
  }

  function selectedWeekdays(form) {
    return Array.from(form.querySelectorAll('input[name="weekday"]:checked'));
  }

  function enforceSingleWeekday(form, changedInput = null) {
    if (form.querySelector('[name="frequencyType"]')?.value !== "monthly") return;
    const checked = selectedWeekdays(form);
    if (checked.length <= 1) return;
    const keep = changedInput?.checked ? changedInput : checked[0];
    checked.forEach((input) => {
      if (input !== keep) input.checked = false;
    });
  }

  function weekText(count) {
    const weeks = WEEK_PRESETS[count] || WEEK_PRESETS[2];
    return weeks.map((n) => `第${n}週`).join("・");
  }

  function renderMode(form) {
    const freq = form.querySelector('[name="frequencyType"]');
    const interval = form.querySelector('[name="intervalValue"]');
    const count = form.querySelector('[name="monthlyVisitCount"]');
    const intervalLabel = interval?.closest("label");
    const countLabel = count?.closest("label");
    const fieldset = form.querySelector(".owner-weekdays");
    const legend = fieldset?.querySelector("legend");
    const help = form.querySelector(".green-monthly-count-help");

    if (!freq || !count) return;

    const monthly = freq.value === "monthly";
    if (countLabel) countLabel.hidden = !monthly;

    if (intervalLabel) {
      intervalLabel.hidden = monthly;
      const textNode = Array.from(intervalLabel.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.nodeValue = freq.value === "every_n_months" ? "何か月ごと " : "間隔 ";
    }

    if (monthly) {
      if (interval) interval.value = "1";
      if (legend) legend.textContent = "基準曜日（1つ選択）";
      enforceSingleWeekday(form);
      const c = Number(count.value || 2);
      if (help) help.innerHTML = `<strong>月${c}回</strong>：${esc(weekText(c))}の基準曜日に1件ずつ生成します。<br>例：月2回＋月曜日 → 第1・第3月曜日。休業日は生成対象外です。`;
    } else {
      if (legend) legend.textContent = "訪問曜日";
      if (help) help.textContent = "";
    }
  }

  function enhanceVisitRuleForm() {
    if (!isVisitRuleDialog()) return;
    const form = document.querySelector("#owner-dialog #visit-rule-form");
    if (!form || form.dataset.greenMonthlyCountReady === VERSION) return;

    const interval = form.querySelector('[name="intervalValue"]');
    const intervalLabel = interval?.closest("label");
    if (!intervalLabel) return;

    let count = form.querySelector('[name="monthlyVisitCount"]');
    if (!count) {
      const label = document.createElement("label");
      label.className = "green-monthly-visit-count";
      label.innerHTML = `<span>月内回数</span>
        <select name="monthlyVisitCount">
          <option value="1">月1回</option>
          <option value="2" selected>月2回</option>
          <option value="3">月3回</option>
          <option value="4">月4回</option>
          <option value="5">月5回</option>
        </select>`;
      intervalLabel.after(label);
      count = label.querySelector("select");
    }

    let help = form.querySelector(".green-monthly-count-help");
    if (!help) {
      help = document.createElement("div");
      help.className = "green-monthly-count-help full owner-inline-note";
      const fieldset = form.querySelector(".owner-weekdays");
      if (fieldset) fieldset.after(help);
      else form.append(help);
    }

    const freq = form.querySelector('[name="frequencyType"]');
    freq?.addEventListener("change", () => renderMode(form));
    count?.addEventListener("change", () => renderMode(form));

    form.querySelectorAll('input[name="weekday"]').forEach((input) => {
      input.addEventListener("change", () => {
        enforceSingleWeekday(form, input);
        renderMode(form);
      });
    });

    const save = document.querySelector("#owner-dialog #save-visit-rule");
    if (save && save.dataset.greenMonthlyValidate !== VERSION) {
      save.dataset.greenMonthlyValidate = VERSION;
      save.addEventListener("click", (event) => {
        if (freq?.value !== "monthly") return;
        enforceSingleWeekday(form);
        if (!selectedWeekdays(form).length) {
          event.preventDefault();
          event.stopImmediatePropagation();
          window.Green?.toast?.("月内回数を使う場合は、基準曜日を1つ選択してください。", "error");
        }
      }, true);
    }

    form.dataset.greenMonthlyCountReady = VERSION;
    renderMode(form);
  }

  function wrapApi() {
    const Green = window.Green;
    if (!Green?.api || Green.api.__greenMonthlyCountWrapped) return false;

    const original = Green.api.bind(Green);

    async function wrapped(path, options = {}) {
      try {
        if (/^\/api\/admin\/visit-rules(?:\/[0-9a-f-]{36})?$/i.test(String(path || "")) &&
            ["POST", "PATCH"].includes(String(options?.method || "GET").toUpperCase()) &&
            options?.json) {
          const form = document.querySelector("#owner-dialog #visit-rule-form");
          if (form && form.querySelector('[name="frequencyType"]')?.value === "monthly") {
            const count = Math.max(1, Math.min(5, Number(form.querySelector('[name="monthlyVisitCount"]')?.value || 2)));
            const checked = selectedWeekdays(form);
            if (checked.length) {
              options = {
                ...options,
                json: {
                  ...options.json,
                  frequencyType: "monthly",
                  intervalValue: 1,
                  weekdays: [Number(checked[0].value)],
                  weekOfMonth: WEEK_PRESETS[count]
                }
              };
            }
          }
        }
      } catch {}
      return original(path, options);
    }

    wrapped.__greenMonthlyCountWrapped = true;
    Green.api = wrapped;
    return true;
  }

  async function improveRuleList() {
    const panel = document.querySelector('[data-view-panel="visits"]');
    if (!panel || !window.Green?.api) return;
    const activeTab = document.querySelector('[data-visit-tab="rules"].is-active, [data-visit-tab="rules"][aria-selected="true"]');
    if (!activeTab && !document.querySelector("#visit-rule-rows")) return;

    try {
      const result = await window.Green.api("/api/admin/visit-rules");
      const items = result?.data?.items || [];
      const byCode = new Map(items.map((r) => [String(r.rule_code || ""), r]));
      document.querySelectorAll("#visit-rule-rows tr").forEach((row) => {
        const code = row.querySelector(".owner-code-badge")?.textContent?.trim() || "";
        const rule = byCode.get(code);
        if (!rule || rule.frequency_type !== "monthly" || !Array.isArray(rule.week_of_month) || !rule.week_of_month.length) return;
        const cells = row.querySelectorAll("td");
        const cell = cells[3];
        if (!cell) return;
        const count = rule.week_of_month.length;
        const weeks = rule.week_of_month.map((n) => `第${n}週`).join("・");
        cell.innerHTML = `毎月<span class="owner-row-sub">月${count}回／${esc(weeks)}</span>`;
      });
    } catch {}
  }

  function run() {
    wrapApi();
    enhanceVisitRuleForm();
    setTimeout(enhanceVisitRuleForm, 50);
    setTimeout(improveRuleList, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();