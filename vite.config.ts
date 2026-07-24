import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@babylonjs/havok"] },
  build: { target: "es2023" },
});
