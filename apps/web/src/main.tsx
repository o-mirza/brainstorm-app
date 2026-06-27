import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import HomeRedirect from "./routes/HomeRedirect";
import NotFoundPage from "./routes/NotFoundPage";
import RoomPage from "./routes/RoomPage";
import "./styles.css";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: "/", element: <HomeRedirect /> },
      { path: "/r/:roomSlug", element: <RoomPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
