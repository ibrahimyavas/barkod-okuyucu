import { useCallback, useEffect, useRef, useState } from "react";
import { BarcodeDetectorImpl, DEFAULT_FORMATS } from "../lib/barcodeDetector.js";

const REPEAT_COOLDOWN_MS = 1500; // ignore re-reads of the *same* code while it's still sitting in frame
const FALLBACK_INTERVAL_MS = 66; // ~15fps, used only when requestVideoFrameCallback is unavailable (e.g. Firefox)

/**
 * Drives a <video> camera preview plus a continuous barcode-detection loop.
 * Detection runs once per real video frame via `requestVideoFrameCallback`
 * (the tightest, lowest-latency hook available - falls back to a timer loop
 * where unsupported) and is guarded against overlap so a slow decode never
 * queues up a backlog of frames.
 */
export function useCameraScanner({ enabled, formats = DEFAULT_FORMATS, onDetect }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackRef = useRef(null);
  const detectorRef = useRef(null);
  const busyRef = useRef(false);
  const loopHandleRef = useRef(null);
  const usingRvfcRef = useRef(false);
  const lastAcceptedRef = useRef({ code: null, at: 0 });
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [devices, setDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  if (!detectorRef.current) {
    detectorRef.current = new BarcodeDetectorImpl({ formats });
  }

  const drawOverlay = useCallback((barcode) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !video.videoWidth) return;
    if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) {
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!barcode || !barcode.cornerPoints?.length) return;

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;
    const pts = barcode.cornerPoints;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = p.x * scaleX;
      const y = p.y * scaleY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(barcode.rawValue, pts[0].x * scaleX, Math.max(14, pts[0].y * scaleY - 8));
  }, []);

  // Held in a ref (rather than a plain useCallback) so `schedule` below can
  // always call the latest version without the two needing to reference each
  // other before either is defined.
  const tickRef = useRef(null);
  tickRef.current = async function tick() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || busyRef.current) {
      schedule();
      return;
    }
    busyRef.current = true;
    try {
      const results = await detectorRef.current.detect(video);
      const best = results[0] || null;
      drawOverlay(best);
      if (best) {
        const now = Date.now();
        const last = lastAcceptedRef.current;
        if (best.rawValue !== last.code || now - last.at > REPEAT_COOLDOWN_MS) {
          lastAcceptedRef.current = { code: best.rawValue, at: now };
          onDetectRef.current?.(best.rawValue, best.format);
        }
      }
    } catch {
      // Transient decode error (e.g. frame mid-transition) - just skip it.
    } finally {
      busyRef.current = false;
      schedule();
    }
  };

  function schedule() {
    const video = videoRef.current;
    if (!video) return;
    if (typeof video.requestVideoFrameCallback === "function") {
      usingRvfcRef.current = true;
      loopHandleRef.current = video.requestVideoFrameCallback(() => tickRef.current());
    } else {
      usingRvfcRef.current = false;
      loopHandleRef.current = setTimeout(() => tickRef.current(), FALLBACK_INTERVAL_MS);
    }
  }

  const stopLoop = useCallback(() => {
    const video = videoRef.current;
    if (loopHandleRef.current == null) return;
    if (usingRvfcRef.current && video?.cancelVideoFrameCallback) {
      video.cancelVideoFrameCallback(loopHandleRef.current);
    } else {
      clearTimeout(loopHandleRef.current);
    }
    loopHandleRef.current = null;
  }, []);

  const stopStream = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    setHasTorch(false);
    setTorchOn(false);
  }, [stopLoop]);

  useEffect(() => {
    if (!enabled) {
      stopStream();
      return;
    }
    let cancelled = false;
    setStarting(true);
    setError(null);

    const constraints = {
      video: activeDeviceId
        ? { deviceId: { exact: activeDeviceId } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track?.getCapabilities?.() || {};
        setHasTorch(Boolean(caps.torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Device labels are only populated once permission has been granted,
        // so we (re-)enumerate here rather than on mount.
        const list = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(list.filter((d) => d.kind === "videoinput"));

        setStarting(false);
        schedule();
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Kameraya erişilemedi.");
          setStarting(false);
        }
      });

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, activeDeviceId]);

  const toggleTorch = useCallback(async () => {
    const track = trackRef.current;
    if (!track || !hasTorch) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      // Torch toggle unsupported mid-stream on this device - ignore.
    }
  }, [hasTorch, torchOn]);

  return {
    videoRef,
    canvasRef,
    devices,
    activeDeviceId,
    setActiveDeviceId,
    hasTorch,
    torchOn,
    toggleTorch,
    error,
    starting,
  };
}
