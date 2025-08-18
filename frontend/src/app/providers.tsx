'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function Providers({ children, ...props }: { children: React.ReactNode }) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
