import { http } from '@/lib/http';
import type { AuthUser } from './store';
import type { LoginFormValues, RegisterFormValues } from './schemas';

export interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresIn: number;
}

export function register(input: RegisterFormValues): Promise<SessionResponse> {
  return http<SessionResponse>('/auth/register', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
}

export function login(input: LoginFormValues): Promise<SessionResponse> {
  return http<SessionResponse>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
}

export function logout(): Promise<void> {
  return http<void>('/auth/logout', {
    method: 'POST',
    skipAuth: true, // /auth/logout usa cookie, não bearer
  });
}

export function refresh(): Promise<SessionResponse> {
  return http<SessionResponse>('/auth/refresh', {
    method: 'POST',
    skipAuth: true,
  });
}

export function me(): Promise<AuthUser> {
  return http<AuthUser>('/auth/me', { method: 'GET' });
}
