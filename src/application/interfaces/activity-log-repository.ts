import {
  ListActivityLogsInput,
  ActivityLogListOutput,
  CreateActivityLogInput,
} from '@/application/dto/activity-log.dto';

export interface IActivityLogRepository {
  list(orgId: string, input: ListActivityLogsInput): Promise<ActivityLogListOutput>;
  create(orgId: string, input: CreateActivityLogInput): Promise<void>;
}
