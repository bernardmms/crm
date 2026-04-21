import { apiClient } from "@/lib/api-client";
import { mapTsRestErrorsToFormErrors } from "@/lib/form-utils";
import { toast } from "@/lib/toast";
import { FormError } from "@/modules/common/components/FormError";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  adminCreateUserRequestSchema,
  adminUserSchema,
  type adminUpdateUserRequestSchema,
} from "@repo/api-contract";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
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
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type z from "zod";

type AdminUser = z.infer<typeof adminUserSchema>;
type UserFormData = z.infer<typeof adminCreateUserRequestSchema>;
type UserUpdateData = z.infer<typeof adminUpdateUserRequestSchema>;

const emptyValues: UserFormData = {
  email: "",
  password: "",
  name: "",
  role: "user",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(adminCreateUserRequestSchema),
    defaultValues: emptyValues,
  });

  const selectedRole = watch("role");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.adminContract.listUsers({
        query: {},
      });

      if (response.status === 200) {
        setUsers(response.body.users);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const openCreateDialog = () => {
    setSelectedUser(null);
    reset(emptyValues);
    setDialogOpen(true);
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    reset({
      email: user.email,
      password: "",
      name: user.name,
      role: normalizeRole(user.role),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSaving(true);

      if (selectedUser) {
        const response = await apiClient.adminContract.updateUser({
          params: { id: selectedUser.id },
          body: buildUpdateUserPayload(data),
        });

        if (response.status === 200) {
          toast.success("User updated");
          setDialogOpen(false);
          await fetchUsers();
          return;
        }

        if (response.status === 400) {
          mapTsRestErrorsToFormErrors(response.body, setError);
          return;
        }
      } else {
        const response = await apiClient.adminContract.createUser({
          body: buildCreateUserPayload(data),
        });

        if (response.status === 200) {
          toast.success("User created");
          setDialogOpen(false);
          await fetchUsers();
          return;
        }

        if (response.status === 400) {
          mapTsRestErrorsToFormErrors(response.body, setError);
          return;
        }
      }

      toast.error("Failed to save user");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save user");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Delete user "${user.email}"?`)) {
      return;
    }

    try {
      const response = await apiClient.adminContract.removeUser({
        params: { id: user.id },
      });

      if (response.status === 200) {
        toast.success("User removed");
        await fetchUsers();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete user");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Admin-only account management
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New user
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User accounts</CardTitle>
          <CardDescription>
            Create and manage members for personal and organization workspaces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{normalizeRole(user.role)}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void handleDelete(user)}
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Edit user" : "Create user"}
            </DialogTitle>
            <DialogDescription>
              Only admins can create or update user accounts.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input id="name" {...register("name")} />
              <FormError message={errors.name?.message} />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" type="email" {...register("email")} />
              <FormError message={errors.email?.message} />
            </div>

            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password {selectedUser ? "(leave blank to keep unchanged)" : ""}
              </label>
              <Input id="password" type="password" {...register("password")} />
              <FormError message={errors.password?.message} />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={normalizeFormRole(selectedRole)}
                onValueChange={(value) =>
                  setValue("role", value as "user" | "admin")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function normalizeRole(role: AdminUser["role"]) {
  return (Array.isArray(role) ? role[0] ?? "user" : role ?? "user") as
    | "user"
    | "admin";
}

function buildCreateUserPayload(data: UserFormData): UserFormData {
  return {
    email: data.email.trim(),
    password: data.password?.trim() || undefined,
    name: data.name.trim(),
    role: normalizeFormRole(data.role),
  };
}

function buildUpdateUserPayload(data: UserFormData): UserUpdateData {
  const payload = buildCreateUserPayload(data);

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ""),
  ) as UserUpdateData;
}

function normalizeFormRole(value: UserFormData["role"]) {
  return (Array.isArray(value) ? value[0] : value) ?? "user";
}
