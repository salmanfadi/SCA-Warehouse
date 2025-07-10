import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext.tsx'
import App from './App.tsx'
import { Toaster } from 'sonner'
// @ts-expect-error: virtual:pwa-register is a Vite virtual module and has no type declarations
import { registerSW } from 'virtual:pwa-register'

const queryClient = new QueryClient()

// Register the service worker for PWA updates (immediate for best UX)
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Toaster from sonner for toast notifications, works in production/PWA */}
    <Toaster richColors position="top-right" />
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
