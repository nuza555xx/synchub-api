import { getUserId, getOrganizationId, getAccessToken } from '@/types/context';
import { ValidationError } from '@/domain/errors/app-error';
import * as EC from '@/domain/enums/error-codes';
import { subscribeSchema } from '@/interfaces/http/validators/payment.validator';
import type { SubscribeUseCase } from '@/application/use-cases/payments/create-checkout';
import type { CancelSubscriptionUseCase } from '@/application/use-cases/payments/create-customer-portal';
import type { GetSubscriptionUseCase } from '@/application/use-cases/payments/get-subscription';
import type { HandleOmiseWebhookUseCase } from '@/application/use-cases/payments/handle-omise-webhook';
import type { IPaymentGateway } from '@/application/interfaces/payment-gateway';
import type { IAuthRepository } from '@/application/interfaces/auth-repository';
import type { TypedContext } from '@/types/koa';

export class PaymentController {
  constructor(
    private readonly subscribeUseCase: SubscribeUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    private readonly getSubscriptionUseCase: GetSubscriptionUseCase,
    private readonly handleWebhookUseCase: HandleOmiseWebhookUseCase,
    private readonly paymentGateway: IPaymentGateway,
    private readonly authRepo: IAuthRepository,
  ) {}

  subscribe = async (ctx: TypedContext<{ planId: string; billingCycle: string; paymentMethod: string; cardToken?: string }>): Promise<void> => {
    const parsed = subscribeSchema.safeParse(ctx.request.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors[0].message, EC.PAY400001);
    }

    const orgId = getOrganizationId(ctx);
    const accessToken = getAccessToken(ctx);
    const me = await this.authRepo.getMe(accessToken);

    const result = await this.subscribeUseCase.execute(orgId, me.email, parsed.data);

    ctx.status = 200;
    ctx.body = {
      code: 'PAY200001',
      message: 'Subscription created',
      result,
    };
  };

  cancelSubscription = async (ctx: TypedContext): Promise<void> => {
    const orgId = getOrganizationId(ctx);
    await this.cancelSubscriptionUseCase.execute(orgId);

    ctx.status = 200;
    ctx.body = {
      code: 'PAY200002',
      message: 'Subscription canceled',
      result: null,
    };
  };

  getSubscription = async (ctx: TypedContext): Promise<void> => {
    const orgId = getOrganizationId(ctx);
    const result = await this.getSubscriptionUseCase.execute(orgId);

    ctx.status = 200;
    ctx.body = {
      code: 'PAY200003',
      message: 'Subscription retrieved',
      result,
    };
  };

  handleWebhook = async (ctx: TypedContext): Promise<void> => {
    const body = ctx.request.body as any;

    // Omise sends webhook events as JSON with { key, data, id }
    // Verify event by retrieving it from Omise API
    if (!body?.id || !body?.key) {
      throw new ValidationError('Invalid webhook payload', EC.PAY400006);
    }

    try {
      const verifiedEvent = await this.paymentGateway.retrieveEvent(body.id);
      await this.handleWebhookUseCase.execute(verifiedEvent);
    } catch {
      throw new ValidationError('Failed to verify webhook event', EC.PAY400006);
    }

    ctx.status = 200;
    ctx.body = { received: true };
  };
}
