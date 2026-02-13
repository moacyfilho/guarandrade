import React, { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MenuClient from './MenuClient';

export const revalidate = 60; // Revalidate every 60 seconds

async function getMenuData() {
    const [catRes, prodRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('products').select('*').eq('status', 'Ativo').order('name')
    ]);

    return {
        categories: catRes.data || [],
        products: prodRes.data || []
    };
}

export default async function PublicMenu() {
    const { categories, products } = await getMenuData();

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-6">
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <MenuClient initialCategories={categories} initialProducts={products} />
        </Suspense>
    );
}
