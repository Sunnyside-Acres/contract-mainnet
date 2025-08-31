'use client'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { WalletProvider } from '@/context/WalletContext'
import { ToastContainer } from 'react-toastify'
import { ClientOnly } from '@/components/ClientOnly'

const inter = Inter({ subsets: ['latin'] })

// Metadata được xử lý trong file riêng hoặc trong server component
// export const metadata: Metadata = {
//   title: 'Sunnyside Acres - Contract Explorer',
//   description: 'Smart contract explorer and management for Sunnyside Acres game',
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <title>Sunnyside Acres - Contract Explorer</title>
        <meta name="description" content="Smart contract explorer and management for Sunnyside Acres game" />
      </head>
      <body className={inter.className}>
        <ClientOnly>
          <Providers>
            <WalletProvider>
              <SidebarProvider>
                <div className="flex h-screen w-full">
                  <AppSidebar />
                  <main className="flex-1 overflow-auto w-full">
                    {children}
                  </main>
                </div>
              </SidebarProvider>
            </WalletProvider>
            <ToastContainer />
          </Providers>
        </ClientOnly>
      </body>
    </html>
  )
}