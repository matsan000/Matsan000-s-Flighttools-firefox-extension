(() => {
  const BUTTON_ID = "flighttools-acars-print-button";

  // The site's own populateDCDU()/clearDCDU() fully replace #screen's innerHTML every time a
  // message is opened or closed, so the button can't just be added once - it has to be
  // re-injected on every change.
  function handlePrintClick(link) {
    try {
      const messageEl = document.querySelector(".dcdu-screen .message");
      const headerEl = document.querySelector(".dcdu-screen .header");
      if (!messageEl) {
        link.textContent = "NO MESSAGE FOUND";
        return;
      }

      const time = headerEl?.querySelector(".time")?.textContent.trim() ?? "";
      const from = headerEl?.querySelector(".from")?.textContent.trim() ?? "";
      const text = `${time}  ${from}\n\n${messageEl.textContent.trim()}`;

      const original = link.textContent;

      if (typeof browser === "undefined" || !browser.runtime || !browser.runtime.sendMessage) {
        link.textContent = "NO BROWSER API";
        return;
      }

      link.textContent = "SENDING...";

      browser.runtime
        .sendMessage({ type: "flighttools-send", destination: "simprinter", text })
        .then((response) => {
          link.textContent =
            response && response.ok
              ? "SENT"
              : `FAILED: ${(response && response.error) || "unknown"}`;
        })
        .catch((err) => {
          link.textContent = `SEND ERROR: ${err && err.message ? err.message : String(err)}`;
        })
        .finally(() => {
          // Longer than usual (was 2.5s) so an error message is actually readable, not just
          // a flash, since debugging THIS is the whole point of the longer text right now.
          setTimeout(() => (link.textContent = original), 4000);
        });
    } catch (err) {
      link.textContent = `ERROR: ${err && err.message ? err.message : String(err)}`;
    }
  }

  // Originally nested inside the header's empty ".open" flex slot, but that turned out
  // unclickable in real testing (cursor never changed on hover) - most likely a stacking
  // conflict with .closeIconMessage, which the site's own CSS gives z-index:5000. Anchored
  // with position:absolute + a much higher z-index instead, so it's guaranteed to paint (and
  // receive pointer events) above anything else in the header regardless of that.
  function injectPrintButton() {
    const header = document.querySelector(".dcdu-screen .header");
    if (!header || header.querySelector(`#${BUTTON_ID}`)) return;

    header.style.position = "relative";

    const btn = document.createElement("span");
    btn.id = BUTTON_ID;
    btn.textContent = "PRINT";
    btn.style.cssText = [
      "position:absolute",
      "top:0",
      "right:30px",
      "z-index:999999",
      "cursor:pointer",
      "text-decoration:underline",
      "background:#000",
      "color:#0f0",
      "padding:2px 5px",
      "border:1px solid #0f0",
    ].join(";");
    // Capturing-phase listener directly on the button itself: if some other script on the
    // page has a capturing listener on an ancestor that calls stopPropagation() on the way
    // down, a normal bubbling-phase listener here would never run at all. This still fires
    // at the target regardless of that.
    btn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          handlePrintClick(btn);
        } catch (err) {
          btn.textContent = `OUTER ERROR: ${err && err.message ? err.message : String(err)}`;
        }
      },
      { capture: true }
    );

    header.appendChild(btn);
  }

  new MutationObserver(injectPrintButton).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  injectPrintButton();
})();
