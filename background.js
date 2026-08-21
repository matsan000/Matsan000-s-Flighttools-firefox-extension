const SIMPRINTER_URL = "http://127.0.0.1:39901/print-text";
const SIMCALLOUTS_URL = "http://127.0.0.1:39902/import-text";

browser.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "simbrief-send") return;

  const toSimCallouts = message.destination === "simcallouts";
  const url = toSimCallouts ? SIMCALLOUTS_URL : SIMPRINTER_URL;
  const appName = toSimCallouts ? "SimCallouts" : "SimPrinter";
  const settingHint = toSimCallouts
    ? '"Auto-fill V1/Rotate from SimBrief performance calculations" enabled in Settings'
    : '"Allow the SimPrinter browser extension to print" enabled in Settings';

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: message.text,
  })
    .then((res) => {
      if (res.ok) return { ok: true };
      return { ok: false, error: `${appName} returned HTTP ${res.status}` };
    })
    .catch(() => ({
      ok: false,
      error: `Could not reach ${appName} - make sure it's running with ${settingHint}.`,
    }));
});
