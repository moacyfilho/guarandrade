"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { logger } from '@/lib/logger';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Product {
    id: string;
    name: string;
    price: string | number;
    category_id?: string;
    category_name?: string; // nome da categoria para busca
}

interface OrderItem {
    id?: string;
    order_id?: string;
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
            .select('id, name, price, category_id, categories(name)')
            .order('name', { ascending: true })
            .then(({ data }) => {
                if (data) {
                    // Achatar o campo categories para category_name
                    const normalized = data.map((p: any) => ({
                        ...p,
                        category_name: p.categories?.name || '',
                    }));
                    setProducts(normalized);
                }
            });
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const filtered = query.trim()
        ? products.filter(p => {
            const q = query.toLowerCase();
            // Busca por nome do produto OU nome da categoria
            return (
                p.name.toLowerCase().includes(q) ||
                (p.category_name || '').toLowerCase().includes(q)
            );
        })
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
        logger.info('handleConfirm:start', { table_id: table.id, items_count: cart.length, items: cart.map(c => ({ product_id: c.product.id, name: c.product.name, qty: c.qty })) });

        try {
            // 1. Busca pedido ativo existente (apenas status que aceitam novos itens)
            const { data: existingOrders } = await supabase
                .from('orders')
                .select('id')
                .eq('table_id', table.id)
                .in('status', ['fila', 'preparando', 'pronto'])
                .order('created_at', { ascending: true })
                .limit(1);

            let orderId: string;
            let createdNewOrder = false;

            if (existingOrders && existingOrders.length > 0) {
                orderId = existingOrders[0].id;
                logger.info('handleConfirm:order_reused', { order_id: orderId, table_id: table.id });
            } else {
                const { data: newOrder, error: orderErr } = await supabase
                    .from('orders')
                    .insert({ table_id: table.id, status: 'fila', total_amount: 0 })
                    .select('id')
                    .single();
                if (orderErr || !newOrder) {
                    logger.error('handleConfirm:order_create_failed', { table_id: table.id, error: orderErr?.message });
                    throw new Error('Erro ao criar pedido: ' + orderErr?.message);
                }
                orderId = newOrder.id;
                createdNewOrder = true;
                logger.info('handleConfirm:order_created', { order_id: orderId, table_id: table.id });
            }

            // 2. Insere itens com rollback automático se falhar
            const { error: itemsErr } = await supabase
                .from('order_items')
                .insert(cart.map(c => ({
                    order_id: orderId,
                    product_id: c.product.id,
                    quantity: c.qty,
                    unit_price: Number(c.product.price),
                })));

            if (itemsErr) {
                logger.error('handleConfirm:items_insert_failed', { order_id: orderId, error: itemsErr.message, rollback: createdNewOrder });
                if (createdNewOrder) {
                    await supabase.from('orders').delete().eq('id', orderId);
                    logger.warn('handleConfirm:rollback_done', { order_id: orderId });
                }
                throw new Error('Erro ao inserir itens. Tente novamente.');
            }

            logger.info('handleConfirm:items_inserted', { order_id: orderId, items_count: cart.length });

            // 3. Atualiza mesa para ocupada (total será corrigido pelo fetchData em até 2s)
            await supabase
                .from('tables')
                .update({ status: 'occupied' })
                .eq('id', table.id);

            logger.info('handleConfirm:success', { order_id: orderId, table_id: table.id });
            onSuccess();
            onClose();
        } catch (err: any) {
            logger.error('handleConfirm:catch', { table_id: table.id, error: err?.message });
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                            <p style={{ fontSize: 12, color: 'var(--price-color)', fontWeight: 800 }}>
                                                R$ {Number(p.price).toFixed(2).replace('.', ',')}
                                            </p>
                                            {p.category_name && (
                                                <span style={{
                                                    fontSize: 9, fontWeight: 700,
                                                    color: 'var(--text-muted)',
                                                    background: 'rgba(255,255,255,0.06)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: 6, padding: '1px 6px',
                                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                                }}>
                                                    {p.category_name}
                                                </span>
                                            )}
                                        </div>
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

        // ⚡ Executa as 3 queries em PARALELO (antes era sequencial = 3x mais lento)
        const [
            { data: tablesData },
            { data: counterData },
            { data: activeOrders },
        ] = await Promise.all([
            supabase
                .from('tables')
                .select('*')
                .order('id', { ascending: true }),
            supabase
                .from('orders')
                .select(`*, order_items (*, products (name))`)
                .is('table_id', null)
                .neq('status', 'finalizado')
                .order('created_at', { ascending: false }),
            supabase
                .from('orders')
                .select(`id, table_id, status, total_amount, order_items (unit_price, quantity)`)
                .neq('status', 'finalizado')
                .not('table_id', 'is', null),
        ]);

        const tableOrdersFilter = activeOrders || [];

        if (tablesData) {
            const tablesWithRealTotal = tablesData.map((table: any) => {
                const tableOrders = tableOrdersFilter.filter(o => o.table_id === table.id);
                const allItems = tableOrders.flatMap((o: any) => o.order_items || []);
                const realTotal = allItems.reduce((acc: number, item: any) => acc + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0);
                const hasRealItems = allItems.length > 0;

                // Cleanup: pedidos sem itens são fantasmas — finaliza silenciosamente
                const ghostOrders = tableOrders.filter((o: any) => (o.order_items || []).length === 0);
                if (ghostOrders.length > 0) {
                    const ghostIds = ghostOrders.map((o: any) => o.id);
                    supabase.from('orders').update({ status: 'finalizado' }).in('id', ghostIds).then(() => { });
                }

                // Auto-correct baseado em itens reais, não apenas existência de pedidos
                if (hasRealItems && table.status !== 'occupied') {
                    supabase.from('tables')
                        .update({ status: 'occupied', total_amount: realTotal })
                        .eq('id', table.id)
                        .then(() => { });
                    return { ...table, status: 'occupied', total_amount: realTotal };
                }

                if (!hasRealItems && table.status === 'occupied') {
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
        pollInterval: 2000,
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
        logger.info('handleFecharConta:start', { table_id: table.id, isCounter: table.isCounter, total: order.total_amount, original_orders: order.originalOrders?.length });
        try {
            if (!table.isCounter) {
                const { data: freshOrders } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('table_id', table.id)
                    .neq('status', 'finalizado');
                const idSet = new Set<string>([
                    ...order.originalOrders.map((o: any) => String(o.id)),
                    ...(freshOrders || []).map((o: any) => String(o.id)),
                ]);
                const allIds = Array.from(idSet);
                logger.info('handleFecharConta:finalizing_orders', { table_id: table.id, order_ids: allIds });
                if (allIds.length > 0) {
                    await supabase.from('orders').update({ status: 'finalizado' }).in('id', allIds);
                }
                await supabase.from('tables').update({ status: 'dirty', total_amount: 0 }).eq('id', table.id);
                logger.info('handleFecharConta:table_set_dirty', { table_id: table.id });
            } else {
                const orderIds = order.originalOrders.map((o: any) => o.id);
                logger.info('handleFecharConta:balcao_finalizing', { order_ids: orderIds });
                await supabase.from('orders').update({ status: 'finalizado' }).in('id', orderIds);
            }
            logger.info('handleFecharConta:success', { table_id: table.id, isCounter: table.isCounter });
            setReceiptModal(null);
            fetchData();
            alert(table.isCounter ? 'Venda Balcão finalizada! 🛍️' : `Mesa ${table.id} fechada com sucesso! 💰`);
            if (!table.isCounter) router.push('/');
        } catch (err: any) {
            logger.error('handleFecharConta:error', { table_id: table.id, error: err?.message });
            alert('Erro ao fechar conta.');
        }
    };

    const handleUpdateItemQty = async (item: OrderItem, delta: number) => {
        if (!receiptModal) return;
        const newQty = item.quantity + delta;
        logger.info('handleUpdateItemQty:start', { item_id: item.id, name: item.products?.name, old_qty: item.quantity, delta, new_qty: newQty });

        if (newQty <= 0) {
            logger.info('handleUpdateItemQty:qty_zero_delete', { item_id: item.id });
            await handleDeleteItem(item, false);
            return;
        }
        const updatedItems = receiptModal.order.items.map((i: OrderItem) =>
            i.id === item.id ? { ...i, quantity: newQty } : i
        );
        const newTotal = updatedItems.reduce(
            (acc: number, i: OrderItem) => acc + (Number(i.unit_price || 0) * Number(i.quantity || 0)), 0
        );
        const snapshot = { items: receiptModal.order.items, total_amount: receiptModal.order.total_amount };
        setReceiptModal((prev: any) => ({ ...prev, order: { ...prev.order, items: updatedItems, total_amount: newTotal } }));
        const { error } = await supabase.from('order_items').update({ quantity: newQty }).eq('id', item.id);
        if (error) {
            logger.error('handleUpdateItemQty:update_failed', { item_id: item.id, error: error.message });
            alert('Erro ao atualizar item: ' + error.message);
            setReceiptModal((prev: any) => ({ ...prev, order: { ...prev.order, items: snapshot.items, total_amount: snapshot.total_amount } }));
            return;
        }
        logger.info('handleUpdateItemQty:success', { item_id: item.id, new_qty: newQty, new_total: newTotal });
        if (!receiptModal.table.isCounter) {
            supabase.from('tables').update({ total_amount: newTotal }).eq('id', receiptModal.table.id)
                .then(() => setTables(prev => prev.map(t => t.id === receiptModal.table.id ? { ...t, total_amount: newTotal } : t)));
        }
    };

    const handleDeleteItem = async (item: OrderItem, askConfirm: boolean) => {
        if (!receiptModal) return;
        logger.info('handleDeleteItem:start', { item_id: item.id, name: item.products?.name, askConfirm });
        if (askConfirm && !confirm(`Remover "${item.products?.name || 'este item'}"?`)) {
            logger.info('handleDeleteItem:cancelled_by_user', { item_id: item.id });
            return;
        }
        const updatedItems = receiptModal.order.items.filter((i: OrderItem) => i.id !== item.id);
        const newTotal = updatedItems.reduce(
            (acc: number, i: OrderItem) => acc + (Number(i.unit_price || 0) * Number(i.quantity || 0)), 0
        );
        if (updatedItems.length === 0) {
            logger.info('handleDeleteItem:last_item_removing', { item_id: item.id, table_id: receiptModal.table.id });
            setReceiptModal(null);
            await supabase.from('order_items').delete().eq('id', item.id);
            if (!receiptModal.table.isCounter) {
                const orderIds = receiptModal.order.originalOrders.map((o: any) => o.id);
                if (orderIds.length > 0) {
                    await supabase.from('orders').update({ status: 'finalizado' }).in('id', orderIds);
                    logger.info('handleDeleteItem:orders_finalized', { order_ids: orderIds });
                }
                await supabase.from('tables').update({ status: 'available', total_amount: 0 }).eq('id', receiptModal.table.id);
                setTables(prev => prev.map(t => t.id === receiptModal.table.id ? { ...t, status: 'available', total_amount: 0 } : t));
                logger.info('handleDeleteItem:table_freed', { table_id: receiptModal.table.id });
            }
            return;
        }
        setReceiptModal((prev: any) => ({ ...prev, order: { ...prev.order, items: updatedItems, total_amount: newTotal } }));
        await supabase.from('order_items').delete().eq('id', item.id);
        logger.info('handleDeleteItem:success', { item_id: item.id, remaining_items: updatedItems.length, new_total: newTotal });
        if (!receiptModal.table.isCounter) {
            supabase.from('tables').update({ total_amount: newTotal }).eq('id', receiptModal.table.id)
                .then(() => setTables(prev => prev.map(t => t.id === receiptModal.table.id ? { ...t, total_amount: newTotal } : t)));
        }
    };

    const handleLiberarMesa = async (id: number) => {
        await supabase.from('orders').update({ status: 'finalizado' }).eq('table_id', id).neq('status', 'finalizado');
        await supabase.from('tables').update({ status: 'available', total_amount: 0 }).eq('id', id);
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
        <div className="page-mesas" style={{ display: 'flex', height: '100vh', padding: 16, gap: 16, position: 'relative' }}>
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
                                        <h3 className="mesa-name" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>{table.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span className={`status-dot ${isOccupied ? 'status-dot-danger' : isDirty ? 'status-dot-warning' : 'status-dot-success'}`} />
                                            <span className="mesa-status" style={{ fontSize: 9, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                                            <p className="mesa-total-lbl" style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Total</p>
                                            <p className="mesa-total" style={{ fontSize: 22, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.03em', fontFamily: 'monospace' }}>
                                                R$ {parseFloat(String(table.total_amount)).toFixed(2).replace('.', ',')}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="mesa-msg" style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 500 }}>
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
                                <div key={item.id ?? i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '9px 0',
                                    borderBottom: i < receiptModal.order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                    gap: 8,
                                }}>
                                    {/* Nome + preço unitário */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p className="rcpt-item-name" style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.products?.name || 'Produto'}
                                        </p>
                                        <p className="rcpt-unit-price" style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>R$ {parseFloat(item.unit_price || 0).toFixed(2).replace('.', ',')}/un</p>
                                    </div>
                                    {/* Controles de quantidade */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <button
                                            onClick={() => handleUpdateItemQty(item, -1)}
                                            style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >−</button>
                                        <span className="rcpt-qty" style={{ fontSize: 13, fontWeight: 800, minWidth: 18, textAlign: 'center', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => handleUpdateItemQty(item, +1)}
                                            style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #EA1D2C, #C8101E)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(234,29,44,0.35)' }}
                                        >+</button>
                                    </div>
                                    {/* Total da linha + lixeira */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <span className="rcpt-line-total" style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                            R$ {(item.quantity * (item.unit_price || 0)).toFixed(2).replace('.', ',')}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteItem(item, true)}
                                            title="Remover item"
                                            style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(234,29,44,0.1)', border: '1px solid rgba(234,29,44,0.2)', color: 'var(--danger)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 14, marginBottom: 16 }}>
                                <span className="rcpt-total-lbl" style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Total a Pagar</span>
                                <span className="rcpt-total" style={{ fontSize: 26, fontWeight: 900, color: 'var(--price-color)', fontFamily: 'monospace' }}>
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
