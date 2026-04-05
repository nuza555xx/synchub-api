import { IActivityLogRepository } from '@/application/interfaces/activity-log-repository';
import {
  ListActivityLogsInput,
  ActivityLogListOutput,
  ActivityLogOutput,
  CreateActivityLogInput,
} from '@/application/dto/activity-log.dto';
import { SupabaseClientFactory } from '@/infrastructure/database/supabase';
import { AppError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class SupabaseActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly supabase: SupabaseClientFactory) {}

  async list(userId: string, input: ListActivityLogsInput): Promise<ActivityLogListOutput> {
    const admin = this.supabase.getAdmin();
    const page = input.page || 1;
    const limit = Math.min(input.limit || 10, 100);
    const offset = (page - 1) * limit;

    let query = admin
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (input.action) {
      const actions = input.action.split(',').map((a) => a.trim());
      query = query.in('action', actions);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new AppError(EC.SYS500001, error.message, 500);
    }

    const items: ActivityLogOutput[] = (data || []).map((row: any) => {
      const meta = row.user?.raw_user_meta_data || {};
      return {
        id: row.id,
        user: {
          id: row.user_id,
          email: row.user?.email || '',
          fullName: meta.full_name || meta.name || '',
        },
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        details: row.details || {},
        ipAddress: row.ip_address,
        createdAt: row.created_at,
      };
    });

    return {
      items,
      meta: { page, limit, total: count || 0 },
    };
  }

  async create(userId: string, input: CreateActivityLogInput): Promise<void> {
    const admin = this.supabase.getAdmin();
    const { error } = await admin.from('activity_logs').insert({
      user_id: userId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      details: input.details || {},
      ip_address: input.ipAddress || null,
    });

    if (error) {
      // Log but don't throw — activity logging should not break the main flow
      console.error('Failed to create activity log:', error.message);
    }
  }
}
