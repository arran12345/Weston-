"use client";

import { useEffect } from "react";

/**
 * Registers the network-only service worker (see public/sw.js) so Chrome
 * offers the install prompt. Renders nothing.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Registration failing is not worth surfacing — it only costs the
    // install prompt, and the app works identically without it.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
