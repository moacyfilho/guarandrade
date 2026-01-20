"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Home() {
    const [stats, setStats] = useState([
        { label: 'Pedidos Hoje', value: '0', icon: '📝', color: 'text-blue-400' },
        { label: 'Mesas Ativas', value: '0/0', icon: '🍽️', color: 'text-green-400' },
        { label: 'Faturamento de Hoje', value: 'R$ 0,00', icon: '💰', color: 'text-purple-400' },
        { label: 'Tempo Médio', value: '-- min', icon: '⏱️', color: 'text-orange-400' },
    ]);
    const [tables, setTables] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Today's Orders Count
        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today);

        // 2. Fetch Active Tables
        const { data: tablesData } = await supabase
            .from('tables')
            .select('*')
            .order('id', { ascending: true });

        const activeTablesCount = tablesData?.filter(t => t.status === 'occupied').length || 0;
        const totalTablesCount = tablesData?.length || 0;

        // 3. Fetch Today's Revenue
        const { data: revenueData } = await supabase
            .from('orders')
            .select('total_amount')
            .gte('created_at', today)
            .neq('status', 'cancelado');
        // Normally we'd filter by 'finalizado' but let's show total valid orders for now

        const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

        // 4. Fetch Recent Orders
        const { data: ordersData } = await supabase
            .from('orders')
            .select(`
                *,
                tables (name)
            `)
            .order('created_at', { ascending: false })
            .limit(3);

        setStats([
            { label: 'Pedidos Hoje', value: String(ordersCount || 0), icon: '📝', color: 'text-blue-400' },
            { label: 'Mesas Ativas', value: `${activeTablesCount}/${totalTablesCount}`, icon: '🍽️', color: 'text-green-400' },
            { label: 'Faturamento de Hoje', value: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, icon: '💰', color: 'text-purple-400' },
            { label: 'Tempo Médio', value: '18 min', icon: '⏱️', color: 'text-orange-400' }, // Hardcoded as placeholder until we have logic
        ]);

        if (tablesData) setTables(tablesData);
        if (ordersData) setRecentOrders(ordersData);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Real-time updates
        const channel = supabase
            .channel('dashboard_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black">
            <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl"></div>
                <p className="font-bold tracking-widest uppercase text-xs text-white">Guarandrade...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen p-4 gap-4">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pr-2 space-y-6">
                {/* Header */}
                <header className="flex justify-between items-center py-2">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Boas-vindas, Admin! 👋</h1>
                        <p className="text-gray-400">Aqui está o resumo do que está acontecendo no Guarandrade agora.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href="/pdv" className="glass px-4 py-2 text-sm font-medium hover:bg-white/10 text-white">Novo Pedido</Link>
                        <div className="glass w-10 h-10 flex items-center justify-center cursor-pointer text-white">🔔</div>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <div key={i} className="glass p-5 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-2xl">{stat.icon}</div>
                                <div className={`text-xs font-bold uppercase tracking-wider ${stat.color}`}>Real-time</div>
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                            <p className="text-gray-400 text-sm">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tables Grid */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Status das Mesas</h2>
                        <div className="flex gap-2 text-xs">
                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-green-500"></span> Livre</span>
                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-red-500"></span> Ocupada</span>
                            <span className="flex items-center gap-1 text-gray-400"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Limpeza</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {tables.map((table) => (
                            <div
                                key={table.id}
                                className={`glass p-4 text-center cursor-pointer hover:scale-105 active:scale-95 border-t-4 ${table.status === 'occupied' ? 'border-t-red-500' :
                                    table.status === 'dirty' ? 'border-t-yellow-500' : 'border-t-green-500'
                                    }`}
                            >
                                <div className="text-2xl mb-1 text-white">🪑</div>
                                <div className="font-bold text-lg mb-1 text-white">{table.name}</div>
                                {table.status === 'occupied' ? (
                                    <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                                        Ocupada
                                    </span>
                                ) : (
                                    <span className="text-gray-500 text-[10px] uppercase font-bold">{table.status === 'dirty' ? 'Limpeza' : 'Livre'}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
                    {/* Recent Orders */}
                    <div className="glass p-5 lg:col-span-2">
                        <h3 className="text-lg font-bold mb-4 text-white">Pedidos Recentes</h3>
                        <div className="space-y-3">
                            {recentOrders.map((order) => (
                                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-white">🍔</div>
                                        <div>
                                            <p className="font-semibold text-sm text-white">{order.tables?.name || 'Mesa ?'}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm text-white">R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</p>
                                        <p className={`text-[10px] font-bold uppercase ${order.status === 'fila' ? 'text-blue-400' :
                                                order.status === 'preparando' ? 'text-yellow-400' :
                                                    order.status === 'pronto' ? 'text-green-400' : 'text-gray-400'
                                            }`}>{order.status}</p>
                                    </div>
                                </div>
                            ))}
                            {recentOrders.length === 0 && (
                                <p className="text-center py-10 text-gray-500 text-sm tracking-widest uppercase">Nenhum pedido recente</p>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions / Voice Order */}
                    <div className="glass p-5 bg-gradient-to-br from-indigo-600/10 to-transparent">
                        <h3 className="text-lg font-bold mb-4 text-white">Pedir por Voz 🎙️</h3>
                        <p className="text-sm text-gray-400 mb-6">Mantenha pressionado para falar um pedido rapidamente.</p>
                        <div className="flex flex-col items-center justify-center gap-4 py-4">
                            <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-3xl shadow-xl shadow-indigo-500/40 cursor-pointer hover:scale-110 active:scale-95 transition-all text-white">
                                🎤
                            </div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest animate-pulse">Ouvindo...</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
