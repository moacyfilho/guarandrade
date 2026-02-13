
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iabjmdwnfunvhobkmddu.supabase.co';
const supabaseKey = 'sb_publishable_HzENXkzWBNz4FCQJb8WhiA_00NISh4O';
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDatabase() {
    console.log('Starting database reset...');

    // 1. Delete all order items
    console.log('Deleting order items...');
    // We can use a trick: filter by quantity > -1 which should cover all items
    const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .gte('quantity', 0);

    if (itemsError) {
        console.error('Error deleting items:', itemsError);
    } else {
        console.log('Order items deleted.');
    }

    // 2. Delete all orders
    console.log('Deleting orders...');
    // Filter by total_amount > -1
    const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .gte('total_amount', 0);

    if (ordersError) {
        console.error('Error deleting orders:', ordersError);
    } else {
        console.log('Orders deleted.');
    }

    // 3. Reset tables
    console.log('Resetting tables...');
    const { error: tablesError } = await supabase
        .from('tables')
        .update({ status: 'available', total_amount: 0 })
        .gt('id', 0); // Tables leverage int IDs usually, so > 0 works. If UUID, we'd need another check.

    if (tablesError) console.error('Error resetting tables:', tablesError);
    else console.log('Tables reset.');

    console.log('Database reset complete.');
}

resetDatabase();
