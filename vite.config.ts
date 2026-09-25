import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const base = process.env.VITE_BASE_PATH || '/'

// The vendor prototype uses root-relative sample URLs, including dynamic templates.
// Rebase only these public resources when hosted under a GitHub Pages repository.
const publicAssetBase: Plugin = {
  name: 'prototype-public-asset-base',
  enforce: 'pre',
  transform(code, id) {
    if (base === '/' || !id.includes('/src/') || !/\.[jt]sx?(\?|$)/.test(id)) return
    return { code: code.replace(/(["'`])\/(samples\/|masters\/|logo\.png)/g, (_match, quote, asset) => quote + base + asset), map: null }
  },
}

export default defineConfig({
  base,
  plugins: [publicAssetBase, inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
