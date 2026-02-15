'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstaller() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
        setIsIOS(isIOSDevice);

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);

                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });
                })
                .catch((error) => {
                    console.error('[PWA] Falha ao registrar Service Worker:', error);
                });
        }

        // Listen for install prompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Show banner after a small delay for better UX
            const dismissed = localStorage.getItem('pwa-banner-dismissed');
            const dismissedTime = dismissed ? parseInt(dismissed) : 0;
            const threeDays = 3 * 24 * 60 * 60 * 1000;

            if (!dismissed || Date.now() - dismissedTime > threeDays) {
                setTimeout(() => setShowBanner(true), 3000);
            }
        };

        // For iOS, show custom guide
        if (isIOSDevice) {
            const dismissed = localStorage.getItem('pwa-ios-dismissed');
            const dismissedTime = dismissed ? parseInt(dismissed) : 0;
            const sevenDays = 7 * 24 * 60 * 60 * 1000;

            if (!dismissed || Date.now() - dismissedTime > sevenDays) {
                setTimeout(() => setShowBanner(true), 3000);
            }
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
            console.log('[PWA] App instalado com sucesso!');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[PWA] Usuário aceitou a instalação');
        } else {
            console.log('[PWA] Usuário recusou a instalação');
        }

        setDeferredPrompt(null);
        setShowBanner(false);
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setShowBanner(false);
        localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
    }, []);

    const handleIOSDismiss = useCallback(() => {
        setShowIOSGuide(false);
        setShowBanner(false);
        localStorage.setItem('pwa-ios-dismissed', Date.now().toString());
    }, []);

    const handleUpdate = useCallback(() => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    }, []);

    if (isInstalled && !updateAvailable) return null;

    return (
        <>
            {/* Update Available Banner */}
            {updateAvailable && (
                <div style={{
                    position: 'fixed',
                    top: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10000,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)',
                    animation: 'slideDown 0.5s ease-out',
                    maxWidth: '90vw',
                }}>
                    <span style={{ fontSize: 20 }}>🔄</span>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Nova versão disponível!</span>
                    <button
                        onClick={handleUpdate}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white',
                            padding: '6px 14px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Atualizar
                    </button>
                </div>
            )}

            {/* Install Banner */}
            {showBanner && !isInstalled && (
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    animation: 'slideUp 0.5s ease-out',
                }}>
                    <div style={{
                        maxWidth: 480,
                        margin: '0 auto 16px',
                        padding: '0 16px',
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(15, 15, 30, 0.98), rgba(25, 25, 50, 0.98))',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: 20,
                            padding: 20,
                            boxShadow: '0 -4px 40px rgba(99, 102, 241, 0.15), 0 8px 32px rgba(0,0,0,0.4)',
                        }}>
                            {/* iOS Guide */}
                            {isIOS ? (
                                <>
                                    {showIOSGuide ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.8, marginBottom: 16 }}>
                                                <p style={{ marginBottom: 12 }}>
                                                    <strong style={{ color: '#e2e8f0' }}>Para instalar no iPhone/iPad:</strong>
                                                </p>
                                                <p>1️⃣ Toque no ícone <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: 'rgba(99,102,241,0.15)',
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    color: '#818cf8',
                                                    fontWeight: 600,
                                                }}>⬆️ Compartilhar</span></p>
                                                <p>2️⃣ Role e toque em <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: 'rgba(99,102,241,0.15)',
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    color: '#818cf8',
                                                    fontWeight: 600,
                                                }}>➕ Adicionar à Tela Início</span></p>
                                                <p>3️⃣ Toque em <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    background: 'rgba(99,102,241,0.15)',
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    color: '#818cf8',
                                                    fontWeight: 600,
                                                }}>Adicionar</span></p>
                                            </div>
                                            <button onClick={handleIOSDismiss} style={{
                                                background: 'rgba(99,102,241,0.15)',
                                                border: '1px solid rgba(99,102,241,0.3)',
                                                color: '#818cf8',
                                                padding: '10px 24px',
                                                borderRadius: 10,
                                                fontSize: 14,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}>
                                                Entendi!
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{
                                                width: 48,
                                                height: 48,
                                                borderRadius: 12,
                                                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 24,
                                                flexShrink: 0,
                                            }}>
                                                📱
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                                                    Instalar Guarandrade
                                                </p>
                                                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                                    Acesse como um app no seu dispositivo
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                                <button onClick={handleIOSDismiss} style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#64748b',
                                                    fontSize: 20,
                                                    cursor: 'pointer',
                                                    padding: 4,
                                                }}>
                                                    ✕
                                                </button>
                                                <button onClick={() => setShowIOSGuide(true)} style={{
                                                    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                                                    border: 'none',
                                                    color: 'white',
                                                    padding: '8px 18px',
                                                    borderRadius: 10,
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                                }}>
                                                    Como?
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Android / Desktop Install */
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 24,
                                        flexShrink: 0,
                                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                    }}>
                                        📲
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>
                                            Instalar Guarandrade
                                        </p>
                                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                                            Acesse rápido como um app no seu dispositivo
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <button onClick={handleDismiss} style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#64748b',
                                            fontSize: 20,
                                            cursor: 'pointer',
                                            padding: 4,
                                        }}>
                                            ✕
                                        </button>
                                        <button onClick={handleInstall} style={{
                                            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                                            border: 'none',
                                            color: 'white',
                                            padding: '8px 18px',
                                            borderRadius: 10,
                                            fontSize: 14,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                            transition: 'all 0.2s ease',
                                        }}>
                                            Instalar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>
        </>
    );
}
