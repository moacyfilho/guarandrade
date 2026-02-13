"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

export default function Configuracoes() {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        restaurant_name: 'Guarandrade',
        dark_mode: true,
        currency: 'BRL',
        printer_enabled: true,
        sound_alert_enabled: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase.from('settings').select('*').single();
            if (data) {
                setSettings({
                    restaurant_name: data.restaurant_name,
                    dark_mode: data.dark_mode,
                    currency: data.currency,
                    printer_enabled: data.printer_enabled,
                    sound_alert_enabled: data.sound_alert_enabled
                });
            } else if (!error) {
                await supabase.from('settings').insert([{ id: 1 }]);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (field: string, value: any) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const [modal, setModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        type: 'confirm' | 'input';
        inputValue?: string;
        onConfirm: (val?: string) => void;
    }>({
        open: false,
        title: '',
        message: '',
        type: 'confirm',
        onConfirm: () => { }
    });

    const closeModal = () => {
        setModal(prev => ({ ...prev, open: false }));
    };

    const handleClearHistory = (e: React.MouseEvent) => {
        e.preventDefault();
        setModal({
            open: true,
            title: 'Limpar Histórico',
            message: 'Tem certeza? Isso apagará apenas os pedidos FINALIZADOS. Essa ação não pode ser desfeita.',
            type: 'confirm',
            onConfirm: async () => {
                setLoading(true);
                try {
                    const { data: finalizedOrders, error: fetchError } = await supabase
                        .from('orders')
                        .select('id')
                        .eq('status', 'finalizado');

                    if (fetchError) throw fetchError;

                    if (finalizedOrders && finalizedOrders.length > 0) {
                        const orderIds = finalizedOrders.map(o => o.id);
                        const { error: itemsError } = await supabase
                            .from('order_items')
                            .delete()
                            .in('order_id', orderIds);

                        if (itemsError) throw itemsError;

                        const { error: ordersError } = await supabase
                            .from('orders')
                            .delete()
                            .in('id', orderIds);

                        if (ordersError) throw ordersError;
                    }

                    alert('Histórico de pedidos finalizados limpo com sucesso!');
                } catch (error: any) {
                    console.error('Error clearing history:', error);
                    alert('Erro ao limpar histórico: ' + error.message);
                } finally {
                    setLoading(false);
                    closeModal();
                }
            }
        });
    };

    const handleResetSystem = (e: React.MouseEvent) => {
        e.preventDefault();
        setModal({
            open: true,
            title: 'RESETAR SISTEMA',
            message: 'DIGITE "RESETAR" PARA CONFIRMAR. ISSO APAGARÁ TUDO!',
            type: 'input',
            onConfirm: async (val) => {
                if (val !== 'RESETAR') return;
                setLoading(true);
                try {
                    const { error: itemsError } = await supabase.from('order_items').delete().neq('quantity', -1);
                    if (itemsError) throw itemsError;

                    const { error: ordersError } = await supabase.from('orders').delete().neq('total_amount', -1);
                    if (ordersError) throw ordersError;

                    const { error: tablesError } = await supabase
                        .from('tables')
                        .update({ status: 'available', total_amount: 0 })
                        .neq('id', -1);

                    if (tablesError) throw tablesError;

                    alert('Sistema resetado com sucesso! 🚀');
                } catch (error: any) {
                    console.error('Error resetting system:', error);
                    alert('Erro: ' + error.message);
                } finally {
                    setLoading(false);
                    closeModal();
                }
            }
        });
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({ ...settings, id: 1 })
                .select();

            if (error) throw error;
            alert('Configurações salvas com sucesso no banco de dados! ✅');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
        <div
            onClick={onToggle}
            style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                background: enabled ? 'linear-gradient(135deg, #EA1D2C, #C8101E)' : 'rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                flexShrink: 0,
                boxShadow: enabled ? '0 2px 10px rgba(234,29,44,0.3)' : 'none',
            }}
        >
            <div style={{
                position: 'absolute',
                top: 3,
                left: enabled ? 25 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
        </div>
    );

    const SettingRow = ({ title, desc, children }: { title: string, desc: string, children: React.ReactNode }) => (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: '1px solid var(--border-subtle)',
        }}>
            <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
            </div>
            {children}
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', padding: 16, gap: 16 }}>
            <Sidebar />

            <main style={{ flex: 1, overflowY: 'auto', paddingRight: 8, position: 'relative' }}>
                {/* Modal */}
                {modal.open && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{modal.title}</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{modal.message}</p>

                            {modal.type === 'input' && (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Digite RESETAR"
                                    style={{
                                        width: '100%',
                                        padding: 12,
                                        borderRadius: 12,
                                        textAlign: 'center',
                                        fontWeight: 800,
                                        letterSpacing: '0.1em',
                                        textTransform: 'uppercase',
                                        fontSize: 14,
                                        marginBottom: 16,
                                        background: 'rgba(239,68,68,0.08) !important',
                                        borderColor: 'rgba(239,68,68,0.2) !important',
                                    }}
                                    onChange={(e) => setModal(prev => ({ ...prev, inputValue: e.target.value }))}
                                />
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={closeModal} className="btn btn-ghost" style={{ flex: 1, padding: '14px 0' }}>
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => modal.onConfirm(modal.inputValue)}
                                    className="btn btn-danger"
                                    style={{ flex: 1, padding: '14px 0' }}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                            Ajustes & Configurações ⚙️
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4 }}>
                            Personalize o sistema e gerencie preferências.
                        </p>
                    </div>
                    <button onClick={handleSave} className="btn btn-primary" disabled={loading} style={{ padding: '12px 28px' }}>
                        {loading ? 'Salvando...' : '💾 Salvar Alterações'}
                    </button>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, paddingBottom: 32 }}>
                    {/* General Settings */}
                    <div className="glass" style={{ padding: 28 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🏪</span> Geral
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Configurações básicas do seu restaurante.</p>

                        <SettingRow title="Nome da Lanchonete" desc="Nome que aparece no sistema e nos recibos.">
                            <input
                                type="text"
                                value={settings.restaurant_name}
                                onChange={(e) => handleChange('restaurant_name', e.target.value)}
                                style={{ width: 200, padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: 'right' }}
                            />
                        </SettingRow>

                        <SettingRow title="Modo Escuro" desc="Alternar entre temas do sistema.">
                            <ToggleSwitch enabled={settings.dark_mode} onToggle={() => handleChange('dark_mode', !settings.dark_mode)} />
                        </SettingRow>

                        <SettingRow title="Moeda" desc="Unidade monetária padrão.">
                            <select
                                value={settings.currency}
                                onChange={(e) => handleChange('currency', e.target.value)}
                                style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
                            >
                                <option value="BRL">BRL (R$)</option>
                                <option value="USD">USD ($)</option>
                            </select>
                        </SettingRow>
                    </div>

                    {/* Devices */}
                    <div className="glass" style={{ padding: 28 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>🖨️</span> Impressão & Dispositivos
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Gerencie conexões de hardware.</p>

                        <div style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 12,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234,29,44,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖨️</div>
                                <div>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Impressora Térmica - Cozinha</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span className={`status-dot ${settings.printer_enabled ? 'status-dot-success' : 'status-dot-danger'}`} />
                                        <span style={{ fontSize: 10, fontWeight: 700, color: settings.printer_enabled ? '#6FCF97' : '#f87171', textTransform: 'uppercase' }}>
                                            {settings.printer_enabled ? 'Conectado' : 'Desativado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ToggleSwitch enabled={settings.printer_enabled} onToggle={() => handleChange('printer_enabled', !settings.printer_enabled)} />
                        </div>

                        <div style={{
                            padding: 16,
                            borderRadius: 16,
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔊</div>
                                <div>
                                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Alerta Sonoro de Pedido</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        <span className={`status-dot ${settings.sound_alert_enabled ? 'status-dot-success' : 'status-dot-danger'}`} />
                                        <span style={{ fontSize: 10, fontWeight: 700, color: settings.sound_alert_enabled ? '#6FCF97' : '#f87171', textTransform: 'uppercase' }}>
                                            {settings.sound_alert_enabled ? 'Ativado' : 'Desativado'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <ToggleSwitch enabled={settings.sound_alert_enabled} onToggle={() => handleChange('sound_alert_enabled', !settings.sound_alert_enabled)} />
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div style={{
                        gridColumn: '1 / -1',
                        background: 'rgba(239,68,68,0.04)',
                        border: '1px solid rgba(239,68,68,0.12)',
                        borderRadius: 20,
                        padding: 28,
                    }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f87171', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>⚠️</span> Zona de Perigo
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Cuidado: essas ações são irreversíveis e afetam todo o sistema.</p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleClearHistory}
                                className="btn btn-ghost"
                                style={{ borderColor: 'rgba(239,68,68,0.2)', color: '#f87171' }}
                            >
                                🗑️ Limpar Histórico de Pedidos
                            </button>
                            <button
                                type="button"
                                onClick={handleResetSystem}
                                className="btn btn-danger"
                            >
                                {loading ? '⏳ Processando...' : '💣 Resetar Sistema'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
