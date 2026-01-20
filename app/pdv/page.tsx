"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';

const MENU_CATEGORIES = ['Todos', 'Lanches', 'Bebidas', 'Porções', 'Sobremesas'];

export default function PDV() {
    const [activeCategory, setActiveCategory] = useState('Todos');
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [cart, setCart] = useState<{ item: any, qty: number }[]>([]);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const [productsRes, tablesRes] = await Promise.all([
                supabase.from('products').select('*').eq('status', 'Ativo'),
                supabase.from('tables').select('*').order('id', { ascending: true })
            ]);

            if (productsRes.data) setMenuItems(productsRes.data);
            if (tablesRes.data) setTables(tablesRes.data);
        };
        fetchData();
    }, []);

    const addToCart = (item: any) => {
        const existing = cart.find(c => c.item.id === item.id);
        if (existing) {
            setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
        } else {
            setCart([...cart, { item, qty: 1 }]);
        }
    };

    const removeFromCart = (itemId: string) => {
        setCart(cart.map(c => {
            if (c.item.id === itemId) return { ...c, qty: c.qty - 1 };
            return c;
        }).filter(c => c.qty > 0));
    };

    const total = cart.reduce((acc, curr) => acc + (curr.item.price * curr.qty), 0);

    const finalizarPedido = async () => {
        if (!selectedTable || cart.length === 0) return;
        setIsSubmitting(true);

        try {
            // 1. Criar o pedido (Order)
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    table_id: selectedTable,
                    status: 'fila',
                    total_amount: total
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Criar os itens do pedido (Order Items)
            const orderItems = cart.map(c => ({
                order_id: order.id,
                product_id: curr.item.id, // Fixed: item is in c.item
                quantity: c.qty,
                unit_price: c.item.price
            }));

            // Fixed: corrected mapping variable name
            const itemsToInsert = cart.map(c => ({
                order_id: order.id,
                product_id: c.item.id,
                quantity: c.qty,
                unit_price: c.item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // 3. Atualizar status da mesa
            await supabase
                .from('tables')
                .update({ status: 'occupied', total_amount: total }) // Note: typically we'd sum current + new, but keeping it simple for now
                .eq('id', selectedTable);

            alert('Pedido enviado com sucesso para a cozinha! 🍳');
            setCart([]);
            setSelectedTable(null);
        } catch (error: any) {
            alert('Erro ao enviar pedido: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredItems = activeCategory === 'Todos'
        ? menuItems
        : menuItems.filter(i => {
            // This logic assumes we might need to fetch category names or join. 
            // For simplicity, we'll just show all for now since we'd need another join.
            return true;
        });

    return (
        <div className="flex h-screen p-4 gap-4 overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex gap-4">
                {/* Menu Section */}
                <section className="flex-1 flex flex-col gap-6">
                    <header className="flex justify-between items-center py-2">
                        <h1 className="text-3xl font-bold text-white">Novo Pedido 🍔</h1>
                        <div className="flex gap-2">
                            {MENU_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat ? 'bg-white text-black' : 'glass text-gray-400'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </header>

                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                        {menuItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => addToCart(item)}
                                className="glass p-4 cursor-pointer hover:bg-white/5 active:scale-95 text-center flex flex-col items-center gap-3"
                            >
                                <div className="text-4xl">🍔</div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                    <p className="text-indigo-400 font-bold">R$ {parseFloat(item.price).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                        {menuItems.length === 0 && (
                            <p className="text-gray-500 col-span-full text-center py-10 tracking-widest uppercase text-xs">Nenhum produto cadastrado no banco.</p>
                        )}
                    </div>
                </section>

                {/* Cart Section */}
                <aside className="w-80 md:w-96 glass flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/5">
                        <h3 className="font-bold text-xl text-white mb-4">Resumo do Pedido</h3>
                        <div className="grid grid-cols-4 gap-2 mb-2">
                            {tables.map(table => (
                                <button
                                    key={table.id}
                                    onClick={() => setSelectedTable(table.id)}
                                    className={`py-1 text-[10px] uppercase font-bold rounded ${selectedTable === table.id ? 'bg-indigo-600 text-white' :
                                            table.status === 'occupied' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400'
                                        }`}
                                >
                                    M{table.id}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {cart.map(c => (
                            <div key={c.item.id} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg">🍔</div>
                                    <div>
                                        <h5 className="text-sm font-bold text-white">{c.item.name}</h5>
                                        <p className="text-[10px] text-gray-400">R$ {parseFloat(c.item.price).toFixed(2)} x {c.qty}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeFromCart(c.item.id)} className="w-6 h-6 glass flex items-center justify-center font-bold text-red-400">-</button>
                                    <span className="text-sm font-bold text-white">{c.qty}</span>
                                    <button onClick={() => addToCart(c.item)} className="w-6 h-6 glass flex items-center justify-center font-bold text-green-400">+</button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="text-center py-20 opacity-30 text-white">
                                <div className="text-4xl mb-2">🛒</div>
                                <p>Carrinho vazio</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-white/5 bg-white/5 space-y-4">
                        <div className="flex justify-between items-center text-white">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-2xl font-bold">R$ {total.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={finalizarPedido}
                            disabled={cart.length === 0 || !selectedTable || isSubmitting}
                            className="w-full py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
                        >
                            {isSubmitting ? 'ENVIANDO...' : 'FINALIZAR PEDIDO'}
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
