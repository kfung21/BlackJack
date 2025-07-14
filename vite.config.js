import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      
      // Include your icon
      includeAssets: ['black-jack-icon.png'],
      
      workbox: {
        // Basic offline-first configuration that works on Netlify
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        
        // Navigation fallback for SPA routing
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        
        // Simple runtime caching without complex functions
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ],
        
        // Offline-first settings
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      },
      
      manifest: {
        name: 'Blackjack Card Counter Pro',
        short_name: 'Blackjack Pro',
        description: 'Professional offline-first blackjack game with card counting',
        theme_color: '#1a5490',
        background_color: '#0f4c75',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/black-jack-icon.png',
            sizes: '348x505',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      
      devOptions: {
        enabled: false
      }
    })
  ],
  
  server: {
    host: true,
    port: 3000
  },
  
  build: {
    target: 'esnext'
  }
})