import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { completeUserInvite } from '../../lib/users';
import { FsgSignature, FSG_TEAM_MEMBERS } from '../../components/FsgSignature';
import InstantTooltip from '../../components/InstantTooltip';

export function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const teamTooltip = `Alunos: ${FSG_TEAM_MEMBERS.join(' • ')}`;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError('Convite inválido ou expirado. Peça um novo link ao administrador.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas devem ser iguais.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await completeUserInvite(token, password);
      setMessage('Senha definida com sucesso. Você já pode acessar o portal.');
      setTimeout(() => navigate('/admin', { replace: true }), 2500);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Falha ao validar o convite.';
      setError(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex items-center justify-center bg-theme-base p-6 relative">
      <div className="absolute top-3 sm:top-4 left-4 z-10">
        <InstantTooltip tooltip={teamTooltip} position="right">
          <div className="hidden sm:block">
            <FsgSignature />
          </div>
          <div className="flex sm:hidden">
            <FsgSignature orientation="column" />
          </div>
        </InstantTooltip>
      </div>
      <div className="w-full max-w-md bg-theme-surface border border-theme rounded-2xl shadow-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold text-theme-primary">Definir senha de acesso</h1>
        {!token && (
          <div className="text-sm text-theme-secondary space-y-2">
            <p>O link informado é inválido ou expirou. Solicite um novo convite ao responsável.</p>
            <Link to="/" className="text-blue-500 hover:text-blue-600 font-medium">
              Voltar para o site
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-theme-primary">Nova senha</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mínimo de 6 caracteres"
              required
              disabled={!token}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-theme-primary">Confirmar nova senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Repita a senha"
              required
              disabled={!token}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {message && (
            <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className={`w-full px-4 py-2 rounded-xl font-medium btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </>
            ) : (
              'Salvar senha'
            )}
          </button>
        </form>

        <p className="text-xs text-theme-muted">
          Se o link expirar, peça novamente ao administrador para reenviar o convite.
        </p>
      </div>
    </div>
  );
}
