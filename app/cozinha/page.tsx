"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

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
        label: 'Pronto',
        btn: 'linear-gradient(135deg, var(--primary), var(--primary-glow))',
        nextLabel: '📦 Finalizar',
        color: 'var(--primary)',
        bg: 'rgba(234, 29, 44, 0.05)',
        border: 'rgba(234, 29, 44, 0.2)',
    },
};

export default function Cozinha() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        const { data } = await supabase
            .from('orders')
            .select(`*, tables(name), order_items(*, products(name))`)
            .neq('status', 'finalizado')
            .order('created_at', { ascending: true });

        if (data) {
            setOrders(prev => {
                // Detecta novos pedidos para destacar visualmente
                if (silent && prev.length > 0) {
                    const prevIds = new Set(prev.map((o: any) => o.id));
                    const incoming = data.filter((o: any) => !prevIds.has(o.id));
                    if (incoming.length > 0) {
                        const ids = new Set(incoming.map((o: any) => o.id as string));
                        setNewOrderIds(ids);
                        // Remove destaque após 4s
                        setTimeout(() => setNewOrderIds(new Set()), 4000);
                    }
                }
                return data;
            });
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'fila' ? 'preparando' : currentStatus === 'preparando' ? 'pronto' : 'finalizado';
        await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
        fetchOrders(true);
    };

    useEffect(() => {
        fetchOrders();

        // Escuta tanto 'orders' quanto 'order_items' para detecção mais rápida
        const channel = supabase
            .channel('kds_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders(true))
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const getTimeSince = (date: string) => {
        const diff = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        return diff < 1 ? 'Agora' : `${diff} min`;
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
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Cozinha 🍳
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            {orders.length} {orders.length === 1 ? 'pedido ativo' : 'pedidos ativos'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
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
                                    animation: isNew ? 'pulse 0.6s ease 3' : undefined,
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
