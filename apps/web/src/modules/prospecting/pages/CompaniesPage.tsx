import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { campaignCompanySchema, campaignSchema } from "@repo/api-contract";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type z from "zod";

type CampaignRecord = z.infer<typeof campaignSchema>;
type CompanyRecord = z.infer<typeof campaignCompanySchema>;

const STORAGE_KEY = "campaign-data:saved-companies";
const PAGE_SIZE = 50;

export default function CompaniesPage() {
  const [tab, setTab] = useState("search");
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [savedCompanies, setSavedCompanies] = useState<CompanyRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [revenue, setRevenue] = useState("");

  const [storageSearch, setStorageSearch] = useState("");
  const [storageCountry, setStorageCountry] = useState("");
  const [storageIndustry, setStorageIndustry] = useState("");
  const [storageRevenue, setStorageRevenue] = useState("");

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CompanyRecord[];
      setSavedCompanies(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCompanies));
  }, [savedCompanies]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setCompanies([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    void loadCompanies();
  }, [selectedCampaignId]);

  const storageFilteredCompanies = useMemo(() => {
    const normalizedSearch = normalize(storageSearch);
    const normalizedCountry = normalize(storageCountry);
    const normalizedIndustry = normalize(storageIndustry);
    const normalizedRevenue = normalize(storageRevenue);

    return savedCompanies.filter((company) => {
      const queryMatches =
        !normalizedSearch ||
        (company.companyName ?? "").toLowerCase().includes(normalizedSearch) ||
        (company.companyDomain ?? "").toLowerCase().includes(normalizedSearch);

      const countryMatches =
        !normalizedCountry ||
        (company.companyCountry ?? "").toLowerCase().includes(normalizedCountry);

      const industryMatches =
        !normalizedIndustry ||
        company.companyIndustries.some((item) =>
          item.toLowerCase().includes(normalizedIndustry),
        );

      const revenueMatches =
        !normalizedRevenue ||
        (company.companyRevenue ?? "").toLowerCase().includes(normalizedRevenue);

      return queryMatches && countryMatches && industryMatches && revenueMatches;
    });
  }, [savedCompanies, storageSearch, storageCountry, storageIndustry, storageRevenue]);

  const loadCampaigns = async () => {
    try {
      const response = await apiClient.campaignDataContract.listCampaigns({
        query: { page: 1, limit: 200 },
      });

      if (response.status !== 200) {
        toast.error(response.body.message);
        return;
      }

      setCampaigns(response.body.campaigns);
      if (response.body.campaigns.length > 0) {
        setSelectedCampaignId(String(response.body.campaigns[0].id));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load campaigns");
    }
  };

  const loadCompanies = async () => {
    const campaignId = Number.parseInt(selectedCampaignId ?? "", 10);
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await apiClient.campaignDataContract.listCampaignCompanies({
        params: { campaignId },
        query: {
          page: 1,
          limit: PAGE_SIZE,
          search: normalize(search),
          country: normalize(country),
          industry: normalize(industry),
          revenue: normalize(revenue),
        },
      });

      if (response.status !== 200) {
        toast.error(response.body.message);
        return;
      }

      setCompanies(response.body.companies);
      setTotal(response.body.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const isSaved = (companyId: number) =>
    savedCompanies.some((company) => company.id === companyId);

  const toggleSaved = (company: CompanyRecord) => {
    if (isSaved(company.id)) {
      setSavedCompanies((previous) =>
        previous.filter((savedCompany) => savedCompany.id !== company.id),
      );
      toast.success("Company removed from storage");
      return;
    }

    setSavedCompanies((previous) => [company, ...previous]);
    toast.success("Company saved to storage");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Companies from campaign data with category-based search
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-fit">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="storage">Storage ({savedCompanies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card>
            <CardHeader className="gap-4">
              <div>
                <CardTitle>Company search</CardTitle>
                <CardDescription>{total} companies found</CardDescription>
              </div>

              <div className="grid gap-2 md:grid-cols-5">
                <Select
                  value={selectedCampaignId}
                  onValueChange={setSelectedCampaignId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={String(campaign.id)}>
                        {campaign.campaignName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative md:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Company name or domain"
                    className="pl-9"
                  />
                </div>

                <Input
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  placeholder="Industry category"
                />

                <div className="flex gap-2">
                  <Input
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    placeholder="Country category"
                  />
                  <Button variant="outline" onClick={() => void loadCompanies()}>
                    Search
                  </Button>
                </div>

                <Input
                  value={revenue}
                  onChange={(event) => setRevenue(event.target.value)}
                  placeholder="Revenue category"
                  className="md:col-span-2"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Industries</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[130px] text-right">Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        Loading companies...
                      </TableCell>
                    </TableRow>
                  ) : companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No companies found for this campaign and categories.
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.companyName ?? "-"}</TableCell>
                        <TableCell>{company.companyDomain ?? "-"}</TableCell>
                        <TableCell>{company.companyCountry ?? "-"}</TableCell>
                        <TableCell>
                          {company.companyIndustries.length > 0
                            ? company.companyIndustries.join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {company.companyEmployeeCount == null
                            ? "-"
                            : company.companyEmployeeCount}
                        </TableCell>
                        <TableCell>{company.companyRevenue ?? "-"}</TableCell>
                        <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isSaved(company.id) ? "secondary" : "outline"}
                            onClick={() => toggleSaved(company)}
                          >
                            {isSaved(company.id) ? "Saved" : "Save"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card>
            <CardHeader className="gap-4">
              <div>
                <CardTitle>Stored companies</CardTitle>
                <CardDescription>
                  {storageFilteredCompanies.length} of {savedCompanies.length} saved
                </CardDescription>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  value={storageSearch}
                  onChange={(event) => setStorageSearch(event.target.value)}
                  placeholder="Company name or domain"
                />
                <Input
                  value={storageCountry}
                  onChange={(event) => setStorageCountry(event.target.value)}
                  placeholder="Country category"
                />
                <Input
                  value={storageIndustry}
                  onChange={(event) => setStorageIndustry(event.target.value)}
                  placeholder="Industry category"
                />
                <Input
                  value={storageRevenue}
                  onChange={(event) => setStorageRevenue(event.target.value)}
                  placeholder="Revenue category"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Industries</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[130px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storageFilteredCompanies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No saved companies match these categories.
                      </TableCell>
                    </TableRow>
                  ) : (
                    storageFilteredCompanies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.companyName ?? "-"}</TableCell>
                        <TableCell>{company.companyDomain ?? "-"}</TableCell>
                        <TableCell>{company.companyCountry ?? "-"}</TableCell>
                        <TableCell>
                          {company.companyIndustries.length > 0
                            ? company.companyIndustries.join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {company.companyEmployeeCount == null
                            ? "-"
                            : company.companyEmployeeCount}
                        </TableCell>
                        <TableCell>{company.companyRevenue ?? "-"}</TableCell>
                        <TableCell>{new Date(company.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => toggleSaved(company)}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function normalize(value?: string) {
  const normalized = value
    ?.trim()
    .replace(/[^a-zA-Z0-9@._\-\s]/g, "")
    .replace(/\s+/g, " ");

  return normalized ? normalized.toLowerCase() : undefined;
}

