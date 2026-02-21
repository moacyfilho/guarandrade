const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrder() {
    console.log('🔍 Investigando Mesa 2...');

    // 1. Check Orders directly
    const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', 2)
        .neq('status', 'finalizado');

    if (orderError) {
        console.error('❌ Erro ao buscar pedidos:', orderError);
        return;
    }

    console.log(`📦 Pedidos encontrados: ${orders.length}`);
    orders.forEach(o => {
        console.log(`   - ID: ${o.id}`);
        console.log(`   - Status: ${o.status}`);
        console.log(`   - Total: ${o.total_amount}`);
    });

    if (orders.length === 0) {
        console.log('⚠️ Nenhum pedido ativo encontrado para Mesa 2');
        return;
    }

    // 2. Check complete query used in the app
    console.log('\n🕵️ Testando query completa do app...');
    const { data: fullData, error: fullError } = await supabase
        .from('orders')
        .select(`*, order_items (*, products (name))`)
        .eq('table_id', 2)
        .neq('status', 'finalizado');

    if (fullError) {
        console.error('❌ Erro na query completa:', fullError);
    } else {
        console.log(`📦 Dados completos retornados: ${fullData.length}`);
        fullData.forEach(o => {
            console.log(`   Pedido: ${o.id}`);
            if (o.order_items) {
                console.log(`   Items: ${o.order_items.length}`);
                o.order_items.forEach(i => {
                    console.log(`     - Item ID: ${i.id}`);
                    console.log(`       Produto: ${i.products ? i.products.name : 'NULL (Produto não encontrado)'}`);
                });
            } else {
                console.log('   ⚠️ order_items é NULL ou undefined');
            }
        });
    }
}

debugOrder();
