import { useCallback, useState } from "react";
import { Volume2, VolumeX, Radio, Download, Trash2, Gauge } from "lucide-react";
import { useScanStore } from "../hooks/useScanStore.js";
import { useCameraScanner } from "../hooks/useCameraScanner.js";
import { useKeyboardWedge } from "../hooks/useKeyboardWedge.js";
import { playBeep, vibrate } from "../lib/beep.js";
import { scansToCSV, downloadTextFile } from "../lib/csv.js";
import CameraPanel from "./CameraPanel.jsx";
import ScanTable from "./ScanTable.jsx";
import ManualEntry from "./ManualEntry.jsx";

export default function ScannerView({ onSendToEntry }) {
  const { scans, addScan, removeScan, clearAll, totalCount } = useScanStore();
  const [cameraOn, setCameraOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [wedgeOn, setWedgeOn] = useState(true);
  const [slowDevice, setSlowDevice] = useState(false);

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

  const camera = useCameraScanner({ enabled: cameraOn, onDetect: handleCameraDetect });
  useKeyboardWedge({ enabled: wedgeOn, slowDevice, onScan: handleWedgeScan });

  const handleExport = () => {
    if (scans.length === 0) return;
    downloadTextFile(`barkod-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`, scansToCSV(scans));
  };

  return (
    <>
      <div className="detector-row">
        <span
          className="detector-badge"
          title={
            camera.usingNative == null
              ? "Dedektör hazırlanıyor…"
              : camera.usingNative
                ? "Tarayıcının yerleşik dedektörü tüm formatları destekliyor, o kullanılıyor (en hızlı)"
                : "Yerleşik dedektör tüm formatları desteklemiyor (veya yok) - güvenilir olan yazılımsal (WASM) dedektöre geçildi"
          }
        >
          {camera.usingNative == null ? "Dedektör hazırlanıyor…" : camera.usingNative ? "Yerleşik dedektör" : "WASM dedektör"}
        </span>
      </div>

      <CameraPanel camera={camera} cameraOn={cameraOn} onToggleCamera={() => setCameraOn((v) => !v)} />

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
