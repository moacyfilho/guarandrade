import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
    title: "Guarandrade - Sistema de Gestão",
    description: "Sistema de gestão completo para restaurante Guarandrade",
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
