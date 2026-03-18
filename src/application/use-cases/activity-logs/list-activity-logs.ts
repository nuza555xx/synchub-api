import { IActivityLogRepository } from '../../interfaces/activity-log-repository';
import { ListActivityLogsInput, ActivityLogListOutput } from '../../dto/activity-log.dto';

export class ListActivityLogsUseCase {
  constructor(private readonly repo: IActivityLogRepository) {}

  async execute(input: ListActivityLogsInput): Promise<ActivityLogListOutput> {
    return this.repo.list(input);
  }
}
