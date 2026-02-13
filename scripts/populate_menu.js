
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://iabjmdwnfunvhobkmddu.supabase.co';
const supabaseKey = 'sb_publishable_HzENXkzWBNz4FCQJb8WhiA_00NISh4O';
const supabase = createClient(supabaseUrl, supabaseKey);

const menuData = [
    {
        category: 'Pastéis Tradicionais',
        icon: '🥟',
        items: [
            { name: 'Queijo', description: 'queijo coalho', price: 10.00 },
            { name: 'Mistão', description: 'carne, queijo coalho e ovo', price: 10.00 },
            { name: 'Carne', description: 'carne moída', price: 10.00 },
            { name: 'Carne e Queijo', description: 'carne moída e queijo coalho', price: 10.00 },
            { name: 'Pizza', description: 'queijo coalho, apresuntado e orégano', price: 10.00 },
            { name: 'Banana', description: 'queijo coalho', price: 10.00 },
            { name: 'Romeu e Julieta', description: 'goiabada e queijo coalho', price: 10.00 },
            { name: 'Frango', description: 'frango desfiado', price: 10.00 },
            { name: 'Calabresa', description: 'queijo coalho', price: 10.00 }
        ]
    },
    {
        category: 'Pastéis Especiais',
        icon: '🥟',
        items: [
            { name: 'Camarão', description: '', price: 12.00 },
            { name: 'Cawboy', description: 'presunto de peru, queijo mussarela, milho verde, ovo, cebolinha e requeijão', price: 12.00 },
            { name: 'Nordestino', description: 'jabá e queijo catupiry', price: 12.00 },
            { name: 'Bauru', description: 'queijo prato, presunto de peru, orégano e tomate', price: 12.00 },
            { name: 'Frangão', description: 'desfiado, queijo catupiry, prato e ovo', price: 12.00 },
            { name: 'Frango com Catupiry', description: 'com catupiry', price: 12.00 },
            { name: 'Magnífico', description: 'frango, queijo prato e catupiry, calabresa, presunto e milho', price: 12.00 },
            { name: 'Caipira', description: 'frango, bacon, milho, azeitona e catupiry', price: 12.00 },
            { name: 'Caboquinho', description: 'tucumã, queijo coalho e banana frita', price: 12.00 },
            { name: '4 Queijo', description: 'mussarela, cheddar, catupiry e coalho', price: 12.00 },
            { name: 'Carne de Sol', description: 'desfiada, queijo coalho e banana frita', price: 12.00 },
            { name: 'Chocolate', description: 'chocolate', price: 12.00 },
            { name: 'Lasanha de Frango', description: 'queijo prato, presunto de peru e molho branco', price: 12.00 },
            { name: 'Lasanha de Carne', description: 'queijo prato, presunto de peru e molho branco', price: 12.00 },
            { name: 'X Salada', description: 'carne de hambúrguer, queijo prato, presunto de peru, ovo e tomate', price: 12.00 },
            { name: 'Portuguesa', description: 'presunto de peru, queijo coalho, queijo mussarela, ovo, cebolinha e ovos', price: 12.00 }
        ]
    },
    {
        category: 'Salgados Tradicionais',
        icon: '🥐',
        items: [
            { name: 'Queijo e Presunto', description: 'massa de macaxeira', price: 6.00 },
            { name: 'Salsicha', description: 'coberta com macaxeira', price: 6.00 },
            { name: 'Coxinha', description: 'frango desfiado com macaxeira', price: 6.00 },
            { name: 'Croquete', description: 'carne moída com macaxeira', price: 6.00 },
            { name: 'Ovo', description: 'ovo cozido coberto com macaxeira', price: 6.00 }
        ]
    },
    {
        category: 'Esfirras, Forno e Empadas',
        icon: '🥧',
        items: [
            { name: 'Esfirra de Frango', description: 'desfiado com catupiry', price: 6.00 },
            { name: 'Esfirra de Queijo e Presunto', description: 'queijo prato, presunto e molho rosé', price: 6.00 },
            { name: 'Pastel de Forno', description: 'carne ou queijo e presunto', price: 6.00 },
            { name: 'Empada de Frango', description: 'com catupiry', price: 6.00 },
            { name: 'Empada de Chocolate', description: '', price: 6.00 }
        ]
    },
    {
        category: 'Vitaminas Especiais',
        icon: '🥑',
        items: [
            { name: 'Guaraná da Amazônia 300ml', description: '', price: 7.00 },
            { name: 'Guaraná da Amazônia 400ml', description: '', price: 8.00 },
            { name: 'Açaí 300ml', description: '', price: 7.00 },
            { name: 'Açaí 400ml', description: '', price: 8.00 },
            { name: 'Chocolatada 400ml', description: '', price: 7.00 },
            { name: 'Abacatada 300ml', description: '', price: 7.00 },
            { name: 'Abacatada 400ml', description: '', price: 8.00 },
            { name: 'Açaí com Tapioca 300ml', description: '', price: 8.00 },
            { name: 'Açaí com Tapioca 400ml', description: '', price: 9.00 }
        ]
    },
    {
        category: 'Sucos Naturais',
        icon: '🥤',
        items: [
            { name: 'Copo 300ml', description: 'Sabores: Maracujá, Goiaba, Acerola, Taperebá, Cupuaçu e outros', price: 6.00 },
            { name: 'Copo 400ml', description: 'Sabores: Maracujá, Goiaba, Acerola, Taperebá, Cupuaçu e outros', price: 7.00 }
        ]
    },
    {
        category: 'Caldo de Cana',
        icon: '🎋',
        items: [
            { name: 'Caldo de Cana 300ml', description: '', price: 5.00 },
            { name: 'Caldo de Cana 400ml', description: '', price: 6.00 }
        ]
    },
    {
        category: 'Pizza Brotinho',
        icon: '🍕',
        items: [
            { name: 'Pizza Brotinho', description: 'Mussarela, Calabresa, Presunto de Peru', price: 8.00 }
        ]
    },
    {
        category: 'Refrigerantes',
        icon: '🥤',
        items: [
            { name: 'Garrafinha KS', description: '', price: 5.00 },
            { name: 'Lata 350ml', description: '', price: 6.00 },
            { name: 'Garrafa 600ml', description: '', price: 7.00 },
            { name: 'Garrafa 1 Litro / Pet Baré 2L', description: '', price: 10.00 },
            { name: 'Garrafa 2 Litros', description: '', price: 14.00 }
        ]
    }
];

