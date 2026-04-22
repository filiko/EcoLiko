/**
 * Relay script running in ISOLATED world.
 * Receives postMessage events from the MAIN world interceptor
 * and forwards them to the background service worker via chrome.runtime.sendMessage.
 */

const ECOLIKO_MSG_TYPE = 'ECOLIKO_USAGE_EVENT';

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type !== ECOLIKO_MSG_TYPE) return;

  chrome.runtime.sendMessage({
    type: ECOLIKO_MSG_TYPE,
    payload: event.data.payload,
  });
});
