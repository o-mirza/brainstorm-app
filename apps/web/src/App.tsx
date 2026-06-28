import { Outlet } from "react-router-dom";
import { ToastProvider } from "./components/ToastProvider";
import { ThemeProvider } from "./hooks/useTheme";

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </ThemeProvider>
  );
}
