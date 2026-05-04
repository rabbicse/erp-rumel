'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/hooks/useAuth'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: 1 } },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster position="top-right" toastOptions={{
          style: { borderRadius: '10px', fontSize: '13px' },
          success: { iconTheme: { primary: '#7e22ce', secondary: '#fff' } },
        }} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
