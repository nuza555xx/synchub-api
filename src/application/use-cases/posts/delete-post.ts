import { IDraftPostRepository } from '@/application/interfaces/post-repository';

export class DeleteDraftPostUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(id: string, orgId: string): Promise<void> {
    return this.repo.delete(id, orgId);
  }
}
