"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Financeiro() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        balance: 0,
        revenueToday: 0,
        totalOrders: 0
    });

    const fetchData = async () => {
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch Today's Orders
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', today);

        const revenueToday = orders?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;

        // 2. Fetch Top Selling Products (Aggregated)
        const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity, products(name, price, category_id, categories(icon))');

        const productMap: any = {};
        orderItems?.forEach((item: any) => {
            const pId = item.product_id;
            if (!productMap[pId]) {
                productMap[pId] = {
                    name: item.products.name,
                    icon: item.products.categories?.icon || '🍔',
                    totalQty: 0,
                    totalRevenue: 0
                };
            }
            productMap[pId].totalQty += item.quantity;
            productMap[pId].totalRevenue += item.quantity * item.products.price;
        });

        const sortedProducts = Object.values(productMap)
            .sort((a: any, b: any) => b.totalQty - a.totalQty)
            .slice(0, 5);

        // 3. Transactions
        const orderTransactions = (orders || []).map(o => ({
            id: o.id,
            type: 'receita',
            value: Number(o.total_amount),
            method: `Pedido #${o.id.toString().slice(0, 4)}`,
            date: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })).reverse().slice(0, 5);

        setStats({
            balance: revenueToday,
            revenueToday: revenueToday,
            totalOrders: orders?.length || 0
        });
        setTopProducts(sortedProducts);
        setTransactions(orderTransactions);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="flex h-screen p-4 gap-4 bg-[#050505]">
            <Sidebar />

            <main className="flex-1 overflow-y-auto pr-2 space-y-6">
                <header className="flex justify-between items-center py-2">
                    <div>
                        <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter italic">Inteligência Financeira 💰</h1>
                        <p className="text-gray-400">Dashboards em tempo real da Guarandrade.</p>
                    </div>
                </header>

                {/* Scorecards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">💵</div>
                        <span className="text-gray-400 text-[10px] uppercase font-black tracking-[0.2em]">Faturamento Hoje</span>
                        <h3 className="text-4xl font-black text-white mt-2">R$ {stats.revenueToday.toFixed(2).replace('.', ',')}</h3>
                        <div className="flex items-center gap-2 mt-4 text-green-400 font-bold text-xs bg-green-400/10 w-fit px-3 py-1 rounded-full">
                            <span>↑ 12%</span>
                            <span className="text-white/40 font-normal">vs ontem</span>
                        </div>
                    </div>
                    <div className="glass p-8 relative overflow-hidden group border-indigo-500/20">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">🧾</div>
                        <span className="text-gray-400 text-[10px] uppercase font-black tracking-[0.2em]">Total de Pedidos</span>
                        <h3 className="text-4xl font-black text-white mt-2">{stats.totalOrders}</h3>
                        <p className="text-indigo-400 text-xs font-bold mt-4 uppercase">Ticket Médio: R$ {(stats.revenueToday / (stats.totalOrders || 1)).toFixed(2)}</p>
                    </div>
                    <div className="glass p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">📈</div>
                        <span className="text-gray-400 text-[10px] uppercase font-black tracking-[0.2em]">Margem Estimada</span>
                        <h3 className="text-4xl font-black text-green-400 mt-2">68%</h3>
                        <div className="w-full bg-white/5 h-1 rounded-full mt-6">
                            <div className="bg-green-400 h-full rounded-full" style={{ width: '68%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products */}
                    <div className="glass">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-black text-white uppercase tracking-wider text-sm">Mais Vendidos 🔥</h3>
                            <button className="text-[10px] font-black uppercase text-indigo-400">Ver Ranking Completo</button>
                        </div>
                        <div className="p-6 space-y-6">
                            {topProducts.map((p: any, i: number) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform shadow-xl">
                                            {p.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{p.name}</h4>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{p.totalQty} unidades vendidas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-black text-sm">R$ {p.totalRevenue.toFixed(2).replace('.', ',')}</p>
                                        <div className="w-20 bg-white/5 h-1 rounded-full mt-1">
                                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(p.totalQty / topProducts[0].totalQty) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {topProducts.length === 0 && (
                                <div className="py-10 text-center text-gray-500 text-xs font-black uppercase opacity-20">Aguardando Vendas...</div>
                            )}
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="glass">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-black text-white uppercase tracking-wider text-sm">Fluxo de Caixa 💸</h3>
                            <button className="text-[10px] font-black uppercase text-indigo-400">Exportar CSV</button>
                        </div>
                        <div className="divide-y divide-white/5">
                            {transactions.map(t => (
                                <div key={t.id} className="p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 font-black text-xs">
                                            INV
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{t.method}</h4>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{t.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-black text-sm">+ R$ {t.value.toFixed(2).replace('.', ',')}</p>
                                        <p className="text-[8px] text-gray-600 font-bold uppercase">Confirmado</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
