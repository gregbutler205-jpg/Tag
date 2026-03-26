import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/plates': 'http://localhost:3001',
      '/daily': 'http://localhost:3001',
      '/groups': 'http://localhost:3001',
      '/leaderboard': 'http://localhost:3001',
      '/auth': 'http://localhost:3001',
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'iWonde Tag',
        short_name: 'iWonde Tag',
        description: 'Decode vanity plates. Compete. Collect.',
        theme_color: '#1e40af',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
