
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iabjmdwnfunvhobkmddu.supabase.co';
const supabaseKey = 'sb_publishable_HzENXkzWBNz4FCQJb8WhiA_00NISh4O';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching products:', error);
    } else {
        if (data.length > 0) {
            console.log('Product keys:', Object.keys(data[0]));
        } else {
            console.log('No products found to check keys, but connection works.');
        }
    }
}

checkSchema();
