import { emailCampaignDetailSchema } from "@repo/api-contract";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import type z from "zod";

type EmailCampaignDetail = z.infer<typeof emailCampaignDetailSchema>;

interface CampaignDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: EmailCampaignDetail | null;
}

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
  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
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

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Recipients</h3>
          {campaign.recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recipients yet. Send the campaign to populate this list.
            </p>
          ) : (
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
                {campaign.recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">
                      {[recipient.contact.firstName, recipient.contact.lastName]
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
                    <TableCell className="max-w-[200px] truncate text-xs">
                      {recipient.errorMessage ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
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
