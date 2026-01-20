"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Mesas() {
    const router = useRouter();
    const [tables, setTables] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiptModal, setReceiptModal] = useState<any>(null);

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

    const handleOpenReceipt = async (table: any) => {
        if (table.status !== 'occupied') return;

        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name)
                )
            `)
            .eq('table_id', table.id)
            .neq('status', 'finalizado');

        if (data && data.length > 0) {
            const allItems = data.flatMap(o => o.order_items);
            const totalAmount = data.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

            setReceiptModal({
                table,
                order: { items: allItems, total_amount: totalAmount, originalOrders: data }
            });
        } else {
            alert('Não foi possível encontrar um pedido ativo para esta mesa.');
        }
    };

    const handleFecharConta = async () => {
        if (!receiptModal) return;

        const { table, order } = receiptModal;
        const orderIds = order.originalOrders.map((o: any) => o.id);

        try {
            // 1. Finalizar Pedidos
            await supabase
                .from('orders')
                .update({ status: 'finalizado' })
                .in('id', orderIds);

            // 2. Marcar Mesa para Limpeza
            await supabase
                .from('tables')
                .update({ status: 'dirty', total_amount: 0 })
                .eq('id', table.id);

            setReceiptModal(null);
            fetchTables();
            alert(`Mesa ${table.id} fechada com sucesso! 💰`);
        } catch (err) {
            alert('Erro ao fechar conta.');
        }
    };

    const handleLiberarMesa = async (id: number) => {
        const { error } = await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', id);

        if (!error) fetchTables();
    };

    const handleAddItems = (tableId: number) => {
        router.push(`/pdv?table=${tableId}`);
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black text-white">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl"></div>
                <p className="font-bold tracking-widest uppercase text-xs">Carregando Mesas...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen p-4 gap-4">
            <Sidebar />

            <main className="flex-1 overflow-y-auto pr-2 space-y-6">
                <header className="flex justify-between items-center py-2">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter italic">Gestão de Mesas 🍽️</h1>
                        <p className="text-gray-400">Gerencie o consumo e a disponibilidade das mesas.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tables.map(table => (
                        <div
                            key={table.id}
                            className="glass p-6 flex flex-col gap-4 relative overflow-hidden group border border-white/5 bg-white/5 active:scale-[0.98] transition-all"
                        >
                            <div className={`absolute top-0 right-0 w-2 h-full ${table.status === 'occupied' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                                table.status === 'dirty' ? 'bg-yellow-500' : 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                                }`} />

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic">{table.name}</h3>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${table.status === 'occupied' ? 'text-red-400' :
                                        table.status === 'dirty' ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                        {table.status === 'occupied' ? 'Ocupada' :
                                            table.status === 'dirty' ? 'Limpeza Necessária' : 'Livre'}
                                    </span>
                                </div>
                                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                                    {table.status === 'occupied' ? '🔥' : table.status === 'dirty' ? '🧹' : '🏠'}
                                </div>
                            </div>

                            <div className="flex-1">
                                {table.status === 'occupied' ? (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter opacity-70">Consumo Acumulado:</p>
                                        <p className="text-3xl font-black text-indigo-400 tracking-tight">R$ {parseFloat(table.total_amount).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-tight opacity-40">Aguardando clientes...</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2 mt-2">
                                {table.status === 'occupied' ? (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleAddItems(table.id)}
                                            className="bg-indigo-600/10 text-indigo-400 py-3 rounded-xl font-black text-[10px] uppercase border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-600/10"
                                        >
                                            + Lançar Itens
                                        </button>
                                        <button
                                            onClick={() => handleOpenReceipt(table)}
                                            className="bg-red-600/10 text-red-400 py-3 rounded-xl font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
                                        >
                                            Ver Itens / Fechar
                                        </button>
                                    </div>
                                ) : table.status === 'dirty' ? (
                                    <button
                                        onClick={() => handleLiberarMesa(table.id)}
                                        className="bg-yellow-600/10 text-yellow-400 py-3 rounded-xl font-black text-[10px] uppercase border border-yellow-500/20 hover:bg-yellow-500 hover:text-black transition-all"
                                    >
                                        Mesa Limpa (Liberar)
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAddItems(table.id)}
                                        className="bg-green-600/10 text-green-400 py-3 rounded-xl font-black text-[10px] uppercase border border-green-500/20 hover:bg-green-600 hover:text-white transition-all shadow-lg shadow-green-600/10"
                                    >
                                        Abrir Nova Conta
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Receipt Modal */}
            {receiptModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
                >
                    <div className="glass w-full max-w-md overflow-hidden animate-fade-in shadow-2xl border border-white/10 bg-[#0A0A0A]">
                        <div className="p-8 bg-white/5 border-b border-white/5 text-center relative">
                            <button
                                onClick={() => setReceiptModal(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >✕</button>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Resumo Consumo 🧾</h2>
                            <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] mt-2 italic px-4 py-1 bg-indigo-500/10 rounded-full w-fit mx-auto border border-indigo-500/20">{receiptModal.table.name}</p>
                        </div>

                        <div className="p-8 space-y-4 max-h-[45vh] overflow-y-auto scrollbar-hide">
                            {receiptModal.order.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-3 group">
                                    <div className="flex flex-col">
                                        <span className="text-white font-black uppercase text-[12px] group-hover:text-indigo-400 transition-colors">{item.quantity}x {item.products.name}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">VALOR UN: R$ {parseFloat(item.unit_price).toFixed(2)}</span>
                                    </div>
                                    <span className="text-white font-black">R$ {(item.quantity * item.unit_price).toFixed(2).replace('.', ',')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-white/5 space-y-6">
                            <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">Total da Mesa:</span>
                                <span className="text-5xl font-black text-white italic tracking-tighter">R$ {parseFloat(receiptModal.order.total_amount).toFixed(2).replace('.', ',')}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => { handleAddItems(receiptModal.table.id); setReceiptModal(null); }}
                                    className="bg-indigo-600/10 text-indigo-400 py-4 rounded-2xl font-black text-[11px] uppercase border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all"
                                >
                                    + Continuar Vendendo
                                </button>
                                <button
                                    onClick={() => handleFecharConta()}
                                    className="bg-green-600 py-6 rounded-2xl font-black text-white shadow-2xl shadow-green-600/30 hover:bg-green-500 uppercase tracking-[0.2em] text-sm transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <span>FECHAR CONTA AGORA</span>
                                    <span className="text-xl">💰</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
