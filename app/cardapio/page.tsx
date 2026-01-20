"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Cardapio() {
    const [items, setItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState({ id: 'all', name: 'Todos' });
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category_id: '',
        status: 'Ativo'
    });

    const fetchData = async () => {
        const [productsRes, categoriesRes] = await Promise.all([
            supabase.from('products').select('*').order('name', { ascending: true }),
            supabase.from('categories').select('*').order('name')
        ]);

        if (productsRes.data) setItems(productsRes.data);
        if (categoriesRes.data) {
            setCategories(categoriesRes.data);
            if (categoriesRes.data.length > 0 && !formData.category_id) {
                setFormData(prev => ({ ...prev, category_id: categoriesRes.data[0].id }));
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'Ativo' ? 'Pausado' : 'Ativo';
        const { error } = await supabase.from('products').update({ status: nextStatus }).eq('id', id);
        if (error) {
            alert('Erro ao atualizar status: ' + error.message);
        } else {
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            fetchData();
        }
    };

    const handleOpenModal = (item: any = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                description: item.description || '',
                price: item.price.toString(),
                category_id: item.category_id,
                status: item.status
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                category_id: categories[0]?.id || '',
                status: 'Ativo'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            ...formData,
            price: parseFloat(formData.price.replace(',', '.'))
        };

        let error;
        if (editingItem) {
            const res = await supabase.from('products').update(payload).eq('id', editingItem.id);
            error = res.error;
        } else {
            const res = await supabase.from('products').insert([payload]);
            error = res.error;
        }

        if (error) {
            alert('Erro ao salvar: ' + error.message);
        } else {
            setIsModalOpen(false);
            fetchData();
        }
    };

    const getProductIcon = (item: any) => {
        const cat = categories.find(c => c.id === item.category_id);
        return cat?.icon || '🍔';
    };

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
                        <h1 className="text-3xl font-black text-white mb-1 uppercase tracking-tighter italic">Cardápio Digital 📜</h1>
                        <p className="text-gray-400">Gerencie seus produtos, preços e disponibilidade.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 px-6 py-3 rounded-2xl font-black text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-xs transition-all active:scale-95"
                    >
                        + Adicionar Item
                    </button>
                </header>

                {/* Categories Bar */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    <button
                        onClick={() => setActiveFilter({ id: 'all', name: 'Todos' })}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter.id === 'all' ? 'bg-white text-black' : 'glass text-gray-500 hover:text-white'}`}
                    >
                        Todos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveFilter(cat)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeFilter.id === cat.id ? 'bg-white text-black shadow-lg' : 'glass text-gray-500 hover:text-white'}`}
                        >
                            <span>{cat.icon}</span>
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Menu Table */}
                <div className="glass overflow-hidden border border-white/5 rounded-3xl bg-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-500 text-[10px] uppercase font-black tracking-[0.2em]">
                                <th className="p-6">Produto</th>
                                <th className="p-6">Preço</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {items.filter(i => activeFilter.id === 'all' || i.category_id === activeFilter.id).map((item) => (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xl border border-white/5">
                                                {getProductIcon(item)}
                                            </div>
                                            <div>
                                                <p className="font-black text-white text-base uppercase italic tracking-tighter">{item.name}</p>
                                                <p className="text-xs text-gray-500 line-clamp-1 max-w-xs font-medium">{item.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6 font-black text-indigo-400 text-lg whitespace-nowrap italic">
                                        R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td className="p-6">
                                        <button
                                            onClick={() => toggleStatus(item.id, item.status)}
                                            className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full tracking-widest transition-all border ${item.status === 'Ativo' ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white'
                                                }`}
                                        >
                                            {item.status}
                                        </button>
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className="flex justify-center gap-4">
                                            <button
                                                onClick={() => handleOpenModal(item)}
                                                className="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-400 hover:text-white hover:bg-indigo-600 transition-all shadow-lg"
                                            >✏️</button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="w-10 h-10 rounded-xl glass flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/20 transition-all shadow-lg"
                                            >🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Modal de Adicionar/Editar */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
                    <div className="glass w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 bg-[#0A0A0A]">
                        <div className="p-8 border-b border-white/5 text-center relative">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-6 right-6 text-gray-500 hover:text-white"
                            >✕</button>
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                {editingItem ? 'Editar Produto' : 'Novo Produto'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2 px-1">Nome do Produto</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                        placeholder="Ex: Pastel de Carne Especial"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2 px-1">Preço (R$)</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-black text-xl italic"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2 px-1">Categoria</label>
                                        <select
                                            value={formData.category_id}
                                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold appearance-none"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id} className="bg-black">{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2 px-1">Descrição</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium h-24"
                                        placeholder="Detalhes do produto..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 glass py-5 rounded-2xl font-black text-xs uppercase text-gray-400 hover:text-white transition-all"
                                >Cancelar</button>
                                <button
                                    type="submit"
                                    className="flex-2 bg-indigo-600 py-5 rounded-2xl font-black text-white shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 uppercase tracking-widest text-xs transition-all active:scale-95 px-8"
                                >Salvar Produto</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
