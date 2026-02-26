"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { getStartDateManaus } from '@/lib/dateUtils';

export default function Financeiro() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [stats, setStats] = useState({
        balance: 0,
        revenue: 0,
        totalOrders: 0
    });

    const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        description: '',
        amount: 0,
        type: 'expense',
        due_date: '',
        status: 'pending',
        customer_name: '',
        payment_method: 'pix',
        category: 'Outros'
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'payable' | 'receivable' | 'relatorio'>('overview');
    const [salesBreakdown, setSalesBreakdown] = useState<{ label: string; orders: number; revenue: number }[]>([]);
    const [reportStats, setReportStats] = useState({ totalRevenue: 0, totalOrders: 0, avgTicket: 0, topProduct: '' });

    // getStartDate removido — usar getStartDateManaus de @/lib/dateUtils

    // ... existing fetch logic ...

    const fetchData = async () => {
        setLoading(true);
        // Usa horário de Manaus (UTC-4) — sem isso o faturamento some após 20h
        const startDate = getStartDateManaus(range);

        const { data: orders } = await supabase
            .from('orders')
            .select('id, created_at, status, order_items(unit_price, quantity, product_id, products(name, categories(icon)))')
            .gte('created_at', startDate)
            .neq('status', 'cancelado');

        // Receita calculada dos itens reais (não do total_amount que é sempre 0)
        const ordersWithRevenue = (orders || []).map(o => ({
            ...o,
            computedRevenue: (o.order_items || []).reduce(
                (s: number, item: any) => s + Number(item.unit_price) * Number(item.quantity), 0
            )
        }));

        const revenue = ordersWithRevenue.reduce((acc, o) => acc + o.computedRevenue, 0);

        // Top produtos por quantidade e receita
        const productMap: any = {};
        ordersWithRevenue.forEach(order => {
            (order.order_items || []).forEach((item: any) => {
                if (!item.products) return;
                const pid = item.product_id;
                if (!productMap[pid]) productMap[pid] = {
                    name: item.products.name,
                    icon: item.products.categories?.icon || '🍔',
                    totalQty: 0,
                    totalRevenue: 0
                };
                productMap[pid].totalQty += Number(item.quantity);
                productMap[pid].totalRevenue += Number(item.unit_price) * Number(item.quantity);
            });
        });

        const sortedProducts = Object.values(productMap)
            .sort((a: any, b: any) => b.totalQty - a.totalQty)
            .slice(0, 5);

        // Breakdown por sub-período
        const groups: Record<string, { orders: number; revenue: number }> = {};
        ordersWithRevenue.forEach(order => {
            const d = new Date(order.created_at);
            let label: string;
            if (range === 'daily') {
                label = `${d.getHours().toString().padStart(2, '0')}h`;
            } else if (range === 'weekly') {
                const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                label = days[d.getDay()];
            } else {
                label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            }
            if (!groups[label]) groups[label] = { orders: 0, revenue: 0 };
            groups[label].orders += 1;
            groups[label].revenue += order.computedRevenue;
        });

        const breakdown = Object.entries(groups).map(([label, data]) => ({ label, ...data }));
        setSalesBreakdown(breakdown);

        const topProduct = sortedProducts[0] ? (sortedProducts[0] as any).name : '-';
        setReportStats({
            totalRevenue: revenue,
            totalOrders: ordersWithRevenue.length,
            avgTicket: ordersWithRevenue.length > 0 ? revenue / ordersWithRevenue.length : 0,
            topProduct,
        });

        const orderTransactions = ordersWithRevenue.map(o => ({
            id: o.id,
            type: 'receita',
            value: o.computedRevenue,
            method: `Pedido #${o.id.toString().slice(0, 4)}`,
            date: new Date(o.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })).reverse().slice(0, 10);

        // NEW: Fetch Financial Transactions
        const { data: finTrans } = await supabase
            .from('financial_transactions')
            .select('*')
            .order('due_date', { ascending: true });

        setFinancialTransactions(finTrans || []);

        setStats({
            balance: revenue, // You might want to adjust this with expenses later
            revenue: revenue,
            totalOrders: orders?.length || 0
        });
        setTopProducts(sortedProducts);
        setTransactions(orderTransactions);
        setLoading(false);
    };

    const handleAddTransaction = async () => {
        if (!newTransaction.description || !newTransaction.amount) {
            alert('Preencha descrição e valor!');
            return;
        }

        let error;

        if (editingId) {
            const { error: updateError } = await supabase
                .from('financial_transactions')
                .update({
                    description: newTransaction.description,
                    amount: newTransaction.amount,
                    type: newTransaction.type,
                    due_date: newTransaction.due_date,
                    status: newTransaction.status,
                    customer_name: newTransaction.customer_name,
                    payment_method: newTransaction.payment_method,
                    category: newTransaction.category
                })
                .eq('id', editingId);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('financial_transactions').insert({
                description: newTransaction.description,
                amount: newTransaction.amount,
                type: newTransaction.type,
                due_date: newTransaction.due_date,
                status: newTransaction.status,
                customer_name: newTransaction.customer_name,
                payment_method: newTransaction.payment_method,
                category: newTransaction.category
            });
            error = insertError;
        }

        if (error) {
            console.error(error);
            alert('Erro ao salvar transação: ' + error.message);
        } else {
            alert(editingId ? 'Transação atualizada! ✏️' : 'Transação salva com sucesso! 💰');
            setTransactionModalOpen(false);
            setEditingId(null);
            setNewTransaction({
                description: '',
                amount: 0,
                type: 'expense',
                due_date: '',
                status: 'pending',
                customer_name: '',
                payment_method: 'pix',
                category: 'Outros'
            });
            fetchData();
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
            if (error) {
                console.error(error);
                alert('Erro ao excluir.');
            } else {
                fetchData();
            }
        }
    };

    const handleEditTransaction = (transaction: any) => {
        setNewTransaction({
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            due_date: transaction.due_date ? transaction.due_date.split('T')[0] : '',
            status: transaction.status,
            customer_name: transaction.customer_name || '',
            payment_method: transaction.payment_method || 'pix',
            category: transaction.category || 'Outros'
        });
        setEditingId(transaction.id);
        setTransactionModalOpen(true);
    };

    const generateSalesReportPDF = async () => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const periodoLabel = range === 'daily' ? 'Diário' : range === 'weekly' ? 'Semanal' : 'Mensal';

            // Header
            doc.setFillColor(5, 5, 5);
            doc.rect(0, 0, 297, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`Guarandrade — Relatório de Vendas ${periodoLabel}`, 10, 13);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 195, 13);

            // Resumo
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.text('Resumo do Período:', 14, 30);
            doc.setFontSize(10);
            doc.setTextColor(100, 0, 200);
            doc.text(`Faturamento: R$ ${reportStats.totalRevenue.toFixed(2).replace('.', ',')}`, 14, 38);
            doc.setTextColor(0, 0, 0);
            doc.text(`Pedidos: ${reportStats.totalOrders}`, 80, 38);
            doc.text(`Ticket Médio: R$ ${reportStats.avgTicket.toFixed(2).replace('.', ',')}`, 120, 38);
            doc.text(`Mais Vendido: ${reportStats.topProduct}`, 190, 38);

            // Tabela breakdown
            const breakdownLabel = range === 'daily' ? 'Hora' : range === 'weekly' ? 'Dia' : 'Data';
            autoTable(doc, {
                startY: 46,
                head: [[breakdownLabel, 'Pedidos', 'Faturamento (R$)', '% do Total']],
                body: salesBreakdown.map(row => [
                    row.label,
                    row.orders,
                    row.revenue.toFixed(2).replace('.', ','),
                    reportStats.totalRevenue > 0 ? `${((row.revenue / reportStats.totalRevenue) * 100).toFixed(1)}%` : '0%',
                ]),
                theme: 'grid',
                headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 9 },
                columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
            });

            // Top Produtos
            const afterBreakdown = (doc as any).lastAutoTable?.finalY + 10 || 80;
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text('Top 5 Produtos:', 14, afterBreakdown);

            autoTable(doc, {
                startY: afterBreakdown + 4,
                head: [['#', 'Produto', 'Qtd. Vendida', 'Faturamento (R$)', '% do Total']],
                body: (topProducts as any[]).map((p, i) => [
                    `${i + 1}º`,
                    p.name,
                    p.totalQty,
                    p.totalRevenue.toFixed(2).replace('.', ','),
                    reportStats.totalRevenue > 0 ? `${((p.totalRevenue / reportStats.totalRevenue) * 100).toFixed(1)}%` : '0%',
                ]),
                theme: 'grid',
                headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 9 },
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
            });

            doc.save(`relatorio-vendas-${periodoLabel.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF.');
        }
    };

    const generatePDF = async () => {
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            // Header
            doc.setFillColor(5, 5, 5);
            doc.rect(0, 0, 297, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Guarandrade - Relatório Financeiro e Contábil', 10, 13);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 200, 13);

            // Resumo Financeiro
            const totalReceita = stats.revenue;
            const totalPagar = financialTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const totalReceber = financialTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const totalPago = financialTransactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0);

            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.text('Resumo do Período:', 14, 30);

            doc.setFontSize(10);
            doc.setTextColor(0, 128, 0);
            doc.text(`Faturamento PDV: R$ ${totalReceita.toFixed(2).replace('.', ',')}`, 14, 38);
            doc.setTextColor(220, 20, 60);
            doc.text(`A Pagar (Pendente): R$ ${totalPagar.toFixed(2).replace('.', ',')}`, 80, 38);
            doc.setTextColor(0, 100, 0);
            doc.text(`A Receber (Pendente): R$ ${totalReceber.toFixed(2).replace('.', ',')}`, 150, 38);

            // Tabela de Transações
            const finData = financialTransactions.map(t => [
                new Date(t.due_date).toLocaleDateString('pt-BR'),
                t.description,
                t.customer_name || '-',
                t.category || '-',
                t.type === 'income' ? 'Receita' : 'Despesa',
                t.payment_method || '-',
                `R$ ${Number(t.amount).toFixed(2).replace('.', ',')}`,
                t.status === 'paid' ? 'Pago' : 'Pendente'
            ]);

            autoTable(doc, {
                startY: 45,
                head: [['Vencimento', 'Descrição', 'Cliente/Benef.', 'Categoria', 'Tipo', 'Método', 'Valor', 'Status']],
                body: finData,
                theme: 'grid',
                headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 60 },
                    4: { cellWidth: 20 },
                    6: { fontStyle: 'bold', halign: 'right' }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 7) {
                        const status = data.cell.raw;
                        if (status === 'Pendente') {
                            data.cell.styles.textColor = [220, 20, 60];
                        } else {
                            data.cell.styles.textColor = [0, 128, 0];
                        }
                    }
                    if (data.section === 'body' && data.column.index === 4) {
                        const type = data.cell.raw;
                        if (type === 'Despesa') {
                            data.cell.styles.textColor = [220, 20, 60];
                        } else {
                            data.cell.styles.textColor = [0, 128, 0];
                        }
                    }
                }
            });

            // Rodapé com totais da tabela (se necessário) ou apenas finalizando
            // ...

            const pdfDataUri = doc.output('dataurlstring');
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`<iframe src="${pdfDataUri}" width="100%" height="100%" style="border:none;"></iframe>`);
            }
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            alert('Erro ao gerar PDF details no console.');
        }
    };

    // ... useEffect ...
    useEffect(() => {
        fetchData();
    }, [range]);


    if (loading) return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40 }}>💰</div>
                <p style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Carregando financeiro...</p>
            </div>
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', padding: 16, gap: 16 }}>
            <Sidebar />

            <main style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Financeiro & Contas 💰
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            Fluxo de caixa, contas a pagar e receber.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setNewTransaction({
                                    description: '',
                                    amount: 0,
                                    type: 'expense',
                                    due_date: '',
                                    status: 'pending',
                                    customer_name: '',
                                    payment_method: 'pix',
                                    category: 'Outros'
                                });
                                setTransactionModalOpen(true);
                            }}
                            className="btn btn-success"
                        >
                            + Nova Conta
                        </button>
                        <button onClick={generatePDF} className="btn btn-primary">
                            📄 Relatório PDF
                        </button>
                    </div>
                </header>

                <div style={{ display: 'flex', background: 'var(--bg-card)', padding: 4, borderRadius: 14, width: 'fit-content', marginBottom: 24, border: '1px solid var(--border-color)' }}>
                    <button onClick={() => setActiveTab('overview')} className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '10px 20px' }}>Visão Geral</button>
                    <button onClick={() => setActiveTab('relatorio')} className={`btn ${activeTab === 'relatorio' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '10px 20px' }}>📊 Relatório de Vendas</button>
                    <button onClick={() => setActiveTab('payable')} className={`btn ${activeTab === 'payable' ? 'btn-danger' : 'btn-ghost'}`} style={{ padding: '10px 20px' }}>A Pagar</button>
                    <button onClick={() => setActiveTab('receivable')} className={`btn ${activeTab === 'receivable' ? 'btn-success' : 'btn-ghost'}`} style={{ padding: '10px 20px' }}>A Receber</button>
                </div>

                {/* Dashboard Cards (Existing) */}
                {activeTab === 'overview' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                            <div style={{ background: 'linear-gradient(135deg, rgba(234,29,44,0.1), rgba(234,29,44,0.02))', border: '1px solid rgba(234,29,44,0.15)', borderRadius: 20, padding: 24 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Faturamento PDV</p>
                                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--price-color)', letterSpacing: '-0.03em' }}>R$ {stats.revenue.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, rgba(234, 29, 44, 0.08), rgba(234, 29, 44, 0.02))', border: '1px solid rgba(234, 29, 44, 0.15)', borderRadius: 20, padding: 24 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🔻</div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contas a Pagar</p>
                                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--danger)', letterSpacing: '-0.03em' }}>
                                    R$ {financialTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                            <div style={{ background: 'linear-gradient(135deg, rgba(80, 167, 115, 0.08), rgba(80, 167, 115, 0.02))', border: '1px solid rgba(80, 167, 115, 0.15)', borderRadius: 20, padding: 24 }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>⬆️</div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contas a Receber</p>
                                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)', letterSpacing: '-0.03em' }}>
                                    R$ {financialTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2).replace('.', ',')}
                                </p>
                            </div>
                        </div>

                        {/* Financial Transactions Table */}
                        <div className="glass" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Últimas Movimentações</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Descrição</th>
                                        <th>Tipo</th>
                                        <th style={{ textAlign: 'right' }}>Valor</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {financialTransactions.slice(0, 5).map(t => (
                                        <tr key={t.id}>
                                            <td>{new Date(t.due_date).toLocaleDateString('pt-BR')}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.description}</td>
                                            <td>
                                                <span className={`badge ${t.type === 'income' ? 'badge-success' : 'badge-danger'}`}>
                                                    {t.type === 'income' ? 'Receita' : 'Despesa'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>R$ {Number(t.amount).toFixed(2).replace('.', ',')}</td>
                                            <td>
                                                <span className={`badge ${t.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                                                    {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'relatorio' && (
                    <>
                        {/* Seletor de período */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                            {(['daily', 'weekly', 'monthly'] as const).map(r => (
                                <button
                                    key={r}
                                    onClick={() => setRange(r)}
                                    className={`btn ${range === r ? 'btn-primary' : 'btn-ghost'}`}
                                    style={{ padding: '10px 20px' }}
                                >
                                    {r === 'daily' ? 'Hoje' : r === 'weekly' ? 'Esta Semana' : 'Este Mês'}
                                </button>
                            ))}
                            <button
                                onClick={generateSalesReportPDF}
                                className="btn btn-ghost"
                                style={{ marginLeft: 'auto', padding: '10px 20px' }}
                            >
                                📄 Exportar PDF
                            </button>
                        </div>

                        {/* Cards resumo */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                            {[
                                { label: 'Faturamento', value: `R$ ${reportStats.totalRevenue.toFixed(2).replace('.', ',')}`, icon: '💰', color: '#c084fc' },
                                { label: 'Pedidos', value: String(reportStats.totalOrders), icon: '📝', color: '#60a5fa' },
                                { label: 'Ticket Médio', value: `R$ ${reportStats.avgTicket.toFixed(2).replace('.', ',')}`, icon: '🎯', color: '#34d399' },
                                { label: 'Mais Vendido', value: reportStats.topProduct, icon: '🏆', color: '#fb923c' },
                            ].map(card => (
                                <div key={card.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24 }}>
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
                                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{card.label}</p>
                                    <p style={{ fontSize: card.label === 'Mais Vendido' ? 14 : 22, fontWeight: 900, color: card.color, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>{card.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Tabela de breakdown */}
                        <div className="glass" style={{ overflow: 'hidden', marginBottom: 24 }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                                    Vendas por {range === 'daily' ? 'Hora' : range === 'weekly' ? 'Dia da Semana' : 'Dia do Mês'}
                                </h3>
                            </div>
                            {salesBreakdown.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma venda no período selecionado.</div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>{range === 'daily' ? 'Hora' : range === 'weekly' ? 'Dia' : 'Data'}</th>
                                            <th style={{ textAlign: 'center' }}>Pedidos</th>
                                            <th style={{ textAlign: 'right' }}>Faturamento</th>
                                            <th style={{ textAlign: 'right' }}>% do Total</th>
                                            <th>Barra</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesBreakdown.map((row) => {
                                            const maxRevenue = Math.max(...salesBreakdown.map(r => r.revenue));
                                            const pct = maxRevenue > 0 ? (row.revenue / reportStats.totalRevenue) * 100 : 0;
                                            const barWidth = maxRevenue > 0 ? (row.revenue / maxRevenue) * 100 : 0;
                                            return (
                                                <tr key={row.label}>
                                                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.label}</td>
                                                    <td style={{ textAlign: 'center' }}>{row.orders}</td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--price-color)' }}>R$ {row.revenue.toFixed(2).replace('.', ',')}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>{pct.toFixed(1)}%</td>
                                                    <td style={{ width: 160 }}>
                                                        <div style={{ background: 'var(--bg-page)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                            <div style={{ width: `${barWidth}%`, height: '100%', background: 'linear-gradient(90deg, #EA1D2C, #c084fc)', borderRadius: 4, transition: 'width 0.3s' }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Top Produtos */}
                        <div className="glass" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>Top 5 Produtos</h3>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Produto</th>
                                        <th style={{ textAlign: 'center' }}>Qtd. Vendida</th>
                                        <th style={{ textAlign: 'right' }}>Faturamento</th>
                                        <th style={{ textAlign: 'right' }}>% do Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(topProducts as any[]).map((p, i) => (
                                        <tr key={p.name}>
                                            <td style={{ fontWeight: 900, color: i === 0 ? '#fb923c' : 'var(--text-muted)', fontSize: 16 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}</td>
                                            <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.icon} {p.name}</td>
                                            <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}>{p.totalQty}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--price-color)' }}>R$ {p.totalRevenue.toFixed(2).replace('.', ',')}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
                                                {reportStats.totalRevenue > 0 ? ((p.totalRevenue / reportStats.totalRevenue) * 100).toFixed(1) : '0.0'}%
                                            </td>
                                        </tr>
                                    ))}
                                    {topProducts.length === 0 && (
                                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Nenhum produto vendido no período.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {activeTab === 'payable' && (
                    <div className="glass p-6">
                        <h3 className="text-red-400 font-black uppercase tracking-widest mb-4 text-xl">🔻 Contas a Pagar</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-white/5 uppercase font-black text-xs text-white">
                                    <tr>
                                        <th className="p-3">Vencimento</th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3">Beneficiário</th>
                                        <th className="p-3">Categoria</th>
                                        <th className="p-3">Valor</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {financialTransactions.filter(t => t.type === 'expense').map(t => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-3">{new Date(t.due_date).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-3 font-bold text-white">{t.description}</td>
                                            <td className="p-3">{t.customer_name || '-'}</td>
                                            <td className="p-3 text-xs uppercase">{t.category || '-'}</td>
                                            <td className="p-3 font-mono text-white">R$ {Number(t.amount).toFixed(2).replace('.', ',')}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${t.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                {t.status === 'pending' && (
                                                    <button
                                                        onClick={async () => {
                                                            await supabase.from('financial_transactions').update({ status: 'paid', payment_date: new Date() }).eq('id', t.id);
                                                            fetchData();
                                                        }}
                                                        className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded uppercase font-black"
                                                        title="Dar Baixa"
                                                    >
                                                        ✔
                                                    </button>
                                                )}
                                                <button onClick={() => handleEditTransaction(t)} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded uppercase font-black" title="Editar">✏️</button>
                                                <button onClick={() => handleDeleteTransaction(t.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded uppercase font-black" title="Excluir">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'receivable' && (
                    <div className="glass p-6">
                        <h3 className="text-green-400 font-black uppercase tracking-widest mb-4 text-xl">⬆️ Contas a Receber</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                                <span className="text-green-200 text-[10px] uppercase font-bold">Total a Receber</span>
                                <h4 className="text-2xl font-black text-green-400">R$ {financialTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2).replace('.', ',')}</h4>
                            </div>
                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                <span className="text-gray-400 text-[10px] uppercase font-bold">Recebido (Total)</span>
                                <h4 className="text-2xl font-black text-white">R$ {financialTransactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0).toFixed(2).replace('.', ',')}</h4>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-white/5 uppercase font-black text-xs text-white">
                                    <tr>
                                        <th className="p-3">Vencimento</th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3">Pagador/Cliente</th>
                                        <th className="p-3">Método</th>
                                        <th className="p-3">Valor</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {financialTransactions.filter(t => t.type === 'income').map(t => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-3">{new Date(t.due_date).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-3 font-bold text-white">{t.description}</td>
                                            <td className="p-3">{t.customer_name || '-'}</td>
                                            <td className="p-3 text-xs uppercase">{t.payment_method || '-'}</td>
                                            <td className="p-3 font-mono text-white">R$ {Number(t.amount).toFixed(2).replace('.', ',')}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${t.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                    {t.status === 'paid' ? 'Pago' : 'Pendente'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                {t.status === 'pending' && (
                                                    <button
                                                        onClick={async () => {
                                                            await supabase.from('financial_transactions').update({ status: 'paid', payment_date: new Date() }).eq('id', t.id);
                                                            fetchData();
                                                        }}
                                                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded uppercase font-black shadow-lg shadow-green-600/20"
                                                        title="Confirmar Recebimento"
                                                    >
                                                        ✔
                                                    </button>
                                                )}
                                                <button onClick={() => handleEditTransaction(t)} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded uppercase font-black" title="Editar">✏️</button>
                                                <button onClick={() => handleDeleteTransaction(t.id)} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded uppercase font-black" title="Excluir">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal Nova Transação */}
                {transactionModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-fade-in-scale" style={{ maxWidth: 520, padding: 0 }}>
                            <div style={{ padding: 24, borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{editingId ? 'Editar Movimentação' : 'Nova Movimentação'}</h3>
                                <button onClick={() => setTransactionModalOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', fontSize: 18 }}>✕</button>
                            </div>

                            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setNewTransaction({ ...newTransaction, type: 'expense' })}
                                        className={`btn ${newTransaction.type === 'expense' ? 'btn-danger' : 'btn-ghost'}`}
                                        style={{ flex: 1, padding: '12px 0' }}
                                    >
                                        Contas a Pagar
                                    </button>
                                    <button
                                        onClick={() => setNewTransaction({ ...newTransaction, type: 'income' })}
                                        className={`btn ${newTransaction.type === 'income' ? 'btn-success' : 'btn-ghost'}`}
                                        style={{ flex: 1, padding: '12px 0' }}
                                    >
                                        Contas a Receber
                                    </button>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Descrição (ex: Aluguel, Venda a Prazo)"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                    value={newTransaction.description}
                                    onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                />

                                <input
                                    type="text"
                                    placeholder={newTransaction.type === 'expense' ? "Beneficiário (Quem receberá?)" : "Pagador/Cliente (Quem pagará?)"}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                    value={newTransaction.customer_name}
                                    onChange={e => setNewTransaction({ ...newTransaction, customer_name: e.target.value })}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <input
                                        type="text"
                                        placeholder="Categoria (ex: Luz, Vendas)"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                        value={newTransaction.category}
                                        onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Valor (R$)"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                        value={newTransaction.amount}
                                        onChange={e => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Vencimento</label>
                                        <input
                                            type="date"
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                            value={newTransaction.due_date}
                                            onChange={e => setNewTransaction({ ...newTransaction, due_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Método</label>
                                        <select
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                            value={newTransaction.payment_method}
                                            onChange={e => setNewTransaction({ ...newTransaction, payment_method: e.target.value })}
                                        >
                                            <option value="pix">Pix</option>
                                            <option value="dinheiro">Dinheiro</option>
                                            <option value="cartao">Cartão</option>
                                            <option value="boleto">Boleto</option>
                                            <option value="transferencia">Transferência</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Status</label>
                                    <select
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 500 }}
                                        value={newTransaction.status}
                                        onChange={e => setNewTransaction({ ...newTransaction, status: e.target.value })}
                                    >
                                        <option value="pending">Pendente</option>
                                        <option value="paid">Pago</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12 }}>
                                <button onClick={() => setTransactionModalOpen(false)} className="btn btn-ghost" style={{ flex: 1, padding: '14px 0' }}>
                                    Cancelar
                                </button>
                                <button onClick={handleAddTransaction} className="btn btn-primary" style={{ flex: 2, padding: '14px 0' }}>
                                    {editingId ? 'Salvar Alterações' : 'Salvar Conta'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
