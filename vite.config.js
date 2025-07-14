import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        // Offline-first strategy
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
        
        // Cache all navigation requests
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        
        // Aggressive caching for offline-first
        runtimeCaching: [
          // App Shell - Cache First (offline-first)
          {
            urlPattern: /^https:\/\/.*\.(?:js|css|html)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheKeyWillBeUsed: async ({ request }) => request.url
            }
          },
          
          // Images - Cache First
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 90 // 90 days
              }
            }
          },
          
          // Fonts - Cache First
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
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
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          
          // API calls - Network First with fallback
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          
          // Same origin navigation - Cache First
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'CacheFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          }
        ],
        
        // Precache important routes
        additionalManifestEntries: [
          { url: '/', revision: '1.0.0' },
          { url: '/profile', revision: '1.0.0' },
          { url: '/settings', revision: '1.0.0' },
          { url: '/stats', revision: '1.0.0' }
        ],
        
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      
      manifest: {
        name: 'Blackjack Card Counter Pro',
        short_name: 'Blackjack Pro',
        description: 'Professional offline-first blackjack game with advanced card counting features',
        theme_color: '#1a5490',
        background_color: '#0f4c75',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        
        // Enhanced for offline experience
        categories: ['games', 'entertainment', 'utilities'],
        
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        
        // Offline capability indicators
        prefer_related_applications: false,
        edge_side_panel: {
          preferred_width: 400
        }
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
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          utils: ['dexie'],
          game: ['./src/stores/gameStore.js', './src/stores/countingStore.js'],
          ui: ['./src/components/CardComponent.vue', './src/components/PlayerHand.vue']
        }
      }
    }
  }
})