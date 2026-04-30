import { auditRepository } from '../repositories/AuditRepository';

export interface AuditLogParams {
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: object;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  await auditRepository.create(params);
}