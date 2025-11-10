import { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPasswordChanged: () => void;
    onError: (error: string) => void;
    onSuccess: (message: string) => void;
}

export function ChangePasswordModal({
    isOpen,
    onClose,
    onPasswordChanged,
    onError,
    onSuccess
}: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChanging, setIsChanging] = useState(false);
    const [localError, setLocalError] = useState('');
    const { changePassword } = useAuth();

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setLocalError('');
        onClose();
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setLocalError('Todos os campos são obrigatórios');
            return;
        }

        if (newPassword !== confirmPassword) {
            setLocalError('A nova senha e confirmação não coincidem');
            return;
        }

        if (newPassword.length < 6) {
            setLocalError('A nova senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (newPassword === currentPassword) {
            setLocalError('A nova senha deve ser diferente da atual');
            return;
        }

        setIsChanging(true);
        setLocalError('');

        try {
            await changePassword(currentPassword, newPassword);

            onSuccess('Senha alterada com sucesso!');
            handleClose();
            onPasswordChanged();

        } catch (err: any) {
            console.error('Erro ao alterar senha:', err);
            let errorMessage = 'Erro ao alterar senha';

            switch (err.code) {
                case 'auth/wrong-password':
                    errorMessage = 'Senha atual incorreta';
                    break;
                case 'auth/not-authenticated':
                    errorMessage = 'Sessão expirada. Faça login novamente.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'A nova senha é muito fraca';
                    break;
                default:
                    errorMessage = err.message || 'Erro ao alterar senha';
            }

            setLocalError(errorMessage);
            onError(errorMessage);
        } finally {
            setIsChanging(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-theme-surface border border-theme rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 grid place-items-center">
                            <Key size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-theme-primary">Alterar Senha</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-theme-secondary hover:text-theme-primary"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 text-theme-primary">Senha Atual</label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Digite sua senha atual"
                                className="w-full px-3 py-2 pr-10 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
                            >
                                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-theme-primary">Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full px-3 py-2 pr-10 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
                            >
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-theme-primary">Confirmar Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Digite novamente a nova senha"
                                className="w-full px-3 py-2 pr-10 border border-theme rounded-lg bg-theme-base focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-secondary hover:text-theme-primary"
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {localError && (
                        <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 p-2 rounded flex items-center gap-2">
                            <AlertCircle size={14} />
                            {localError}
                        </div>
                    )}

                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                            <div className="text-sm text-theme-secondary">
                                <div className="font-medium mb-1 text-theme-primary">Dicas de Segurança:</div>
                                <ul className="space-y-1 text-xs">
                                    <li>• Use pelo menos 6 caracteres</li>
                                    <li>• Combine letras, números e símbolos</li>
                                    <li>• Não reutilize senhas antigas</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-theme text-theme-secondary rounded-lg hover:bg-theme-surface-hover transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleChangePassword}
                            disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isChanging ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Alterando...
                                </>
                            ) : (
                                <>
                                    <Key size={16} />
                                    Alterar Senha
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
