"use client";

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function QRCodes() {
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTables = async () => {
            const { data } = await supabase.from('tables').select('*').order('id', { ascending: true });
            if (data) setTables(data);
            setLoading(false);
        };
        fetchTables();
    }, []);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40 }}>📱</div>
                <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Carregando QR Codes...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', padding: 16, gap: 16 }}>
            <Sidebar />

            <main style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {/* Header */}
                <header className="print:hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            QR Codes 📱
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            {tables.length} mesas cadastradas · Imprima os códigos para seus clientes
                        </p>
                    </div>
                    <button onClick={handlePrint} className="btn btn-primary">
                        🖨️ Imprimir Todos
                    </button>
                </header>

                {/* QR Grid */}
                <div ref={printRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, paddingBottom: 24 }}>
                    {tables.map((table, idx) => {
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUrl + '/menu?table=' + table.id)}`;
                        return (
                            <div key={table.id} className="animate-fade-in" style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 20,
                                padding: 24,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 16,
                                animationDelay: `${idx * 0.04}s`,
                                opacity: 0,
                            }}>
                                <div style={{
                                    background: 'white',
                                    borderRadius: 16,
                                    padding: 16,
                                    boxShadow: 'var(--shadow-card)',
                                }}>
                                    <img
                                        src={qrUrl}
                                        alt={`QR Code - ${table.name}`}
                                        style={{ width: 160, height: 160, display: 'block' }}
                                    />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{table.name}</h3>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Escaneie para acessar o cardápio</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Print-only styles */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    aside { display: none !important; }
                    main { padding: 0 !important; }
                    [class*="animate-fade-in"] { opacity: 1 !important; animation: none !important; }
                    div[style*="background: rgba(255,255,255,0.02)"] {
                        background: white !important;
                        border: 2px solid #eee !important;
                        page-break-inside: avoid;
                    }
                    h3 { color: black !important; }
                    p { color: #666 !important; }
                }
            `}</style>
        </div>
    );
}
