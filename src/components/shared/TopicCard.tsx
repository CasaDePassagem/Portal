import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Topic } from '../../lib/db';
import { CourseImage } from '../CourseImage';
import { CategoryIcon } from '../CategoryIcon';
import { getCategoryInfo, generateColorFromString } from '../../lib/courseUtils';

interface TopicCardProps {
    topic: Topic;
    isSelected: boolean;
    onClick: (topic: Topic) => void;
    onEdit?: (topic: Topic) => void;
    onDelete?: (topic: Topic) => void;
    dragProps?: any;
    enableMotion?: boolean;
}

export function TopicCard({
    topic,
    isSelected,
    onClick,
    onEdit,
    onDelete,
    dragProps,
    enableMotion = false,
}: TopicCardProps) {
    const categoryInfo = getCategoryInfo(topic.category);
    const fallbackColor = topic.color || generateColorFromString(topic.name);
    const isAdminMode = !!(onEdit && onDelete);

    const cardContent = (
        <div
            className={`group relative overflow-hidden rounded-2xl border bg-theme-surface text-left ${!isAdminMode ? 'transition-all duration-300' : ''
                } ${isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : 'border-theme hover:border-gray-300 hover:shadow-lg'
                } ${isAdminMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
            onClick={() => onClick(topic)}
            {...dragProps}
        >
            <div className="relative">
                <CourseImage
                    src={topic.coverImageUrl}
                    alt={topic.name}
                    fallbackColor={fallbackColor}
                    fallbackIcon={categoryInfo.icon}
                    aspectRatio="video"
                    className={`${!isAdminMode ? 'group-hover:scale-105 transition-transform duration-300' : ''}`}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-xl" />

                <div
                    className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1"
                    style={{ backgroundColor: categoryInfo.color + '90' }}
                >
                    <CategoryIcon Icon={categoryInfo.icon} size={12} />
                    <span>{categoryInfo.name}</span>
                </div>

                {isAdminMode && (
                    <div className="absolute top-3 left-3 flex gap-2">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit(topic);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur-sm"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete(topic);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/70 text-white hover:bg-red-500 backdrop-blur-sm"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-semibold text-white text-lg leading-tight">{topic.name}</h3>
                </div>
            </div>
        </div>
    );

    if (enableMotion && !isAdminMode) {
        return (
            <motion.div
                key={topic.id}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.98 }}
            >
                {cardContent}
            </motion.div>
        );
    }

    return cardContent;
}