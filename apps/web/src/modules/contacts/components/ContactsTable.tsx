import { Button } from "@repo/ui/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@repo/ui/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import { contactSchema } from "@repo/api-contract";
import type z from "zod";

type ContactRecord = z.infer<typeof contactSchema>;

type ContactsTableProps = {
    contacts: ContactRecord[];
    loading: boolean;
    isDeleting: string | null;
    onEdit: (contact: ContactRecord) => void;
    onDelete: (contact: ContactRecord) => void;
};

export function ContactsTable({
    contacts,
    loading,
    isDeleting,
    onEdit,
    onDelete,
}: ContactsTableProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            Loading contacts...
                        </TableCell>
                    </TableRow>
                ) : contacts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                            No contacts found for the current filters.
                        </TableCell>
                    </TableRow>
                ) : (
                    contacts.map((contact) => (
                        <TableRow key={contact.id}>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{formatContactName(contact)}</span>
                                    {contact.jobTitle ? (
                                        <span className="text-xs text-muted-foreground">{contact.jobTitle}</span>
                                    ) : null}
                                </div>
                            </TableCell>
                            <TableCell>{contact.company ?? "-"}</TableCell>
                            <TableCell>{contact.email ?? "-"}</TableCell>
                            <TableCell>{contact.phone ?? "-"}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button size="sm"
                                        variant="ghost" onClick={() => onEdit(contact)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isDeleting === contact.id}
                                        onClick={() => onDelete(contact)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}

function formatContactName(contact: ContactRecord) {
    return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}
