import {
  getApiErrorMessage,
  normalizeRange,
  normalizeSearchValue,
  parseIntegerFilter,
} from "@/modules/prospecting/helpers";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { CompanyRecord } from "@/modules/prospecting/types";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const PAGE_SIZE = 50;

type CampaignCompaniesPanelProps = {
  campaignId?: number;
};

export default function CampaignCompaniesPanel({
  campaignId,
}: CampaignCompaniesPanelProps) {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [revenue, setRevenue] = useState("");
  const [employeeCountMin, setEmployeeCountMin] = useState("");
  const [employeeCountMax, setEmployeeCountMax] = useState("");

  useEffect(() => {
    if (!campaignId) {
      setCompanies([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    void loadCompanies();
  }, [campaignId]);

  const loadCompanies = async () => {
    if (!campaignId) return;

    const minValue = parseIntegerFilter(employeeCountMin);
    const maxValue = parseIntegerFilter(employeeCountMax);
    const [employeeMin, employeeMax] = normalizeRange(minValue, maxValue);

    try {
      setLoading(true);
      const response = await apiClient.campaignDataContract.listCampaignCompanies({
        params: { campaignId },
        query: {
          page: 1,
          limit: PAGE_SIZE,
          search: normalizeSearchValue(search),
          country: normalizeSearchValue(country),
          industry: normalizeSearchValue(industry),
          revenue: normalizeSearchValue(revenue),
          employeeCountMin: employeeMin,
          employeeCountMax: employeeMax,
        },
      });

      if (response.status !== 200) {
        toast.error(getApiErrorMessage(response.body, "Failed to load companies"));
        return;
      }

      const body = response.body as {
        companies: CompanyRecord[];
        total: number;
      };
      setCompanies(body.companies);
      setTotal(body.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Companies</CardTitle>
          <CardDescription>{total} companies found</CardDescription>
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
          <div className="relative md:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Company name, domain or LinkedIn"
              className="pl-9"
            />
          </div>

          <Input
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            placeholder="Industry"
          />

          <Input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Country"
          />

          <Input
            value={revenue}
            onChange={(event) => setRevenue(event.target.value)}
            placeholder="Revenue"
          />

          <Input
            value={employeeCountMin}
            onChange={(event) => setEmployeeCountMin(event.target.value)}
            placeholder="Employees min"
          />

          <Input
            value={employeeCountMax}
            onChange={(event) => setEmployeeCountMax(event.target.value)}
            placeholder="Employees max"
          />

          <Button variant="outline" onClick={() => void loadCompanies()}>
            Search
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industries</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead className="hidden md:table-cell">Domain</TableHead>
              <TableHead className="hidden lg:table-cell">Country</TableHead>
              <TableHead className="hidden lg:table-cell">Revenue</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Loading companies...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No companies found for this campaign and filters.
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="max-w-[220px] whitespace-normal font-medium">
                    {company.companyName ?? "-"}
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal">
                    {company.companyIndustries.length > 0
                      ? company.companyIndustries.join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {company.companyEmployeeCount == null ? "-" : company.companyEmployeeCount}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {company.companyDomain ?? "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {company.companyCountry ?? "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {company.companyRevenue ?? "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
