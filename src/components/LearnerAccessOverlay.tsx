import { useState } from 'react';
import { X, User } from 'lucide-react';
import { useLearner } from '../context/LearnerContext';

interface LearnerAccessOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LearnerAccessOverlay({ isOpen, onClose }: LearnerAccessOverlayProps) {
    const { setLearner } = useLearner();
    const [displayName, setDisplayName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return;

        const learner = {
            id: `learner_${Date.now()}`,
            displayName: displayName.trim(),
            createdAt: new Date(),
            lastActiveAt: new Date()
        };

        setLearner(learner);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <User size={20} />
                        Identificação do Participante
                    </h2>
                    <button onClick={onClose} className="text-theme-secondary hover:text-theme-primary">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Nome para exibição</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Digite seu nome..."
                            className="w-full px-3 py-2 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                        />
                    </div>

                    <div className="text-sm text-theme-secondary">
                        Seu progresso será salvo automaticamente conforme você assiste às aulas.
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-theme rounded-lg hover:bg-theme-surface-hover transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!displayName.trim()}
                            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Começar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}