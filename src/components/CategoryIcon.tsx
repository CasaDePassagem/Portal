import type { LucideIcon } from 'lucide-react';

interface CategoryIconProps {
    Icon: LucideIcon;
    size?: number;
    className?: string;
}

export function CategoryIcon({ Icon, size = 16, className = '' }: CategoryIconProps) {
    return <Icon size={size} className={className} />;
}