async function populateMenu() {
    console.log('Iniciando cadastro do cardápio...');

    for (const categoryData of menuData) {
        // 1. Create or Get Category
        let categoryId;
        const { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('name', categoryData.category)
            .single();

        if (existingCategory) {
            categoryId = existingCategory.id;
            console.log(`Categoria existente encontrada: ${categoryData.category}`);
        } else {
            const { data: newCategory, error: catError } = await supabase
                .from('categories')
                .insert([{ name: categoryData.category, icon: categoryData.icon }])
                .select()
                .single();

            if (catError) {
                console.error(`Erro ao criar categoria ${categoryData.category}:`, catError);
                continue;
            }
            categoryId = newCategory.id;
            console.log(`Categoria criada: ${categoryData.category}`);
        }

        // 2. Insert Items
        for (const item of categoryData.items) {
            const { error: itemError } = await supabase
                .from('products')
                .insert([{
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    category_id: categoryId,
                    status: 'Ativo',
                    stock_quantity: 100 // Default stock
                }]);

            if (itemError) {
                console.error(`Erro ao criar produto ${item.name}:`, itemError);
            } else {
                console.log(`Produto criado: ${item.name}`);
            }
        }
    }

    console.log('Cardápio atualizado com sucesso!');
}

populateMenu();
