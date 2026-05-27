import { Frame, Pause, Play, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function RecordingControl(): JSX.Element {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [frameVisible, setFrameVisible] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const cleanupPaused = window.broll.onRecordingPausedChanged(setPaused);
    const cleanupStarted = window.broll.onRecordingStarted(() => {
      setElapsedSeconds(0);
      setPaused(false);
      setFrameVisible(false);
      setActive(true);
    });
    const cleanupStopped = window.broll.onRecordingStopped(() => {
      setActive(false);
      setPaused(false);
      setFrameVisible(false);
      setElapsedSeconds(0);
    });

    return () => {
      cleanupPaused();
      cleanupStarted();
      cleanupStopped();
    };
  }, []);

  useEffect(() => {
    if (!active || paused) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [paused]);

  const elapsedLabel = useMemo(() => {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  return (
    <main className="recording-control">
      <strong>{paused ? "Pause" : elapsedLabel}</strong>
      <button
        className="small-control-button"
        type="button"
        onClick={() => {
          setPaused((current) => !current);
          void window.broll.requestPauseRecording();
        }}
      >
        {paused ? <Play size={16} /> : <Pause size={16} />}
        {paused ? "Weiter" : "Pause"}
      </button>
      <button
        className={`small-control-button ${frameVisible ? "is-active" : ""}`}
        type="button"
        onClick={() => {
          setFrameVisible((current) => !current);
          void window.broll.requestToggleRecordingFrame();
        }}
      >
        <Frame size={16} />
        Rahmen
      </button>
      <button type="button" onClick={() => window.broll.requestStopRecording()}>
        <Square size={18} />
        Stop
      </button>
    </main>
  );
}
