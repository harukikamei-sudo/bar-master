import { useEffect, useState, useCallback } from 'react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const duration = 2500;
    const interval = 20;
    const step = (interval / duration) * 100;
    let current = 0;

    const timer = setInterval(() => {
      current += step + Math.random() * 0.3;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        setReady(true);
      }
      setProgress(current);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const handleEnter = useCallback(() => {
    if (!ready || fadingOut) return;
    setFadingOut(true);
    setTimeout(() => onComplete?.(), 800);
  }, [ready, fadingOut, onComplete]);

  return (
    <div className={`loading-screen ${fadingOut ? 'loading-fade-out' : ''}`}>
      <div className="loading-content">
        <h1 className="loading-logo">BAR <span>MASTER</span></h1>
        {!ready ? (
          <div className="loading-bar-track">
            <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        ) : (
          <button className="enter-btn" onClick={handleEnter}>
            Enter
          </button>
        )}
      </div>
    </div>
  );
}
