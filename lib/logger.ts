type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
    level: LogLevel;
    action: string;
    data?: Record<string, unknown>;
    ts: string;
}

function emit(level: LogLevel, action: string, data?: Record<string, unknown>) {
    const entry: LogEntry = { level, action, data, ts: new Date().toISOString() };
    const tag = `[GRD][${level}] ${action}`;

    if (level === 'ERROR') {
        console.error(tag, data ?? '');
    } else if (level === 'WARN') {
        console.warn(tag, data ?? '');
    } else {
        console.log(tag, data ?? '');
    }

    // Em produção, loga também como JSON estruturado para facilitar busca no Vercel Logs
    if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(entry));
    }
}

export const logger = {
    info:  (action: string, data?: Record<string, unknown>) => emit('INFO',  action, data),
    warn:  (action: string, data?: Record<string, unknown>) => emit('WARN',  action, data),
    error: (action: string, data?: Record<string, unknown>) => emit('ERROR', action, data),
    debug: (action: string, data?: Record<string, unknown>) => emit('DEBUG', action, data),
};
