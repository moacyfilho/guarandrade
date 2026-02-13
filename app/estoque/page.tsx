"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

interface Product {
    id: string;
    name: string;
    stock_quantity: number;
    price: number;
    category_id: string;
    categories?: { name: string };
}

interface Log {
    id: string;
    product_id: string;
    change_amount: number;
    reason: string;
    created_at: string;
    products?: { name: string };
}

export default function Estoque() {
    const [products, setProducts] = useState<Product[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [adjustment, setAdjustment] = useState({ amount: 0, reason: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const { data: prods } = await supabase
            .from('products')
            .select('*, categories(name)')
            .order('name');

        const { data: lgs } = await supabase
            .from('inventory_logs')
            .select('*, products(name)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (prods) setProducts(prods);
        if (lgs) setLogs(lgs);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdjustment = async () => {
        if (!selectedProduct || adjustment.amount === 0 || !adjustment.reason) {
            alert('Preencha a quantidade (diferente de 0) e o motivo.');
            return;
        }

        const newStock = (selectedProduct.stock_quantity || 0) + Number(adjustment.amount);

        const { error: prodError } = await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', selectedProduct.id);

        if (prodError) {
            alert('Erro ao atualizar produto: ' + prodError.message);
            return;
        }

        const { error: logError } = await supabase
            .from('inventory_logs')
            .insert({
                product_id: selectedProduct.id,
                change_amount: Number(adjustment.amount),
                reason: adjustment.reason
            });

        if (logError) {
            console.error('Erro ao salvar log:', logError);
        }

        alert('Estoque atualizado com sucesso! 📦');
        setModalOpen(false);
        setAdjustment({ amount: 0, reason: '' });
        fetchData();
    };

    const generatePDF = async () => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF();

            const dateStr = new Date().toLocaleDateString('pt-BR');
            doc.text(`Relatório de Estoque - ${dateStr}`, 14, 15);

            const stockData = products.map(p => [
                p.name,
                p.categories?.name || '-',
                p.stock_quantity?.toString() || '0',
                `R$ ${Number(p.price).toFixed(2).replace('.', ',')}`
            ]);

            autoTable(doc, {
                head: [['Produto', 'Categoria', 'Qtd. Atual', 'Preço Unit.']],
                body: stockData,
                startY: 25,
            });

            const finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.text('Histórico Recente de Alterações', 14, finalY);

            const logsData = logs.map(l => [
                new Date(l.created_at).toLocaleString('pt-BR'),
                l.products?.name || 'Desconhecido',
                l.change_amount > 0 ? `+${l.change_amount}` : l.change_amount.toString(),
                l.reason
            ]);

            autoTable(doc, {
                head: [['Data', 'Produto', 'Mudança', 'Motivo']],
                body: logsData,
                startY: finalY + 10,
            });

            const pdfDataUri = doc.output('dataurlstring');
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`<iframe src="${pdfDataUri}" width="100%" height="100%" style="border:none;"></iframe>`);
            }
        } catch (err) {
            alert('Erro ao gerar PDF.');
            console.error(err);
        }
    };

    const lowStockCount = products.filter(p => (p.stock_quantity || 0) < 5).length;
    const totalItems = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40 }}>📦</div>
                <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Carregando estoque...</p>
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
                            Controle de Estoque 📦
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            Gerencie entradas e saídas de produtos.
                        </p>
                    </div>
                    <button onClick={generatePDF} className="btn btn-primary">
                        📄 Relatório PDF
                    </button>
                </header>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.02))', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 16, padding: 20 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Produtos</p>
                        <p style={{ fontSize: 28, fontWeight: 900, color: '#60a5fa', letterSpacing: '-0.03em' }}>{products.length}</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, rgba(80,167,115,0.1), rgba(80,167,115,0.02))', border: '1px solid rgba(80,167,115,0.15)', borderRadius: 16, padding: 20 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Itens em Estoque</p>
                        <p style={{ fontSize: 28, fontWeight: 900, color: '#6FCF97', letterSpacing: '-0.03em' }}>{totalItems}</p>
                    </div>
                    <div style={{ background: `linear-gradient(135deg, rgba(239,68,68,${lowStockCount > 0 ? 0.12 : 0.05}), rgba(239,68,68,0.02))`, border: `1px solid rgba(239,68,68,${lowStockCount > 0 ? 0.25 : 0.1})`, borderRadius: 16, padding: 20 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Estoque Baixo</p>
                        <p style={{ fontSize: 28, fontWeight: 900, color: lowStockCount > 0 ? '#f87171' : '#6FCF97', letterSpacing: '-0.03em' }}>{lowStockCount}</p>
                    </div>
                </div>

                {/* Search */}
                <div style={{ marginBottom: 16 }}>
                    <input
                        type="text"
                        placeholder="🔍 Buscar produto ou categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', maxWidth: 400, padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                    />
                </div>

                {/* Table */}
                <div className="glass" style={{ overflow: 'hidden', marginBottom: 32 }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Categoria</th>
                                <th style={{ textAlign: 'center' }}>Qtd. Atual</th>
                                <th style={{ textAlign: 'right' }}>Preço Unit.</th>
                                <th style={{ textAlign: 'right' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product.id}>
                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{product.categories?.name}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${(product.stock_quantity || 0) < 5 ? 'badge-danger' : 'badge-success'}`}>
                                            {product.stock_quantity || 0}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', color: 'var(--text-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                                        R$ {Number(product.price).toFixed(2).replace('.', ',')}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button
                                            onClick={() => {
                                                setSelectedProduct(product);
                                                setModalOpen(true);
                                            }}
                                            className="btn btn-primary"
                                            style={{ fontSize: 10, padding: '6px 14px' }}
                                        >
                                            Ajustar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Recent Logs */}
                {logs.length > 0 && (
                    <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Histórico de Ajustes Recentes</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {logs.slice(0, 8).map(log => (
                                <div key={log.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    background: 'var(--bg-card)',
                                    border: '1px solid rgba(255,255,255,0.03)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 800,
                                            color: log.change_amount > 0 ? '#6FCF97' : '#f87171',
                                            minWidth: 40,
                                        }}>{log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{log.products?.name}</span>
                                        <span className="badge" style={{ background: 'var(--bg-card-hover)', color: 'var(--text-muted)' }}>{log.reason}</span>
                                    </div>
                                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                                        {new Date(log.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Adjustment Sidebar */}
            {modalOpen && selectedProduct && (
                <div className="modal-overlay" style={{ justifyContent: 'flex-end' }}>
                    <div
                        style={{ position: 'absolute', inset: 0 }}
                        onClick={() => setModalOpen(false)}
                    />
                    <div className="animate-slide-in-right" style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 420,
                        height: '100%',
                        background: 'var(--bg-page)',
                        borderLeft: '1px solid var(--border-color)',
                        boxShadow: '0 0 60px rgba(0,0,0,0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Ajustar Estoque</h3>
                            <button onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 18 }}>✕</button>
                        </div>

                        <div style={{ padding: 24, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Produto Selecionado</span>
                                <h4 style={{ fontSize: 22, fontWeight: 900, color: 'var(--price-color)' }}>{selectedProduct?.name}</h4>
                                <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                                    <span>Atual: <span style={{ color: 'var(--text-primary)' }}>{selectedProduct?.stock_quantity || 0}</span></span>
                                    <span>Categoria: <span style={{ color: 'var(--text-primary)' }}>{selectedProduct?.categories?.name}</span></span>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Quantidade do Ajuste</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <button
                                        onClick={() => setAdjustment(prev => ({ ...prev, amount: (prev.amount || 0) - 1 }))}
                                        style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}
                                    >-</button>
                                    <input
                                        type="number"
                                        value={adjustment.amount}
                                        onChange={e => setAdjustment({ ...adjustment, amount: e.target.valueAsNumber || 0 })}
                                        style={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: 18, padding: 12 }}
                                        placeholder="Ex: 10 ou -5"
                                    />
                                    <button
                                        onClick={() => setAdjustment(prev => ({ ...prev, amount: (prev.amount || 0) + 1 }))}
                                        style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontSize: 18 }}
                                    >+</button>
                                </div>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8, fontStyle: 'italic' }}>* Valores negativos para saídas, positivos para entradas.</p>
                            </div>

                            <div>
                                <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Motivo do Ajuste</label>
                                <input
                                    type="text"
                                    value={adjustment.reason}
                                    onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })}
                                    style={{ width: '100%', padding: 12, borderRadius: 12, fontSize: 13 }}
                                    placeholder="Ex: Compra, Perda, Consumo Interno..."
                                />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    {['Compra', 'Perda', 'Ajuste', 'Consumo'].map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setAdjustment({ ...adjustment, reason })}
                                            className="btn btn-ghost"
                                            style={{ fontSize: 9, padding: '4px 12px' }}
                                        >{reason}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 24, borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', gap: 12 }}>
                            <button onClick={() => setModalOpen(false)} className="btn btn-ghost" style={{ flex: 1, padding: '14px 0' }}>
                                Cancelar
                            </button>
                            <button onClick={handleAdjustment} className="btn btn-primary" style={{ flex: 2, padding: '14px 0' }}>
                                Confirmar Ajuste
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
