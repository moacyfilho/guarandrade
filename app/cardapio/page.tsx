"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Cardapio() {
    const [items, setItems] = useState<any[]>([]);
    const [filter, setFilter] = useState('Todos');
    const [loading, setLoading] = useState(true);

    const categories = ['Todos', 'Lanches', 'Bebidas', 'Porções', 'Sobremesas'];

    const fetchMenu = async () => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name', { ascending: true });

        if (data) setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    const toggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'Ativo' ? 'Pausado' : 'Ativo';
        await supabase.from('products').update({ status: nextStatus }).eq('id', id);
        fetchMenu();
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
                        <h1 className="text-3xl font-bold text-white mb-1">Cardápio Digital 📜</h1>
                        <p className="text-gray-400">Gerencie seus produtos, preços e disponibilidade.</p>
                    </div>
                    <button className="bg-indigo-600 px-6 py-2 rounded-xl font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">
                        + Adicionar Item
                    </button>
                </header>

                {/* Categories Bar */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${filter === cat ? 'bg-white text-black' : 'glass text-gray-400 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Menu Table/Grid */}
                <div className="glass overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest font-bold">
                                <th className="p-4">Produto</th>
                                <th className="p-4">Preço</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-xl">🍔</div>
                                            <div>
                                                <p className="font-bold text-white">{item.name}</p>
                                                <p className="text-xs text-gray-500 truncate max-w-xs">{item.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-bold text-indigo-400">
                                        R$ {parseFloat(item.price).toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => toggleStatus(item.id, item.status)}
                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full transition-all ${item.status === 'Ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                }`}
                                        >
                                            {item.status}
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-3">
                                            <button className="text-gray-400 hover:text-white transition-colors">✏️</button>
                                            <button className="text-gray-400 hover:text-red-400 transition-colors">🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Menu Insight Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass p-6 border-l-4 border-indigo-500">
                        <h4 className="font-bold text-lg mb-2 text-white">Destaque da Semana ⭐</h4>
                        <p className="text-sm text-gray-400">Dados baseados no seu banco de dados em tempo real.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
