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
            // Aggregate all items from multiple orders if necessary, although usually there's one active order flow
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

        // 1. Finalizar Pedidos
        const orderIds = order.originalOrders.map((o: any) => o.id);
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
        alert(`Mesa ${table.id} fechada com sucesso! 💰`);
    };

    const handleLiberarMesa = async (id: number) => {
        const { error } = await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', id);

        if (!error) fetchTables();
    };

    const handleTableClick = (table: any) => {
        if (table.status === 'occupied') {
            handleOpenReceipt(table);
        } else if (table.status === 'dirty') {
            handleLiberarMesa(table.id);
        } else {
            router.push(`/pdv?table=${table.id}`);
        }
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
                            onClick={() => handleTableClick(table)}
                            className="glass p-6 flex flex-col gap-4 relative overflow-hidden group cursor-pointer hover:bg-white/5 active:scale-95 transition-all"
                        >
                            <div className={`absolute top-0 right-0 w-2 h-full ${table.status === 'occupied' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                table.status === 'dirty' ? 'bg-yellow-500' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                                }`} />

                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic">{table.name}</h3>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${table.status === 'occupied' ? 'text-red-400' :
                                        table.status === 'dirty' ? 'text-yellow-400' : 'text-green-400'
                                        }`}>
                                        {table.status === 'occupied' ? 'Ocupada' :
                                            table.status === 'dirty' ? 'Para Limpeza' : 'Disponível'}
                                    </span>
                                </div>
                                <div className="text-4xl grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-300">
                                    {table.status === 'occupied' ? '🔥' : table.status === 'dirty' ? '🧹' : '🏠'}
                                </div>
                            </div>

                            <div className="flex-1">
                                {table.status === 'occupied' ? (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">Consumo Total:</p>
                                        <p className="text-3xl font-black text-indigo-400">R$ {parseFloat(table.total_amount).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-tight opacity-50">Livre p/ Novos Pedidos</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-2 mt-2">
                                {table.status === 'occupied' ? (
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAddItems(table.id); }}
                                            className="bg-indigo-600/20 text-indigo-400 py-3 rounded-xl font-black text-[10px] uppercase border border-indigo-500/20 hover:bg-indigo-600/40 transition-colors"
                                        >
                                            + Adicionar Itens
                                        </button>
                                        <button className="bg-red-600/20 text-red-400 py-3 rounded-xl font-black text-[10px] uppercase border border-red-500/20 hover:bg-red-600/40 transition-colors">
                                            Ver Resumo / Fechar
                                        </button>
                                    </div>
                                ) : table.status === 'dirty' ? (
                                    <button className="bg-yellow-600/20 text-yellow-400 py-3 rounded-xl font-black text-[10px] uppercase border border-yellow-500/20 hover:bg-yellow-600/40 transition-colors">
                                        Confirmar Limpeza
                                    </button>
                                ) : (
                                    <button className="bg-green-600/20 text-green-400 py-3 rounded-xl font-black text-[10px] uppercase border border-green-500/20 hover:bg-green-600/40 transition-colors">
                                        Abrir Mesa
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="glass w-full max-w-md overflow-hidden animate-fade-in shadow-2xl border-white/10" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 bg-white/5 border-b border-white/5 text-center relative">
                            <button
                                onClick={() => setReceiptModal(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >✕</button>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Resumo da Mesa 🧾</h2>
                            <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] mt-2">{receiptModal.table.name}</p>
                        </div>

                        <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto scrollbar-hide">
                            {receiptModal.order.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                                    <div className="flex flex-col">
                                        <span className="text-white font-black uppercase text-[12px]">{item.quantity}x {item.products.name}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">UN: R$ {parseFloat(item.unit_price).toFixed(2)}</span>
                                    </div>
                                    <span className="text-indigo-400 font-black">R$ {(item.quantity * item.unit_price).toFixed(2).replace('.', ',')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-white/5 space-y-6">
                            <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                <span className="text-gray-500 text-xs font-black uppercase tracking-widest leading-none mb-1">Total à Pagar:</span>
                                <span className="text-4xl font-black text-white italic">R$ {parseFloat(receiptModal.order.total_amount).toFixed(2).replace('.', ',')}</span>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleAddItems(receiptModal.table.id); }}
                                    className="bg-indigo-600/20 text-indigo-400 py-4 rounded-2xl font-black text-xs uppercase border border-indigo-500/30 hover:bg-indigo-600/30"
                                >
                                    + Continuar Lançando Itens
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleFecharConta(); }}
                                    className="bg-green-600 py-5 rounded-2xl font-black text-white shadow-xl shadow-green-600/20 hover:bg-green-500 uppercase tracking-widest text-sm transition-all active:scale-95"
                                >
                                    Fechar e Confirmar Pagamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
