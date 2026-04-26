import type { PlanOutput } from '@/application/dto/plan.dto';
import type { Plan } from '@/domain/entities/plan';

export interface IPlanRepository {
  list(): Promise<PlanOutput[]>;
  findById(planId: string): Promise<Plan | null>;
  findByName(name: string): Promise<Plan | null>;
}
