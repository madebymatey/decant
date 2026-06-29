import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import framer from "vite-plugin-framer"
import mkcert from "vite-plugin-mkcert"

// Framer requires plugins to be served over HTTPS, hence mkcert. vite-plugin-framer
// wires up the framer.json manifest + packaging for `vite build`.
export default defineConfig({
  plugins: [react(), framer(), mkcert()],
  build: {
    target: "ES2022",
  },
})
