const NATIVE_HOST = "co.anysphere.sand.webauthn_proxy";

const inFlight = new Set();

function log(...args) {
  console.log("[sand-webauthn-proxy]", ...args);
}

// Chrome MV3 reinitializes the service worker when an event is dispatched and a listener registered asynchronously misses that event, so every listener here registers synchronously at top level: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#register-listeners
chrome.webAuthenticationProxy.onRemoteSessionStateChange.addListener(() => {
  void attach();
});

chrome.runtime.onStartup.addListener(() => {
  void attach();
});
chrome.runtime.onInstalled.addListener(() => {
  void attach();
});

chrome.webAuthenticationProxy.onIsUvpaaRequest.addListener((request) => {
  chrome.webAuthenticationProxy.completeIsUvpaaRequest({
    requestId: request.requestId,
    isUvpaa: false,
  });
});

chrome.webAuthenticationProxy.onCreateRequest.addListener((request) => {
  void handleRequest("create", request);
});

chrome.webAuthenticationProxy.onGetRequest.addListener((request) => {
  void handleRequest("get", request);
});

chrome.webAuthenticationProxy.onRequestCanceled.addListener((requestId) => {
  // Chrome forbids completing a request once it has been canceled, so the id is dropped before a late native reply can report a result: https://developer.chrome.com/docs/extensions/reference/api/webAuthenticationProxy#event-onRequestCanceled
  if (inFlight.delete(requestId)) {
    log(`request ${requestId} canceled by the page`);
  }
});

async function attach() {
  try {
    const refusal = await chrome.webAuthenticationProxy.attach();
    if (refusal) {
      log("attach refused:", refusal);
      return;
    }
    log("attached — box WebAuthn now routes to the user's machine");
  } catch (error) {
    log("attach failed:", error?.message ?? error);
  }
}

// Secure Contexts treats a loopback host as potentially trustworthy, so tabCanSpeakFor accepts http only from those hosts: https://www.w3.org/TR/secure-contexts/#is-origin-trustworthy
const LOOPBACK_HOSTNAMES = new Set(["localhost", "[::1]"]); // pragma: allowlist secret

function isLoopbackHostname(hostname) {
  if (LOOPBACK_HOSTNAMES.has(hostname)) {
    return true;
  }
  const octets = hostname.split(".");
  return (
    octets.length === 4 &&
    Number(octets[0]) === 127 &&
    octets.every((octet) => /^\d+$/.test(octet) && Number(octet) <= 255)
  );
}

// WebAuthn lets a caller claim an rpId equal to its origin's effective domain or a registrable domain suffix of it, so accounts.google.com asserting for google.com is the ordinary shape: https://www.w3.org/TR/webauthn-3/#relying-party-identifier
function tabCanSpeakFor(url, rpId) {
  const secureContext =
    url.protocol === "https:" || (url.protocol === "http:" && isLoopbackHostname(url.hostname));
  return secureContext && (url.hostname === rpId || url.hostname.endsWith(`.${rpId}`));
}

async function originFromFocusedTab(rpId) {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (tab?.url) {
      const url = new URL(tab.url);
      if (tabCanSpeakFor(url, rpId)) {
        return url.origin;
      }
      log(`focused tab ${url.origin} cannot claim rpId ${rpId}`);
    }
  } catch (error) {
    log("tab lookup failed:", error?.message ?? error);
  }
  return undefined;
}

// Chrome hands a request to an active webAuthenticationProxy extension only after its own RP ID validation, refuses to proxy a request that already carries remoteDesktopClientOverride, and sets that field to the calling origin itself, so callerFromClientOverride reads the caller from it: https://chromium.googlesource.com/chromium/src/+/b24e51fe3854abd62fc77477f7f05fc48905a108/content/browser/webauth/authenticator_common_impl.cc
function callerFromClientOverride(options, rpId) {
  const override = options?.extensions?.remoteDesktopClientOverride;
  if (typeof override?.origin !== "string" || override.origin === "") {
    return undefined;
  }
  // A caller that is not same-origin with its ancestors gets crossOrigin:true and a topOrigin in its clientDataJSON, which this signer never emits, so a request with sameOriginWithAncestors false is refused: https://www.w3.org/TR/webauthn-3/#dictdef-collectedclientdata
  if (override.sameOriginWithAncestors === false) {
    return {
      refusal: `Grok Bot cannot sign for a security key request made inside an embedded frame (rpId ${rpId}).`,
    };
  }
  return { origin: override.origin };
}

