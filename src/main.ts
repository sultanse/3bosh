import "./styles/main.css";
import { GameApp } from "./app/GameApp";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) {
  throw new Error("Missing #game-canvas");
}

const app = new GameApp({ canvas });
void app.start();
window.addEventListener("pagehide", () => app.dispose(), { once: true });
