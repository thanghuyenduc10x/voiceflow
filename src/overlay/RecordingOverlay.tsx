import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MicrophoneIcon,
  TranscriptionIcon,
  CancelIcon,
} from "../components/icons";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const overlayWindow = getCurrentWindow();

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(16).fill(0));
  const smoothedLevelsRef = useRef<number[]>(Array(16).fill(0));
  const direction = getLanguageDirection(i18n.language);

  useEffect(() => {
    const setupEventListeners = async () => {
      // Listen for show-overlay event from Rust
      const unlistenShow = await listen("show-overlay", async (event) => {
        // Sync language from settings each time overlay is shown
        await syncLanguageFromSettings();
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
      });

      // Listen for hide-overlay event from Rust
      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
      });

      // Listen for mic-level updates
      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];

        // Apply smoothing to reduce jitter
        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          return prev * 0.7 + target * 0.3; // Smooth transition
        });

        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed.slice(0, 9));
      });

      // Cleanup function
      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
      };
    };

    setupEventListeners();
  }, []);

  const getIcon = () => {
    if (state === "recording") {
      return <MicrophoneIcon />;
    } else {
      return <TranscriptionIcon />;
    }
  };

  // --- Drag-to-move the recording bar ---------------------------------------
  // Manual pointer dragging: we control start/move/end precisely and only
  // persist the new position when the bar actually moved (so a plain click on
  // the bar never overwrites the saved spot, and programmatic re-positioning
  // when the overlay re-appears never triggers a save).
  const dragRef = useRef<{
    startScreenX: number;
    startScreenY: number;
    startWinX: number;
    startWinY: number;
    lastX: number;
    lastY: number;
    moved: boolean;
    raf: number | null;
  } | null>(null);

  const applyMove = () => {
    const s = dragRef.current;
    if (!s) return;
    s.raf = null;
    overlayWindow.setPosition(new LogicalPosition(s.lastX, s.lastY));
  };

  const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".cancel-button")) return;
    if (e.button !== 0) return;
    // Read synchronously before any await (React pools the event object).
    const sx = e.screenX;
    const sy = e.screenY;
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    try {
      const phys = await overlayWindow.outerPosition();
      const scale = await overlayWindow.scaleFactor();
      dragRef.current = {
        startScreenX: sx,
        startScreenY: sy,
        startWinX: phys.x / scale,
        startWinY: phys.y / scale,
        lastX: phys.x / scale,
        lastY: phys.y / scale,
        moved: false,
        raf: null,
      };
      target.setPointerCapture(pointerId);
    } catch (err) {
      console.error("Failed to start overlay drag:", err);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s) return;
    const dx = e.screenX - s.startScreenX;
    const dy = e.screenY - s.startScreenY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) s.moved = true;
    s.lastX = s.startWinX + dx;
    s.lastY = s.startWinY + dy;
    if (s.raf == null) s.raf = requestAnimationFrame(applyMove);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s) return;
    if (s.raf != null) cancelAnimationFrame(s.raf);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (s.moved) {
      overlayWindow.setPosition(new LogicalPosition(s.lastX, s.lastY));
      commands.setOverlayCustomPosition(s.lastX, s.lastY);
    }
    dragRef.current = null;
  };

  return (
    <div
      dir={direction}
      className={`recording-overlay ${isVisible ? "fade-in" : ""}`}
      style={{ cursor: "grab", userSelect: "none", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="overlay-left">{getIcon()}</div>

      <div className="overlay-middle">
        {state === "recording" && (
          <div className="bars-container">
            {levels.map((v, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  height: `${Math.min(20, 4 + Math.pow(v, 0.7) * 16)}px`, // Cap at 20px max height
                  transition: "height 60ms ease-out, opacity 120ms ease-out",
                  opacity: Math.max(0.2, v * 1.7), // Minimum opacity for visibility
                }}
              />
            ))}
          </div>
        )}
        {state === "transcribing" && (
          <div className="transcribing-text">{t("overlay.transcribing")}</div>
        )}
        {state === "processing" && (
          <div className="transcribing-text">{t("overlay.processing")}</div>
        )}
      </div>

      <div className="overlay-right">
        {state === "recording" && (
          <div
            className="cancel-button"
            onClick={() => {
              commands.cancelOperation();
            }}
          >
            <CancelIcon />
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingOverlay;
