import { Controller } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import { Roles } from '@thallesp/nestjs-better-auth';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { CampaignDataService } from './campaign-data.service';

@Controller()
@Roles(['user', 'admin'])
export class CampaignDataController {
  constructor(private readonly campaignDataService: CampaignDataService) {}

  @TsRestHandler(contract.campaignDataContract.listCampaigns)
  async listCampaigns() {
    return tsRestHandler(contract.campaignDataContract.listCampaigns, async ({ query }) => {
      return await this.campaignDataService.listCampaigns(query);
    });
  }

  @TsRestHandler(contract.campaignDataContract.listCampaignDatabases)
  async listCampaignDatabases() {
    return tsRestHandler(
      contract.campaignDataContract.listCampaignDatabases,
      async () => {
        return await this.campaignDataService.listCampaignDatabases();
      },
    );
  }

  @TsRestHandler(contract.campaignDataContract.listCampaignCompanies)
  async listCampaignCompanies() {
    return tsRestHandler(
      contract.campaignDataContract.listCampaignCompanies,
      async ({ params, query }) => {
        return await this.campaignDataService.listCampaignCompanies(
          params.campaignId,
          query,
        );
      },
    );
  }

  @TsRestHandler(contract.campaignDataContract.listCampaignPeople)
  async listCampaignPeople() {
    return tsRestHandler(
      contract.campaignDataContract.listCampaignPeople,
      async ({ params, query }) => {
        return await this.campaignDataService.listCampaignPeople(
          params.campaignId,
          query,
        );
      },
    );
  }
}

