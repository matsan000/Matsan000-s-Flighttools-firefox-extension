(() => {
  const BUTTON_ID = "flighttools-acars-print-button";

  // The site's own populateDCDU()/clearDCDU() fully replace #screen's innerHTML every time a
  // message is opened or closed, so the button can't just be added once - it has to be
  // re-injected on every change.
  function handlePrintClick(link) {
    const messageEl = document.querySelector(".dcdu-screen .message");
    const headerEl = document.querySelector(".dcdu-screen .header");
    if (!messageEl) return;

    const time = headerEl?.querySelector(".time")?.textContent.trim() ?? "";
    const from = headerEl?.querySelector(".from")?.textContent.trim() ?? "";
    const text = `${time}  ${from}\n\n${messageEl.textContent.trim()}`;

    const original = link.textContent;
    link.textContent = "SENDING...";

    browser.runtime
      .sendMessage({ type: "flighttools-send", destination: "simprinter", text })
      .then((response) => {
        link.textContent = response && response.ok ? "SENT" : "FAILED";
        if (response && !response.ok) console.warn("ACARS print:", response.error);
      })
      .catch(() => {
        link.textContent = "FAILED";
      })
      .finally(() => {
        setTimeout(() => (link.textContent = original), 2500);
      });
  }

  // The header row (time / from-to / open / close) uses justify-content:space-between with
  // four children - the "open" span is already one of them but sits empty, so the print
  // button goes inside it instead of adding a fifth flex child that would shift the existing
  // spacing.
  function injectPrintButton() {
    const openSlot = document.querySelector(".dcdu-screen .header .open");
    if (!openSlot || openSlot.querySelector(`#${BUTTON_ID}`)) return;

    const btn = document.createElement("span");
    btn.id = BUTTON_ID;
    btn.textContent = "PRINT";
    btn.style.cssText = "cursor:pointer;text-decoration:underline;";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlePrintClick(btn);
    });

    openSlot.appendChild(btn);
  }

  new MutationObserver(injectPrintButton).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  injectPrintButton();
})();
