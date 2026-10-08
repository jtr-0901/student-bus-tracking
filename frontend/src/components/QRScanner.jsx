import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';

export default function QRScanner({ onScan, disabled = false }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);
  const scannerId = 'qr-reader-' + Math.random().toString(36).substring(2, 8);

  const startScanner = async () => {
    setError(null);
    setScanning(true);

    try {
      const html5Qr = new Html5Qrcode(scannerId);
      html5QrRef.current = html5Qr;

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error('No camera found on this device.');
      }

      const camera = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[0];

      await html5Qr.start(
        camera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          try {
            const data = JSON.parse(decodedText);
            if (data.studentId) {
              stopScanner();
              onScan(data);
            }
          } catch {
            toast.error('Invalid QR code format');
          }
        },
        () => { /* ignore scan errors */ }
      );
    } catch (err) {
      setError(err.message || 'Failed to start camera');
      setScanning(false);
      toast.error('Camera error: ' + (err.message || 'Unknown error'));
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch {}
      html5QrRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* Scanner viewport */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#0a0f1e',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--border)',
          overflow: 'hidden',
          minHeight: scanning ? 300 : 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'min-height 0.3s ease',
        }}
      >
        <div id={scannerId} style={{ width: '100%' }} />
        {!scanning && (
          <div style={{ position: 'absolute', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
            <span style={{ fontSize: '2rem' }}>📷</span>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Camera feed will appear here</p>
          </div>
        )}
        {scanning && (
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 250, height: 250,
            border: '2px solid var(--accent)',
            borderRadius: 12,
            pointerEvents: 'none',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          }}>
            {/* Corner decorations */}
            {['tl','tr','bl','br'].map(pos => (
              <div key={pos} style={{
                position: 'absolute',
                width: 24, height: 24,
                borderColor: '#f59e0b',
                borderStyle: 'solid',
                borderWidth: pos.includes('t') ? '3px 0 0' : '0 0 3px',
                ...(pos.includes('l') ? { borderLeftWidth: 3, left: -1 } : { borderRightWidth: 3, right: -1 }),
                ...(pos.includes('t') ? { top: -1 } : { bottom: -1 }),
              }} />
            ))}
            {/* Scan line */}
            <div style={{
              position: 'absolute',
              left: 0, right: 0,
              height: 2,
              background: 'var(--accent)',
              animation: 'scanLine 2s ease-in-out infinite',
              top: '50%',
            }} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>

      {error && (
        <div className="alert" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5', width: '100%', maxWidth: 360 }}>
          ⚠️ {error}
        </div>
      )}

      {!scanning ? (
        <button className="btn btn-primary btn-lg" onClick={startScanner} disabled={disabled}>
          📷 Start Scanning
        </button>
      ) : (
        <button className="btn btn-danger" onClick={stopScanner}>
          ⏹ Stop Scanner
        </button>
      )}
    </div>
  );
}
