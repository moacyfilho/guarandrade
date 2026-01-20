"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PublicMenu() {
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const [catRes, prodRes] = await Promise.all([
                supabase.from('categories').select('*').order('name'),
                supabase.from('products').select('*').eq('status', 'Ativo').order('name')
            ]);
            if (catRes.data) setCategories(catRes.data);
            if (prodRes.data) setProducts(prodRes.data);
            setLoading(false);
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* Header / Logo */}
            <div className="p-8 pb-4 text-center space-y-2">
                <div className="w-20 h-20 bg-white/5 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-xl border border-white/10">
                    🥟
                </div>
                <h1 className="text-3xl font-black tracking-tight uppercase">Guarandrade</h1>
                <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em]">Dos Selvas e Dos Feras</p>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto p-4 scrollbar-hide sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-20">
                <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-6 py-2 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-gray-500'}`}
                >
                    Todos
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-6 py-2 rounded-2xl text-xs font-black uppercase transition-all whitespace-nowrap flex items-center gap-2 ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-gray-500'}`}
                    >
                        <span>{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Menu Items */}
            <div className="p-4 space-y-3 pb-20">
                {products.filter(p => activeCategory === 'all' || p.category_id === activeCategory).map(item => (
                    <div key={item.id} className="glass p-4 flex justify-between items-center animate-fade-in group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                {categories.find(c => c.id === item.category_id)?.icon || '🍔'}
                            </div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">{item.name}</h3>
                                <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-indigo-400 font-black">R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Info */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] glass p-4 text-center z-50">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Peça ao atendente citando o número da sua mesa</p>
            </div>
        </div>
    );
}
