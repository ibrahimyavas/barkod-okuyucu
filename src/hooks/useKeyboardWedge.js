import { useEffect, useRef } from "react";

// Handheld "keyboard wedge" scanners (USB or Bluetooth HID) work by typing
// out the decoded barcode as if on a keyboard, then sending Enter/Tab. They
// do this at electronic speed - single-digit milliseconds between
// characters - while even a fast human typist rarely sustains much under
// ~100ms/key. We use that timing gap to tell scanner input apart from
// someone typing normally, without needing a special driver, and without
// requiring any particular element to be focused.
const DEFAULT_MAX_GAP_MS = 80;
const SLOW_DEVICE_MAX_GAP_MS = 250; // some Bluetooth scanners pace themselves - see "Yavaş cihaz" toggle
const MIN_CODE_LENGTH = 3;

export function useKeyboardWedge({ enabled, slowDevice = false, onScan }) {
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    const maxGap = slowDevice ? SLOW_DEVICE_MAX_GAP_MS : DEFAULT_MAX_GAP_MS;

    function handleKeyDown(e) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      const gap = now - lastKeyAtRef.current;
      lastKeyAtRef.current = now;

      if (e.key === "Enter" || e.key === "Tab") {
        const code = bufferRef.current;
        bufferRef.current = "";
        // Every character already in the buffer arrived within maxGap of its
        // neighbor (see below), so checking the final gap is enough to know
        // the whole run - including this terminator - was typed at scanner
        // speed rather than human speed.
        if (code.length >= MIN_CODE_LENGTH && gap <= maxGap) {
          e.preventDefault();
          onScanRef.current?.(code);
        }
        return;
      }

      if (e.key.length !== 1) return; // ignore Shift, Backspace, arrows, F-keys, etc.

      if (gap > maxGap) bufferRef.current = ""; // too slow to be the scanner - start a fresh run
      bufferRef.current += e.key;
    }

    // Capture phase so we see the keystrokes before any focused input does,
    // but we only preventDefault when we're confident it's a scan.
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, slowDevice]);
}
