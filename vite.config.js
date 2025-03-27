import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // This allows access from external URLs

    port: 5173, // or your preferred port
    strictPort: true,
    allowedHosts: [
      "localhost",
      "bb9b-2406-7400-3d-50db-197a-35a0-11ed-caf1.ngrok-free.app", // Allow any ngrok URL
    ],
    cors: {
      origin: ["http://localhost:5173/"], // Replace with the exact URL you'll provide
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  },
});
