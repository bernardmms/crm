import { emailCampaignDetailSchema } from "@repo/api-contract";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type z from "zod";

type EmailCampaignDetail = z.infer<typeof emailCampaignDetailSchema>;

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: EmailCampaignDetail | null;
}

const RECIPIENTS_PAGE_SIZE = 25;

function getRecipientBadge(status: string) {
  switch (status) {
    case "SENT":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Sent
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    case "BOUNCED":
      return (
        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          Bounced
        </Badge>
      );
    case "PENDING":
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export function CampaignDetailDialog({
  open,
  onOpenChange,
  campaign,
}: CampaignDetailDialogProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [campaign?.id]);

  const totalRecipients = campaign?.recipients.length ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalRecipients / RECIPIENTS_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages);
  const pagedRecipients = useMemo(() => {
    if (!campaign) return [];
    const start = (safePage - 1) * RECIPIENTS_PAGE_SIZE;
    return campaign.recipients.slice(start, start + RECIPIENTS_PAGE_SIZE);
  }, [campaign, safePage]);

  if (!campaign) return null;

  const rangeStart =
    totalRecipients === 0 ? 0 : (safePage - 1) * RECIPIENTS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safePage * RECIPIENTS_PAGE_SIZE,
    totalRecipients,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign.name}</DialogTitle>
          <DialogDescription>
            Subject: {campaign.subject} — List: {campaign.contactList.name}
          </DialogDescription>
        </DialogHeader>

        {campaign.stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Total" value={campaign.stats.total} />
            <StatCard label="Sent" value={campaign.stats.sent} />
            <StatCard label="Pending" value={campaign.stats.pending} />
            <StatCard label="Failed" value={campaign.stats.failed} />
            <StatCard label="Bounced" value={campaign.stats.bounced} />
          </div>
        )}

        <Tabs defaultValue="recipients" className="mt-2">
          <TabsList>
            <TabsTrigger value="recipients">
              Recipients ({totalRecipients})
            </TabsTrigger>
            <TabsTrigger value="preview">Email preview</TabsTrigger>
          </TabsList>

          <TabsContent
            value="recipients"
            className="space-y-2 min-h-[60vh] animate-in fade-in-0 duration-200"
          >
            {totalRecipients === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recipients yet. Send the campaign to populate this list.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRecipients.map((recipient) => (
                        <TableRow key={recipient.id}>
                          <TableCell className="font-medium">
                            {[
                              recipient.contact.firstName,
                              recipient.contact.lastName,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          </TableCell>
                          <TableCell>
                            {recipient.contact.email ?? "-"}
                          </TableCell>
                          <TableCell>
                            {getRecipientBadge(recipient.status)}
                          </TableCell>
                          <TableCell>
                            {recipient.sentAt
                              ? new Date(recipient.sentAt).toLocaleString()
                              : "-"}
                          </TableCell>
                          <TableCell
                            className="max-w-[280px] truncate text-xs"
                            title={recipient.errorMessage ?? undefined}
                          >
                            {recipient.errorMessage ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Showing {rangeStart}–{rangeEnd} of {totalRecipients}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent
            value="preview"
            className="min-h-[60vh] animate-in fade-in-0 duration-200"
          >
            <div className="rounded-md border bg-zinc-50 p-2">
              <iframe
                title={`Preview of ${campaign.name}`}
                srcDoc={campaign.htmlContent}
                sandbox=""
                className="h-[60vh] w-full rounded-sm border-0 bg-white"
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
