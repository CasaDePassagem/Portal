import { createContext } from 'react';
import type { UserRecord } from '../lib/users';

export type LoginChallenge = {
  question: string;
};

export type PendingLogin = {
  email: string;
  token: string;
  expiresAt: number;
};

export type AuthContextValue = {
  user: UserRecord | null;
  loading: boolean;
  pendingLogin: PendingLogin | null;
  signIn: (username: string, password: string, challengeAnswer?: number) => Promise<'success' | 'otp_required'>;
  confirmSignIn: (otpCode: string) => Promise<void>;
  cancelPendingLogin: () => void;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
