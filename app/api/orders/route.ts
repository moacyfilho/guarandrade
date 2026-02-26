import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    const reqId = crypto.randomUUID().slice(0, 8);
    try {
        const body = await request.json();
        const { table_id, items } = body;
        logger.info('api/orders:request', { req_id: reqId, table_id, items_count: items?.length });

        // 1. Validação
        if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
            logger.warn('api/orders:validation_failed', { req_id: reqId, table_id, items });
            return NextResponse.json({ error: 'Dados inválidos. Mesa e itens são obrigatórios.' }, { status: 400 });
        }

        // 2. Busca preços atuais do banco (fonte de verdade — evita manipulação client-side)
        const productIds = items.map((i: any) => i.product_id);
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, price')
            .in('id', productIds);

        if (productsError || !products || products.length === 0) {
            logger.error('api/orders:products_fetch_failed', { req_id: reqId, error: productsError?.message, product_ids: productIds });
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
            logger.warn('api/orders:no_valid_items', { req_id: reqId, table_id });
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
            logger.info('api/orders:order_reused', { req_id: reqId, order_id: orderId, table_id });
        } else {
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert({ table_id, status: 'fila', total_amount: 0 })
                .select('id')
                .single();

            if (orderError || !newOrder) {
                logger.error('api/orders:order_create_failed', { req_id: reqId, table_id, error: orderError?.message });
                return NextResponse.json({ error: 'Erro ao criar pedido.' }, { status: 500 });
            }

            orderId = newOrder.id;
            createdNewOrder = true;
            logger.info('api/orders:order_created', { req_id: reqId, order_id: orderId, table_id });
        }

        // 5. Insere itens com rollback automático se falhar
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(finalItems.map((item: any) => ({ order_id: orderId, ...item })));

        if (itemsError) {
            logger.error('api/orders:items_insert_failed', { req_id: reqId, order_id: orderId, error: itemsError.message, rollback: createdNewOrder });
            if (createdNewOrder) {
                await supabase.from('orders').delete().eq('id', orderId);
                logger.warn('api/orders:rollback_done', { req_id: reqId, order_id: orderId });
            }
            return NextResponse.json(
                { error: 'Erro ao inserir itens. Operação revertida.' },
                { status: 500 }
            );
        }

        logger.info('api/orders:items_inserted', { req_id: reqId, order_id: orderId, items_count: finalItems.length });

        // 6. Marca mesa como ocupada
        await supabase
            .from('tables')
            .update({ status: 'occupied' })
            .eq('id', table_id);

        logger.info('api/orders:success', { req_id: reqId, order_id: orderId, table_id });
        return NextResponse.json({ success: true, orderId });

    } catch (error: any) {
        logger.error('api/orders:unhandled_exception', { req_id: reqId, error: error?.message });
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
