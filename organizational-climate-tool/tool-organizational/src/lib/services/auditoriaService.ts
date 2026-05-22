import { apiGet } from '@/lib/api';
import type { LogAuditoria } from '@/lib/types';

interface ListLogsParams {
  page?: number;
  limit?: number;
  data_inicio?: string;
  data_fim?: string;
}

export const auditoriaService = {
  listByEmpresa(empresaId: number, params?: ListLogsParams): Promise<LogAuditoria[]> {
    return apiGet<LogAuditoria[]>(`/empresas/${empresaId}/logs-auditoria`, params as Record<string, unknown>);
  },

  getById(id: number): Promise<LogAuditoria> {
    return apiGet<LogAuditoria>(`/logs-auditoria/${id}`);
  },

  listByUsuario(usuarioId: number): Promise<LogAuditoria[]> {
    return apiGet<LogAuditoria[]>(`/usuarios-administradores/${usuarioId}/logs-auditoria`);
  },
};
