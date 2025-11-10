import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { X, Key } from 'lucide-react';

import { useLearner } from '../context/LearnerContext';
import { fetchParticipant, markParticipantActive, computeParticipantDisplayName } from '../lib/progress';

interface LearnerAccessProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LearnerAccess({ isOpen, onClose }: LearnerAccessProps) {
    const { setLearner } = useLearner();
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const resetState = () => {
        setCode('');
        setError('');
        setSuccessMessage('');
        setIsLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            resetState();
        }
    }, [isOpen]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (trimmed.length === 0) {
            setError('Informe o código do participante.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const participant = await fetchParticipant(trimmed);
            if (!participant) {
                setError('Código não encontrado.');
                return;
            }

            const displayName = computeParticipantDisplayName({
                code: trimmed,
                displayName: participant.displayName,
                firstName: participant.firstName,
                lastName: participant.lastName,
            });

            setLearner({
                id: trimmed,
                displayName,
                firstName: participant.firstName,
                lastName: participant.lastName,
                age: participant.age ?? null,
                gender: participant.gender,
                fatherName: participant.fatherName,
                motherName: participant.motherName,
                careHouse: participant.careHouse,
                createdAt: participant.createdAt,
                lastActiveAt: new Date(),
            });

            await markParticipantActive(trimmed);
            setSuccessMessage(`Bem-vindo(a), ${displayName}!`);
            setTimeout(() => handleClose(), 1200);
        } catch (err) {
            console.error('Erro ao buscar participante:', err);
            setError('Não foi possível validar o código. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Rastreio de progresso</h2>
                    <button onClick={handleClose} className="text-theme-secondary hover:text-theme-primary">
                        <X size={20} />
                    </button>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <p className="text-sm text-theme-secondary">
                            Informe o código fornecido no atendimento para acompanhar suas aulas.
                        </p>
                        <div className="relative">
                            <input
                                type="text"
                                value={code}
                                onChange={(event) => setCode(event.target.value.toUpperCase())}
                                placeholder="Digite seu código"
                                className="w-full px-3 py-2 pr-10 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase tracking-widest"
                                maxLength={12}
                                autoFocus
                                disabled={isLoading}
                            />
                            <Key className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary" size={18} />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 border border-red-200 p-2 rounded">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="text-sm text-green-600 bg-green-50 border border-green-200 p-2 rounded">
                            {successMessage}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 rounded-lg border border-theme text-theme-secondary hover:text-theme-primary hover:bg-theme-surface-hover transition-colors"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={code.trim().length === 0 || isLoading}
                            className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Verificando...' : 'Acessar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
