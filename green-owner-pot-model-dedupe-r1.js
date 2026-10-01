(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-POT-MODEL-DEDUPE-R1.0-20261001";
  if (window.__DPRO_GREEN_OWNER_POT_MODEL_DEDUPE_R1__) return;
  window.__DPRO_GREEN_OWNER_POT_MODEL_DEDUPE_R1__ = VERSION;

  function dedupePotModelField() {
    const kicker = document.querySelector("#dialog-kicker")?.textContent?.trim() || "";
    if (kicker !== "PLANT ASSET") return;

    const form = document.querySelector("#owner-dialog #asset-form");
    if (!form) return;

    const selects = Array.from(form.querySelectorAll('select[name="containerModelId"]'));
    if (selects.length <= 1) return;

    const keep = selects[0];
    const keepLabel = keep.closest("label");

    for (const select of selects.slice(1)) {
      const wrapper = select.closest("label") || select.parentElement;
      if (wrapper && wrapper !== keepLabel) wrapper.remove();
      else select.remove();
    }

    // Prevent the legacy async enhancer from inserting another duplicate.
    form.dataset.greenIntegratedPotReady = "1";
  }

  function run() {
    queueMicrotask(dedupePotModelField);
    setTimeout(dedupePotModelField, 50);
    setTimeout(dedupePotModelField, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  new MutationObserver(run).observe(document.body, {
    childList: true,
    subtree: true
  });
})();