"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

// ----------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------
export type Product = {
    id: string;
    name: string;
    description: string;
    price: number | string;
    category_id: string;
    stock_quantity: number;
    status: string;
    image_url?: string;
};

export type Category = {
    id: string;
    name: string;
    icon: string;
};

type CartItem = {
    product: Product;
    quantity: number;
    observation?: string;
};

interface MenuClientProps {
    initialCategories: Category[];
    initialProducts: Product[];
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function MenuClient({ initialCategories, initialProducts }: MenuClientProps) {
    const searchParams = useSearchParams();

    // --- State: UI & Flow ---
    const [activeCategory, setActiveCategory] = useState('all');
    const [tableId, setTableId] = useState<number | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderSent, setOrderSent] = useState(false);

    // --- Helpers ---
    const formatCurrency = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return `R$ ${num.toFixed(2).replace('.', ',')}`;
    };

    // --- Effects ---
    useEffect(() => {
        // Get Table ID from URL
        const tableParam = searchParams.get('mesa') || searchParams.get('table');
        if (tableParam) setTableId(parseInt(tableParam));
    }, [searchParams]);

    // --- Cart Logic ---
    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });

        // Haptic feedback if available
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                return { ...item, quantity: item.quantity - 1 };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const cartTotal = cart.reduce((acc, item) => {
        const price = typeof item.product.price === 'string' ? parseFloat(item.product.price) : item.product.price;
        return acc + (price * item.quantity);
    }, 0);

    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    // --- Checkout Logic ---
    const handleCheckout = async () => {
        if (!tableId) {
            alert('Por favor, escaneie o QR Code da mesa novamente ou informe o número da mesa.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Secure API Call
            const payload = {
                table_id: tableId,
                items: cart.map(item => ({
                    product_id: item.product.id,
                    quantity: item.quantity
                }))
            };

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao processar pedido.');
            }

            setOrderSent(true);
            setCart([]);
            setIsCartOpen(false);

        } catch (error: any) {
            console.error(error);
            alert('Erro: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (orderSent) return (
        <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center p-8 text-center space-y-6 animate-fade-in">
            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center text-5xl mb-4 animate-bounce">
                🎉
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Pedido Enviado!</h1>
            <p className="text-gray-400 text-sm">
                A cozinha já recebeu seu pedido para a <span className="text-white font-bold">Mesa {tableId}</span>.
            </p>
            <button
                onClick={() => setOrderSent(false)}
                className="bg-red-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs hover:bg-red-500 transition-all shadow-lg shadow-red-600/30"
            >
                Fazer Novo Pedido
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#1A1A1A] text-white pb-32">
            {/* --- Header --- */}
            <div className="p-6 pt-8 text-center space-y-2 relative">
                {tableId && (
                    <div className="absolute top-4 right-4 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                            Mesa {tableId}
                        </p>
                    </div>
                )}
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-2xl shadow-red-600/20 mb-4">
                    🥟
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">Guarandrade</h1>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em]">Cardápio Digital</p>
            </div>

            {/* --- Categories --- */}
            <div className="flex gap-3 overflow-x-auto px-6 py-2 scrollbar-hide sticky top-0 bg-[#1A1A1A]/95 backdrop-blur-xl z-20 border-b border-white/5">
                <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${activeCategory === 'all' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-white/10'}`}
                >
                    Todos
                </button>
                {initialCategories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-2 border ${activeCategory === cat.id ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-white/10'}`}
                    >
                        <span>{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* --- Product List --- */}
            <div className="px-4 py-6 space-y-4">
                {initialProducts.filter(p => activeCategory === 'all' || p.category_id === activeCategory).map(item => {
                    const cartItem = cart.find(c => c.product.id === item.id);
                    const qty = cartItem ? cartItem.quantity : 0;

                    return (
                        <div key={item.id} className={`glass p-4 transition-all duration-300 ${qty > 0 ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                            <div className="flex gap-4">
                                <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center text-3xl shrink-0 overflow-hidden relative">
                                    {item.image_url ? (
                                        <Image
                                            src={item.image_url}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100px, 100px"
                                        />
                                    ) : (
                                        <span>{initialCategories.find(c => c.id === item.category_id)?.icon || '🍔'}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                    <div>
                                        <h3 className="font-bold text-sm uppercase tracking-tight truncate pr-2">{item.name}</h3>
                                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mt-1">{item.description}</p>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <p className="text-white font-black text-sm">{formatCurrency(item.price)}</p>

                                        {/* Add/Remove Control */}
                                        <div className="flex items-center gap-3 bg-black/40 rounded-lg p-1 border border-white/10">
                                            {qty > 0 ? (
                                                <>
                                                    <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center text-red-400 active:scale-95 transition-transform font-bold">-</button>
                                                    <span className="text-xs font-black min-w-[12px] text-center">{qty}</span>
                                                </>
                                            ) : null}
                                            <button
                                                onClick={() => addToCart(item)}
                                                className={`w-6 h-6 flex items-center justify-center active:scale-95 transition-transform font-bold ${qty > 0 ? 'text-green-400' : 'text-white'}`}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- Floating Cart Button --- */}
            {cartCount > 0 && (
                <div className="fixed bottom-6 inset-x-0 px-6 z-30">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full glass bg-[#ffffff] text-black py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl shadow-white/10 animate-fade-in active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <span className="bg-black text-white w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center">
                                {cartCount}
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest">Ver Pedido</span>
                        </div>
                        <span className="text-sm font-black">{formatCurrency(cartTotal)}</span>
                    </button>
                </div>
            )}

            {/* --- Cart Modal (Sheet) --- */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />

                    <div className="relative bg-[#111] w-full max-w-md max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden animate-slide-up border-t border-white/10">
                        {/* Handle */}
                        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2" />

                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-lg font-black uppercase tracking-tight">Seu Pedido</h2>
                            <button onClick={() => setIsCartOpen(false)} className="text-xs font-bold text-gray-500 uppercase">Fechar</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cart.map(item => (
                                <div key={item.product.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-lg overflow-hidden relative">
                                            {item.product.image_url ? (
                                                <Image
                                                    src={item.product.image_url}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="40px"
                                                />
                                            ) : (
                                                <span>{initialCategories.find(c => c.id === item.product.category_id)?.icon || '🍔'}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase">{item.product.name}</p>
                                            <p className="text-[10px] text-gray-500">{formatCurrency(item.product.price)} x {item.quantity}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => removeFromCart(item.product.id)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-red-500 font-bold active:scale-95">-</button>
                                        <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                        <button onClick={() => addToCart(item.product)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-green-500 font-bold active:scale-95">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 border-t border-white/10 bg-[#161616] space-y-4">
                            {!tableId && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl flex gap-3 items-center">
                                    <span className="text-lg">⚠️</span>
                                    <p className="text-[10px] text-yellow-500 font-bold leading-tight">
                                        Mesa não identificada. Escaneie o QR Code da mesa ou chame o garçom.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between items-end">
                                <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Total</span>
                                <span className="text-2xl font-black text-red-400">{formatCurrency(cartTotal)}</span>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={isSubmitting || !tableId}
                                className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all shadow-xl ${isSubmitting || !tableId ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200 active:scale-95'}`}
                            >
                                {isSubmitting ? 'Enviando...' : 'Confirmar Pedido 🚀'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
