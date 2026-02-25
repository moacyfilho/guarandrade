import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Aumenta timeout para 60s no Vercel (padrão é 10s no plano Hobby)
export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { table_id, items } = body;

        // 1. Validação
        if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Dados inválidos. Mesa e itens são obrigatórios.' }, { status: 400 });
        }

        // 2. Busca preços atuais do banco (fonte de verdade — evita manipulação client-side)
        const productIds = items.map((i: any) => i.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price')
            .in('id', productIds);

        if (productsError || !products || products.length === 0) {
            return NextResponse.json({ error: 'Erro ao buscar produtos.' }, { status: 500 });
        }

        // 3. Monta itens com preços do banco
        const finalItems = items
            .map((item: any) => {
                const product = products.find((p: any) => p.id === item.product_id);
                if (!product) return null;
                return {
                    product_id: item.product_id,
                    quantity: Math.max(1, parseInt(item.quantity) || 1),
                    unit_price: parseFloat(product.price),
                };
            })
            .filter(Boolean);

        if (finalItems.length === 0) {
            return NextResponse.json({ error: 'Nenhum item válido encontrado.' }, { status: 400 });
        }

        // 4. Busca pedido ativo existente para a mesa
        const { data: existingOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('table_id', table_id)
            .in('status', ['fila', 'preparando', 'pronto'])
            .order('created_at', { ascending: true })
            .limit(1);

        let orderId: string;
        let createdNewOrder = false;

        if (existingOrders && existingOrders.length > 0) {
            orderId = existingOrders[0].id;
        } else {
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert({ table_id, status: 'fila', total_amount: 0 })
                .select('id')
                .single();

            if (orderError || !newOrder) {
                return NextResponse.json({ error: 'Erro ao criar pedido.' }, { status: 500 });
            }

            orderId = newOrder.id;
            createdNewOrder = true;
        }

        // 5. Insere itens com rollback automático se falhar
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(finalItems.map((item: any) => ({ order_id: orderId, ...item })));

        if (itemsError) {
            if (createdNewOrder) {
                await supabase.from('orders').delete().eq('id', orderId);
            }
            return NextResponse.json(
                { error: 'Erro ao inserir itens. Operação revertida.' },
                { status: 500 }
            );
        }

        // 6. Marca mesa como ocupada
        // (total_amount é recalculado automaticamente pelo fetchData via useRealtimeSync em até 2s)
        await supabase
            .from('tables')
            .update({ status: 'occupied' })
            .eq('id', table_id);

        return NextResponse.json({ success: true, orderId });

    } catch (error: any) {
        console.error('API /orders error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
