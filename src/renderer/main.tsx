import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installDevBrollApi } from "./devBrollApi";
import { FrameOverlay } from "./overlay/FrameOverlay";
import { RecordingControl } from "./RecordingControl";
import "./styles.css";

installDevBrollApi();

const root = createRoot(document.getElementById("root") as HTMLElement);
const route = window.location.hash.replace("#", "");
const isOverlayRoute = route === "overlay";
const isFrameRoute = isOverlayRoute || route === "recording-frame";

document.documentElement.classList.toggle("overlay-page", isFrameRoute);
document.body.classList.toggle("overlay-page", isFrameRoute);
document.documentElement.classList.toggle("recording-control-page", route === "recording-control");
document.body.classList.toggle("recording-control-page", route === "recording-control");

root.render(
  <React.StrictMode>
    {isFrameRoute ? (
      <FrameOverlay mode={route === "recording-frame" ? "guide" : "edit"} />
    ) : route === "recording-control" ? (
      <RecordingControl />
    ) : (
      <App />
    )}
  </React.StrictMode>
);
