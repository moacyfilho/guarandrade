/**
 * Utilitários de data para o fuso horário de Manaus (UTC-4)
 * 
 * O Supabase armazena tudo em UTC. Manaus é UTC-4.
 * Se usarmos new Date().toISOString() para filtrar "hoje", a partir das
 * 20:00 de Manaus (= 00:00 UTC) o filtro já pula para o dia seguinte,
 * cortando o faturamento da noite.
 *
 * Solução: sempre gerar a data de "hoje" e os intervalos de tempo
 * levando em conta o offset de -4h.
 */

const MANAUS_OFFSET_HOURS = -4; // UTC-4

/**
 * Retorna o início do dia atual em Manaus como string ISO (UTC).
 * Ex: se for 23:00 do dia 20/02 em Manaus (= 03:00 de 21/02 UTC),
 * retorna "2026-02-20T04:00:00.000Z" (meia-noite do dia 20 em Manaus = 04:00 UTC).
 */
export function getTodayStartManaus(): string {
    const now = new Date();
    // Calcular a data "local" de Manaus
    const manausTime = new Date(now.getTime() + MANAUS_OFFSET_HOURS * 60 * 60 * 1000);
    // Pegar só a data (YYYY-MM-DD) em Manaus
    const manausDateStr = manausTime.toISOString().split('T')[0];
    // Meia-noite em Manaus = meia-noite + 4h em UTC
    return `${manausDateStr}T04:00:00.000Z`;
}

/**
 * Retorna o início de N dias atrás em Manaus como string ISO (UTC).
 */
export function getNDaysAgoManaus(days: number): string {
    const now = new Date();
    const manausTime = new Date(now.getTime() + MANAUS_OFFSET_HOURS * 60 * 60 * 1000);
    manausTime.setUTCDate(manausTime.getUTCDate() - days);
    const manausDateStr = manausTime.toISOString().split('T')[0];
    return `${manausDateStr}T04:00:00.000Z`;
}

/**
 * Para o filtro do financeiro por período
 */
export function getStartDateManaus(range: 'daily' | 'weekly' | 'monthly'): string {
    if (range === 'daily') return getTodayStartManaus();
    if (range === 'weekly') return getNDaysAgoManaus(7);
    return getNDaysAgoManaus(30);
}