async function resolveCaller(options, rpId) {
  const declared = callerFromClientOverride(options, rpId);
  if (declared !== undefined) {
    return declared;
  }
  const guessed = await originFromFocusedTab(rpId);
  if (guessed !== undefined) {
    return { origin: guessed };
  }
  return {
    refusal: `Grok Bot could not confirm which page requested the security key (rpId ${rpId}).`,
  };
}

async function assertCallerTabEligible(origin) {
  let tabs;
  let focusedWindow;
  try {
    [tabs, focusedWindow] = await Promise.all([
      chrome.tabs.query({}),
      chrome.windows.getLastFocused(),
    ]);
  } catch (error) {
    return {
      refusal: `Grok Bot could not inspect open tabs for the security key request (${error?.message ?? error}).`,
    };
  }
  if (!Array.isArray(tabs) || typeof focusedWindow?.id !== "number") {
    return {
      refusal: `Grok Bot could not inspect open tabs for the security key request.`,
    };
  }
  let sawMatching = false;
  for (const tab of tabs) {
    if (!tab?.url || tab.discarded) {
      continue;
    }
    let url;
    try {
      url = new URL(tab.url);
    } catch {
      continue;
    }
    if (url.origin !== origin) {
      continue;
    }
    sawMatching = true;
    if (tab.active === true && tab.windowId === focusedWindow.id) {
      return {};
    }
  }
  if (!sawMatching) {
    return {
      refusal: `Grok Bot ignored a security key request from ${origin} because no open tab matches that page.`,
    };
  }
  return {
    refusal: `Grok Bot ignored a security key request from ${origin} because that page is not the tab in front.`,
  };
}

async function complete(kind, requestId, credentialJson) {
  if (!inFlight.has(requestId)) {
    return;
  }
  const details = { requestId, responseJson: credentialJson };
  try {
    await (kind === "create"
      ? chrome.webAuthenticationProxy.completeCreateRequest(details)
      : chrome.webAuthenticationProxy.completeGetRequest(details));
  } catch (error) {
    log(`complete ${kind} rejected: ${error?.message ?? error}`);
    fail(
      kind,
      requestId,
      "NotAllowedError",
      "Grok Bot could not deliver the security key response to this page.",
    );
  }
}

function fail(kind, requestId, name, message) {
  log(`request ${requestId} failed: ${name}: ${message}`);
  if (!inFlight.has(requestId)) {
    return;
  }
  const details = { requestId, error: { name, message } };
  const settled =
    kind === "create"
      ? chrome.webAuthenticationProxy.completeCreateRequest(details)
      : chrome.webAuthenticationProxy.completeGetRequest(details);
  settled.catch((error) => log(`fail ${kind} rejected: ${error?.message ?? error}`));
}

async function handleRequest(kind, request) {
  const { requestId, requestDetailsJson } = request;
  inFlight.add(requestId);

  let options;
  try {
    options = JSON.parse(requestDetailsJson);
  } catch (error) {
    fail(kind, requestId, "DataError", `unparseable request options: ${error}`);
    inFlight.delete(requestId);
    return;
  }

  const declaredRpId = kind === "create" ? options?.rp?.id : options?.rpId;
  if (typeof declaredRpId !== "string" || declaredRpId === "") {
    fail(kind, requestId, "NotAllowedError", "request carried no rpId");
    inFlight.delete(requestId);
    return;
  }
  const rpId = declaredRpId.toLowerCase();

  const caller = await resolveCaller(options, rpId);
  if (caller.refusal !== undefined) {
    fail(kind, requestId, "NotAllowedError", caller.refusal);
    inFlight.delete(requestId);
    return;
  }
  const origin = caller.origin;
  log(`${kind} request ${requestId}: rpId=${rpId} origin=${origin}`);

  const eligibility = await assertCallerTabEligible(origin);
  if (eligibility.refusal !== undefined) {
    fail(kind, requestId, "NotAllowedError", eligibility.refusal);
    inFlight.delete(requestId);
    return;
  }

  try {
    const result = await chrome.runtime.sendNativeMessage(NATIVE_HOST, {
      kind,
      origin,
      optionsJson: requestDetailsJson,
    });
    if (result?.ok) {
      await complete(kind, requestId, result.credentialJson);
      log(`${kind} request ${requestId} completed`);
    } else {
      const error = result?.error ?? {
        name: "NotAllowedError",
        message: "the Grok Bot bridge returned no result",
      };
      fail(kind, requestId, error.name, error.message);
    }
  } catch (error) {
    fail(
      kind,
      requestId,
      "NotAllowedError",
      `Grok Bot bridge unavailable: ${error?.message ?? error}`,
    );
  } finally {
    inFlight.delete(requestId);
  }
}

void attach();
