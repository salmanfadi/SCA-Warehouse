import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import path from "path";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";
import manifestJson from "./public/manifest.json";

// Type assertion for the manifest
const manifest = manifestJson as unknown as Partial<ManifestOptions>;

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true, // Listen on all network interfaces
    port: 5174, // Use the port that was available
  },
  plugins: [
    react(),
    // Added vite-plugin-pwa for PWA support. This enables offline capability, service worker, and manifest integration.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(__dirname, "src")
      }
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      'lucide-react',
      // Add other frequently used dependencies
    ]
  },
  build: {
    target: 'esnext', // Optimize for modern browsers
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    // rollupOptions: {
    //   output: {
    //     manualChunks: (id) => {
    //       // Split vendor libraries into separate chunks
    //       if (id.includes('node_modules')) {
    //         if (id.includes('react') || id.includes('react-dom')) {
    //           return 'react-vendor';
    //         }
    //         if (id.includes('@radix-ui') || id.includes('lucide-react')) {
    //           return 'ui-vendor';
    //         }
    //         if (id.includes('@tanstack/react-query')) {
    //           return 'query-vendor';
    //         }
    //         if (id.includes('@supabase')) {
    //           return 'supabase-vendor';
    //         }
    //         if (id.includes('recharts')) {
    //           return 'charts-vendor';
    //         }
    //         return 'vendor';
    //       }
    //       
    //       // Split pages into separate chunks
    //       if (id.includes('/pages/')) {
    //         if (id.includes('/admin/')) {
    //           return 'admin-pages';
    //         }
    //         if (id.includes('/salesOperator/')) {
    //           return 'sales-pages';
    //         }
    //         if (id.includes('/warehouseManager/')) {
    //           return 'warehouse-pages';
    //         }
    //         if (id.includes('/fieldOperator/')) {
    //           return 'field-pages';
    //         }
    //         return 'pages';
    //       }
    //     }
    //   }
    // }
  }
});
