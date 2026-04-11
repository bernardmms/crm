import { Injectable, Logger } from '@nestjs/common';
import { contract } from '@repo/api-contract';
import type { ServerInferRequest, ServerInferResponses } from '@ts-rest/core';

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  schema: string;
};

type CampaignRow = {
  id: number;
  campaign_name: string;
  database_fk: string;
  status: string;
  created_at: string;
  results_hash?: string | null;
};

type DatabaseRow = {
  database_pk: string;
  name: string;
};

type CampaignCompanyRow = {
  id: number;
  campaign_id: number;
  company_name?: string | null;
  company_domain?: string | null;
  company_linkedin_url?: string | null;
  company_country?: string | null;
  company_industries?: unknown;
  company_employee_count?: number | null;
  company_revenue?: string | null;
  created_at: string;
};

type CampaignPersonRow = {
  id: number;
  campaign_id: number;
  company_domain?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  email?: string | null;
  phone?: string | null;
  data_source?: string | null;
  status: string;
  created_at: string;
};

@Injectable()
export class CampaignDataService {
  private readonly logger = new Logger(CampaignDataService.name);

  async listCampaigns(
    query: ServerInferRequest<typeof contract.campaignDataContract.listCampaigns>['query'],
  ): Promise<ServerInferResponses<typeof contract.campaignDataContract.listCampaigns>> {
    const config = this.getSupabaseConfig();
    if (!config) {
      return this.unconfiguredResponse();
    }

    const page = this.normalizePage(query?.page);
    const limit = this.normalizeLimit(query?.limit);
    const offset = (page - 1) * limit;

    const params = new URLSearchParams();
    params.set(
      'select',
      'id,campaign_name,database_fk,status,created_at,results_hash',
    );
    params.set('order', 'created_at.desc');
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const search = this.sanitizeSearchTerm(query?.search);
    if (search) {
      params.set(
        'or',
        [`campaign_name.ilike.*${search}*`, `results_hash.ilike.*${search}*`].join(','),
      );
    }

    if (query?.status?.trim()) {
      params.set('status', `eq.${query.status.trim()}`);
    }

    if (query?.databaseFk?.trim()) {
      params.set('database_fk', `eq.${query.databaseFk.trim()}`);
    }

    try {
      const result = await this.fetchRows<CampaignRow>(
        config,
        'campaigns',
        params,
        true,
      );

      const databaseFks = Array.from(
        new Set(result.rows.map((row) => row.database_fk).filter(Boolean)),
      );

      const databaseNames = await this.fetchDatabaseNames(config, databaseFks);

      return {
        status: 200 as const,
        body: {
          campaigns: result.rows.map((row) => ({
            id: row.id,
            campaignName: row.campaign_name,
            databaseFk: row.database_fk,
            databaseName: databaseNames.get(row.database_fk) ?? null,
            status: row.status,
            createdAt: new Date(row.created_at),
            resultsHash: row.results_hash ?? null,
          })),
          total: result.total,
          page,
          limit,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to load campaigns from Supabase: ${this.getErrorMessage(error)}`,
      );
      return this.providerUnavailableResponse();
    }
  }

  async listCampaignDatabases(): Promise<
    ServerInferResponses<typeof contract.campaignDataContract.listCampaignDatabases>
  > {
    const config = this.getSupabaseConfig();
    if (!config) {
      return this.unconfiguredResponse();
    }

    const params = new URLSearchParams();
    params.set('select', 'database_pk,name');
    params.set('order', 'name.asc');

    try {
      const result = await this.fetchRows<DatabaseRow>(
        config,
        'databases',
        params,
        false,
      );

      return {
        status: 200 as const,
        body: {
          databases: result.rows.map((row) => ({
            databasePk: row.database_pk,
            name: row.name,
          })),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to load campaign databases from Supabase: ${this.getErrorMessage(error)}`,
      );
      return this.providerUnavailableResponse();
    }
  }

  async listCampaignCompanies(
    campaignId: number,
    query: ServerInferRequest<typeof contract.campaignDataContract.listCampaignCompanies>['query'],
  ): Promise<
    ServerInferResponses<typeof contract.campaignDataContract.listCampaignCompanies>
  > {
    const config = this.getSupabaseConfig();
    if (!config) {
      return this.unconfiguredResponse();
    }

    const page = this.normalizePage(query?.page);
    const limit = this.normalizeLimit(query?.limit);
    const offset = (page - 1) * limit;

    const params = new URLSearchParams();
    params.set(
      'select',
      'id,campaign_id,company_name,company_domain,company_linkedin_url,company_country,company_industries,company_employee_count,company_revenue,created_at',
    );
    params.set('order', 'created_at.desc');
    params.set('campaign_id', `eq.${campaignId}`);

    const search = this.sanitizeSearchTerm(query?.search);
    if (search) {
      params.set(
        'or',
        [
          `company_name.ilike.*${search}*`,
          `company_domain.ilike.*${search}*`,
          `company_linkedin_url.ilike.*${search}*`,
        ].join(','),
      );
    }

    if (query?.country?.trim()) {
      params.set('company_country', `ilike.*${query.country.trim()}*`);
    }

    if (query?.revenue?.trim()) {
      params.set('company_revenue', `ilike.*${query.revenue.trim()}*`);
    }

    const industryFilter = this.sanitizeSearchTerm(query?.industry)?.toLowerCase();

    try {
      if (industryFilter) {
        params.set('limit', '10000');
        params.set('offset', '0');

        const raw = await this.fetchRows<CampaignCompanyRow>(
          config,
          'campaign_companies',
          params,
          false,
        );

        const filtered = raw.rows.filter((row) =>
          this.normalizeIndustries(row.company_industries).some((industry) =>
            industry.toLowerCase().includes(industryFilter),
          ),
        );

        const pageRows = filtered.slice(offset, offset + limit);
        return {
          status: 200 as const,
          body: {
            companies: pageRows.map((row) => this.mapCampaignCompany(row)),
            total: filtered.length,
            page,
            limit,
          },
        };
      }

      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const result = await this.fetchRows<CampaignCompanyRow>(
        config,
        'campaign_companies',
        params,
        true,
      );

      return {
        status: 200 as const,
        body: {
          companies: result.rows.map((row) => this.mapCampaignCompany(row)),
          total: result.total,
          page,
          limit,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to load campaign companies from Supabase: ${this.getErrorMessage(error)}`,
      );
      return this.providerUnavailableResponse();
    }
  }

  async listCampaignPeople(
    campaignId: number,
    query: ServerInferRequest<typeof contract.campaignDataContract.listCampaignPeople>['query'],
  ): Promise<
    ServerInferResponses<typeof contract.campaignDataContract.listCampaignPeople>
  > {
    const config = this.getSupabaseConfig();
    if (!config) {
      return this.unconfiguredResponse();
    }

    const page = this.normalizePage(query?.page);
    const limit = this.normalizeLimit(query?.limit);
    const offset = (page - 1) * limit;

    const params = new URLSearchParams();
    params.set(
      'select',
      'id,campaign_id,company_domain,first_name,last_name,full_name,job_title,linkedin_url,email,phone,data_source,status,created_at',
    );
    params.set('campaign_id', `eq.${campaignId}`);
    params.set('order', 'created_at.desc');
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    const search = this.sanitizeSearchTerm(query?.search);
    if (search) {
      params.set(
        'or',
        [
          `first_name.ilike.*${search}*`,
          `last_name.ilike.*${search}*`,
          `full_name.ilike.*${search}*`,
          `email.ilike.*${search}*`,
          `company_domain.ilike.*${search}*`,
          `job_title.ilike.*${search}*`,
        ].join(','),
      );
    }

    if (query?.status?.trim()) {
      params.set('status', `eq.${query.status.trim()}`);
    }

    if (query?.jobTitle?.trim()) {
      params.set('job_title', `ilike.*${query.jobTitle.trim()}*`);
    }

    if (query?.companyDomain?.trim()) {
      params.set('company_domain', `ilike.*${query.companyDomain.trim()}*`);
    }

    try {
      const result = await this.fetchRows<CampaignPersonRow>(
        config,
        'campaign_people',
        params,
        true,
      );

      return {
        status: 200 as const,
        body: {
          people: result.rows.map((row) => ({
            id: row.id,
            campaignId: row.campaign_id,
            companyDomain: row.company_domain ?? null,
            firstName: row.first_name ?? null,
            lastName: row.last_name ?? null,
            fullName: row.full_name ?? null,
            jobTitle: row.job_title ?? null,
            linkedinUrl: row.linkedin_url ?? null,
            email: row.email ?? null,
            phone: row.phone ?? null,
            dataSource: row.data_source ?? null,
            status: row.status,
            createdAt: new Date(row.created_at),
          })),
          total: result.total,
          page,
          limit,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to load campaign people from Supabase: ${this.getErrorMessage(error)}`,
      );
      return this.providerUnavailableResponse();
    }
  }

  private mapCampaignCompany(row: CampaignCompanyRow) {
    return {
      id: row.id,
      campaignId: row.campaign_id,
      companyName: row.company_name ?? null,
      companyDomain: row.company_domain ?? null,
      companyLinkedinUrl: row.company_linkedin_url ?? null,
      companyCountry: row.company_country ?? null,
      companyIndustries: this.normalizeIndustries(row.company_industries),
      companyEmployeeCount: row.company_employee_count ?? null,
      companyRevenue: row.company_revenue ?? null,
      createdAt: new Date(row.created_at),
    };
  }

  private normalizeIndustries(value: unknown) {
    if (!value) return [];

    const toLabel = (item: unknown): string | null => {
      if (typeof item === 'string') return item.trim() || null;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const candidates = ['industry', 'name', 'label'];
        for (const key of candidates) {
          const candidate = obj[key];
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
      }
      return null;
    };

    if (Array.isArray(value)) {
      return value
        .map(toLabel)
        .filter((item): item is string => Boolean(item));
    }

    const single = toLabel(value);
    return single ? [single] : [];
  }

  private getSupabaseConfig(): SupabaseConfig | null {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !serviceRoleKey) {
      return null;
    }

    return {
      url: url.replace(/\/+$/, ''),
      serviceRoleKey,
      schema: process.env.SUPABASE_SCHEMA?.trim() || 'public',
    };
  }

  private async fetchDatabaseNames(
    config: SupabaseConfig,
    databaseFks: string[],
  ) {
    if (databaseFks.length === 0) {
      return new Map<string, string>();
    }

    const normalizedKeys = Array.from(
      new Set(databaseFks.map((value) => this.escapePostgrestValue(value)).filter(Boolean)),
    );

    if (normalizedKeys.length === 0) {
      return new Map<string, string>();
    }

    const params = new URLSearchParams();
    params.set('select', 'database_pk,name');
    params.set('database_pk', `in.(${normalizedKeys.join(',')})`);

    const result = await this.fetchRows<DatabaseRow>(config, 'databases', params, false);
    return new Map(result.rows.map((row) => [row.database_pk, row.name]));
  }

  private async fetchRows<T>(
    config: SupabaseConfig,
    table: string,
    params: URLSearchParams,
    withCount: boolean,
  ) {
    const url = new URL(`${config.url}/rest/v1/${encodeURIComponent(table)}`);
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    const headers: Record<string, string> = {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: 'application/json',
      'Accept-Profile': config.schema,
    };

    if (withCount) {
      headers.Prefer = 'count=exact';
    }

    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(await this.getSupabaseErrorMessage(response));
    }

    const payload = (await response.json()) as unknown;
    const rows = Array.isArray(payload) ? (payload as T[]) : [];
    const total = withCount
      ? this.parseTotalFromContentRange(response.headers.get('content-range'))
      : rows.length;

    return { rows, total };
  }

