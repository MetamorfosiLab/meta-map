import { resolve } from "pathe";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "MetaMap",
      fileName: "meta-map",
      // formats: ["cjs", "es", "iife", "umd"],
    },
  },
});
