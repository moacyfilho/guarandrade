"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Cozinha() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        tables (name),
        order_items (
          *,
          products (name)
        )
      `)
            .neq('status', 'finalizado')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setOrders(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const updateStatus = async (id: string, currentStatus: string) => {
        let nextStatus = '';
        if (currentStatus === 'fila') nextStatus = 'preparando';
        else if (currentStatus === 'preparando') nextStatus = 'pronto';
        else return;

        await supabase
            .from('orders')
            .update({ status: nextStatus })
            .eq('id', id);
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="flex h-screen p-4 gap-4">
            <Sidebar />

            <main className="flex-1 overflow-y-auto pr-2 space-y-6">
                <header className="flex justify-between items-center py-2">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Cozinha (KDS) 🍳</h1>
                        <p className="text-gray-400">Gerencie os pedidos em tempo real para produção.</p>
                    </div>
                    <div className="glass px-4 py-2 text-sm font-bold text-indigo-400">
                        {orders.length} Pedidos Ativos
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {orders.map((order) => (
                        <div key={order.id} className={`glass flex flex-col border-l-8 ${order.status === 'atrasado' ? 'border-l-red-500' :
                                order.status === 'preparando' ? 'border-l-blue-500' : 'border-l-gray-600'
                            }`}>
                            <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pedido #{order.id.slice(0, 4)}</span>
                                    <h3 className="text-xl font-bold text-white">{order.tables?.name || 'Mesa ?'}</h3>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-700 text-gray-300`}>
                                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="p-4 flex-1">
                                <ul className="space-y-2">
                                    {order.order_items?.map((item: any) => (
                                        <li key={item.id} className="flex items-center gap-2 text-white font-medium">
                                            <input type="checkbox" className="w-5 h-5 rounded border-gray-600 bg-transparent" />
                                            {item.quantity}x {item.products?.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-4 bg-white/5">
                                <button
                                    onClick={() => updateStatus(order.id, order.status)}
                                    className={`w-full py-3 rounded-xl font-bold transition-all ${order.status === 'fila' ? 'bg-indigo-600 text-white hover:bg-indigo-500' :
                                            order.status === 'preparando' ? 'bg-green-600 text-white hover:bg-green-500' :
                                                'bg-red-600 text-white hover:bg-red-500'
                                        }`}
                                >
                                    {order.status === 'fila' ? 'INICIAR PREPARO' :
                                        order.status === 'preparando' ? 'MARCAR COMO PRONTO' : 'RESOLVER ATRASO'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {orders.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 text-white">
                        <div className="text-6xl mb-4">💤</div>
                        <p className="text-xl font-medium">Nenhum pedido pendente na cozinha.</p>
                    </div>
                )}
            </main>
        </div>
    );
}
