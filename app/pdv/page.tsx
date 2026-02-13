"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

function PDVContent() {
    const searchParams = useSearchParams();
    const tableParam = searchParams.get('table');

    const [activeCategory, setActiveCategory] = useState({ id: 'all', name: 'Todos' });
    const [categories, setCategories] = useState<any[]>([]);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [cart, setCart] = useState<{ item: any, qty: number }[]>([]);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const [categoriesRes, productsRes, tablesRes] = await Promise.all([
                supabase.from('categories').select('*').order('name'),
                supabase.from('products').select('*').eq('status', 'Ativo'),
                supabase.from('tables').select('*').order('id', { ascending: true })
            ]);

            if (categoriesRes.data) setCategories(categoriesRes.data);
            if (productsRes.data) setMenuItems(productsRes.data);
            if (tablesRes.data) setTables(tablesRes.data);

            if (tableParam) {
                setSelectedTable(parseInt(tableParam));
            }
        };
        fetchData();
    }, [tableParam]);

    const addToCart = (item: any, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(c => c.item.id === item.id);
            if (existing) {
                return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + quantity } : c);
            } else {
                return [...prev, { item, qty: quantity }];
            }
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.map(c => {
            if (c.item.id === itemId) return { ...c, qty: c.qty - 1 };
            return c;
        }).filter(c => c.qty > 0));
    };

    const total = cart.reduce((acc, curr) => acc + (parseFloat(curr.item.price) * curr.qty), 0);

    const finalizarPedido = async () => {
        if (!selectedTable) {
            alert('Por favor, selecione uma mesa antes de lançar o pedido.');
            return;
        }
        if (cart.length === 0) return;
        setIsSubmitting(true);

        try {
            const isCounterSale = selectedTable === 999;
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    table_id: isCounterSale ? null : selectedTable,
                    status: 'fila',
                    total_amount: total
                })
                .select()
                .single();

            if (orderError) throw orderError;

            const itemsToInsert = cart.map(c => ({
                order_id: order.id,
                product_id: c.item.id,
                quantity: c.qty,
                unit_price: parseFloat(c.item.price)
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error('Error inserting items, rolling back order:', order.id);
                await supabase.from('orders').delete().eq('id', order.id);
                throw itemsError;
            }

            // Decrement Stock
            for (const c of cart) {
                const newStock = (c.item.stock_quantity || 0) - c.qty;
                await supabase.from('products').update({ stock_quantity: newStock }).eq('id', c.item.id);
            }

            if (!isCounterSale) {
                const currentTable = tables.find(t => t.id === selectedTable);
                const newTotal = (parseFloat(currentTable?.total_amount || 0) + total);

                await supabase
                    .from('tables')
                    .update({ status: 'occupied', total_amount: newTotal })
                    .eq('id', selectedTable);
            }

            alert(isCounterSale ? 'Venda Balcão registrada! 🛍️' : `Pedido lançado para Mesa ${selectedTable}! 🍳`);
            setCart([]);

            // Refetch data
            const { data: updatedTables } = await supabase.from('tables').select('*').order('id', { ascending: true });
            if (updatedTables) setTables(updatedTables);
            const { data: updatedProducts } = await supabase.from('products').select('*').eq('status', 'Ativo');
            if (updatedProducts) setMenuItems(updatedProducts);

        } catch (error: any) {
            alert('Erro: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getProductIcon = (item: any) => {
        const cat = categories.find(c => c.id === item.category_id);
        return cat?.icon || '🍔';
    };

    return (
        <>
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                {/* Header */}
                <header style={{ display: 'flex', alignItems: 'center', padding: '4px 0', gap: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>PDV Guarandrade 🛒</h1>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                            {selectedTable === 999 ? 'Venda Balcão Selecionada' : selectedTable ? `Mesa ${selectedTable} Selecionada` : 'Selecione uma mesa'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0, paddingBottom: 4 }} className="scrollbar-thin">
                        <button
                            onClick={() => setActiveCategory({ id: 'all', name: 'Todos' })}
                            className={`btn ${activeCategory.id === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ fontSize: 10, padding: '8px 14px', whiteSpace: 'nowrap' }}
                        >Todos</button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat)}
                                className={`btn ${activeCategory.id === cat.id ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ fontSize: 10, padding: '8px 14px', whiteSpace: 'nowrap' }}
                            >{cat.icon} {cat.name}</button>
                        ))}
                    </div>
                </header>

                {/* Products Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
                    gap: 12,
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    alignContent: 'start',
                    paddingRight: 8,
                    paddingBottom: 16,
                }} className="scrollbar-hide">
                    {menuItems.filter(i => activeCategory.id === 'all' || i.category_id === activeCategory.id).map((item, idx) => (
                        <div
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="animate-fade-in"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 16,
                                padding: 16,
                                cursor: 'pointer',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 10,
                                transition: 'all 0.2s ease',
                                animationDelay: `${idx * 0.02}s`,
                                opacity: 0,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: 'var(--bg-card)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 26,
                                transition: 'transform 0.2s ease',
                            }}>
                                {getProductIcon(item)}
                            </div>
                            <div style={{ width: '100%' }}>
                                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.02em' }}>R$ {parseFloat(item.price).toFixed(2).replace('.', ',')}</span>
                                    <span className={`badge ${(item.stock_quantity || 0) > 0 ? 'badge-info' : 'badge-danger'}`} style={{ fontSize: 8, padding: '2px 6px' }}>
                                        {item.stock_quantity || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Cart Sidebar */}
            <aside style={{
                width: 300,
                background: 'var(--bg-card)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 20,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                flexShrink: 0,
            }}>
                {/* Table Selector */}
                <div style={{ padding: 16, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Mesa Atual</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, maxHeight: 100, overflowY: 'auto' }} className="scrollbar-hide">
                        <button
                            onClick={() => setSelectedTable(999)}
                            style={{
                                padding: '8px 0',
                                fontSize: 10,
                                fontWeight: 800,
                                borderRadius: 10,
                                border: selectedTable === 999 ? '1px solid rgba(234, 29, 44, 0.5)' : '1px solid var(--border-color)',
                                background: selectedTable === 999 ? 'linear-gradient(135deg, var(--primary), var(--primary-glow))' : 'var(--bg-card)',
                                color: selectedTable === 999 ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            }}
                        >👋 Bal</button>
                        {tables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(table.id)}
                                style={{
                                    padding: '8px 0',
                                    fontSize: 11,
                                    fontWeight: 800,
                                    borderRadius: 10,
                                    border: selectedTable === table.id ? '1px solid rgba(234, 29, 44, 0.5)' : '1px solid var(--border-color)',
                                    background: selectedTable === table.id ? 'linear-gradient(135deg, var(--primary), var(--primary-glow))' : table.status === 'occupied' ? 'rgba(234, 29, 44, 0.08)' : 'var(--bg-card)',
                                    color: selectedTable === table.id ? 'white' : table.status === 'occupied' ? 'var(--danger)' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {table.id}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cart Items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }} className="scrollbar-hide">
                    {cart.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.2 }}>
                            <span style={{ fontSize: 48, marginBottom: 12 }} className="animate-pulse">🛒</span>
                            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                Selecione produtos<br />para adicionar ao pedido
                            </p>
                        </div>
                    ) : (
                        cart.map(c => (
                            <div key={c.item.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'var(--bg-card)',
                                padding: 10,
                                borderRadius: 14,
                                border: '1px solid var(--border-subtle)',
                                transition: 'border-color 0.15s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{getProductIcon(c.item)}</div>
                                    <div style={{ maxWidth: 90 }}>
                                        <h5 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{c.item.name}</h5>
                                        <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'monospace' }}>R$ {parseFloat(c.item.price).toFixed(2)}</p>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'var(--hover-overlay)',
                                    padding: '4px 6px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-color)',
                                }}>
                                    <button
                                        onClick={() => removeFromCart(c.item.id)}
                                        style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--danger)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(234, 29, 44, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >-</button>
                                    <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--text-primary)', width: 18, textAlign: 'center' }}>{c.qty}</span>
                                    <button
                                        onClick={() => addToCart(c.item)}
                                        style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--success)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(80, 167, 115, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                    >+</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: 16, borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Pedido:</span>
                        <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.03em', fontFamily: 'monospace' }}>R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button
                        onClick={finalizarPedido}
                        disabled={cart.length === 0 || !selectedTable || isSubmitting}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '16px 0',
                            opacity: (cart.length === 0 || !selectedTable) ? 0.4 : 1,
                            cursor: (cart.length === 0 || !selectedTable || isSubmitting) ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isSubmitting ? 'Enviando...' : !selectedTable ? 'Selecione uma Mesa' : selectedTable === 999 ? 'Finalizar Balcão 🛍️' : 'Lançar Pedido 🚀'}
                    </button>
                </div>
            </aside>
        </>
    );
}

export default function PDV() {
    return (
        <div style={{ display: 'flex', height: '100%', padding: '4px 16px 16px 16px', gap: 16 }}>
            <div style={{ flexShrink: 0, zIndex: 100 }}>
                <Sidebar />
            </div>
            <div style={{ flex: 1, display: 'flex', gap: 16, minWidth: 0, minHeight: 0, position: 'relative', zIndex: 0 }}>
                <Suspense fallback={
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <div style={{ fontSize: 40 }}>🛒</div>
                            <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Iniciando PDV...</p>
                        </div>
                    </div>
                }>
                    <PDVContent />
                </Suspense>
            </div>
        </div>
    );
}
