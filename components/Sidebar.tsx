"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

export default function Sidebar() {
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    const menuItems = [
        { name: 'Dashboard', path: '/', icon: '📊' },
        { name: 'PDV', path: '/pdv', icon: '🛒' },
        { name: 'Mesas', path: '/mesas', icon: '🍽️' },
        { name: 'Cozinha', path: '/cozinha', icon: '🍳' },
        { name: 'Cardápio', path: '/cardapio', icon: '📜' },
        { name: 'Estoque', path: '/estoque', icon: '📦' },
        { name: 'Financeiro', path: '/financeiro', icon: '💰' },
        { name: 'QR Codes', path: '/qrcodes', icon: '📱' },
        { name: 'Ajustes', path: '/configuracoes', icon: '⚙️' },
    ];

    return (
        <aside className="print:hidden flex-shrink-0 z-50" style={{
            width: 'clamp(64px, 14vw, 220px)',
            height: 'calc(100vh - 2rem)',
            position: 'sticky',
            top: '1rem',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem 0.75rem',
            gap: '0.5rem',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxShadow: 'var(--shadow-card)',
            transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}>
            {/* Logo */}
            <Link href="/" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.375rem 0.5rem',
                marginBottom: '0.75rem',
                textDecoration: 'none',
            }}>
                <div style={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #EA1D2C, #C8101E)',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: 16,
                    color: 'white',
                    boxShadow: '0 4px 14px rgba(234,29,44,0.35)',
                    flexShrink: 0,
                }}>
                    G
                </div>
                <span className="hidden md:block" style={{
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: '-0.03em',
                    color: 'var(--text-primary)',
                    transition: 'color 0.3s ease',
                }}>Guarandrade</span>
            </Link>

            {/* Navigation */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            href={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.625rem 0.75rem',
                                borderRadius: 12,
                                transition: 'all 0.2s ease',
                                textDecoration: 'none',
                                background: isActive ? 'rgba(234,29,44,0.12)' : 'transparent',
                                border: isActive ? '1px solid rgba(234,29,44,0.25)' : '1px solid transparent',
                                color: isActive ? '#EA1D2C' : 'var(--text-muted)',
                            }}
                            onMouseOver={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'var(--hover-overlay)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                }
                            }}
                        >
                            <div style={{ width: 20, textAlign: 'center', fontSize: 16, flexShrink: 0 }}>
                                {item.icon}
                            </div>
                            <span className="hidden md:block" style={{
                                fontWeight: 700,
                                fontSize: 11,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                            }}>{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Theme Toggle + User */}
            <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 0.75rem',
                        borderRadius: 12,
                        background: 'var(--hover-overlay)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-hover)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'var(--hover-overlay)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                >
                    <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </span>
                    <span className="hidden md:block" style={{
                        fontWeight: 700,
                        fontSize: 10,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                    }}>
                        {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    </span>
                </button>

                {/* User Profile */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem',
                    borderRadius: 12,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'all 0.3s ease',
                }}>
                    <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #EA1D2C, #FF4D5A)',
                        flexShrink: 0,
                    }} />
                    <div className="hidden md:block" style={{ overflow: 'hidden' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.03em', transition: 'color 0.3s ease' }}>Admin</p>
                        <p style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600, transition: 'color 0.3s ease' }}>● Online</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
