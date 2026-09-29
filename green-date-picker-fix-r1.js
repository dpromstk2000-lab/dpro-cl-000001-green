(() => {
  "use strict";

  const VERSION = "GREEN-DATE-PICKER-R2.1-DIRECT-20260928";
  if (window.__DPRO_GREEN_DATE_PICKER_R2__) return;
  window.__DPRO_GREEN_DATE_PICKER_R2__ = VERSION;
  document.documentElement.dataset.greenDatePicker = VERSION;

  const pad = (n) => String(n).padStart(2, "0");

  function localDateParts(date = new Date()) {
    return {
      y: date.getFullYear(),
      m: date.getMonth() + 1,
      d: date.getDate(),
      hh: date.getHours(),
      mm: date.getMinutes(),
    };
  }

  function parseNativeValue(type, value) {
    const now = localDateParts();
    if (!value) return now;
    if (type === "date") {
      const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return m ? { y:+m[1], m:+m[2], d:+m[3], hh:now.hh, mm:now.mm } : now;
    }
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? { y:+m[1], m:+m[2], d:+m[3], hh:+m[4], mm:+m[5] } : now;
  }

  function formatNative(type, p) {
    const date = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
    return type === "date" ? date : `${date}T${pad(p.hh)}:${pad(p.mm)}`;
  }

  function formatDisplay(type, p) {
    const date = `${p.y}/${pad(p.m)}/${pad(p.d)}`;
    return type === "date" ? date : `${date} ${pad(p.hh)}:${pad(p.mm)}`;
  }

  function roundQuarter(minute) {
    return Math.min(45, Math.floor(minute / 15) * 15);
  }

  function compareNative(type, a, b) {
    if (!a || !b) return 0;
    return a.localeCompare(b);
  }

  function installStyle() {
    if (document.getElementById("green-date-picker-r2-style")) return;
    const style = document.createElement("style");
    style.id = "green-date-picker-r2-style";
    style.textContent = `
      #owner-dialog .green-clean-date-button{
        pointer-events:auto!important;
        position:relative!important;
        z-index:6!important;
      }
      #owner-dialog .green-clean-date-native{
        pointer-events:none!important;
        position:absolute!important;
        left:-10000px!important;
        width:1px!important;
        height:1px!important;
        opacity:0!important;
      }

      #green-date-picker-r2-overlay{
        position:fixed;inset:0;z-index:200000;background:#0006;
        display:grid;place-items:center;padding:18px;
      }
      #green-date-picker-r2{
        width:min(420px,96vw);max-height:92vh;overflow:auto;
        background:#fff;border-radius:18px;border:1px solid #d8e3dc;
        box-shadow:0 24px 70px #0004;padding:16px;
        color:#173d2f;font-family:inherit;
      }
      #green-date-picker-r2 .gdp-head{
        display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px
      }
      #green-date-picker-r2 .gdp-head strong{font-size:18px}
      #green-date-picker-r2 .gdp-close,
      #green-date-picker-r2 .gdp-nav{
        min-width:42px;min-height:42px;border:1px solid #cfdcd4;border-radius:10px;
        background:#fff;font:inherit;font-weight:900;cursor:pointer
      }
      #green-date-picker-r2 .gdp-month-row{
        display:grid;grid-template-columns:42px 1fr 42px;gap:8px;align-items:center;margin-bottom:10px
      }
      #green-date-picker-r2 .gdp-month-label{text-align:center;font-weight:900;font-size:17px}
      #green-date-picker-r2 .gdp-week,
      #green-date-picker-r2 .gdp-days{
        display:grid;grid-template-columns:repeat(7,1fr);gap:5px
      }
      #green-date-picker-r2 .gdp-week span{
        text-align:center;font-size:11px;color:#687b71;font-weight:800;padding:4px 0
      }
      #green-date-picker-r2 .gdp-day{
        min-height:42px;border:1px solid #d9e4dd;border-radius:10px;background:#fff;
        font:inherit;font-weight:800;color:#173d2f;cursor:pointer
      }
      #green-date-picker-r2 .gdp-day:hover{background:#f2f8f4}
      #green-date-picker-r2 .gdp-day.is-selected{
        background:#174c35;color:#fff;border-color:#174c35
      }
      #green-date-picker-r2 .gdp-day.is-today:not(.is-selected){
        box-shadow:0 0 0 2px #d4b255 inset
      }
      #green-date-picker-r2 .gdp-day:disabled{
        opacity:.28;cursor:not-allowed;background:#f5f5f5
      }
      #green-date-picker-r2 .gdp-empty{min-height:42px}
      #green-date-picker-r2 .gdp-time{
        display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px
      }
      #green-date-picker-r2 .gdp-time label{font-weight:900}
      #green-date-picker-r2 .gdp-time select{
        width:100%;min-height:46px;margin-top:6px;border:1px solid #cfdcd4;border-radius:10px;
        background:#fff;padding:0 12px;font:inherit;font-weight:800
      }
      #green-date-picker-r2 .gdp-note{
        margin:12px 0 0;padding:9px 11px;border-radius:10px;background:#f4f8f5;
        color:#607269;font-size:12px;line-height:1.5
      }
      #green-date-picker-r2 .gdp-actions{
        display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:12px;
        border-top:1px solid #e1e8e3
      }
      #green-date-picker-r2 .gdp-actions button{
        min-height:44px;padding:0 16px;border-radius:10px;border:1px solid #cfdcd4;
        background:#fff;font:inherit;font-weight:900;cursor:pointer
      }
      #green-date-picker-r2 .gdp-actions .is-primary{
        background:#174c35;color:#fff;border-color:#174c35
      }
      @media(max-width:520px){
        #green-date-picker-r2{padding:13px}
        #green-date-picker-r2 .gdp-day{min-height:38px}
      }
    `;
    document.head.append(style);
  }

  function openPicker(wrapper) {
    const native = wrapper.querySelector(".green-clean-date-native");
    const display = wrapper.querySelector(".green-clean-date-display");
    if (!native || !display) return;

    const type = native.dataset.greenOriginalDateType || native.type || "date";
    const min = native.min || "";
    const max = native.max || "";

    const initial = parseNativeValue(type, native.value);
    initial.mm = roundQuarter(initial.mm);

    let selected = { ...initial };
    let viewYear = selected.y;
    let viewMonth = selected.m;

    const overlay = document.createElement("div");
    overlay.id = "green-date-picker-r2-overlay";
    overlay.innerHTML = `
      <div id="green-date-picker-r2" role="dialog" aria-modal="true" aria-label="${type === "date" ? "日付を選択" : "日時を選択"}">
        <div class="gdp-head">
          <strong>${type === "date" ? "日付を選択" : "日時を選択"}</strong>
          <button type="button" class="gdp-close" aria-label="閉じる">×</button>
        </div>
        <div class="gdp-month-row">
          <button type="button" class="gdp-nav" data-dir="-1">‹</button>
          <div class="gdp-month-label"></div>
          <button type="button" class="gdp-nav" data-dir="1">›</button>
        </div>
        <div class="gdp-week">
          <span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span>
        </div>
        <div class="gdp-days"></div>
        ${type === "datetime-local" ? `
          <div class="gdp-time">
            <label>時
              <select class="gdp-hour"></select>
            </label>
            <label>分
              <select class="gdp-minute">
                <option value="0">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
            </label>
          </div>
        ` : ""}
        <div class="gdp-note">${type === "datetime-local" ? "15分刻みで選択します。" : "日付を選択します。"}</div>
        <div class="gdp-actions">
          <button type="button" class="gdp-cancel">取消</button>
          <button type="button" class="gdp-ok is-primary">決定</button>
        </div>
      </div>
    `;
    document.body.append(overlay);

    const days = overlay.querySelector(".gdp-days");
    const label = overlay.querySelector(".gdp-month-label");
    const hour = overlay.querySelector(".gdp-hour");
    const minute = overlay.querySelector(".gdp-minute");

    if (hour) {
      hour.innerHTML = Array.from({length:24}, (_,i)=>`<option value="${i}">${pad(i)}</option>`).join("");
      hour.value = String(selected.hh);
      minute.value = String(selected.mm);
    }

    const isAllowed = (p) => {
      const value = formatNative(type, p);
      if (min && compareNative(type, value, min) < 0) return false;
      if (max && compareNative(type, value, max) > 0) return false;
      return true;
    };

    const render = () => {
      label.textContent = `${viewYear}年 ${viewMonth}月`;
      days.innerHTML = "";
      const first = new Date(viewYear, viewMonth - 1, 1);
      const lastDay = new Date(viewYear, viewMonth, 0).getDate();
      const start = first.getDay();
      const today = localDateParts();

      for (let i=0; i<start; i++) {
        const blank = document.createElement("div");
        blank.className = "gdp-empty";
        days.append(blank);
      }

      for (let d=1; d<=lastDay; d++) {
        const p = { y:viewYear, m:viewMonth, d, hh:selected.hh, mm:selected.mm };
        const b = document.createElement("button");
        b.type = "button";
        b.className = "gdp-day";
        b.textContent = String(d);
        if (selected.y === viewYear && selected.m === viewMonth && selected.d === d) b.classList.add("is-selected");
        if (today.y === viewYear && today.m === viewMonth && today.d === d) b.classList.add("is-today");
        if (!isAllowed(p)) b.disabled = true;
        b.addEventListener("click", () => {
          selected.y = viewYear;
          selected.m = viewMonth;
          selected.d = d;
          render();
        });
        days.append(b);
      }
    };

    overlay.querySelectorAll(".gdp-nav").forEach((b) => {
      b.addEventListener("click", () => {
        const dir = Number(b.dataset.dir || 0);
        viewMonth += dir;
        if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
        if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
        render();
      });
    });

    const close = () => overlay.remove();
    overlay.querySelector(".gdp-close").addEventListener("click", close);
    overlay.querySelector(".gdp-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector(".gdp-ok").addEventListener("click", () => {
      if (hour) selected.hh = Number(hour.value);
      if (minute) selected.mm = Number(minute.value);

      const value = formatNative(type, selected);
      if (min && compareNative(type, value, min) < 0) {
        alert("現在以降の日時を選択してください。");
        return;
      }
      if (max && compareNative(type, value, max) > 0) {
        alert("選択できる範囲を超えています。");
        return;
      }

      native.value = value;
      display.value = formatDisplay(type, selected);
      display.setCustomValidity("");
      native.dispatchEvent(new Event("input", { bubbles:true }));
      native.dispatchEvent(new Event("change", { bubbles:true }));
      close();
    });

    render();
  }

  function bind() {
    installStyle();
    document.addEventListener("click", (e) => {
      const button = e.target.closest?.("#owner-dialog .green-clean-date-button");
      if (!button) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const wrapper = button.closest(".green-clean-date-wrap");
      if (wrapper) openPicker(wrapper);
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once:true });
  } else {
    bind();
  }
})();