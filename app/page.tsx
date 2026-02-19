"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export default function Home() {
    const [stats, setStats] = useState([
        { label: 'Pedidos Hoje', value: '0', icon: '📝', color: '#60a5fa', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))' },
        { label: 'Mesas Ativas', value: '0/0', icon: '🍽️', color: '#6FCF97', gradient: 'linear-gradient(135deg, rgba(80,167,115,0.12), rgba(80,167,115,0.03))' },
        { label: 'Faturamento', value: 'R$ 0,00', icon: '💰', color: '#c084fc', gradient: 'linear-gradient(135deg, rgba(192,132,252,0.12), rgba(192,132,252,0.03))' },
        { label: 'Tempo Médio', value: '-- min', icon: '⏱️', color: '#fb923c', gradient: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.03))' },
    ]);
    const [tables, setTables] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const today = new Date().toISOString().split('T')[0];

        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today);

        const { data: tablesData } = await supabase
            .from('tables')
            .select('*')
            .order('id', { ascending: true });

        const activeTablesCount = tablesData?.filter(t => t.status === 'occupied').length || 0;
        const totalTablesCount = tablesData?.length || 0;

        const { data: revenueData } = await supabase
            .from('orders')
            .select('total_amount')
            .gte('created_at', today)
            .neq('status', 'cancelado');

        const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;

        const { data: ordersData } = await supabase
            .from('orders')
            .select(`*, tables (name)`)
            .order('created_at', { ascending: false })
            .limit(5);

        setStats([
            { label: 'Pedidos Hoje', value: String(ordersCount || 0), icon: '📝', color: '#60a5fa', gradient: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.03))' },
            { label: 'Mesas Ativas', value: `${activeTablesCount}/${totalTablesCount}`, icon: '🍽️', color: '#6FCF97', gradient: 'linear-gradient(135deg, rgba(80,167,115,0.12), rgba(80,167,115,0.03))' },
            { label: 'Faturamento', value: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`, icon: '💰', color: '#c084fc', gradient: 'linear-gradient(135deg, rgba(192,132,252,0.12), rgba(192,132,252,0.03))' },
            { label: 'Tempo Médio', value: '18 min', icon: '⏱️', color: '#fb923c', gradient: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.03))' },
        ]);

        const { data: activeOrders } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    id
                )
            `)
            .eq('status', 'fila')
            .not('table_id', 'is', null);

        if (tablesData) {
            // Calculate real total for each table
            const tablesWithRealTotal = tablesData.map(table => {
                if (table.status !== 'occupied') return table;

                const tableOrders = activeOrders?.filter(o => o.table_id === table.id) || [];
                const realTotal = tableOrders.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

                return { ...table, total_amount: realTotal };
            });
            setTables(tablesWithRealTotal);
        }

        if (ordersData) setRecentOrders(ordersData);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // Realtime + polling a cada 10s para o dashboard
    useRealtimeSync(fetchData, {
        channelName: 'dashboard_realtime',
        tables: ['orders', 'tables'],
        pollInterval: 10000,
    });

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #EA1D2C, #C8101E)', borderRadius: 16 }} />
                <p style={{ fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: 10, color: 'var(--text-secondary)' }}>Carregando...</p>
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
                            Boas-vindas, Admin! 👋
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>
                            Resumo do que está acontecendo no Guarandrade agora.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Link href="/pdv" className="btn btn-primary" style={{ fontSize: 11 }}>
                            + Novo Pedido
                        </Link>
                    </div>
                </header>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                    {stats.map((stat, i) => (
                        <div key={i} className="animate-fade-in" style={{
                            background: stat.gradient,
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 20,
                            padding: 24,
                            animationDelay: `${i * 0.08}s`,
                            opacity: 0,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ fontSize: 28 }}>{stat.icon}</div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>Tempo real</span>
                            </div>
                            <h3 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>{stat.value}</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tables Overview */}
                <section style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Status das Mesas</h2>
                        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot status-dot-success" /> Livre</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot status-dot-danger" /> Ocupada</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="status-dot status-dot-warning" /> Limpeza</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 }}>
                        {tables.map((table) => (
                            <Link
                                key={table.id}
                                href="/mesas"
                                style={{
                                    textDecoration: 'none',
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                    borderTop: `3px solid ${table.status === 'occupied' ? '#ef4444' : table.status === 'dirty' ? '#f59e0b' : '#50A773'}`,
                                    borderRadius: 16,
                                    padding: '16px 12px',
                                    textAlign: 'center' as const,
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
                            >
                                <div style={{ fontSize: 22, marginBottom: 4 }}>🪑</div>
                                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>{table.name}</div>
                                {table.status === 'occupied' ? (
                                    <span className="badge badge-danger">{`R$ ${parseFloat(table.total_amount || 0).toFixed(0)}`}</span>
                                ) : (
                                    <span style={{ color: 'var(--text-faint)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const }}>
                                        {table.status === 'dirty' ? 'Limpeza' : 'Livre'}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Recent Orders + Quick Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, paddingBottom: 24 }}>
                    {/* Recent Orders */}
                    <div className="glass" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, letterSpacing: '-0.01em' }}>Pedidos Recentes</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {recentOrders.map((order) => (
                                <div key={order.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    borderRadius: 12,
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-subtle)',
                                    transition: 'background 0.15s ease',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 12,
                                            background: 'rgba(234,29,44,0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 18,
                                        }}>🍔</div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{order.tables?.name || 'Balcão 🛍️'}</p>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' as const }}>
                                        <p style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}</p>
                                        <span className={`badge ${order.status === 'fila' ? 'badge-info' :
                                            order.status === 'preparando' ? 'badge-warning' :
                                                order.status === 'pronto' ? 'badge-success' : 'badge-info'
                                            }`}>{order.status}</span>
                                    </div>
                                </div>
                            ))}
                            {recentOrders.length === 0 && (
                                <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
                                    Nenhum pedido recente
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>Ações Rápidas</h3>
                        <Link href="/pdv" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}>
                            🛒 Novo Pedido (PDV)
                        </Link>
                        <Link href="/cozinha" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}>
                            🍳 Ver Cozinha
                        </Link>
                        <Link href="/mesas" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}>
                            🍽️ Gestão de Mesas
                        </Link>
                        <Link href="/financeiro" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}>
                            💰 Financeiro
                        </Link>
                        <Link href="/cardapio" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '14px 0' }}>
                            📜 Editar Cardápio
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
