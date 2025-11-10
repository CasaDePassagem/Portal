/**
 * Cache seletivo para dados públicos (NÃO salva users ou dados sensíveis)
 * Armazena apenas: topics, contents, lessons
 */

const CACHE_KEY = 'app_public_cache';
const CACHE_VERSION = 'v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

type CacheData = {
    version: string;
    timestamp: number;
    topics: Array<unknown>;
    contents: Array<unknown>;
    lessons: Array<unknown>;
};

export function getCachedData(): CacheData | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const data = JSON.parse(raw) as CacheData;

        // Verifica versão
        if (data.version !== CACHE_VERSION) {
            clearCache();
            return null;
        }

        // Verifica TTL
        const now = Date.now();
        if (now - data.timestamp > CACHE_TTL) {
            clearCache();
            return null;
        }

        return data;
    } catch (err) {
        console.error('Erro ao ler cache:', err);
        clearCache();
        return null;
    }
}

export function setCachedData(data: {
    topics: Array<unknown>;
    contents: Array<unknown>;
    lessons: Array<unknown>;
}) {
    try {
        const cacheData: CacheData = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            topics: data.topics,
            contents: data.contents,
            lessons: data.lessons,
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
        console.error('Erro ao salvar cache:', err);
        // Se der erro (quota exceeded), limpa tudo
        clearCache();
    }
}

export function clearCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch (err) {
        console.error('Erro ao limpar cache:', err);
    }
}

export function getCacheInfo() {
    const data = getCachedData();
    if (!data) return { cached: false };

    const age = Date.now() - data.timestamp;
    const remaining = CACHE_TTL - age;

    return {
        cached: true,
        age: Math.floor(age / 1000), // segundos
        remaining: Math.floor(remaining / 1000), // segundos
        topicsCount: data.topics.length,
        contentsCount: data.contents.length,
        lessonsCount: data.lessons.length,
    };
}
