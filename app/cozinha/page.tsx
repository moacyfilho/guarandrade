"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const statusConfig: Record<string, { label: string; btn: string; nextLabel: string; color: string; bg: string; border: string }> = {
    fila: {
        label: 'Na Fila',
        btn: 'linear-gradient(135deg, var(--warning), #d97706)',
        nextLabel: '🔥 Iniciar Preparo',
        color: 'var(--warning)',
        bg: 'rgba(255, 184, 77, 0.05)',
        border: 'rgba(255, 184, 77, 0.2)',
    },
    preparando: {
        label: 'Preparando',
        btn: 'linear-gradient(135deg, var(--success), #3D8B5E)',
        nextLabel: '✅ Marcar Pronto',
        color: 'var(--success)',
        bg: 'rgba(80, 167, 115, 0.05)',
        border: 'rgba(80, 167, 115, 0.2)',
    },
    pronto: {
        label: 'Pronto ✓',
        btn: 'linear-gradient(135deg, var(--primary), var(--primary-glow))',
        nextLabel: '🛎️ Entregar à Mesa',
        color: 'var(--primary)',
        bg: 'rgba(234, 29, 44, 0.05)',
        border: 'rgba(234, 29, 44, 0.2)',
    },
};

export default function Cozinha() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const ordersRef = useRef<any[]>([]);

    const fetchOrders = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        const { data } = await supabase
            .from('orders')
            .select(`*, tables(name), order_items(*, products(name))`)
            // Mostra apenas pedidos ativos na cozinha (entregue e finalizado ficam fora da tela)
            .in('status', ['fila', 'preparando', 'pronto'])
            .order('created_at', { ascending: true });

        if (data) {
            // Detecta novos pedidos para destacar visualmente
            const prev = ordersRef.current;
            if (prev.length > 0) {
                const prevIds = new Set(prev.map((o: any) => o.id));
                const incoming = data.filter((o: any) => !prevIds.has(o.id));
                if (incoming.length > 0) {
                    const ids = new Set(incoming.map((o: any) => o.id as string));
                    setNewOrderIds(ids);
                    setTimeout(() => setNewOrderIds(new Set()), 5000);
                }
            }
            ordersRef.current = data;
            setOrders(data);
            setLastUpdated(new Date());
        }
        setLoading(false);
        setRefreshing(false);
    }, []);

    const handleManualRefresh = () => {
        fetchOrders(true);
    };

    const updateStatus = async (id: string, currentStatus: string) => {
        // 'entregue' = entregue à mesa mas NÃO finalizado (só o caixa finaliza ao cobrar)
        const nextStatus = currentStatus === 'fila' ? 'preparando' : currentStatus === 'preparando' ? 'pronto' : 'entregue';

        // Atualiza o status do pedido
        await supabase.from('orders').update({ status: nextStatus }).eq('id', id);

        // Se o pedido foi entregue, recalcula o total da mesa para evitar inconsistência
        if (nextStatus === 'entregue') {
            // Busca o pedido para saber a mesa
            const { data: orderData } = await supabase.from('orders').select('table_id').eq('id', id).single();
            if (orderData?.table_id) {
                // Soma todos os pedidos ativos da mesa
                const { data: activeOrders } = await supabase
                    .from('orders')
                    .select('total_amount')
                    .eq('table_id', orderData.table_id)
                    .neq('status', 'finalizado');

                const realTotal = (activeOrders || []).reduce(
                    (acc: number, o: any) => acc + parseFloat(o.total_amount || 0), 0
                );

                await supabase
                    .from('tables')
                    .update({ status: 'occupied', total_amount: realTotal })
                    .eq('id', orderData.table_id);
            }
        }

        fetchOrders(true);
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Realtime + polling a cada 4s + refresh ao focar a aba
    useRealtimeSync(() => fetchOrders(true), {
        channelName: 'cozinha_realtime',
        tables: ['orders', 'order_items'],
        pollInterval: 4000,
    });

    const getTimeSince = (date: string) => {
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        return diff < 1 ? 'Agora' : `${diff} min`;
    };

    const formatLastUpdated = () => {
        return lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40 }}>🍳</div>
                <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Carregando cozinha...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', padding: 16, gap: 16 }}>
            <Sidebar />
            <main style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Cozinha 🍳
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                                {orders.length} {orders.length === 1 ? 'pedido ativo' : 'pedidos ativos'}
                            </p>
                            <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 500 }}>
                                • atualizado às {formatLastUpdated()}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        {Object.entries(statusConfig).map(([key, cfg]) => {
                            const count = orders.filter(o => o.status === key).length;
                            return (
                                <div key={key} style={{
                                    padding: '8px 16px',
                                    borderRadius: 12,
                                    background: cfg.bg,
                                    border: `1px solid ${cfg.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 8px ${cfg.color}60` }} />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{count} {cfg.label}</span>
                                </div>
                            );
                        })}

                        {/* Botão de atualizar manual */}
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 16px',
                                borderRadius: 12,
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-muted)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: refreshing ? 'not-allowed' : 'pointer',
                                opacity: refreshing ? 0.6 : 1,
                                transition: 'all 0.2s ease',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        >
                            <span style={{
                                display: 'inline-block',
                                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                            }}>🔄</span>
                            {refreshing ? 'Atualizando...' : 'Atualizar'}
                        </button>
                    </div>

                    {/* Indicador de atualização automática */}
                    <div style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 12px',
                        borderRadius: 10,
                        background: 'rgba(80,167,115,0.06)',
                        border: '1px solid rgba(80,167,115,0.15)',
                        fontSize: 10,
                        color: 'var(--success)',
                        fontWeight: 600,
                    }}>
                        <span style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--success)',
                            boxShadow: '0 0 6px var(--success)',
                            animation: 'pulse 2s infinite',
                            flexShrink: 0,
                        }} />
                        Atualização automática ativada — verifica a cada 8 segundos e em tempo real
                    </div>
                </header>

                {/* Orders Grid */}
                {orders.length === 0 ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        height: '60vh', gap: 16, opacity: 0.5,
                    }}>
                        <div style={{ fontSize: 64 }}>🎉</div>
                        <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Tudo limpo!</p>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum pedido pendente na cozinha.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, paddingBottom: 24 }}>
                        {orders.map((order, idx) => {
                            const cfg = statusConfig[order.status] || statusConfig.fila;
                            const timeSince = getTimeSince(order.created_at);
                            const isUrgent = (Date.now() - new Date(order.created_at).getTime()) > 15 * 60 * 1000;
                            const isNew = newOrderIds.has(order.id);

                            return (
                                <div key={order.id} className="animate-fade-in" style={{
                                    background: 'var(--bg-card)',
                                    border: `1px solid ${isNew ? 'rgba(255, 184, 77, 0.7)' : isUrgent && order.status !== 'pronto' ? 'rgba(234, 29, 44, 0.3)' : cfg.border}`,
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                    animationDelay: `${idx * 0.05}s`,
                                    opacity: 0,
                                    transition: 'all 0.25s ease',
                                    boxShadow: isNew ? '0 0 24px rgba(255, 184, 77, 0.3)' : 'none',
                                }}>
                                    {/* Novo pedido badge */}
                                    {isNew && (
                                        <div style={{
                                            background: 'linear-gradient(135deg, var(--warning), #d97706)',
                                            padding: '6px 20px',
                                            textAlign: 'center',
                                            fontSize: 10,
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.15em',
                                            color: '#000',
                                        }}>
                                            🔔 NOVO PEDIDO
                                        </div>
                                    )}

                                    {/* Card Header */}
                                    <div style={{
                                        padding: '16px 20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        background: cfg.bg,
                                    }}>
                                        <div>
                                            <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 2 }}>
                                                {order.tables?.name || '🛍️ Balcão'}
                                            </h3>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                #{order.id.slice(0, 6)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: 8,
                                                background: cfg.bg,
                                                border: `1px solid ${cfg.border}`,
                                                fontSize: 10,
                                                fontWeight: 800,
                                                textTransform: 'uppercase',
                                                color: cfg.color,
                                                letterSpacing: '0.05em',
                                            }}>{cfg.label}</span>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: isUrgent && order.status !== 'pronto' ? 'var(--price-color)' : 'var(--text-muted)',
                                            }}>
                                                ⏱ {timeSince}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div style={{ padding: '12px 20px' }}>
                                        {order.order_items?.map((item: any, i: number) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 0',
                                                borderBottom: i < order.order_items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: 8,
                                                        background: 'rgba(234,29,44,0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 11,
                                                        fontWeight: 900,
                                                        color: 'var(--price-color)',
                                                    }}>{item.quantity}x</span>
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.products?.name || 'Item'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ padding: '12px 20px 20px' }}>
                                        <button
                                            onClick={() => updateStatus(order.id, order.status)}
                                            style={{
                                                width: '100%',
                                                padding: '14px 0',
                                                borderRadius: 14,
                                                border: 'none',
                                                background: cfg.btn,
                                                color: 'var(--text-primary)',
                                                fontWeight: 800,
                                                fontSize: 12,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: `0 6px 20px ${cfg.color}30`,
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
                                        >
                                            {cfg.nextLabel}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
