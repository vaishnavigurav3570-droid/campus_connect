import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  // --- ADD THIS BLOCK TO FIX THE 404 ERROR ---
  server: {
    host: true,       // Listen on all addresses (0.0.0.0)
    strictPort: true, // Ensure it stays on port 5173
    allowedHosts: ['.devtunnels.ms'] // Explicitly allow the dev tunnel domain
  },
})