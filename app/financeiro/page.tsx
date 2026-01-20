"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Financeiro() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        balance: 0,
        revenueToday: 0,
        profitMargin: 0
    });

    const fetchFinancialData = async () => {
        const today = new Date().toISOString().split('T')[0];

        // Fetch orders for revenue
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', today);

        const revenueToday = orders?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0;

        // For now, since we don't have a full billing system, 
        // we'll map orders as "receitas"
        const orderTransactions = (orders || []).map(o => ({
            id: o.id,
            type: 'receita',
            value: Number(o.total_amount),
            method: 'Venda Mesa',
            date: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })).slice(0, 10);

        setStats({
            balance: revenueToday,
            revenueToday: revenueToday,
            profitMargin: revenueToday > 0 ? 100 : 0 // Simple mock margin
        });
        setTransactions(orderTransactions);
        setLoading(false);
    };

    useEffect(() => {
        fetchFinancialData();
    }, []);

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
                        <h1 className="text-3xl font-bold text-white mb-1">Financeiro 💰</h1>
                        <p className="text-gray-400">Controle seu fluxo de caixa, despesas e lucros.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="glass px-4 py-2 text-sm font-bold text-red-400">Lançar Despesa</button>
                        <button className="bg-indigo-600 px-6 py-2 rounded-xl font-bold text-white">Relatório Mensal</button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass p-6 flex flex-col items-center justify-center text-center gap-2">
                        <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Saldo Hoje (Vendas)</span>
                        <h3 className="text-4xl font-bold text-white">R$ {stats.balance.toFixed(2).replace('.', ',')}</h3>
                        <span className="text-green-400 text-xs font-bold">+R$ {stats.revenueToday.toFixed(2)} hoje</span>
                    </div>
                    <div className="glass p-6 flex flex-col items-center justify-center text-center gap-2">
                        <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Contas a Pagar</span>
                        <h3 className="text-4xl font-bold text-red-400">R$ 0,00</h3>
                        <span className="text-gray-500 text-xs">Nenhum vencimento pendente</span>
                    </div>
                    <div className="glass p-6 flex flex-col items-center justify-center text-center gap-2">
                        <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Lucro Bruto</span>
                        <h3 className="text-4xl font-bold text-green-400">R$ {stats.balance.toFixed(2).replace('.', ',')}</h3>
                        <span className="text-gray-500 text-xs text-[10px] uppercase font-bold">Baseado em Vendas</span>
                    </div>
                </div>

                <div className="glass">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-white">Transações Recentes</h3>
                        <button className="text-indigo-400 text-sm font-bold">Ver Tudo</button>
                    </div>
                    <div className="divide-y divide-white/5">
                        {transactions.map(t => (
                            <div key={t.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${t.type === 'receita' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {t.type === 'receita' ? '↑' : '↓'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{t.method}</h4>
                                        <p className="text-xs text-gray-400">{t.date}</p>
                                    </div>
                                </div>
                                <div className={`font-bold ${t.type === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                                    {t.type === 'receita' ? '+' : '-'} R$ {t.value.toFixed(2).replace('.', ',')}
                                </div>
                            </div>
                        ))}
                        {transactions.length === 0 && (
                            <p className="p-10 text-center text-gray-500 text-xs uppercase tracking-widest">Nenhuma transação registrada</p>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
