import { defineConfig } from "vite" //helper de config do Vite
import react from "@vitejs/plugin-react" //plugin React (JSX, Fast Refresh)
import tailwindcss from "@tailwindcss/vite" //plugin Tailwind CSS v4

// https://vite.dev/config/
export default defineConfig({ //exporta a config do bundler
  plugins: [react(), tailwindcss()], //React + Tailwind ativos
})
