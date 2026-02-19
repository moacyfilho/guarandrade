import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type TableName = string;

interface RealtimeSyncOptions {
    /** Tabelas do Supabase para observar via Realtime */
    tables: TableName[];
    /** Intervalo de polling em ms (fallback). Padrão: 5000ms */
    pollInterval?: number;
    /** Nome único do canal Realtime */
    channelName: string;
    /** Habilitar atualização ao focar a aba. Padrão: true */
    refreshOnFocus?: boolean;
}

/**
 * Hook que combina Supabase Realtime + polling automático + refresh ao focar aba.
 * Garante que os dados fiquem sempre atualizados sem depender apenas de um mecanismo.
 *
 * @param onRefresh - Função chamada sempre que há novos dados
 * @param options - Configurações
 */
export function useRealtimeSync(
    onRefresh: () => void | Promise<void>,
    options: RealtimeSyncOptions
) {
    const {
        tables,
        pollInterval = 5000,
        channelName,
        refreshOnFocus = true,
    } = options;

    // Ref estável para a função de refresh (evita re-criar efeitos)
    const refreshRef = useRef(onRefresh);
    refreshRef.current = onRefresh;

    const stableRefresh = useCallback(() => {
        refreshRef.current();
    }, []);

    useEffect(() => {
        // 1. Polling automático como fallback confiável
        const timer = setInterval(stableRefresh, pollInterval);

        // 2. Realtime Supabase — recebe mudanças instantaneamente
        const channel = supabase.channel(channelName);

        tables.forEach((table) => {
            channel.on(
                'postgres_changes' as any,
                { event: '*', schema: 'public', table },
                stableRefresh
            );
        });

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // Quando o canal se conecta, faz um refresh imediato
                stableRefresh();
            }
        });

        // 3. Atualiza ao voltar para a aba (ex: usuário estava em outra aba)
        let focusHandler: (() => void) | null = null;
        if (refreshOnFocus) {
            focusHandler = () => stableRefresh();
            window.addEventListener('focus', focusHandler);
        }

        return () => {
            clearInterval(timer);
            supabase.removeChannel(channel);
            if (focusHandler) {
                window.removeEventListener('focus', focusHandler);
            }
        };
    }, [stableRefresh, channelName, pollInterval, tables, refreshOnFocus]);
}
