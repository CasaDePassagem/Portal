import { useState } from 'react';
import { BookOpen, type LucideIcon } from 'lucide-react';

interface CourseImageProps {
    src?: string;
    alt: string;
    className?: string;
    fallbackColor?: string;
    fallbackIcon?: LucideIcon;
    aspectRatio?: 'video' | 'square' | 'wide';
}

export function CourseImage({
    src,
    alt,
    className = '',
    fallbackColor = '#6366f1',
    fallbackIcon: FallbackIcon = BookOpen,
    aspectRatio = 'video'
}: CourseImageProps) {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(!!src);

    const aspectClasses = {
        video: 'aspect-video',
        square: 'aspect-square',
        wide: 'aspect-[3/2]'
    };

    const handleError = () => {
        setHasError(true);
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
    };

    if (!src || hasError) {
        return (
            <div
                className={`${aspectClasses[aspectRatio]} w-full rounded-xl flex items-center justify-center text-white ${className}`}
                style={{ backgroundColor: fallbackColor }}
            >
                <div className="text-center">
                    <FallbackIcon size={48} className="mx-auto mb-2 opacity-90" />
                    <div className="text-sm font-medium opacity-90 px-2">{alt}</div>
                </div>
            </div>
        );
    }

    return (
        <div className={`${aspectClasses[aspectRatio]} w-full relative ${className}`}>
            {isLoading && (
                <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: fallbackColor + '20' }}
                >
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={`w-full h-full object-cover rounded-xl transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                onError={handleError}
                onLoad={handleLoad}
            />
        </div>
    );
}