import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import PWAInstaller from "@/components/PWAInstaller";

export const viewport: Viewport = {
    themeColor: '#6366f1',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export const metadata: Metadata = {
    title: "Guarandrade - Sistema de Gestão",
    description: "Sistema de gestão completo para restaurante Guarandrade",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Guarandrade",
        startupImage: "/icons/icon-512x512.png",
    },
    formatDetection: {
        telephone: false,
    },
    other: {
        "mobile-web-app-capable": "yes",
        "apple-mobile-web-app-capable": "yes",
    },
    icons: {
        icon: [
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
            { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning data-theme="dark">
            <body>
                <ThemeProvider>
                    <PWAInstaller />
                    <div style={{
                        height: '100vh',
                        width: '100vw',
                        background: 'var(--bg-page)',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'background 0.3s ease',
                    }}>
                        {/* Ambient light effects */}
                        <div style={{
                            position: 'absolute',
                            top: '-15%',
                            left: '-10%',
                            width: '35%',
                            height: '35%',
                            background: 'radial-gradient(circle, var(--ambient-1) 0%, transparent 70%)',
                            filter: 'blur(80px)',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                        }} />
                        <div style={{
                            position: 'absolute',
                            bottom: '-15%',
                            right: '-10%',
                            width: '35%',
                            height: '35%',
                            background: 'radial-gradient(circle, var(--ambient-2) 0%, transparent 70%)',
                            filter: 'blur(80px)',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                        }} />

                        <main style={{
                            position: 'relative',
                            zIndex: 10,
                            flex: 1,
                            overflow: 'hidden',
                        }}>
                            {children}
                        </main>
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}
