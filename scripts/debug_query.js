
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iabjmdwnfunvhobkmddu.supabase.co';
const supabaseKey = 'sb_publishable_HzENXkzWBNz4FCQJb8WhiA_00NISh4O';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuery() {
    console.log('Testing Cozinha Query...');

    // Exact query from Cozinha page
    const { data: cozinData, error: cozinError } = await supabase
        .from('orders')
        .select(`
            *,
            tables (name),
            order_items (
                *,
                products (name)
            )
        `)
        .neq('status', 'finalizado')
        .limit(1);

    if (cozinError) {
        console.error('Cozinha Query Error:', cozinError);
    } else {
        console.log('Cozinha Query Success:', cozinData);
    }

    console.log('\nTesting PDV Table Query...');
    const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .limit(1);

    if (tableError) {
        console.error('Table Query Error:', tableError);
    } else {
        console.log('Table Query Success:', tableData);
    }
}

debugQuery();
