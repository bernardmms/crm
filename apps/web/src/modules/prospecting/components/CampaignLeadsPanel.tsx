import {
  getApiErrorMessage,
  getPersonName,
  normalizeSearchValue,
} from "@/modules/prospecting/helpers";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { PersonRecord } from "@/modules/prospecting/types";
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

type CampaignLeadsPanelProps = {
  campaignId?: number;
};

export default function CampaignLeadsPanel({ campaignId }: CampaignLeadsPanelProps) {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");

  useEffect(() => {
    if (!campaignId) {
      setPeople([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    void loadPeople();
  }, [campaignId]);

  const loadPeople = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await apiClient.campaignDataContract.listCampaignPeople({
        params: { campaignId },
        query: {
          page: 1,
          limit: PAGE_SIZE,
          search: normalizeSearchValue(search),
          status: normalizeSearchValue(status),
          jobTitle: normalizeSearchValue(jobTitle),
          companyDomain: normalizeSearchValue(companyDomain),
        },
      });

      if (response.status !== 200) {
        toast.error(getApiErrorMessage(response.body, "Failed to load leads"));
        return;
      }

      const body = response.body as {
        people: PersonRecord[];
        total: number;
      };
      setPeople(body.people);
      setTotal(body.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-4">
        <div>
          <CardTitle>Leads</CardTitle>
          <CardDescription>{total} leads found</CardDescription>
        </div>

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
          <div className="relative md:col-span-2 lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email or company domain"
              className="pl-9"
            />
          </div>

          <Input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="Job title"
          />

          <Input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder="Status"
          />

          <Input
            value={companyDomain}
            onChange={(event) => setCompanyDomain(event.target.value)}
            placeholder="Company domain"
          />

          <Button variant="outline" onClick={() => void loadPeople()}>
            Search
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Company domain</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading leads...
                </TableCell>
              </TableRow>
            ) : people.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No leads found for this campaign and filters.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="max-w-[220px] whitespace-normal font-medium">
                    {getPersonName(person)}
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    {person.jobTitle ?? "-"}
                  </TableCell>
                  <TableCell>{person.status}</TableCell>
                  <TableCell className="hidden md:table-cell">{person.email ?? "-"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {person.companyDomain ?? "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(person.createdAt).toLocaleDateString()}
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
