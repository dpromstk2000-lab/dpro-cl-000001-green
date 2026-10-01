(() => {
  "use strict";

  const VERSION = "GREEN-VISIT-RULE-MONTHLY-COUNT-R3.0-20261001";
  if (window.__DPRO_GREEN_VISIT_RULE_MONTHLY_COUNT_R3__) return;
  window.__DPRO_GREEN_VISIT_RULE_MONTHLY_COUNT_R3__ = VERSION;

  const WEEK_PRESETS = {
    1: [2],
    2: [1, 3],
    3: [1, 3, 5],
    4: [1, 2, 3, 4],
    5: [1, 2, 3, 4, 5]
  };

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  function getForm() {
    if (qs("#dialog-kicker")?.textContent?.trim() !== "VISIT RULE") return null;
    return qs("#visit-rule-form");
  }

  function checkedWeekdays(form) {
    return qsa('input[name="weekday"]:checked', form);
  }

  function enforceSingleWeekday(form, changed = null) {
    const freq = qs('[name="frequencyType"]', form);
    if (freq?.value !== "monthly") return;
    const checked = checkedWeekdays(form);
    if (checked.length <= 1) return;
    const keep = changed?.checked ? changed : checked[0];
    checked.forEach((input) => {
      if (input !== keep) input.checked = false;
    });
  }

  function setTextIfChanged(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setHiddenIfChanged(node, value) {
    if (node && node.hidden !== value) node.hidden = value;
  }

  function render(form) {
    const freq = qs('[name="frequencyType"]', form);
    const interval = qs('[name="intervalValue"]', form);
    const intervalLabel = interval?.closest("label");
    const count = qs('[name="monthlyVisitCount"]', form);
    const countLabel = count?.closest("label");
    const legend = qs(".owner-weekdays legend", form);
    const help = qs(".green-monthly-count-help", form);
    if (!freq || !count || !help) return;

    const monthly = freq.value === "monthly";
    setHiddenIfChanged(intervalLabel, monthly);
    setHiddenIfChanged(countLabel, !monthly);

    if (monthly) {
      if (interval && interval.value !== "1") interval.value = "1";
      setTextIfChanged(legend, "基準曜日（1つ選択）");
      enforceSingleWeekday(form);
      const n = Number(count.value || 2);
      const weeks = WEEK_PRESETS[n] || WEEK_PRESETS[2];
      setHiddenIfChanged(help, false);
      const html = `<strong>月${n}回</strong>：${weeks.map((w) => `第${w}週`).join("・")}の基準曜日に1件ずつ生成します。<br>例：月2回＋月曜日 → 第1・第3月曜日。休業日は生成対象外です。`;
      if (help.innerHTML !== html) help.innerHTML = html;
    } else {
      setTextIfChanged(legend, "訪問曜日");
      setHiddenIfChanged(help, true);
    }
  }

  function enhance() {
    const form = getForm();
    if (!form) return;

    const interval = qs('[name="intervalValue"]', form);
    const intervalLabel = interval?.closest("label");
    if (!intervalLabel) return;

    if (form.dataset.greenMonthlyCountR3 !== VERSION) {
      let count = qs('[name="monthlyVisitCount"]', form);
      if (!count) {
        const label = document.createElement("label");
        label.className = "green-monthly-count-label";
        label.innerHTML = `<span>月内回数</span>
          <select name="monthlyVisitCount">
            <option value="1">月1回</option>
            <option value="2" selected>月2回</option>
            <option value="3">月3回</option>
            <option value="4">月4回</option>
            <option value="5">月5回</option>
          </select>`;
        intervalLabel.after(label);
        count = qs('[name="monthlyVisitCount"]', form);
      }

      let help = qs(".green-monthly-count-help", form);
      if (!help) {
        help = document.createElement("div");
        help.className = "owner-inline-note full green-monthly-count-help";
        const fieldset = qs(".owner-weekdays", form);
        if (fieldset) fieldset.after(help);
        else form.append(help);
      }

      const freq = qs('[name="frequencyType"]', form);
      freq?.addEventListener("change", () => render(form));
      count?.addEventListener("change", () => render(form));
      qsa('input[name="weekday"]', form).forEach((input) => {
        input.addEventListener("change", () => {
          enforceSingleWeekday(form, input);
          render(form);
        });
      });

      form.dataset.greenMonthlyCountR3 = VERSION;
    }

    render(form);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function(input, init = {}) {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init?.method || "GET").toUpperCase();

      if (/\/api\/admin\/visit-rules(?:\/[0-9a-f-]{36})?(?:\?|$)/i.test(url) &&
          (method === "POST" || method === "PATCH") &&
          typeof init?.body === "string") {
        const form = getForm();
        if (form && qs('[name="frequencyType"]', form)?.value === "monthly") {
          enforceSingleWeekday(form);
          const selected = checkedWeekdays(form);

          if (selected.length === 1) {
            const count = Math.max(
              1,
              Math.min(5, Number(qs('[name="monthlyVisitCount"]', form)?.value || 2))
            );

            const body = JSON.parse(init.body);
            body.frequencyType = "monthly";
            body.intervalValue = 1;
            body.weekdays = [Number(selected[0].value)];
            body.weekOfMonth = WEEK_PRESETS[count] || WEEK_PRESETS[2];
            init = { ...init, body: JSON.stringify(body) };
          }
        }
      }
    } catch (error) {
      console.warn("DPRO GREEN monthly-count R3 request enhancement skipped.", error);
    }

    return originalFetch(input, init);
  };

  document.addEventListener("click", (event) => {
    const target = event.target.closest(
      '[data-rule-edit], [data-action="new-visit-rule"]'
    );
    if (!target) return;
    setTimeout(enhance, 0);
    setTimeout(enhance, 100);
    setTimeout(enhance, 300);
  }, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(enhance, 100);
    }, { once: true });
  } else {
    setTimeout(enhance, 100);
  }
})();