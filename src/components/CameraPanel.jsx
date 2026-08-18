import { Camera, CameraOff, Zap, ZapOff, SwitchCamera } from "lucide-react";

export default function CameraPanel({ camera, cameraOn, onToggleCamera }) {
  const {
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
  } = camera;

  const cycleCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === activeDeviceId);
    const next = devices[(idx + 1) % devices.length];
    setActiveDeviceId(next.deviceId);
  };

  return (
    <div className="camera-panel">
      <div className="camera-frame">
        {cameraOn ? (
          <>
            <video ref={videoRef} playsInline muted className="camera-video" />
            <canvas ref={canvasRef} className="camera-overlay" />
            <div className="camera-reticle" aria-hidden="true" />
            {starting && <div className="camera-status">Kamera başlatılıyor…</div>}
            {error && <div className="camera-status camera-status-error">{error}</div>}
          </>
        ) : (
          <div className="camera-off">
            <CameraOff size={32} />
            <span>Kamera kapalı</span>
          </div>
        )}
      </div>
      <div className="camera-controls">
        <button className="icon-btn" onClick={onToggleCamera} aria-label="Kamerayı aç/kapat" title="Kamerayı aç/kapat">
          {cameraOn ? <CameraOff size={18} /> : <Camera size={18} />}
        </button>
        {cameraOn && hasTorch && (
          <button
            className={`icon-btn ${torchOn ? "active" : ""}`}
            onClick={toggleTorch}
            aria-label="Fener"
            title="Fener"
          >
            {torchOn ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
        )}
        {cameraOn && devices.length > 1 && (
          <button className="icon-btn" onClick={cycleCamera} aria-label="Kamera değiştir" title="Kamera değiştir">
            <SwitchCamera size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
