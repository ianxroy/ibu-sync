import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Base path ensures assets are referenced with /ibu-sync/ prefix
  // This allows the app to work when served under hanteck.online/ibu-sync
  base: "/ibu-sync/",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-icons"],
          motion: ["framer-motion"],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
