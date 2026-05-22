import { apiPost } from '@/lib/api';
import type { LoginResponse, TokenValidationResponse } from '@/lib/types';

export const authService = {
  login(email: string, senha: string): Promise<LoginResponse> {
    return apiPost<LoginResponse>('/auth/login', { email, senha });
  },

  bootstrap(data: any): Promise<any> {
    return apiPost<any>('/bootstrap', data);
  },

  logout(): Promise<void> {
    return apiPost<void>('/auth/logout', {});
  },

  validate(token: string): Promise<TokenValidationResponse> {
    return apiPost<TokenValidationResponse>('/auth/validate', { token });
  },

  refreshToken(token: string): Promise<{ token: string; expires_in: number }> {
    return apiPost('/auth/refresh', { token });
  },

  changePassword(senhaAtual: string, novaSenha: string): Promise<void> {
    return apiPost('/auth/change-password', { senha_atual: senhaAtual, nova_senha: novaSenha });
  },
};
