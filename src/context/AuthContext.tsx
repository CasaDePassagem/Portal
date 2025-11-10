import { useMemo, useState } from 'react';
import { AuthContext, type AuthContextValue, type PendingLogin } from './auth';
import type { UserRecord } from '../lib/users';
import { changeUserPassword, initiateLogin, completeLogin } from '../lib/users';
import { remoteLogout } from '../lib/remoteStore';

type ChallengeState = {
  question: string;
  answer: number;
  expiresAt: number;
};

type AttemptState = {
  count: number;
  challenge?: ChallengeState;
  lastAttempt: number;
};

type AuthError = Error & {
  code?: string;
  challenge?: { question: string };
};

const ATTEMPT_THRESHOLD = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const attempts = new Map<string, AttemptState>();

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function createChallenge(): ChallengeState {
  const a = 10 + Math.floor(Math.random() * 40);
  const b = 10 + Math.floor(Math.random() * 40);
  const answer = a + b;
  return {
    question: `${a} + ${b}`,
    answer,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  };
}

function getAttemptState(username: string) {
  const key = normalizeUsername(username);
  const existing = attempts.get(key);
  if (!existing) {
    const state: AttemptState = { count: 0, lastAttempt: Date.now() };
    attempts.set(key, state);
    return { state, key };
  }

  const now = Date.now();
  if (now - existing.lastAttempt > ATTEMPT_WINDOW_MS) {
    existing.count = 0;
    existing.challenge = undefined;
  }
  existing.lastAttempt = now;

  if (existing.challenge && existing.challenge.expiresAt < now) {
    existing.challenge = undefined;
  }

  attempts.set(key, existing);
  return { state: existing, key };
}

function registerFailure(key: string, state: AttemptState) {
  state.count += 1;
  if (state.count >= ATTEMPT_THRESHOLD && !state.challenge) {
    state.challenge = createChallenge();
  }
  attempts.set(key, state);
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [loading] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<PendingLogin | null>(null);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    pendingLogin,
    async signIn(username: string, password: string, challengeAnswer?: number) {
      const trimmedUsername = username.trim();
      const { state, key } = getAttemptState(trimmedUsername);

      if (state.count >= ATTEMPT_THRESHOLD) {
        if (!state.challenge) {
          state.challenge = createChallenge();
        }
        if (typeof challengeAnswer !== 'number' || Number.isNaN(challengeAnswer) || challengeAnswer !== state.challenge.answer) {
          const error = new Error('Responda ao desafio para continuar.') as AuthError;
          error.code = 'auth/challenge-required';
          error.challenge = { question: state.challenge.question };
          attempts.set(key, state);
          throw error;
        }
        state.challenge = undefined;
        attempts.set(key, state);
      }

      try {
        const result = await initiateLogin(trimmedUsername, password);
        if (result.status === 'otp_required') {
          clearAttempts(key);
          setPendingLogin({
            email: result.email,
            token: result.token,
            expiresAt: Date.now() + result.expiresIn * 1000,
          });
          return 'otp_required';
        }

        clearAttempts(key);
        setPendingLogin(null);
        setUser(result.user);
        return 'success';
      } catch (err) {
        registerFailure(key, state);
        const error = err as AuthError;
        if (!error.code) error.code = 'auth/invalid-credentials';
        if (state.challenge) {
          error.challenge = { question: state.challenge.question };
        } else if (state.count >= ATTEMPT_THRESHOLD) {
          state.challenge = createChallenge();
          attempts.set(key, state);
          error.challenge = { question: state.challenge.question };
          error.code = 'auth/challenge-required';
        }
        throw error;
      }
    },
    async confirmSignIn(otpCode: string) {
      const current = pendingLogin;
      if (!current) {
        const error = new Error('Nenhum login pendente.') as AuthError;
        error.code = 'auth/no-pending-login';
        throw error;
      }
      const normalizedOtp = otpCode.trim();
      if (!normalizedOtp) {
        const error = new Error('Informe o código enviado por e-mail.') as AuthError;
        error.code = 'auth/missing-otp';
        throw error;
      }

      const account = await completeLogin(current.token, normalizedOtp);
      clearAttempts(normalizeUsername(current.email));
      setPendingLogin(null);
      setUser(account);
    },
    cancelPendingLogin() {
      if (pendingLogin) {
        clearAttempts(normalizeUsername(pendingLogin.email));
      }
      setPendingLogin(null);
    },
    async signOut() {
      await remoteLogout().catch(() => undefined);
      if (user) {
        clearAttempts(normalizeUsername(user.email));
      }
      setUser(null);
      setPendingLogin(null);
    },
    async changePassword(currentPassword: string, newPassword: string) {
      if (!user) {
        const error = new Error('Usuário não autenticado') as AuthError;
        error.code = 'auth/not-authenticated';
        throw error;
      }

      await changeUserPassword(user.uid, currentPassword, newPassword);
    },
  }), [user, loading, pendingLogin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
