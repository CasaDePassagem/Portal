// Utilitários para categorias e cores dos cursos
import {
    Monitor,
    Palette,
    BarChart3,
    TrendingUp,
    Code,
    Sparkles,
    GraduationCap,
    Heart,
    FileText,
    Zap,
    BookOpen
} from 'lucide-react';

export const TOPIC_CATEGORIES = {
    technology: {
        name: 'Tecnologia',
        color: '#3b82f6', // blue-500
        icon: Monitor,
    },
    design: {
        name: 'Design',
        color: '#ec4899', // pink-500
        icon: Palette,
    },
    business: {
        name: 'Negócios',
        color: '#10b981', // emerald-500
        icon: BarChart3,
    },
    marketing: {
        name: 'Marketing',
        color: '#f59e0b', // amber-500
        icon: TrendingUp,
    },
    development: {
        name: 'Desenvolvimento',
        color: '#8b5cf6', // violet-500
        icon: Code,
    },
    creative: {
        name: 'Criativo',
        color: '#ef4444', // red-500
        icon: Sparkles,
    },
    education: {
        name: 'Educação',
        color: '#06b6d4', // cyan-500
        icon: GraduationCap,
    },
    health: {
        name: 'Saúde',
        color: '#84cc16', // lime-500
        icon: Heart,
    },
    other: {
        name: 'Outros',
        color: '#6b7280', // gray-500
        icon: FileText,
    }
} as const;

export type TopicCategory = keyof typeof TOPIC_CATEGORIES;

export function getCategoryInfo(category?: string) {
    if (!category || !(category in TOPIC_CATEGORIES)) {
        return TOPIC_CATEGORIES.other;
    }
    return TOPIC_CATEGORIES[category as TopicCategory];
}

export const DIFFICULTY_LEVELS = {
    beginner: {
        name: 'Iniciante',
        color: '#10b981', // emerald-500
        icon: BookOpen,
    },
    intermediate: {
        name: 'Intermediário',
        color: '#f59e0b', // amber-500
        icon: Zap,
    },
    advanced: {
        name: 'Avançado',
        color: '#ef4444', // red-500
        icon: Sparkles,
    }
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;

export function getDifficultyInfo(difficulty?: string) {
    if (!difficulty || !(difficulty in DIFFICULTY_LEVELS)) {
        return DIFFICULTY_LEVELS.beginner;
    }
    return DIFFICULTY_LEVELS[difficulty as DifficultyLevel];
}

export function formatDuration(minutes?: number): string {
    if (!minutes || minutes <= 0) return 'Duração não informada';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
        return `${mins}min`;
    }

    if (mins === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${mins}min`;
}

// Função para gerar cor aleatória baseada no nome (para fallback)
export function generateColorFromString(str: string): string {
    const colors = [
        '#3b82f6', '#ec4899', '#10b981', '#f59e0b',
        '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}