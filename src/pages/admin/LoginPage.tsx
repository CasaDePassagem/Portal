import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestPasswordReset } from '../../lib/users';

export function LoginPage() {
  const { signIn, confirmSignIn, cancelPendingLogin, pendingLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [challengeQuestion, setChallengeQuestion] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'otp'>(pendingLogin ? 'otp' : 'credentials');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (pendingLogin) {
      setStage('otp');
      setOtpCode('');
      const update = () => {
        const remaining = Math.max(0, Math.floor((pendingLogin.expiresAt - Date.now()) / 1000));
        setOtpSecondsLeft(remaining);
      };
      update();
      const timer = window.setInterval(update, 1000);
      return () => window.clearInterval(timer);
    }
    setStage('credentials');
    setOtpSecondsLeft(0);
    return undefined;
  }, [pendingLogin]);

  useEffect(() => {
    setError(null);
  }, [stage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (stage === 'otp') {
        const code = otpCode.trim();
        if (!code) {
          setError('Informe o código enviado por e-mail.');
          return;
        }
        await confirmSignIn(code);
        setOtpCode('');
        navigate(from, { replace: true });
        return;
      }

      const challengeValue = challengeAnswer.trim() ? Number(challengeAnswer.trim()) : undefined;
      const outcome = await signIn(email.trim(), password, challengeValue);
      setChallengeQuestion(null);
      setChallengeAnswer('');
      if (outcome === 'success') {
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const authError = err as Error & { code?: string; challenge?: { question?: string } };
      if (authError.challenge?.question) {
        setChallengeQuestion(authError.challenge.question);
        setChallengeAnswer('');
      }
      setError(authError.message || 'Falha ao entrar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOtp = () => {
    cancelPendingLogin();
    setOtpCode('');
  };

  const resetBaseUrl = useMemo(() => {
    const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
    return url.toString().replace(/\/+$/, '');
  }, []);

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetEmail.trim()) return;
    setResetError(null);
    setResetMessage(null);
    setResetLoading(true);
    try {
      await requestPasswordReset(resetEmail.trim(), resetBaseUrl);
      setResetMessage('Se o e-mail existir, enviamos um código de redefinição para a caixa de entrada.');
    } catch (err) {
      const error = err as Error;
      setResetError(error.message || 'Não foi possível enviar o código. Tente novamente.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex items-center justify-center p-6 bg-theme-base relative">
      <div className="w-full max-w-sm bg-theme-surface rounded-2xl border border-theme shadow-xl p-6">
        <h1 className="text-xl font-semibold mb-4 text-theme-primary">
          {stage === 'otp' ? 'Confirme o código' : 'Acesso Restrito'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {stage === 'credentials' ? (
              <>
                <label htmlFor="email" className="block text-sm font-medium mb-1 text-theme-primary">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@projeto.com"
                  required
                  autoFocus
                />
              </>
            ) : (
              <div className="text-sm text-theme-secondary">
                Código enviado para <span className="font-medium text-theme-primary">{pendingLogin?.email}</span>.
              </div>
            )}
          </div>

          {stage === 'credentials' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1 text-theme-primary">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
          )}

          {stage === 'credentials' && challengeQuestion && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="font-medium text-blue-700 dark:text-blue-400">Confirme que você é humano</h3>
              </div>
              <label className="block text-sm text-theme-secondary">
                Resolva rapidamente: {challengeQuestion}
              </label>
              <input
                type="number"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                className="w-full px-3 py-2 border border-blue-500/40 rounded-lg bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Resposta"
                required
              />
            </div>
          )}

          {stage === 'otp' && (
            <div>
              <label htmlFor="otp" className="block text-sm font-medium mb-1 text-theme-primary">
                Código de verificação
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tracking-[0.3em] text-center text-lg"
                placeholder="000000"
                required
                autoFocus
              />
              <div className="text-xs text-theme-muted mt-2">
                {otpSecondsLeft > 0
                  ? `O código expira em ${Math.floor(otpSecondsLeft / 60)
                    .toString()
                    .padStart(2, '0')}:${(otpSecondsLeft % 60).toString().padStart(2, '0')}.`
                  : 'Código expirado? Cancele e peça novamente.'}
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 rounded-xl font-medium btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {stage === 'otp' ? 'Validando...' : 'Entrando...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
                </svg>
                {stage === 'otp' ? 'Confirmar código' : 'Entrar'}
              </>
            )}
          </button>

          {stage === 'otp' && (
            <button
              type="button"
              onClick={handleCancelOtp}
              className="w-full text-sm text-theme-secondary hover:text-theme-primary mt-2"
              disabled={loading}
            >
              Cancelar e tentar novamente
            </button>
          )}
        </form>

        {stage === 'credentials' && (
          <div className="text-xs text-theme-muted mt-4 space-y-2">
            <p>Não há cadastro público. Contas são gerenciadas internamente.</p>
            <button
              type="button"
              onClick={() => {
                setShowReset(true);
                setResetEmail(email);
                setResetMessage(null);
                setResetError(null);
              }}
              className="text-theme-secondary hover:text-theme-primary underline"
            >
              Esqueci minha senha
            </button>
          </div>
        )}
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-theme-surface border border-theme rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme-primary">Recuperar acesso</h2>
              <button
                onClick={() => {
                  setShowReset(false);
                  setResetEmail('');
                  setResetMessage(null);
                  setResetError(null);
                }}
                className="text-theme-secondary hover:text-theme-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleResetSubmit} className="space-y-3">
              <div>
                <label className="block text-sm text-theme-primary font-medium mb-1">Email cadastrado</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-xl bg-theme-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="admin@projeto.com"
                  required
                  autoFocus
                />
              </div>
              {resetError && (
                <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl p-2">
                  {resetError}
                </div>
              )}
              {resetMessage && (
                <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl p-2">
                  {resetMessage}
                </div>
              )}
              <button
                type="submit"
                disabled={resetLoading}
                className={`w-full px-4 py-2 rounded-xl font-medium btn-primary flex items-center justify-center gap-2 ${resetLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {resetLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar código'
                )}
              </button>
            </form>
            <p className="text-xs text-theme-muted">
              Você receberá um código válido por 10 minutos e um link para redefinição. Verifique também a caixa de spam.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
