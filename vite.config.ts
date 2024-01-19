import { resolve } from "pathe";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: resolve(__dirname, "/public") + "/[!.]*",
          dest: "./",
        },
      ],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "MetaMap",
      fileName: "meta-map",
      // formats: ["cjs", "es", "iife", "umd"],
    },
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@public": resolve(__dirname, "./public"),
    },
  },
});
