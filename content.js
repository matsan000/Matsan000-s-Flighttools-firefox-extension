(() => {
  const WIDGET_ID = "simprinter-send-widget";
  const LINK_STYLE = "cursor:pointer;text-decoration:underline;";

  function handleSendClick(link, getText, destination) {
    const text = getText();
    const original = link.textContent;

    if (!text) {
      link.textContent = "Nothing to send";
      setTimeout(() => (link.textContent = original), 2000);
      return;
    }

    link.textContent = "Sending...";

    browser.runtime
      .sendMessage({ type: "simbrief-send", destination, text })
      .then((response) => {
        link.textContent = response && response.ok ? "Sent" : "Failed";
        if (response && !response.ok) console.warn("SimBrief send:", response.error);
      })
      .catch(() => {
        link.textContent = "Failed";
      })
      .finally(() => {
        setTimeout(() => (link.textContent = original), 2500);
      });
  }

  // Builds "Send to: SimPrinter / SimCallouts" - two independently clickable targets sharing
  // one getText() callback, so the same captured result can go to either app without
  // re-reading the page. Each link resets its own text after a click, independent of the
  // other, so clicking one doesn't clobber feedback from a click on the other moments earlier.
  function buildSendWidget(getText) {
    const container = document.createElement("span");
    container.id = WIDGET_ID;
    container.style.cssText = "margin-right:14px;";

    const label = document.createElement("span");
    label.textContent = "Send to: ";

    const simPrinterLink = document.createElement("span");
    simPrinterLink.textContent = "SimPrinter";
    simPrinterLink.style.cssText = LINK_STYLE;
    simPrinterLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSendClick(simPrinterLink, getText, "simprinter");
    });

    const separator = document.createElement("span");
    separator.textContent = " / ";

    const simCalloutsLink = document.createElement("span");
    simCalloutsLink.textContent = "SimCallouts";
    simCalloutsLink.style.cssText = LINK_STYLE;
    simCalloutsLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSendClick(simCalloutsLink, getText, "simcallouts");
    });

    container.append(label, simPrinterLink, separator, simCalloutsLink);
    return container;
  }

  // Case 1: the per-flight Takeoff/Landing Performance popup (flight briefing page).
  //
  // SimBrief's "tlr" (takeoff/landing reference) dialog is reused for both calculators and
  // may leave a stale, hidden copy in the DOM after switching between them - querying "the
  // first .tlr-output in the page" can silently find the wrong (invisible) one and skip
  // injecting into the one actually on screen. Every candidate is checked for visibility, and
  // the dialog/result element are captured in a closure so the click handler never has to
  // re-look-up by id later either. The panel's own "Copy" button also sits inside a
  // fixed-height, overflow:hidden container - anything appended after it there gets clipped
  // invisible, so the widget lives in the <h3> header row instead, which is never clipped.
  function injectPopupWidget() {
    document.querySelectorAll(".tlr-output").forEach((container) => {
      const dialog = container.closest(".ui-dialog");
      if (dialog && dialog.offsetParent === null) return; // stale hidden copy

      const h3 = container.querySelector("h3");
      if (!h3 || h3.querySelector(`#${WIDGET_ID}`)) return;

      const resultEl = container.querySelector("#message-tlr-result");
      if (!resultEl || !resultEl.textContent.trim()) return; // wait for a real calculation

      const infoLink = h3.querySelector("span.right");
      const widget = buildSendWidget(() => resultEl.textContent.trim());
      widget.className = "right";

      if (infoLink) h3.insertBefore(widget, infoLink);
      else h3.appendChild(widget);
    });
  }

  // Case 2: the standalone Performance & Tools page (dispatch.simbrief.com/tools).
  //
  // Its "Raw Output" view has its own independent header (with its own Formatted/Raw
  // toggle), completely separate from the Formatted view's header - the two are just shown
  // and hidden with jQuery slideUp/slideDown. Takeoff and Landing each get their own
  // .performance-results-raw container, so both are handled by the same loop.
  function injectToolsPageWidget() {
    document.querySelectorAll(".performance-results-raw").forEach((container) => {
      const h1 = container.querySelector("h1");
      if (!h1 || h1.querySelector(`#${WIDGET_ID}`)) return;

      const textEl = container.querySelector(".textbox");
      if (!textEl || !textEl.textContent.trim()) return;

      const widget = buildSendWidget(() => textEl.textContent.trim());
      h1.appendChild(widget);
    });
  }

  function tryInject() {
    injectPopupWidget();
    injectToolsPageWidget();
  }

  new MutationObserver(tryInject).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  tryInject();
})();
