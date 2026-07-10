import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { preloadPalaceAssets } from "./data/preloadAssets";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/home-scene.css";
import "./styles/modules.css";
import "./styles/game-hud.css";

// 왕궁 로비/방 이미지를 앱 시작과 동시에 미리 불러와, 방을 이동할 때 흰 화면 없이
// 바로 전환되도록 합니다.
preloadPalaceAssets();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
