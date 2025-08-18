'use client'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { WalletProvider } from '@/context/WalletContext'
import { ToastContainer } from 'react-toastify'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
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
      </body>
    </html>
  )
}