import type { Variants } from "motion/react";

export const easeStandard = [0.2, 0, 0.2, 1] as const;
export const easeOverlay = [0.16, 1, 0.3, 1] as const;

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.975 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.975 }
};

export const shareOverlayBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

export const shareOverlayPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

export const composerVariants: Variants = {
  hidden: { opacity: 0, y: "calc(100% + 18px)" },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: "calc(100% + 18px)" }
};

export const ideaItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, scale: 0.99, pointerEvents: "none" }
};

export const commentItemVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, scale: 0.99, pointerEvents: "none" }
};

export const toastVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 14 }
};
