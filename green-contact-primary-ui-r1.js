(() => {
  "use strict";
  const VERSION = "GREEN-CONTACT-PRIMARY-UI-R1.0-20261001";
  if (window.__GREEN_CONTACT_PRIMARY_UI_R1__) return;
  window.__GREEN_CONTACT_PRIMARY_UI_R1__ = VERSION;

  function ensureStyle() {
    if (document.getElementById("green-contact-primary-ui-r1-style")) return;
    const style = document.createElement("style");
    style.id = "green-contact-primary-ui-r1-style";
    style.textContent = `
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
    `;
    document.head.appendChild(style);
  }

  function enhance() {
    ensureStyle();
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

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; enhance(); });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once:true });
  } else schedule();
  new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
})();