  private parseTotalFromContentRange(contentRange: string | null) {
    if (!contentRange) return 0;
    const totalPart = contentRange.split('/')[1];
    const parsed = Number.parseInt(totalPart ?? '', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private sanitizeSearchTerm(value?: string) {
    const normalized = value
      ?.trim()
      .replace(/[^a-zA-Z0-9@._\-\s]/g, '')
      .replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private normalizePage(value?: number) {
    if (!value || Number.isNaN(value)) return 1;
    return Math.max(1, Math.floor(value));
  }

  private normalizeLimit(value?: number) {
    if (!value || Number.isNaN(value)) return 20;
    return Math.min(100, Math.max(1, Math.floor(value)));
  }

  private escapePostgrestValue(value: string) {
    return value.replace(/[,()]/g, ' ').trim();
  }

  private async getSupabaseErrorMessage(response: Response) {
    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
        hint?: string;
      };
      return (
        payload.message ||
        payload.error ||
        payload.hint ||
        `Supabase request failed with status ${response.status}`
      );
    } catch {
      return `Supabase request failed with status ${response.status}`;
    }
  }

  private unconfiguredResponse() {
    return {
      status: 503 as const,
      body: { message: 'Supabase integration is not configured.' },
    };
  }

  private providerUnavailableResponse() {
    return {
      status: 503 as const,
      body: { message: 'Campaign data provider is unavailable right now.' },
    };
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return 'Unknown error';
  }
}
