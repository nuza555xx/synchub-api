import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { PlanOutput } from '@/application/dto/plan.dto';

export class ListPlansUseCase {
  constructor(private readonly planRepo: IPlanRepository) {}

  async execute(): Promise<PlanOutput[]> {
    return this.planRepo.list();
  }
}
