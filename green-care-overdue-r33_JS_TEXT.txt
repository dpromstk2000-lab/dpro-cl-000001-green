(() => {
  "use strict";

  const VERSION = "GREEN-CARE-OVERDUE-R33-20260917";
  if (!/\/owner\.html$/.test(location.pathname)) return;

  function jstTodayKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function parseJapaneseDate(text) {
    const m = String(text || "").match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!m) return "";
    return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;
  }

  function daysBetween(fromKey, toKey) {
    const from = new Date(`${fromKey}T00:00:00+09:00`);
    const to = new Date(`${toKey}T00:00:00+09:00`);
    return Math.max(0, Math.floor((to - from) / 86400000));
  }

  function ensureStyle() {
    if (document.getElementById("green-care-overdue-r33-style")) return;
    const style = document.createElement("style");
    style.id = "green-care-overdue-r33-style";
    style.textContent = `
      .green-care-overdue-chip{
        display:inline-flex;align-items:center;margin-left:8px;padding:4px 8px;
        border-radius:999px;background:#fff0e3;color:#a34b13;
        border:1px solid #f4c99f;font-size:12px;font-weight:800;white-space:nowrap
      }
      .green-care-overdue-row td{background:linear-gradient(0deg,rgba(255,247,239,.62),rgba(255,247,239,.62))}
      .green-care-overdue-alert{
        margin:14px 0 18px;padding:13px 15px;border-radius:12px;
        border:1px solid #efc49b;background:#fff7ef;color:#7d4318;
        font-weight:800;line-height:1.65
      }
      .green-care-overdue-alert small{display:block;margin-top:4px;font-weight:600;color:#875b39}
    `;
    document.head.append(style);
  }

  function markCareList() {
    const today = jstTodayKey();
    const tables = Array.from(document.querySelectorAll("table"));
    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
      const nextIndex = headers.findIndex((v) => v === "次回確認");
      const statusIndex = headers.findIndex((v) => v === "状態");
      if (nextIndex < 0 || statusIndex < 0) continue;

      table.querySelectorAll("tbody tr").forEach((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length <= Math.max(nextIndex, statusIndex)) return;
        const nextCell = cells[nextIndex];
        const statusCell = cells[statusIndex];
        const statusText = statusCell.textContent.trim();
        const nextKey = parseJapaneseDate(nextCell.textContent);
        const overdue = statusText.includes("養生中") && nextKey && nextKey < today;

        row.classList.toggle("green-care-overdue-row", Boolean(overdue));
        const existing = nextCell.querySelector(".green-care-overdue-chip");
        if (!overdue) {
          existing?.remove();
          return;
        }
        if (!existing) {
          const chip = document.createElement("span");
          chip.className = "green-care-overdue-chip";
          chip.textContent = "確認期限超過";
          nextCell.appendChild(chip);
        }
      });
    }
  }

  function detailItem(dialog, label) {
    return Array.from(dialog.querySelectorAll(".owner-detail-item"))
      .find((el) => el.querySelector("small")?.textContent.trim() === label);
  }

  function markCareDetail() {
    const dialog = document.getElementById("owner-dialog");
    if (!dialog) return;
    const kicker = document.getElementById("dialog-kicker");
    if (!kicker || kicker.textContent.trim() !== "CARE DETAIL") return;

    const today = jstTodayKey();
    const statusItem = detailItem(dialog, "状態");
    const nextItem = detailItem(dialog, "次回確認");
    const statusText = statusItem?.querySelector("strong")?.textContent.trim() || "";
    const nextText = nextItem?.querySelector("strong")?.textContent.trim() || "";
    const nextKey = parseJapaneseDate(nextText);
    const overdue = statusText === "養生中" && nextKey && nextKey < today;

    let alert = dialog.querySelector(".green-care-overdue-alert");
    if (!overdue) {
      alert?.remove();
      return;
    }

    const days = daysBetween(nextKey, today);
    if (!alert) {
      alert = document.createElement("div");
      alert.className = "green-care-overdue-alert";
      const grid = dialog.querySelector(".owner-detail-grid");
      if (grid) grid.insertAdjacentElement("afterend", alert);
    }
    alert.innerHTML = `確認期限を過ぎています。<small>次回確認日から${days}日経過しています。養生記録を確認し、再利用・廃棄の判定、または必要な対応を確認してください。</small>`;
  }

  function apply() {
    ensureStyle();
    markCareList();
    markCareDetail();
    document.documentElement.dataset.greenCareOverdueR33 = VERSION;
  }

  function start() {
    apply();
    const observer = new MutationObserver(() => {
      clearTimeout(start._timer);
      start._timer = setTimeout(apply, 10);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();