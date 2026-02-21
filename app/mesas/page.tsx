"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Product {
    id: string;
    name: string;
    price: string | number;
    category_id?: string;
}

interface OrderItem {
    id?: string;
    quantity: number;
    unit_price: number;
    products?: { name: string };
}

interface Order {
    id: string;
    status: string;
    total_amount: number;
    table_id: number | null;
    created_at: string;
    order_items?: OrderItem[];
}

interface Table {
    id: number;
    name: string;
    status: 'available' | 'occupied' | 'dirty';
    total_amount: number;
}

// ─── Product Search Modal ──────────────────────────────────────────────────
function ProductSearchModal({
    table,
    onClose,
    onSuccess,
}: {
    table: Table;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [products, setProducts] = useState<Product[]>([]);
    const [query, setQuery] = useState('');
    const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        supabase
            .from('products')
            .select('id, name, price, category_id')
            .order('name', { ascending: true })
            .then(({ data }) => {
                if (data) setProducts(data);
            });
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const filtered = query.trim()
        ? products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase())
        )
        : products;

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(c => c.product.id === product.id);
            if (existing) {
                return prev.map(c =>
                    c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
                );
            }
            return [...prev, { product, qty: 1 }];
        });
    };

    const changeQty = (productId: string, delta: number) => {
        setCart(prev =>
            prev
                .map(c => c.product.id === productId ? { ...c, qty: c.qty + delta } : c)
                .filter(c => c.qty > 0)
        );
    };

    const cartTotal = cart.reduce(
        (acc, c) => acc + Number(c.product.price) * c.qty,
        0
    );

    const handleConfirm = async () => {
        if (cart.length === 0 || saving) return;
        setSaving(true);

        try {
            // 1. Sempre busca FRESH no banco se já existe pedido ativo para esta mesa
            //    (ignora o status local do objeto table que pode estar desatualizado)
            const { data: existingOrders } = await supabase
                .from('orders')
                .select('id')
                .eq('table_id', table.id)
                .neq('status', 'finalizado')
                .order('created_at', { ascending: true }) // pega o mais antigo
                .limit(1);

            let orderId: string;

            if (existingOrders && existingOrders.length > 0) {
                // Reusa o pedido já existente — NÃO cria novo
                orderId = existingOrders[0].id;
            } else {
                // Cria pedido novo (mesa sem nenhum pedido ativo)
                const { data: newOrder, error: orderErr } = await supabase
                    .from('orders')
                    .insert({ table_id: table.id, status: 'fila', total_amount: 0 })
                    .select('id')
                    .single();

                if (orderErr || !newOrder) throw new Error('Erro ao criar pedido: ' + orderErr?.message);
                orderId = newOrder.id;
            }

            // 2. Insere os itens no pedido
            const items = cart.map(c => ({
                order_id: orderId,
                product_id: c.product.id,
                quantity: c.qty,
                unit_price: Number(c.product.price),
            }));

            const { error: itemsErr } = await supabase
                .from('order_items')
                .insert(items);

            if (itemsErr) throw new Error('Erro ao inserir itens: ' + itemsErr.message);

            // 3. Recalcula o total do pedido diretamente dos itens (source of truth)
            const { data: allItems } = await supabase
                .from('order_items')
                .select('quantity, unit_price')
                .eq('order_id', orderId);

            const orderTotal = (allItems || []).reduce(
                (acc, i) => acc + (Number(i.unit_price) * Number(i.quantity)), 0
            );

            await supabase
                .from('orders')
                .update({ total_amount: orderTotal, status: 'fila' })
                .eq('id', orderId);

            // 4. Atualiza o total da mesa somando todos os pedidos ativos
            const { data: activeOrdersForTable } = await supabase
                .from('orders')
                .select('total_amount')
                .eq('table_id', table.id)
                .neq('status', 'finalizado');

            const tableTotal = (activeOrdersForTable || []).reduce(
                (acc, o) => acc + Number(o.total_amount || 0), 0
            );

            await supabase
                .from('tables')
                .update({ status: 'occupied', total_amount: tableTotal })
                .eq('id', table.id);

            onSuccess();
            onClose();
        } catch (err: any) {
            alert(err.message || 'Erro ao lançar itens');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="animate-fade-in-scale"
                style={{
                    background: '#0d0d0d',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 24,
                    width: '100%',
                    maxWidth: 500,
                    maxHeight: '90dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                                🔍 Lançar Itens
                            </h2>
                            <p style={{ fontSize: 11, color: 'var(--price-color)', fontWeight: 700, marginTop: 2 }}>
                                {table.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: 'var(--text-muted)', cursor: 'pointer',
                                fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >✕</button>
                    </div>

                    {/* Search input */}
                    <div style={{ position: 'relative' }}>
                        <span style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            fontSize: 14, pointerEvents: 'none', opacity: 0.4,
                        }}>🔍</span>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Buscar produto..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '11px 12px 11px 36px',
                                borderRadius: 12,
                                fontSize: 14,
                                fontWeight: 500,
                            }}
                        />
                    </div>
                </div>

                {/* Product list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Nenhum produto encontrado
                        </div>
                    ) : (
                        filtered.map(p => {
                            const inCart = cart.find(c => c.product.id === p.id);
                            return (
                                <div
                                    key={p.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 8px',
                                        borderRadius: 12,
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        transition: 'background 0.15s',
                                        background: inCart ? 'rgba(234,29,44,0.06)' : 'transparent',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</p>
                                        <p style={{ fontSize: 11, color: 'var(--price-color)', fontWeight: 800, marginTop: 1 }}>
                                            R$ {Number(p.price).toFixed(2).replace('.', ',')}
                                        </p>
                                    </div>

                                    {inCart ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button
                                                onClick={() => changeQty(p.id, -1)}
                                                style={{
                                                    width: 30, height: 30, borderRadius: 8,
                                                    background: 'rgba(255,255,255,0.08)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: '#fff', cursor: 'pointer', fontSize: 16,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >−</button>
                                            <span style={{ fontSize: 15, fontWeight: 800, minWidth: 20, textAlign: 'center' }}>
                                                {inCart.qty}
                                            </span>
                                            <button
                                                onClick={() => changeQty(p.id, 1)}
                                                style={{
                                                    width: 30, height: 30, borderRadius: 8,
                                                    background: 'linear-gradient(135deg, #EA1D2C, #C8101E)',
                                                    border: 'none',
                                                    color: '#fff', cursor: 'pointer', fontSize: 16,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 2px 8px rgba(234,29,44,0.4)',
                                                }}
                                            >+</button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => addToCart(p)}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: 10,
                                                background: 'rgba(234,29,44,0.12)',
                                                border: '1px solid rgba(234,29,44,0.25)',
                                                color: 'var(--price-color)',
                                                fontSize: 12, fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >+ Add</button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Cart footer */}
                {cart.length > 0 && (
                    <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        padding: 16,
                        background: 'rgba(255,255,255,0.02)',
                        flexShrink: 0,
                    }}>
                        {/* Cart summary */}
                        <div style={{ marginBottom: 12 }}>
                            {cart.map(c => (
                                <div key={c.product.id} style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: 12, color: 'var(--text-secondary)',
                                    padding: '3px 0',
                                }}>
                                    <span>{c.qty}× {c.product.name}</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                        R$ {(Number(c.product.price) * c.qty).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            ))}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                marginTop: 8, paddingTop: 8,
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>Total a lançar</span>
                                <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--price-color)', fontFamily: 'monospace' }}>
                                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={saving}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '14px 0', fontSize: 13, opacity: saving ? 0.7 : 1 }}
                        >
                            {saving ? '⏳ Lançando...' : `✅ Confirmar Lançamento (${cart.length} ${cart.length === 1 ? 'item' : 'itens'})`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Mesas() {
    const router = useRouter();
    const [tables, setTables] = useState<Table[]>([]);
    const [counterOrders, setCounterOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiptModal, setReceiptModal] = useState<any>(null);
    const [loadingReceipt, setLoadingReceipt] = useState<number | null>(null);
    const [searchModal, setSearchModal] = useState<Table | null>(null); // Table being served

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        const { data: tablesData } = await supabase
            .from('tables')
            .select('*')
            .order('id', { ascending: true });

        const { data: counterData } = await supabase
            .from('orders')
            .select(`*, order_items (*, products (name))`)
            .is('table_id', null)
            .neq('status', 'finalizado')
            .order('created_at', { ascending: false });

        const { data: activeOrders } = await supabase
            .from('orders')
            .select(`*, order_items (id)`)
            .neq('status', 'finalizado');

        const tableOrdersFilter = activeOrders?.filter(o => o.table_id !== null) || [];

        if (tablesData) {
            const tablesWithRealTotal = tablesData.map((table: any) => {
                const tableOrders = tableOrdersFilter.filter(o => o.table_id === table.id);
                const hasActiveOrders = tableOrders.length > 0;
                const realTotal = tableOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

                // Auto-correct: if table has active orders but wrong status, fix it silently
                if (hasActiveOrders && table.status !== 'occupied') {
                    supabase.from('tables')
                        .update({ status: 'occupied', total_amount: realTotal })
                        .eq('id', table.id)
                        .then(() => { }); // fire-and-forget
                    return { ...table, status: 'occupied', total_amount: realTotal };
                }

                // Auto-correct: if table is 'occupied' but has NO active orders, mark as dirty
                if (!hasActiveOrders && table.status === 'occupied') {
                    supabase.from('tables')
                        .update({ status: 'dirty', total_amount: 0 })
                        .eq('id', table.id)
                        .then(() => { });
                    return { ...table, status: 'dirty', total_amount: 0 };
                }

                if (table.status !== 'occupied') return table;
                return { ...table, total_amount: realTotal };
            });
            setTables(tablesWithRealTotal);
        }

        if (counterData) {
            const validCounterOrders = counterData.filter(o => o.order_items && o.order_items.length > 0);
            setCounterOrders(validCounterOrders);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(true); }, []);

    useRealtimeSync(() => fetchData(false), {
        channelName: 'mesas_realtime',
        tables: ['tables', 'orders', 'order_items'],
        pollInterval: 4000,
    });

    const handleOpenReceipt = async (table: any, isCounter: boolean = false) => {
        if (!isCounter && table.status !== 'occupied') return;

        if (isCounter) {
            const counterTotal = (table.order_items || []).reduce(
                (acc: number, item: any) => acc + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0
            );
            setReceiptModal({
                table: { id: 'Balcão', name: 'Venda Balcão', isCounter: true },
                order: { items: table.order_items, total_amount: counterTotal, originalOrders: [table] }
            });
            return;
        }

        setLoadingReceipt(table.id);
        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items (*, products (name))`)
            .eq('table_id', table.id)
            .neq('status', 'finalizado');

        setLoadingReceipt(null);

        if (error) { alert('Erro ao carregar conta: ' + error.message); return; }

        if (data && data.length > 0) {
            const allItems = data.flatMap(o => o.order_items || []);
            if (allItems.length === 0) {
                if (confirm('Mesa com pedidos sem itens. Deseja liberar a mesa?')) {
                    await supabase.from('tables').update({ status: 'available', total_amount: 0 }).eq('id', table.id);
                    fetchData();
                }
                return;
            }
            const totalFromItems = allItems.reduce(
                (acc, item) => acc + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0
            );
            setReceiptModal({
                table,
                order: { items: allItems, total_amount: totalFromItems, originalOrders: data }
            });
            supabase.from('tables').update({ total_amount: totalFromItems }).eq('id', table.id)
                .then(() => {
                    setTables(prev => prev.map(t => t.id === table.id ? { ...t, total_amount: totalFromItems } : t));
                });
        } else {
            if (confirm('Nenhum pedido ativo encontrado. Deseja liberar a mesa?')) {
                await supabase.from('tables').update({ status: 'available', total_amount: 0 }).eq('id', table.id);
                fetchData();
            }
        }
    };

    const handleFecharConta = async () => {
        if (!receiptModal) return;
        const { table, order } = receiptModal;
        const orderIds = order.originalOrders.map((o: any) => o.id);
        try {
            await supabase.from('orders').update({ status: 'finalizado' }).in('id', orderIds);
            if (!table.isCounter) {
                await supabase.from('tables').update({ status: 'dirty', total_amount: 0 }).eq('id', table.id);
            }
            setReceiptModal(null);
            fetchData();
            alert(table.isCounter ? 'Venda Balcão finalizada! 🛍️' : `Mesa ${table.id} fechada com sucesso! 💰`);
            if (!table.isCounter) router.push('/');
        } catch {
            alert('Erro ao fechar conta.');
        }
    };

    const handleLiberarMesa = async (id: number) => {
        await supabase.from('tables').update({ status: 'available' }).eq('id', id);
        fetchData();
    };

    const occupiedCount = tables.filter(t => t.status === 'occupied').length;
    const dirtyCount = tables.filter(t => t.status === 'dirty').length;
    const availableCount = tables.filter(t => t.status === 'available').length;

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40 }}>🍽️</div>
                <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Carregando mesas...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', padding: 16, gap: 16, position: 'relative' }}>
            <Sidebar />

            <main style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>

                {/* ── Header ── */}
                <header style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', marginBottom: 20, flexWrap: 'wrap', gap: 12,
                }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Gestão de Mesas 🍽️
                        </h1>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Monitore e gerencie o status de cada mesa.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Status pills */}
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'rgba(80,167,115,0.1)', border: '1px solid rgba(80,167,115,0.2)',
                                borderRadius: 20, padding: '4px 10px', fontWeight: 700,
                            }}>
                                <span className="status-dot status-dot-success" /> {availableCount} Livres
                            </span>
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'rgba(234,29,44,0.1)', border: '1px solid rgba(234,29,44,0.2)',
                                borderRadius: 20, padding: '4px 10px', fontWeight: 700,
                            }}>
                                <span className="status-dot status-dot-danger" /> {occupiedCount} Ocupadas
                            </span>
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: 'rgba(255,184,77,0.1)', border: '1px solid rgba(255,184,77,0.2)',
                                borderRadius: 20, padding: '4px 10px', fontWeight: 700,
                            }}>
                                <span className="status-dot status-dot-warning" /> {dirtyCount} Limpeza
                            </span>
                        </div>
                        <button onClick={() => fetchData()} className="btn btn-ghost">🔄 Atualizar</button>
                    </div>
                </header>

                {/* ── Counter Orders ── */}
                {counterOrders.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 12, fontWeight: 800, color: 'var(--price-color)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                            🛍️ Pedidos de Balcão Ativos
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                            {counterOrders.map((order, idx) => (
                                <div key={order.id} className="animate-fade-in" style={{
                                    background: 'rgba(234,29,44,0.04)',
                                    border: '1px solid rgba(234,29,44,0.15)',
                                    borderRadius: 16, padding: 16,
                                    animationDelay: `${idx * 0.05}s`, opacity: 0,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>#{order.id.slice(0, 4)}</span>
                                        <span className="badge badge-success" style={{ fontSize: 10 }}>
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                                        R$ {parseFloat(order.total_amount).toFixed(2).replace('.', ',')}
                                    </p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 12px' }}>{order.order_items?.length} itens</p>
                                    <button
                                        onClick={() => handleOpenReceipt(order, true)}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '10px 0' }}
                                    >Finalizar / Ver</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tables Grid ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 12,
                    paddingBottom: 32,
                }}>
                    {tables.map((table, idx) => {
                        const isOccupied = table.status === 'occupied';
                        const isDirty = table.status === 'dirty';
                        const statusColor = isOccupied ? 'var(--danger)' : isDirty ? 'var(--warning)' : 'var(--success)';
                        const statusBg = isOccupied ? 'rgba(234,29,44,0.06)' : isDirty ? 'rgba(255,184,77,0.06)' : 'rgba(80,167,115,0.04)';

                        return (
                            <div
                                key={table.id}
                                className="animate-fade-in"
                                style={{
                                    background: statusBg,
                                    border: `1px solid ${isOccupied ? 'rgba(234,29,44,0.2)' : isDirty ? 'rgba(255,184,77,0.2)' : 'var(--border-color)'}`,
                                    borderRadius: 18,
                                    padding: '18px 16px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.25s ease',
                                    animationDelay: `${idx * 0.03}s`,
                                    opacity: 0,
                                }}
                            >
                                {/* Top color bar */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0,
                                    height: 3, background: statusColor,
                                    boxShadow: `0 0 12px ${statusColor}60`,
                                }} />

                                {/* Table header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>{table.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span className={`status-dot ${isOccupied ? 'status-dot-danger' : isDirty ? 'status-dot-warning' : 'status-dot-success'}`} />
                                            <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {isOccupied ? 'Ocupada' : isDirty ? 'Limpeza' : 'Livre'}
                                            </span>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 22 }}>
                                        {isOccupied ? '🔥' : isDirty ? '🧹' : '🪑'}
                                    </span>
                                </div>

                                {/* Total */}
                                <div style={{ marginBottom: 14 }}>
                                    {isOccupied ? (
                                        <div>
                                            <p style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total</p>
                                            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.03em', fontFamily: 'monospace' }}>
                                                R$ {parseFloat(String(table.total_amount)).toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>
                                            {isDirty ? 'Aguardando limpeza' : 'Pronta para uso'}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {isOccupied ? (
                                        <>
                                            {/* Quick search button */}
                                            <button
                                                onClick={() => setSearchModal(table)}
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '10px 0', fontSize: 11 }}
                                            >
                                                🔍 Buscar e Lançar
                                            </button>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    onClick={() => router.push(`/pdv?table=${table.id}`)}
                                                    className="btn btn-ghost"
                                                    style={{ flex: 1, padding: '9px 0', fontSize: 10 }}
                                                >
                                                    PDV
                                                </button>
                                                <button
                                                    onClick={() => handleOpenReceipt(table)}
                                                    className="btn btn-ghost"
                                                    disabled={loadingReceipt === table.id}
                                                    style={{ flex: 1, padding: '9px 0', fontSize: 10, opacity: loadingReceipt === table.id ? 0.6 : 1 }}
                                                >
                                                    {loadingReceipt === table.id ? '⏳' : '🧾 Conta'}
                                                </button>
                                            </div>
                                        </>
                                    ) : isDirty ? (
                                        <button
                                            onClick={() => handleLiberarMesa(table.id)}
                                            style={{
                                                width: '100%', padding: '10px 0',
                                                borderRadius: 10, border: 'none',
                                                background: 'linear-gradient(135deg, var(--warning), #d97706)',
                                                color: '#000', fontWeight: 800,
                                                fontSize: 10, textTransform: 'uppercase',
                                                letterSpacing: '0.06em', cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >✔ Confirmar Limpeza</button>
                                    ) : (
                                        <button
                                            onClick={() => setSearchModal(table)}
                                            className="btn btn-success"
                                            style={{ width: '100%', padding: '10px 0', fontSize: 11 }}
                                        >
                                            🍽️ Abrir Mesa
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* ── Product Search Modal ── */}
            {searchModal && (
                <ProductSearchModal
                    table={searchModal}
                    onClose={() => setSearchModal(null)}
                    onSuccess={() => fetchData(false)}
                />
            )}

            {/* ── Receipt Modal ── */}
            {receiptModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in-scale">
                        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'center', background: 'var(--bg-card)', position: 'relative' }}>
                            <button
                                onClick={() => setReceiptModal(null)}
                                style={{ position: 'absolute', top: 14, right: 14, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 18 }}
                            >✕</button>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Resumo da Conta</h2>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--price-color)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>
                                {receiptModal.table.name}
                            </p>
                        </div>

                        <div style={{ padding: '16px 20px', maxHeight: '40vh', overflowY: 'auto' }}>
                            {receiptModal.order.items.map((item: any, i: number) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '9px 0',
                                    borderBottom: i < receiptModal.order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.quantity}× {item.products?.name || 'Produto'}</p>
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>R$ {parseFloat(item.unit_price || 0).toFixed(2).replace('.', ',')}/un</p>
                                    </div>
                                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                        R$ {(item.quantity * (item.unit_price || 0)).toFixed(2).replace('.', ',')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 14, marginBottom: 16 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Total a Pagar</span>
                                <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--price-color)', fontFamily: 'monospace' }}>
                                    R$ {parseFloat(receiptModal.order.total_amount).toFixed(2).replace('.', ',')}
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {!receiptModal.table.isCounter && (
                                    <>
                                        <button
                                            onClick={() => { setSearchModal(receiptModal.table); setReceiptModal(null); }}
                                            className="btn btn-ghost"
                                            style={{ width: '100%', padding: '12px 0' }}
                                        >🔍 Buscar e Lançar Mais</button>
                                        <button
                                            onClick={() => { router.push(`/pdv?table=${receiptModal.table.id}`); setReceiptModal(null); }}
                                            className="btn btn-ghost"
                                            style={{ width: '100%', padding: '12px 0' }}
                                        >🖥️ Ir para PDV</button>
                                    </>
                                )}
                                <button
                                    onClick={handleFecharConta}
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '14px 0' }}
                                >💰 Confirmar Pagamento</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
