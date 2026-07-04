import { MotionConfig } from "motion/react";
import { Outlet } from "react-router-dom";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./hooks/useTheme";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
