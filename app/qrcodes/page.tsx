"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

export default function QRCodes() {
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [baseUrl, setBaseUrl] = useState('');

    useEffect(() => {
        const fetchTables = async () => {
            const { data } = await supabase.from('tables').select('*').order('id');
            if (data) setTables(data);
            setLoading(false);
        };
        fetchTables();

        // In production this would be the real domain
        setBaseUrl(window.location.origin);
    }, []);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-white uppercase font-black animate-pulse">Gerando códigos...</div>;

    return (
        <div className="flex h-screen p-4 gap-4 bg-[#050505]">
            <div className="print:hidden">
                <Sidebar />
            </div>

            <main className="flex-1 overflow-y-auto space-y-8 pr-2">
                <header className="flex justify-between items-center py-4 print:hidden">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">Gerador de QR Codes 📱</h1>
                        <p className="text-gray-400">Imprima os códigos para as mesas da sua lanchonete.</p>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 px-8 py-3 rounded-2xl font-black text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs"
                    >
                        Imprimir Todos
                    </button>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {tables.map(table => (
                        <div key={table.id} className="glass p-8 flex flex-col items-center gap-6 print:border print:border-black print:shadow-none bg-white/5">
                            {/* Branding on Card */}
                            <div className="text-center">
                                <h2 className="text-4xl font-black text-white mb-1">{table.name}</h2>
                                <p className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Escanear para Pedir</p>
                            </div>

                            {/* QR Code */}
                            <div className="p-4 bg-white rounded-3xl shadow-2xl">
                                <QRCodeSVG
                                    value={`${baseUrl}/menu?table=${table.id}`}
                                    size={180}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            {/* Logo Reference */}
                            <div className="flex items-center gap-2">
                                <div className="text-2xl">🥟</div>
                                <div className="text-left leading-none">
                                    <p className="text-white font-black text-xs uppercase">Guarandrade</p>
                                    <p className="text-gray-500 text-[8px] uppercase font-bold tracking-tighter">Dos Selvas e Dos Feras</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Print Styles */}
                <style jsx global>{`
                    @media print {
                        body { background: white !important; }
                        .glass { background: white !important; border: 2px solid #eee !important; color: black !important; }
                        .text-white { color: black !important; }
                        .text-gray-400, .text-gray-500 { color: #666 !important; }
                        .text-indigo-400 { color: #4338ca !important; }
                        .print\\:hidden { display: none !important; }
                        .grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 20px !important; }
                        main { padding: 0 !important; overflow: visible !important; }
                    }
                `}</style>
            </main>
        </div>
    );
}
