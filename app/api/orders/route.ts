import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Using the client for now, but in a real scenario we'd use a service role client

// ----------------------------------------------------------------------
// Request Schema (Validation)
// ----------------------------------------------------------------------
// In a real app we'd use Zod. For now, manual validation.

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { table_id, items } = body;

        // 1. Validation
        if (!table_id || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Dados inválidos. Mesa e itens são obrigatórios.' }, { status: 400 });
        }

        // 2. Calculate Total Server-Side (Security)
        // We need to fetch current prices from DB to avoid client-side price manipulation
        const { data: products } = await supabase
            .from('products')
            .select('id, price, stock_quantity')
            .in('id', items.map((item: any) => item.product_id));

        if (!products) {
            return NextResponse.json({ error: 'Erro ao buscar produtos.' }, { status: 500 });
        }

        let totalAmount = 0;
        const finalItems = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.product_id);
            if (!product) continue; // Skip if product doesn't exist

            const quantity = parseInt(item.quantity) || 1;
            const price = parseFloat(product.price);

            totalAmount += price * quantity;

            finalItems.push({
                product_id: product.id,
                quantity: quantity,
                unit_price: price, // Source of truth from DB
                // observations: item.observations
            });
        }

        // 3. Create Order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                table_id,
                status: 'fila',
                total_amount: totalAmount
            })
            .select()
            .single();

        if (orderError) throw orderError;

        // 4. Create Order Items
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(finalItems.map(item => ({
                order_id: order.id,
                ...item
            })));

        if (itemsError) {
            // Ideally we'd rollback order creation here
            console.error('Error inserting items:', itemsError);
            return NextResponse.json({ error: 'Erro ao processar itens do pedido.' }, { status: 500 });
        }

        // 5. Update Stock
        for (const item of finalItems) {
            const product = products.find(p => p.id === item.product_id);
            if (product) {
                const newStock = (product.stock_quantity || 0) - item.quantity;
                await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);
            }
        }

        // 6. Update Table Status
        const { data: currentTable } = await supabase.from('tables').select('total_amount').eq('id', table_id).single();
        const newTotal = (parseFloat(currentTable?.total_amount || 0) + totalAmount);

        await supabase
            .from('tables')
            .update({ status: 'occupied', total_amount: newTotal })
            .eq('id', table_id);

        return NextResponse.json({ success: true, orderId: order.id });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
    }
}
