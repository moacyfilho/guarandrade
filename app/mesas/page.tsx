"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Mesas() {
    const router = useRouter();
    const [tables, setTables] = useState<any[]>([]);
    const [counterOrders, setCounterOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiptModal, setReceiptModal] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        const { data: tablesData } = await supabase
            .from('tables')
            .select('*')
            .order('id', { ascending: true });

        const { data: counterData } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    products (name)
                )
            `)
            .is('table_id', null)
            .neq('status', 'finalizado')
            .order('created_at', { ascending: false });

        const { data: activeOrders } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id
                )
            `)
            .eq('status', 'fila');

        const tableOrdersFilter = activeOrders?.filter(o => o.table_id !== null) || [];

        if (tablesData) {
            // Calculate real total for each table
            const tablesWithRealTotal = tablesData.map(table => {
                if (table.status !== 'occupied') return table;

                const tableOrders = tableOrdersFilter.filter(o => o.table_id === table.id);
                const realTotal = tableOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

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

    useEffect(() => {
        fetchData();

        const tablesChannel = supabase
            .channel('public:tables')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => fetchData())
            .subscribe();

        const ordersChannel = supabase
            .channel('public:orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(tablesChannel);
            supabase.removeChannel(ordersChannel);
        };
    }, []);

    const handleOpenReceipt = async (table: any, isCounter: boolean = false) => {
        if (!isCounter && table.status !== 'occupied') return;

        if (isCounter) {
            setReceiptModal({
                table: { id: 'Balcão', name: 'Venda Balcão', isCounter: true },
                order: { items: table.order_items, total_amount: table.total_amount, originalOrders: [table] }
            });
            return;
        }

        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items (*, products (name))`)
            .eq('table_id', table.id)
            .neq('status', 'finalizado');

        if (error) {
            alert('Erro ao carregar conta: ' + error.message);
            return;
        }

        if (data && data.length > 0) {
            const validOrders = data.filter(o => o.order_items && o.order_items.length > 0);
            const allItems = validOrders.flatMap(o => o.order_items);
            const totalAmount = validOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

            setReceiptModal({
                table,
                order: { items: allItems, total_amount: totalAmount, originalOrders: validOrders }
            });
        } else {
            alert('Não foi possível encontrar um pedido ativo para esta mesa.');
        }
    };

    const handleFecharConta = async () => {
        if (!receiptModal) return;

        const { table, order } = receiptModal;
        const orderIds = order.originalOrders.map((o: any) => o.id);

        try {
            await supabase
                .from('orders')
                .update({ status: 'finalizado' })
                .in('id', orderIds);

            if (!table.isCounter) {
                await supabase
                    .from('tables')
                    .update({ status: 'dirty', total_amount: 0 })
                    .eq('id', table.id);
            }

            setReceiptModal(null);
            fetchData();
            alert(table.isCounter ? 'Venda Balcão finalizada! 🛍️' : `Mesa ${table.id} fechada com sucesso! 💰`);
            if (!table.isCounter) router.push('/');
        } catch (err) {
            alert('Erro ao fechar conta.');
        }
    };

    const handleLiberarMesa = async (id: number) => {
        const { error } = await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', id);

        if (!error) fetchData();
    };

    const handleAddItems = (tableId: number) => {
        router.push(`/pdv?table=${tableId}`);
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
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Gestão de Mesas 🍽️
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            Monitore e gerencie o status de cada mesa.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', marginRight: 8 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot status-dot-success" /> {availableCount} Livres</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot status-dot-danger" /> {occupiedCount} Ocupadas</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot status-dot-warning" /> {dirtyCount} Limpeza</span>
                        </div>
                        <button onClick={() => fetchData()} className="btn btn-ghost">🔄 Atualizar</button>
                    </div>
                </header>

                {/* Counter Orders */}
                {counterOrders.length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                        <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--price-color)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            🛍️ Pedidos de Balcão Ativos
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                            {counterOrders.map((order, idx) => (
                                <div key={order.id} className="animate-fade-in" style={{
                                    background: 'rgba(234,29,44,0.04)',
                                    border: '1px solid rgba(234,29,44,0.15)',
                                    borderRadius: 20,
                                    padding: 20,
                                    animationDelay: `${idx * 0.05}s`,
                                    opacity: 0,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>#{order.id.slice(0, 4)}</span>
                                        <span className="badge badge-success" style={{ fontSize: 10 }}>
                                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: 16 }}>
                                        <p style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>R$ {parseFloat(order.total_amount).toFixed(2).replace('.', ',')}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{order.order_items?.length} itens</p>
                                    </div>
                                    <button
                                        onClick={() => handleOpenReceipt(order, true)}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '12px 0' }}
                                    >
                                        Finalizar / Ver
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tables Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, paddingBottom: 24 }}>
                    {tables.map((table, idx) => {
                        const statusColor = table.status === 'occupied' ? 'var(--danger)' : table.status === 'dirty' ? 'var(--warning)' : 'var(--success)';
                        const statusBg = table.status === 'occupied' ? 'rgba(234, 29, 44, 0.06)' : table.status === 'dirty' ? 'rgba(255, 184, 77, 0.06)' : 'rgba(80, 167, 115, 0.04)';

                        return (
                            <div
                                key={table.id}
                                className="animate-fade-in"
                                style={{
                                    background: statusBg,
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 20,
                                    padding: 24,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.25s ease',
                                    animationDelay: `${idx * 0.03}s`,
                                    opacity: 0,
                                }}
                            >
                                {/* Status indicator bar */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    width: 4,
                                    height: '100%',
                                    background: statusColor,
                                    boxShadow: `0 0 12px ${statusColor}50`,
                                }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div>
                                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>{table.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className={`status-dot ${table.status === 'occupied' ? 'status-dot-danger' : table.status === 'dirty' ? 'status-dot-warning' : 'status-dot-success'}`} />
                                            <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {table.status === 'occupied' ? 'Ocupada' : table.status === 'dirty' ? 'Limpeza' : 'Livre'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 28 }}>
                                        {table.status === 'occupied' ? '🔥' : table.status === 'dirty' ? '🧹' : '🪑'}
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    {table.status === 'occupied' ? (
                                        <div>
                                            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Acumulado:</p>
                                            <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.03em' }}>R$ {parseFloat(table.total_amount).toFixed(2).replace('.', ',')}</p>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 11, color: 'var(--text-faint)', fontWeight: 600 }}>Pronta para uso</p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {table.status === 'occupied' ? (
                                        <>
                                            <button
                                                onClick={() => handleAddItems(table.id)}
                                                className="btn btn-primary"
                                                style={{ width: '100%', padding: '12px 0' }}
                                            >
                                                + Lançar Itens
                                            </button>
                                            <button
                                                onClick={() => handleOpenReceipt(table)}
                                                className="btn btn-ghost"
                                                style={{ width: '100%', padding: '12px 0' }}
                                            >
                                                Ver Itens / Fechar
                                            </button>
                                        </>
                                    ) : table.status === 'dirty' ? (
                                        <button
                                            onClick={() => handleLiberarMesa(table.id)}
                                            style={{
                                                width: '100%',
                                                padding: '12px 0',
                                                borderRadius: 12,
                                                border: 'none',
                                                background: 'linear-gradient(135deg, var(--warning), #d97706)',
                                                color: 'var(--text-primary)',
                                                fontWeight: 800,
                                                fontSize: 11,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            ✔ Confirmar Limpeza
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAddItems(table.id)}
                                            className="btn btn-success"
                                            style={{ width: '100%', padding: '12px 0' }}
                                        >
                                            Abrir Mesa
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Receipt Modal */}
            {receiptModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-fade-in-scale">
                        <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)', textAlign: 'center', background: 'var(--bg-card)', position: 'relative' }}>
                            <button
                                onClick={() => setReceiptModal(null)}
                                style={{ position: 'absolute', top: 16, right: 16, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 18 }}
                            >✕</button>
                            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Resumo da Conta</h2>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--price-color)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>{receiptModal.table.name}</p>
                        </div>

                        <div style={{ padding: 24, maxHeight: '40vh', overflowY: 'auto' }}>
                            {receiptModal.order.items.map((item: any, i: number) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 0',
                                    borderBottom: i < receiptModal.order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.quantity}x {item.products?.name || 'Produto'}</p>
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>Unidade: R$ {parseFloat(item.unit_price || 0).toFixed(2).replace('.', ',')}</p>
                                    </div>
                                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>R$ {(item.quantity * (item.unit_price || 0)).toFixed(2).replace('.', ',')}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: 24, background: 'var(--bg-card)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 16, marginBottom: 20 }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Total a Pagar</span>
                                <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--price-color)', fontFamily: 'monospace' }}>R$ {parseFloat(receiptModal.order.total_amount).toFixed(2).replace('.', ',')}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {!receiptModal.table.isCounter && (
                                    <button
                                        onClick={() => { handleAddItems(receiptModal.table.id); setReceiptModal(null); }}
                                        className="btn btn-ghost"
                                        style={{ width: '100%', padding: '14px 0' }}
                                    >
                                        Continuar Lançando
                                    </button>
                                )}
                                <button
                                    onClick={() => handleFecharConta()}
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '14px 0' }}
                                >
                                    💰 Confirmar Pagamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
