import { useCallback, useState } from "react";
import { Volume2, VolumeX, Radio, Download, Trash2, Gauge, ScanLine, QrCode } from "lucide-react";
import { useScanStore } from "../hooks/useScanStore.js";
import { useCameraScanner } from "../hooks/useCameraScanner.js";
import { useKeyboardWedge } from "../hooks/useKeyboardWedge.js";
import { playBeep, vibrate } from "../lib/beep.js";
import { scansToCSV, downloadTextFile } from "../lib/csv.js";
import { DEFAULT_FORMATS, QR_ONLY_FORMATS, resolveQrOnlyDetector } from "../lib/barcodeDetector.js";
import CameraPanel from "./CameraPanel.jsx";
import ScanTable from "./ScanTable.jsx";
import ManualEntry from "./ManualEntry.jsx";

// QR modunda tüm kareyi değil, ortadaki bu bölgeyi analiz ediyoruz - hem
// gereksiz kenar alanını eleyip biraz hız kazandırıyor hem de kullanıcının
// kodu tam ortalamasını gerektirmeyecek kadar geniş bir pay bırakıyor.
// Artık agresif bir küçültme uygulanmıyor (bkz. useCameraScanner.js:
// getDetectSource) - o yüzden bölgeyi dar tutmanın eskisi kadar hız
// kazancı yok, güvenlik payını genişletmek daha değerli.
const QR_CROP_REGION = { widthPct: 0.8, heightPct: 0.8 };

export default function ScannerView({ onSendToEntry }) {
  const { scans, addScan, removeScan, clearAll, totalCount } = useScanStore();
  const [cameraOn, setCameraOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [wedgeOn, setWedgeOn] = useState(true);
  const [slowDevice, setSlowDevice] = useState(false);
  // "barkod" (varsayılan, dokunulmadı) vs "qr" - QR modu her zaman WASM
  // motorunu zorluyor, bkz. lib/barcodeDetector.js:resolveQrOnlyDetector.
  const [scanMode, setScanMode] = useState("barkod");
  // Kamera üstündeki yeşil flaş + "✓ kod" bandını tetikler - bkz.
  // CameraPanel.jsx. Asla null'a dönmüyor; her yeni tarama zamandamgasını
  // (key olarak kullanılıyor) güncelleyip CSS animasyonunu yeniden
  // başlatıyor, animasyon kendi kendine söner (animation-fill-mode).
  const [lastHit, setLastHit] = useState(null);

  const feedback = useCallback(
    (outcome) => {
      if (soundOn) playBeep(outcome);
      vibrate(outcome === "duplicate" ? [30, 40, 30] : 60);
    },
    [soundOn]
  );

  const handleCameraDetect = useCallback(
    (code, format) => {
      const outcome = addScan(code, { format, source: "camera" });
      if (outcome) feedback(outcome);
      setLastHit({ code, ts: Date.now() });
    },
    [addScan, feedback]
  );

  const handleWedgeScan = useCallback(
    (code) => {
      const outcome = addScan(code, { source: "gadget" });
      if (outcome) feedback(outcome);
    },
    [addScan, feedback]
  );

  const handleManualAdd = useCallback(
    (code) => {
      const outcome = addScan(code, { source: "manual" });
      if (outcome) feedback(outcome);
    },
    [addScan, feedback]
  );

  const camera = useCameraScanner({
    enabled: cameraOn,
    formats: scanMode === "qr" ? QR_ONLY_FORMATS : DEFAULT_FORMATS,
    resolveDetector: scanMode === "qr" ? resolveQrOnlyDetector : undefined,
    cropRegion: scanMode === "qr" ? QR_CROP_REGION : null,
    onDetect: handleCameraDetect,
  });
  useKeyboardWedge({ enabled: wedgeOn, slowDevice, onScan: handleWedgeScan });

  const handleExport = () => {
    if (scans.length === 0) return;
    downloadTextFile(`barkod-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`, scansToCSV(scans));
  };

  return (
    <>
      <div className="detector-row">
        <div className="scan-mode-toggle">
          <button
            type="button"
            className={`scan-mode-btn ${scanMode === "barkod" ? "active" : ""}`}
            onClick={() => setScanMode("barkod")}
          >
            <ScanLine size={14} /> Barkod
          </button>
          <button
            type="button"
            className={`scan-mode-btn ${scanMode === "qr" ? "active" : ""}`}
            onClick={() => setScanMode("qr")}
          >
            <QrCode size={14} /> QR
          </button>
        </div>
        <span
          className="detector-badge"
          title={
            scanMode === "qr"
              ? "QR modu her zaman hafif, hızlı yazılımsal (jsQR) dedektörü kullanır"
              : camera.usingNative == null
                ? "Dedektör hazırlanıyor…"
                : camera.usingNative
                  ? "Tarayıcının yerleşik dedektörü tüm formatları destekliyor, o kullanılıyor (en hızlı)"
                  : "Yerleşik dedektör tüm formatları desteklemiyor (veya yok) - güvenilir olan yazılımsal (WASM) dedektöre geçildi"
          }
        >
          {scanMode === "qr"
            ? "Hızlı QR dedektörü"
            : camera.usingNative == null
              ? "Dedektör hazırlanıyor…"
              : camera.usingNative
                ? "Yerleşik dedektör"
                : "WASM dedektör"}
        </span>
      </div>

      <CameraPanel
        camera={camera}
        cameraOn={cameraOn}
        onToggleCamera={() => setCameraOn((v) => !v)}
        scanMode={scanMode}
        lastHit={lastHit}
      />

      <ManualEntry onAdd={handleManualAdd} />

      <div className="toolbar">
        <div className="toolbar-group">
          <button
            className={`icon-btn labeled ${wedgeOn ? "active" : ""}`}
            onClick={() => setWedgeOn((v) => !v)}
            title="El terminali (klavye emülasyonlu) dinleme"
          >
            <Radio size={16} />
            El Terminali {wedgeOn ? "Açık" : "Kapalı"}
          </button>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={slowDevice}
              onChange={(e) => setSlowDevice(e.target.checked)}
              disabled={!wedgeOn}
            />
            Yavaş cihaz
          </label>
        </div>
        <div className="toolbar-group">
          <button className="icon-btn" onClick={() => setSoundOn((v) => !v)} title="Sesli uyarı">
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <span className="total-badge">
            <Gauge size={14} />
            {scans.length} kod / {totalCount} adet
          </span>
          <button className="icon-btn" onClick={handleExport} disabled={scans.length === 0} title="CSV indir">
            <Download size={16} />
          </button>
          <button className="icon-btn danger" onClick={clearAll} disabled={scans.length === 0} title="Tümünü sil">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <ScanTable scans={scans} onRemove={removeScan} onSendToEntry={onSendToEntry} />
    </>
  );
}
