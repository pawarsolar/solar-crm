import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SupabaseService } from '../../db/supabase.service';

/** Field names whose values must never reach the audit log. */
const REDACTED_KEYS = [
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'secret',
  'bank_account',
  'account_number',
  'ifsc',
  'card',
  'cvv',
  'otp',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Normalise IPv6 loopback / mapped addresses into something `inet` accepts. */
  private normaliseIp(ip?: string): string | null {
    if (!ip) return null;
    const cleaned = ip.replace(/^::ffff:/, '');
    if (cleaned === '::1') return '127.0.0.1';
    // Reject anything that is not a plausible IPv4/IPv6 literal so `inet` never errors.
    if (!/^[0-9a-fA-F:.]+$/.test(cleaned)) return null;
    return cleaned;
  }

  /** Deep, case-insensitive redaction of sensitive keys from the request body. */
  private redact(value: any, depth = 0): any {
    if (depth > 4 || value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.slice(0, 50).map((v) => this.redact(v, depth + 1));

    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (REDACTED_KEYS.some((k) => key.toLowerCase().includes(k))) {
        out[key] = '[redacted]';
      } else {
        out[key] = this.redact(val, depth + 1);
      }
    }
    return out;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user, body } = request;

    return next.handle().pipe(
      tap(async (response) => {
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method) || url.includes('/exports/')) {
          try {
            const orgId = user?.org_id;
            const userId = user?.id;

            const entityMatch = url.match(/\/api\/([a-zA-Z_-]+)/);
            const entity = entityMatch ? entityMatch[1] : 'unknown';
            const entityId = response?.id || request.params?.id || null;

            await this.supabaseService.client.from('audit_log').insert({
              org_id: orgId,
              user_id: userId,
              action: `${method} ${url}`,
              entity,
              entity_id: entityId ? String(entityId) : null,
              meta: {
                body: this.redact(body),
                // Record which Super Admin a child-login action belongs to.
                impersonated_by: user?.impersonator?.id || null,
              },
              ip: this.normaliseIp(ip),
            });
          } catch (err) {
            this.logger.warn(`Failed to write to audit log: ${err.message}`);
          }
        }
      }),
    );
  }
}
