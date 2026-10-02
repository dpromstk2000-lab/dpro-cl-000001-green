(() => {
  "use strict";

  const VERSION = "GREEN-RETURN-LOCATION-FIX-R1.0-20261003";
  const HQ_VALUE = "headquarters";
  const HQ_LABEL = "本部";

  function ensureOption(select, value, label) {
    if (!select) return;
    let option = Array.from(select.options).find((item) => item.value === value);
    if (!option) {
      option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    } else if (option.textContent !== label) {
      option.textContent = label;
    }
  }

  function patchLocationSelects(root = document) {
    root.querySelectorAll?.('select[name="toLocationType"], select[name="nextLocationType"]').forEach((select) => {
      ensureOption(select, HQ_VALUE, HQ_LABEL);
    });
  }

  function patchCareDecisionForm(root = document) {
    const form = root.querySelector?.("#care-decision-form") || document.querySelector("#care-decision-form");
    if (!form) return;

    const decision = form.elements?.decision;
    const nextLocation = form.elements?.nextLocationType;
    if (!decision || !nextLocation) return;

    ensureOption(nextLocation, HQ_VALUE, HQ_LABEL);

    const syncReturnLocation = () => {
      if (decision.value === "return_supplier") nextLocation.value = "supplier";
      if (decision.value === "return_headquarters") nextLocation.value = HQ_VALUE;
    };

    if (decision.dataset.returnLocationFixBound !== VERSION) {
      decision.addEventListener("change", syncReturnLocation);
      decision.dataset.returnLocationFixBound = VERSION;
    }
    syncReturnLocation();
  }

  function replaceRawHeadquarters(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const targets = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue?.trim() === HQ_VALUE) targets.push(node);
    }
    targets.forEach((node) => { node.nodeValue = node.nodeValue.replace(HQ_VALUE, HQ_LABEL); });
  }

  function patch(root = document) {
    patchLocationSelects(root);
    patchCareDecisionForm(root);
    replaceRawHeadquarters(root);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) patch(node);
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim() === HQ_VALUE) {
          node.nodeValue = node.nodeValue.replace(HQ_VALUE, HQ_LABEL);
        }
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      patch(document);
      observer.observe(document.body, { childList: true, subtree: true });
    }, { once: true });
  } else {
    patch(document);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.DPRO_GREEN_RETURN_LOCATION_FIX_VERSION = VERSION;
})();
