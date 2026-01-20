import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Guarandrade - Sistema de Gestão",
    description: "O sistema de gestão mais avançado para sua lanchonete.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body>
                <div className="min-h-screen bg-[#050505] relative overflow-hidden">
                    {/* Animated background blobs */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full" />

                    <main className="relative z-10">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
