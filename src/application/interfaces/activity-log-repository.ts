import {
  ListActivityLogsInput,
  ActivityLogListOutput,
  CreateActivityLogInput,
} from '@/application/dto/activity-log.dto';

export interface IActivityLogRepository {
  list(input: ListActivityLogsInput): Promise<ActivityLogListOutput>;
  create(input: CreateActivityLogInput): Promise<void>;
}
