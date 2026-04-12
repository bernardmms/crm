import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { campaignPersonSchema, campaignSchema } from "@repo/api-contract";
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
type PersonRecord = z.infer<typeof campaignPersonSchema>;

const STORAGE_KEY = "campaign-data:saved-people";
const PAGE_SIZE = 50;

export default function LeadsPage() {
  const [tab, setTab] = useState("search");
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>();
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [savedPeople, setSavedPeople] = useState<PersonRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");

  const [storageSearch, setStorageSearch] = useState("");
  const [storageStatus, setStorageStatus] = useState("");
  const [storageJobTitle, setStorageJobTitle] = useState("");
  const [storageCompanyDomain, setStorageCompanyDomain] = useState("");

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersonRecord[];
      setSavedPeople(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPeople));
  }, [savedPeople]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setPeople([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    void loadPeople();
  }, [selectedCampaignId]);

  const storageFilteredPeople = useMemo(() => {
    const normalizedSearch = normalize(storageSearch);
    const normalizedStatus = normalize(storageStatus);
    const normalizedJobTitle = normalize(storageJobTitle);
    const normalizedDomain = normalize(storageCompanyDomain);

    return savedPeople.filter((person) => {
      const name = getPersonName(person).toLowerCase();
      const queryMatches =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        (person.email ?? "").toLowerCase().includes(normalizedSearch) ||
        (person.companyDomain ?? "").toLowerCase().includes(normalizedSearch);

      const statusMatches =
        !normalizedStatus ||
        person.status.toLowerCase().includes(normalizedStatus);

      const jobTitleMatches =
        !normalizedJobTitle ||
        (person.jobTitle ?? "").toLowerCase().includes(normalizedJobTitle);

      const domainMatches =
        !normalizedDomain ||
        (person.companyDomain ?? "").toLowerCase().includes(normalizedDomain);

      return queryMatches && statusMatches && jobTitleMatches && domainMatches;
    });
  }, [savedPeople, storageSearch, storageStatus, storageJobTitle, storageCompanyDomain]);

  const loadCampaigns = async () => {
    try {
      const response = await apiClient.campaignDataContract.listCampaigns({
        query: { page: 1, limit: 200 },
      });

      if (response.status !== 200) {
        toast.error(getApiErrorMessage(response.body, "Failed to load campaigns"));
        return;
      }

      const body = response.body as { campaigns: CampaignRecord[] };
      setCampaigns(body.campaigns);
      if (body.campaigns.length > 0) {
        setSelectedCampaignId(String(body.campaigns[0].id));
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load campaigns");
    }
  };

  const loadPeople = async () => {
    const campaignId = Number.parseInt(selectedCampaignId ?? "", 10);
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await apiClient.campaignDataContract.listCampaignPeople({
        params: { campaignId },
        query: {
          page: 1,
          limit: PAGE_SIZE,
          search: normalize(search),
          status: normalize(status),
          jobTitle: normalize(jobTitle),
          companyDomain: normalize(companyDomain),
        },
      });

      if (response.status !== 200) {
        toast.error(getApiErrorMessage(response.body, "Failed to load leads"));
        return;
      }

      const body = response.body as { people: PersonRecord[]; total: number };
      setPeople(body.people);
      setTotal(body.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const isSaved = (personId: number) =>
    savedPeople.some((person) => person.id === personId);

  const toggleSaved = (person: PersonRecord) => {
    if (isSaved(person.id)) {
      setSavedPeople((previous) =>
        previous.filter((savedPerson) => savedPerson.id !== person.id),
      );
      toast.success("Lead removed from storage");
      return;
    }

    setSavedPeople((previous) => [person, ...previous]);
    toast.success("Lead saved to storage");
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground">
          People from campaign data with category-based search
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-fit">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="storage">Storage ({savedPeople.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="search">
          <Card>
            <CardHeader className="gap-4">
              <div>
                <CardTitle>Lead search</CardTitle>
                <CardDescription>{total} leads found</CardDescription>
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
                    placeholder="Name, email or company domain"
                    className="pl-9"
                  />
                </div>

                <Input
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  placeholder="Status category"
                />

                <div className="flex gap-2">
                  <Input
                    value={jobTitle}
                    onChange={(event) => setJobTitle(event.target.value)}
                    placeholder="Job title category"
                  />
                  <Button variant="outline" onClick={() => void loadPeople()}>
                    Search
                  </Button>
                </div>

                <Input
                  value={companyDomain}
                  onChange={(event) => setCompanyDomain(event.target.value)}
                  placeholder="Company domain category"
                  className="md:col-span-2"
                />
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Company domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[130px] text-right">Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Loading leads...
                      </TableCell>
                    </TableRow>
                  ) : people.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No leads found for this campaign and categories.
                      </TableCell>
                    </TableRow>
                  ) : (
                    people.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{getPersonName(person)}</TableCell>
                        <TableCell>{person.email ?? "-"}</TableCell>
                        <TableCell>{person.jobTitle ?? "-"}</TableCell>
                        <TableCell>{person.companyDomain ?? "-"}</TableCell>
                        <TableCell>{person.status}</TableCell>
                        <TableCell>{new Date(person.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={isSaved(person.id) ? "secondary" : "outline"}
                            onClick={() => toggleSaved(person)}
                          >
                            {isSaved(person.id) ? "Saved" : "Save"}
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
                <CardTitle>Stored leads</CardTitle>
                <CardDescription>
                  {storageFilteredPeople.length} of {savedPeople.length} saved
                </CardDescription>
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Input
                  value={storageSearch}
                  onChange={(event) => setStorageSearch(event.target.value)}
                  placeholder="Name, email, domain"
                />
                <Input
                  value={storageStatus}
                  onChange={(event) => setStorageStatus(event.target.value)}
                  placeholder="Status category"
                />
                <Input
                  value={storageJobTitle}
                  onChange={(event) => setStorageJobTitle(event.target.value)}
                  placeholder="Job title category"
                />
                <Input
                  value={storageCompanyDomain}
                  onChange={(event) => setStorageCompanyDomain(event.target.value)}
                  placeholder="Company domain category"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Company domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[130px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storageFilteredPeople.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No saved leads match these categories.
                      </TableCell>
                    </TableRow>
                  ) : (
                    storageFilteredPeople.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{getPersonName(person)}</TableCell>
                        <TableCell>{person.email ?? "-"}</TableCell>
                        <TableCell>{person.jobTitle ?? "-"}</TableCell>
                        <TableCell>{person.companyDomain ?? "-"}</TableCell>
                        <TableCell>{person.status}</TableCell>
                        <TableCell>{new Date(person.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => toggleSaved(person)}>
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

function getPersonName(person: PersonRecord) {
  return (
    person.fullName ??
    [person.firstName, person.lastName].filter(Boolean).join(" ") ??
    "-"
  );
}

function normalize(value?: string) {
  const normalized = value
    ?.trim()
    .replace(/[^a-zA-Z0-9@._\-\s]/g, "")
    .replace(/\s+/g, " ");

  return normalized || undefined;
}

function getApiErrorMessage(body: unknown, fallback: string) {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }

  return fallback;
}
