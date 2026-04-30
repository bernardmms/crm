import { Controller } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { UnsubscribeService } from './unsubscribe.service';

@Controller()
@AllowAnonymous()
export class UnsubscribeController {
  constructor(private readonly unsubscribeService: UnsubscribeService) {}

  @TsRestHandler(contract.unsubscribeContract.getUnsubscribeStatus)
  async getUnsubscribeStatus() {
    return tsRestHandler(
      contract.unsubscribeContract.getUnsubscribeStatus,
      async ({ params }) =>
        this.unsubscribeService.getStatus(params.contactId, params.token),
    );
  }

  @TsRestHandler(contract.unsubscribeContract.unsubscribe)
  async unsubscribe() {
    return tsRestHandler(
      contract.unsubscribeContract.unsubscribe,
      async ({ params, body }) =>
        this.unsubscribeService.unsubscribe(
          params.contactId,
          params.token,
          body.reason,
        ),
    );
  }
}
