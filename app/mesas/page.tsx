"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Mesas() {
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTables = async () => {
        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .order('id', { ascending: true });

        if (!error && data) {
            setTables(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTables();

        const channel = supabase
            .channel('public:tables')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
                fetchTables();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl"></div>
                <p className="font-bold tracking-widest uppercase text-xs">Carregando Guarandrade...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen p-4 gap-4">
            <Sidebar />

            <main className="flex-1 overflow-y-auto pr-2 space-y-6">
                <header className="flex justify-between items-center py-2">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Gestão de Mesas 🍽️</h1>
                        <p className="text-gray-400">Monitore, abra e feche contas em tempo real.</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="glass px-4 py-2 text-sm font-bold text-green-400">Liberar Todas</button>
                        <button className="glass px-4 py-2 text-sm font-bold text-indigo-400">Gerar QRs</button>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tables.map(table => (
                        <div key={table.id} className="glass p-6 flex flex-col gap-4 relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-2 h-full ${table.status === 'occupied' ? 'bg-red-500' :
                                table.status === 'dirty' ? 'bg-yellow-500' : 'bg-green-500'
                                }`} />

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{table.name}</h3>
                                    <span className={`text-[10px] font-bold uppercase ${table.status === 'occupied' ? 'text-red-400' :
                                        table.status === 'dirty' ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                        {table.status === 'occupied' ? 'Ocupada' :
                                            table.status === 'dirty' ? 'Limpeza' : 'Disponível'}
                                    </span>
                                </div>
                                <div className="text-3xl grayscale group-hover:grayscale-0 transition-all opacity-20 group-hover:opacity-100">
                                    📍
                                </div>
                            </div>

                            {table.status === 'occupied' ? (
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total:</span>
                                        <span className="text-indigo-400 font-bold">R$ {table.total_amount || '0.00'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center py-4 border border-dashed border-white/10 rounded-xl">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Aguardando Cliente</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button className="glass py-2 text-[10px] font-bold uppercase hover:bg-white/10">Ver Detalhes</button>
                                {table.status === 'available' ? (
                                    <button className="bg-indigo-600 py-2 text-[10px] font-bold uppercase text-white rounded-lg">Abrir Mesa</button>
                                ) : (
                                    <button className="bg-red-600/20 text-red-400 py-2 text-[10px] font-bold uppercase rounded-lg border border-red-500/30">Fechar Conta</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
