import { useEffect, type ReactNode, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
    submitLabel?: string;
    isEdit?: boolean;
}

export function AdminModal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    onSubmit,
    submitLabel = 'Salvar',
    isEdit = false,
}: AdminModalProps) {
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (event: React.MouseEvent) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-2xl max-h-[90vh] bg-theme-base rounded-3xl shadow-2xl border border-theme overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-theme bg-theme-surface">
                    <div>
                        <h2 className="text-xl font-semibold text-theme-primary">{title}</h2>
                        {subtitle && (
                            <p className="text-sm text-theme-secondary mt-1">{subtitle}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-theme-base transition-colors text-theme-secondary hover:text-theme-primary"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
                    {onSubmit ? (
                        <form onSubmit={onSubmit} className="p-6 space-y-6">
                            {children}
                            <div className="flex justify-end gap-3 pt-4 border-t border-theme">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-xl border border-theme text-theme-secondary hover:text-theme-primary hover:border-theme-primary transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 rounded-xl btn-primary font-medium"
                                >
                                    {isEdit ? `Salvar ${submitLabel}` : `Criar ${submitLabel}`}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="p-6">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}