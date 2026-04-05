import { IDraftPostRepository } from '@/application/interfaces/post-repository';
import { PublishPostInput, PublishPostOutput } from '@/application/dto/post.dto';

export class PublishPostUseCase {
  constructor(private readonly repo: IDraftPostRepository) {}

  async execute(userId: string, input: PublishPostInput): Promise<PublishPostOutput> {
    return this.repo.publish(userId, input);
  }
}
