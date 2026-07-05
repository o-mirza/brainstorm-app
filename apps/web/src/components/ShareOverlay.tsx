import { X } from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import ReactCanvasConfetti from "react-canvas-confetti";
import type {
  TCanvasConfettiAnimationOptions,
  TCanvasConfettiInstance,
} from "react-canvas-confetti/dist/types";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { easeOverlay, shareOverlayBackdropVariants, shareOverlayPanelVariants } from "../lib/animations";
import CopyLinkButton from "./CopyLinkButton";

const QR_CONFETTI_OPTIONS: TCanvasConfettiAnimationOptions = {
  particleCount: 500,
  angle: 90,
  spread: 360,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  drift: 0,
  ticks: 600,
  origin: {
    x: 0.5,
    y: 0.5,
  },
  colors: ["#26ccff", "#a25afd", "#ff5e7e", "#88ff5a", "#fcff42", "#ffa62d", "#ff36ff"],
  shapes: ["circle", "square"],
  scalar: 1,
  disableForReducedMotion: true,
};

export default function ShareOverlay({ roomUrl, onClose }: { roomUrl: string; onClose: () => void }) {
  const [confettiApi, setConfettiApi] = useState<TCanvasConfettiInstance | null>(null);
  const confettiShot = useRef(false);
  const { theme } = useTheme();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!confettiApi || confettiShot.current) return;

    const timeoutId = window.setTimeout(() => {
      if (confettiShot.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      confettiShot.current = true;
      void confettiApi(QR_CONFETTI_OPTIONS);
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [confettiApi]);

  return (
    <motion.div
      className="share-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Jump in"
      variants={shareOverlayBackdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseDown={onClose}
    >
      <ReactCanvasConfetti
        className="share-overlay-confetti"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
        globalOptions={{ resize: true, disableForReducedMotion: true }}
        onInit={({ confetti }) => setConfettiApi(() => confetti)}
      />
      <button className="icon-button overlay-close" type="button" onClick={onClose} aria-label="Close share view">
        <X size={22} />
      </button>
      <motion.div
        className="share-overlay-panel"
        variants={shareOverlayPanelVariants}
        transition={{ duration: 0.2, ease: easeOverlay }}
      >
        <h1>Jump in</h1>
        <div className="large-qr-stage">
          <motion.div
            className="large-qr"
            layoutId="share-room-qr"
            transition={{ layout: { duration: 0.2, ease: easeOverlay } }}
            onClick={onClose}
          >
            <QRCodeSVG
              value={roomUrl}
              size={340}
              bgColor={theme === "dark" ? "#13151a" : "#ffffff"}
              fgColor={theme === "dark" ? "#ffffff" : "#000000"}
            />
          </motion.div>
        </div>
        <div className="large-link-box" onMouseDown={(event) => event.stopPropagation()}>
          <span>{roomUrl}</span>
          <CopyLinkButton value={roomUrl} />
        </div>
      </motion.div>
    </motion.div>
  );
}
