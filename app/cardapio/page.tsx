"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Cardapio() {
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', price: '', category_id: '', status: 'Ativo', stock_quantity: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [catRes, prodRes] = await Promise.all([
            supabase.from('categories').select('*').order('name'),
            supabase.from('products').select('*, categories(name, icon)').order('name'),
        ]);
        if (catRes.data) setCategories(catRes.data);
        if (prodRes.data) setMenuItems(prodRes.data);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!formData.name || !formData.price || !formData.category_id) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            category_id: formData.category_id,
            status: formData.status,
            stock_quantity: formData.stock_quantity,
        };

        if (editItem) {
            const { error } = await supabase.from('products').update(payload).eq('id', editItem.id);
            if (error) { alert('Erro: ' + error.message); return; }
        } else {
            const { error } = await supabase.from('products').insert(payload);
            if (error) { alert('Erro: ' + error.message); return; }
        }
        setModalOpen(false);
        setEditItem(null);
        setFormData({ name: '', price: '', category_id: '', status: 'Ativo', stock_quantity: 0 });
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que quer remover este item?')) return;
        await supabase.from('products').delete().eq('id', id);
        fetchData();
    };

    const openEdit = (item: any) => {
        setEditItem(item);
        setFormData({
            name: item.name,
            price: item.price.toString(),
            category_id: item.category_id,
            status: item.status,
            stock_quantity: item.stock_quantity || 0,
        });
        setModalOpen(true);
    };

    const openNew = () => {
        setEditItem(null);
        setFormData({ name: '', price: '', category_id: '', status: 'Ativo', stock_quantity: 0 });
        setModalOpen(true);
    };

    const filtered = menuItems.filter(i => {
        const matchCategory = activeFilter === 'all' || i.category_id === activeFilter;
        const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchCategory && matchSearch;
    });

    const activeCount = menuItems.filter(i => i.status === 'Ativo').length;
    const inactiveCount = menuItems.filter(i => i.status !== 'Ativo').length;

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40 }}>📜</div>
                <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Carregando cardápio...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', padding: 16, gap: 16 }}>
            <Sidebar />
            <main style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Cardápio 📜
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            {activeCount} ativos · {inactiveCount} inativos · {categories.length} categorias
                        </p>
                    </div>
                    <button onClick={openNew} className="btn btn-primary">
                        + Novo Item
                    </button>
                </header>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar no cardápio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500, width: 260 }}
                    />
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                        <button
                            onClick={() => setActiveFilter('all')}
                            className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ fontSize: 10, padding: '8px 14px' }}
                        >Todos</button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveFilter(cat.id)}
                                className={`btn ${activeFilter === cat.id ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 10, padding: '8px 14px', whiteSpace: 'nowrap' }}
                            >{cat.icon} {cat.name}</button>
                        ))}
                    </div>
                </div>

                {/* Items Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, paddingBottom: 24 }}>
                    {filtered.map((item, idx) => (
                        <div key={item.id} className="animate-fade-in" style={{
                            background: item.status === 'Ativo' ? 'var(--bg-card)' : 'rgba(239,68,68,0.03)',
                            border: `1px solid ${item.status === 'Ativo' ? 'var(--border-color)' : 'rgba(239,68,68,0.1)'}`,
                            borderRadius: 20,
                            padding: 24,
                            transition: 'all 0.2s ease',
                            animationDelay: `${idx * 0.03}s`,
                            opacity: 0,
                            position: 'relative',
                        }}
                        >
                            {/* Status badge */}
                            <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                <span className={`badge ${item.status === 'Ativo' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 8 }}>
                                    {item.status}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                    background: 'rgba(234,29,44,0.08)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 24,
                                }}>
                                    {item.categories?.icon || '🍔'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h4>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.categories?.name}</p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.03em' }}>R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}</p>
                                <span className={`badge ${(item.stock_quantity || 0) < 5 ? 'badge-danger' : 'badge-info'}`}>
                                    Est: {item.stock_quantity || 0}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => openEdit(item)} className="btn btn-ghost" style={{ flex: 1, fontSize: 10, padding: '10px 0' }}>
                                    ✏️ Editar
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="btn btn-ghost" style={{ fontSize: 10, padding: '10px 12px', color: '#f87171', borderColor: 'rgba(239,68,68,0.2)' }}>
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in-scale" style={{ maxWidth: 480 }}>
                        <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{editItem ? 'Editar Item' : 'Novo Item'}</h2>
                                <button onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 18 }}>✕</button>
                            </div>
                        </div>

                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Nome do Produto *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}
                                    placeholder="Ex: X-Burger Especial"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Preço (R$) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Estoque Inicial</label>
                                    <input
                                        type="number"
                                        value={formData.stock_quantity}
                                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Categoria *</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}
                                    >
                                        <option value="">Selecionar...</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}
                                    >
                                        <option value="Ativo">Ativo</option>
                                        <option value="Inativo">Inativo</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
                            <button onClick={() => setModalOpen(false)} className="btn btn-ghost" style={{ flex: 1, padding: '14px 0' }}>Cancelar</button>
                            <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2, padding: '14px 0' }}>
                                {editItem ? 'Salvar Alterações' : 'Criar Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
