import { CheckCircle2, Video, GripVertical } from 'lucide-react';
import type { Lesson } from '../../lib/db';

interface LessonCardProps {
    lesson: Lesson;
    index: number;
    isActive: boolean;
    onClick: (lesson: Lesson) => void;
    onEdit?: (lesson: Lesson) => void;
    onDelete?: (lesson: Lesson) => void;
    dragProps?: any;
    progressData?: {
        completed: boolean;
        lastPosition: number;
        duration: number;
    };
    showProgress?: boolean;
}

export function LessonCard({
    lesson,
    index,
    isActive,
    onClick,
    onEdit,
    onDelete,
    dragProps,
    progressData,
    showProgress = false,
}: LessonCardProps) {
    const isAdminMode = !!dragProps || (!!onEdit && !!onDelete);
    const isCompleted = progressData?.completed || false;
    const progressPercent = progressData && progressData.duration > 0
        ? Math.round((progressData.lastPosition / progressData.duration) * 100)
        : 0;

    if (isAdminMode) {
        const dragRef = dragProps?.ref;
        const draggableAttributes = dragProps?.draggableProps ?? {};
        const dragHandleAttributes = dragProps?.dragHandleProps ?? {};

        // Admin version - with separate drag handle
        return (
            <div
                ref={dragRef}
                {...draggableAttributes}
                className={`p-3 rounded-xl border ${isActive ? 'border-blue-500 bg-blue-500/5' : 'border-theme bg-theme-base'
                    } flex items-center gap-3`}
            >
                <div
                    {...dragHandleAttributes}
                    className="cursor-grab active:cursor-grabbing text-theme-secondary hover:text-theme-primary flex-shrink-0"
                >
                    <GripVertical size={16} />
                </div>
                <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onClick(lesson)}
                >
                    <div className="text-sm font-medium text-theme-primary">{lesson.title}</div>
                    <div className="text-xs text-theme-secondary line-clamp-2">
                        {lesson.description || 'Sem descrição'}
                    </div>
                </div>
            </div>
        );
    }

    // Public version - with progress tracking
    return (
        <li>
            <button
                onClick={() => onClick(lesson)}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${isActive
                    ? 'btn-primary'
                    : 'border-theme bg-theme-surface text-theme-primary hover:bg-theme-surface-hover'
                    }`}
            >
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full border ${isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                            ? 'border-white/50'
                            : 'border-theme'
                        }`}>
                        {isCompleted ? <CheckCircle2 size={12} /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{lesson.title}</div>
                        <div className="text-xs opacity-80 truncate">
                            {showProgress && progressData
                                ? `${progressPercent}% assistido`
                                : 'Pronto para começar'
                            }
                        </div>
                    </div>
                </div>
                {showProgress && progressData && progressPercent > 0 && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                        <div
                            className={`h-1 rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </button>
        </li>
    );
}

// Admin lesson details component for showing active lesson info with edit/delete buttons
interface AdminLessonDetailsProps {
    lesson: Lesson;
    onEdit: (lesson: Lesson) => void;
    onDelete: (lesson: Lesson) => void;
}

export function AdminLessonDetails({ lesson, onEdit, onDelete }: AdminLessonDetailsProps) {
    return (
        <div className="rounded-xl border border-theme bg-theme-surface px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
                <div className="font-medium text-theme-primary">{lesson.title}</div>
                <div className="text-xs text-theme-secondary flex items-center gap-2">
                    <Video size={14} className="text-red-500" />
                    {lesson.youtubeUrl}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onEdit(lesson)}
                    className="px-3 py-2 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary"
                >
                    Editar aula
                </button>
                <button
                    onClick={() => onDelete(lesson)}
                    className="px-3 py-2 rounded-xl border border-red-500 text-red-500 hover:bg-red-500/10"
                >
                    Remover
                </button>
            </div>
        </div>
    );
}
