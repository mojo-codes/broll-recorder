import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getFormatPreset } from "../../shared/presets";
import type { DisplayBounds, FrameRect, FormatPresetId, OverlayState } from "../../shared/types";

type DragMode = "move" | "nw" | "ne" | "sw" | "se";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  frame: FrameRect;
}

export function FrameOverlay({ mode = "edit" }: { mode?: "edit" | "guide" }): JSX.Element {
  const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
  const [frame, setFrame] = useState<FrameRect | null>(null);
  const dragState = useRef<DragState | null>(null);

  useEffect(() => {
    void window.broll.getOverlayState().then((state) => {
      setOverlayState(state);
      setFrame(state.frame);
    });

    const cleanup = window.broll.onOverlayStateChanged((state) => {
      setOverlayState(state);
      setFrame(state.frame);
    });

    const keyListener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void window.broll.hideOverlay();
      }
      if (event.key === "Enter") {
        void window.broll.hideOverlay();
      }
    };

    window.addEventListener("keydown", keyListener);
    return () => {
      cleanup();
      window.removeEventListener("keydown", keyListener);
    };
  }, []);

  useEffect(() => {
    if (frame) {
      void window.broll.updateFrame(frame);
    }
  }, [frame]);

  const format = useMemo(() => {
    return getFormatPreset(overlayState?.formatId ?? "vertical");
  }, [overlayState?.formatId]);

  if (!overlayState || !frame) {
    return <div className="overlay-root" />;
  }

  const localFrame = {
    x: frame.x - overlayState.displayBounds.x,
    y: frame.y - overlayState.displayBounds.y,
    width: frame.width,
    height: frame.height
  };

  const beginDrag = (dragMode: DragMode, event: React.PointerEvent) => {
    if (mode === "guide") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      mode: dragMode,
      startX: event.clientX,
      startY: event.clientY,
      frame
    };
  };

  const moveDrag = (event: React.PointerEvent) => {
    if (!dragState.current || !overlayState) {
      return;
    }

    const nextFrame = calculateFrame(
      dragState.current,
      event.clientX - dragState.current.startX,
      event.clientY - dragState.current.startY,
      overlayState.displayBounds,
      overlayState.formatId
    );
    setFrame(nextFrame);
  };

  const endDrag = () => {
    dragState.current = null;
  };

  const resetToPreset = async () => {
    if (!overlayState) {
      return;
    }

    const nextState = await window.broll.resetFrame(overlayState.formatId);
    setOverlayState(nextState);
    setFrame(nextState.frame);
  };

  return (
    <div className="overlay-root" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
      {mode === "edit" ? (
        <div className="overlay-toolbar">
          <button className="overlay-reset" type="button" onClick={resetToPreset}>
            <RotateCcw size={16} />
            Preset
          </button>
          <button className="overlay-done" type="button" onClick={() => window.broll.hideOverlay()}>
            <Check size={17} />
            Fertig
          </button>
          <button className="overlay-close" type="button" onClick={() => window.broll.hideOverlay()} aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
      ) : null}
      <div
        className={`capture-frame ${mode === "guide" ? "is-guide" : ""}`}
        onPointerDown={mode === "edit" ? (event) => beginDrag("move", event) : undefined}
        style={{
          left: localFrame.x,
          top: localFrame.y,
          width: localFrame.width,
          height: localFrame.height
        }}
      >
        {mode === "edit" ? (
          <button className="frame-move" type="button" onPointerDown={(event) => beginDrag("move", event)}>
            <span>{format.label}</span>
            <small>Rahmen {Math.round(frame.width)}x{Math.round(frame.height)}</small>
            <small>Video {format.technicalLabel}</small>
          </button>
        ) : null}
        {mode === "edit"
          ? (["nw", "ne", "sw", "se"] as DragMode[]).map((handleMode) => (
          <button
            key={handleMode}
            className={`resize-handle ${handleMode}`}
            type="button"
            aria-label={`Resize ${handleMode}`}
            onPointerDown={(event) => beginDrag(handleMode, event)}
          />
            ))
          : null}
      </div>
    </div>
  );
}

function calculateFrame(
  drag: DragState,
  deltaX: number,
  deltaY: number,
  displayBounds: DisplayBounds,
  formatId: FormatPresetId
): FrameRect {
  const aspect = getFormatPreset(formatId).width / getFormatPreset(formatId).height;

  if (drag.mode === "move") {
    return clampFrame(
      {
        ...drag.frame,
        x: Math.round(drag.frame.x + deltaX),
        y: Math.round(drag.frame.y + deltaY)
      },
      displayBounds
    );
  }

  const directionX = drag.mode.endsWith("e") ? 1 : -1;
  const directionY = drag.mode.startsWith("s") ? 1 : -1;
  const widthDelta = directionX * deltaX;
  const proposedWidth = Math.max(180, drag.frame.width + widthDelta);
  const proposedHeight = proposedWidth / aspect;
  const centerPinnedX = directionX > 0 ? drag.frame.x : drag.frame.x + drag.frame.width;
  const centerPinnedY = directionY > 0 ? drag.frame.y : drag.frame.y + drag.frame.height;
  const x = directionX > 0 ? drag.frame.x : centerPinnedX - proposedWidth;
  const y = directionY > 0 ? drag.frame.y : centerPinnedY - proposedHeight;

  return clampFrame(
    {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(proposedWidth),
      height: Math.round(proposedHeight),
      displayId: drag.frame.displayId
    },
    displayBounds
  );
}

function clampFrame(frame: FrameRect, displayBounds: DisplayBounds): FrameRect {
  const width = Math.min(frame.width, displayBounds.width - 24);
  const height = Math.min(frame.height, displayBounds.height - 24);
  const x = Math.min(
    Math.max(frame.x, displayBounds.x + 12),
    displayBounds.x + displayBounds.width - width - 12
  );
  const y = Math.min(
    Math.max(frame.y, displayBounds.y + 12),
    displayBounds.y + displayBounds.height - height - 12
  );

  return {
    ...frame,
    x,
    y,
    width,
    height
  };
}
