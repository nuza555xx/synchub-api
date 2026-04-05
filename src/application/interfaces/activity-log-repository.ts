import {
  ListActivityLogsInput,
  ActivityLogListOutput,
  CreateActivityLogInput,
} from '@/application/dto/activity-log.dto';

export interface IActivityLogRepository {
  list(userId: string, input: ListActivityLogsInput): Promise<ActivityLogListOutput>;
  create(userId: string, input: CreateActivityLogInput): Promise<void>;
}
