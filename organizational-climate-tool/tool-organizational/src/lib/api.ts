import axios, { AxiosError } from 'axios';
import { parseCookies } from 'nookies';
import { toast } from 'sonner';

// Tipo base que espelha a estrutura padrão de resposta da API Go
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  error?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

// ========== INSTÂNCIA AUTENTICADA (admin) ==========
const api = axios.create({ baseURL: API_BASE });

// Interceptor de request: injeta o token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const { authToken: token } = parseCookies();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response: trata 401 e erros genéricos
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && window.location.pathname.includes('/responder/')) {
        return Promise.reject(error);
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    const shouldSkipToast = 
      error.config?.url?.includes('/dashboards') || 
      error.config?.url?.includes('/dashboard') ||
      error.config?.url?.includes('/respostas/stats') ||
      error.config?.url?.includes('/respostas/count');

    if (shouldSkipToast) {
      return Promise.reject(error);
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Ocorreu um erro inesperado. Tente novamente.';

    if (typeof window !== 'undefined') {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// ========== INSTÂNCIA PÚBLICA (sem JWT, para rotas anônimas) ==========
export const publicApi = axios.create({ baseURL: API_BASE });
// Sem interceptores de request — nunca injeta token.
// Sem interceptores de response — nunca redireciona para /login.

// Helpers tipados — AUTENTICADOS (admin)
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, body);
  return response.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, body);
  return response.data.data;
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data.data;
}

// Helpers tipados — PÚBLICOS (sem token, para rotas anônimas)
export async function publicApiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await publicApi.get<ApiResponse<T>>(url, { params });
  return response.data.data;
}

export async function publicApiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await publicApi.post<ApiResponse<T>>(url, body);
  return response.data.data;
}

export default api;
