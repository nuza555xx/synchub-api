import type { IOrganizationRepository } from '@/application/interfaces/organization-repository';
import type { IPlanRepository } from '@/application/interfaces/plan-repository';
import type { CreateOrganizationInput, OrganizationOutput } from '@/application/dto/organization.dto';
import { ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';

export class CreateOrganizationUseCase {
  constructor(
    private readonly orgRepo: IOrganizationRepository,
    private readonly planRepo: IPlanRepository,
  ) {}

  async execute(userId: string, input: CreateOrganizationInput): Promise<OrganizationOutput> {
    if (!input.name?.trim()) {
      throw new ValidationError('Organization name is required', EC.ORG400001);
    }
    if (!input.slug?.trim()) {
      throw new ValidationError('Organization slug is required', EC.ORG400001);
    }

    return this.orgRepo.create(userId, input);
  }
}
