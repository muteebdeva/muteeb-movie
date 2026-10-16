import { sb } from './supabase.js';
import type { AdminIdentity } from './auth.js';

/** Best-effort audit logging. A logging failure never fails the operation. */
export async function audit(
  admin: AdminIdentity,
  action: string,
  entity?: string,
  entityId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await sb.insert('audit_log', [
      {
        admin_id: admin.id,
        admin_email: admin.email,
        action,
        entity: entity ?? null,
        entity_id: entityId ?? null,
        details: details ?? {},
      },
    ]);
  } catch (e) {
    console.error('[api] audit log write failed:', e);
  }
}
