"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Ban,
	ChevronLeft,
	ChevronRight,
	Crown,
	Ellipsis,
	ExternalLink,
	LogIn,
	RefreshCw,
	Search,
	Trash2,
	UserCheck,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/dashboard/modals/form-delete-confirmation-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { authClient, useSession } from "@/lib/auth-client";

type AdminRole = "admin" | "user";
type SortField = "name" | "email" | "role" | "createdAt";
type SortDirection = "asc" | "desc";
type SearchField = "name" | "email";
type FilterValue = "all" | "admin" | "user" | "banned" | "active";

interface AdminUserRow {
	id: string;
	name: string;
	email: string;
	role?: string | null;
	banned?: boolean | null;
	banReason?: string | null;
	createdAt: Date | string;
}

const USERS_QUERY_KEY = ["admin", "users"];

/**
 * The admin plugin accepts a single `filterField`/`filterValue` pair. We expose
 * the most useful combinations through one dropdown so the filter runs
 * server-side instead of being applied to a single page of results.
 */
function filterToQuery(filter: FilterValue) {
	switch (filter) {
		case "admin":
			return { filterField: "role", filterValue: "admin", filterOperator: "eq" as const };
		case "user":
			return { filterField: "role", filterValue: "user", filterOperator: "eq" as const };
		case "banned":
			return { filterField: "banned", filterValue: true, filterOperator: "eq" as const };
		case "active":
			return { filterField: "banned", filterValue: false, filterOperator: "eq" as const };
		default:
			return {};
	}
}

export function UsersTable() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;

	const [searchTerm, setSearchTerm] = useState("");
	const [searchField, setSearchField] = useState<SearchField>("email");
	const [sortField, setSortField] = useState<SortField>("createdAt");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [filter, setFilter] = useState<FilterValue>("all");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);
	const [pendingAction, setPendingAction] = useState<{
		type: "ban" | "delete";
		user: AdminUserRow;
	} | null>(null);

	const usersQuery = useQuery({
		queryKey: [
			...USERS_QUERY_KEY,
			{ searchTerm, searchField, sortField, sortDirection, filter, currentPage, itemsPerPage },
		],
		queryFn: async () => {
			const { data, error } = await authClient.admin.listUsers({
				query: {
					limit: itemsPerPage,
					offset: (currentPage - 1) * itemsPerPage,
					searchValue: searchTerm || undefined,
					searchField,
					searchOperator: "contains",
					sortBy: sortField,
					sortDirection,
					...filterToQuery(filter),
				},
			});
			if (error) {
				throw new Error(error.message ?? "Failed to load users");
			}
			return data;
		},
	});

	const invalidateUsers = useCallback(() => {
		void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
	}, [queryClient]);

	const setRole = useMutation({
		mutationFn: async ({ userId, role }: { userId: string; role: AdminRole }) => {
			const { error } = await authClient.admin.setRole({ userId, role });
			if (error) throw new Error(error.message ?? "Failed to update role");
		},
		onSuccess: () => {
			toast.success("Role updated");
			invalidateUsers();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const banUser = useMutation({
		mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
			const { error } = await authClient.admin.banUser({
				userId,
				banReason: reason ?? "Banned by an administrator",
			});
			if (error) throw new Error(error.message ?? "Failed to ban user");
		},
		onSuccess: () => {
			toast.success("User banned");
			invalidateUsers();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const unbanUser = useMutation({
		mutationFn: async (userId: string) => {
			const { error } = await authClient.admin.unbanUser({ userId });
			if (error) throw new Error(error.message ?? "Failed to unban user");
		},
		onSuccess: () => {
			toast.success("User unbanned");
			invalidateUsers();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const removeUser = useMutation({
		mutationFn: async (userId: string) => {
			const { error } = await authClient.admin.removeUser({ userId });
			if (error) throw new Error(error.message ?? "Failed to delete user");
		},
		onSuccess: () => {
			toast.success("User deleted");
			invalidateUsers();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const revokeSessions = useMutation({
		mutationFn: async (userId: string) => {
			const { error } = await authClient.admin.revokeUserSessions({ userId });
			if (error) throw new Error(error.message ?? "Failed to revoke sessions");
		},
		onSuccess: () => toast.success("Sessions revoked"),
		onError: (error: Error) => toast.error(error.message),
	});

	const impersonate = useMutation({
		mutationFn: async (userId: string) => {
			const { error } = await authClient.admin.impersonateUser({ userId });
			if (error) throw new Error(error.message ?? "Failed to impersonate user");
		},
		onSuccess: () => {
			toast.success("Now impersonating user");
			router.push("/dashboard");
			router.refresh();
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const users = usersQuery.data?.users ?? [];
	const total = usersQuery.data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

	const handleSort = useCallback(
		(field: SortField) => {
			if (sortField === field) {
				setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
			} else {
				setSortField(field);
				setSortDirection("desc");
			}
			setCurrentPage(1);
		},
		[sortField]
	);

	const getSortIcon = useCallback(
		(field: SortField) => {
			if (sortField !== field) {
				return <ArrowUpDown aria-hidden="true" className="size-3" />;
			}
			return sortDirection === "asc" ? (
				<ArrowUp aria-hidden="true" className="size-3" />
			) : (
				<ArrowDown aria-hidden="true" className="size-3" />
			);
		},
		[sortField, sortDirection]
	);

	const clearFilters = useCallback(() => {
		setSearchTerm("");
		setFilter("all");
		setCurrentPage(1);
	}, []);

	const hasActiveFilters = searchTerm !== "" || filter !== "all";

	const sortableHeader = (label: string, field: SortField) => (
		<Button
			aria-label={`Sort by ${label}`}
			className="h-auto p-0 font-medium hover:bg-transparent"
			onClick={() => handleSort(field)}
			size="sm"
			variant="ghost"
		>
			{label} {getSortIcon(field)}
		</Button>
	);

	const isSelf = (user: AdminUserRow) => user.id === currentUserId;

	const limitedRange = useMemo(() => {
		const start = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
		const end = Math.min(currentPage * itemsPerPage, total);
		return `${start}-${end}`;
	}, [currentPage, itemsPerPage, total]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-4 md:flex-row md:items-center">
				<div className="relative flex-1">
					<Search
						aria-hidden="true"
						className="absolute top-1/2 left-3 size-4 -translate-y-1/2 transform text-muted-foreground"
					/>
					<Input
						aria-label="Search users"
						className="pl-10"
						onChange={(e) => {
							setSearchTerm(e.target.value);
							setCurrentPage(1);
						}}
						placeholder="Search users..."
						type="search"
						value={searchTerm}
					/>
				</div>

				<div className="flex flex-wrap gap-2">
					<Select
						onValueChange={(value) => {
							setSearchField(value as SearchField);
							setCurrentPage(1);
						}}
						value={searchField}
					>
						<SelectTrigger aria-label="Search field" className="w-[120px]">
							<SelectValue placeholder="Search in" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="email">Email</SelectItem>
							<SelectItem value="name">Name</SelectItem>
						</SelectContent>
					</Select>

					<Select
						onValueChange={(value) => {
							setFilter(value as FilterValue);
							setCurrentPage(1);
						}}
						value={filter}
					>
						<SelectTrigger aria-label="Filter users" className="w-[140px]">
							<SelectValue placeholder="Filter" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Users</SelectItem>
							<SelectItem value="admin">Admins</SelectItem>
							<SelectItem value="user">Users</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="banned">Banned</SelectItem>
						</SelectContent>
					</Select>

					{hasActiveFilters && (
						<Button
							aria-label="Clear all filters"
							onClick={clearFilters}
							size="sm"
							variant="outline"
						>
							<X aria-hidden="true" className="size-4" />
							Clear
						</Button>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="text-muted-foreground text-sm">
					{usersQuery.isPending
						? "Loading users..."
						: `Showing ${limitedRange} of ${total} user(s)`}
				</div>

				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-sm">Show:</span>
					<Select
						onValueChange={(value) => {
							setItemsPerPage(Number(value));
							setCurrentPage(1);
						}}
						value={itemsPerPage.toString()}
					>
						<SelectTrigger aria-label="Items per page" className="w-[80px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="10">10</SelectItem>
							<SelectItem value="25">25</SelectItem>
							<SelectItem value="50">50</SelectItem>
							<SelectItem value="100">100</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{usersQuery.isError && (
				<div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-destructive text-sm">
					{usersQuery.error instanceof Error
						? usersQuery.error.message
						: "Failed to load users"}
				</div>
			)}

			<div className="rounded-md border">
				<Table aria-label="Users table" role="table">
					<TableHeader>
						<TableRow>
							<TableHead>{sortableHeader("Name", "name")}</TableHead>
							<TableHead>{sortableHeader("Email", "email")}</TableHead>
							<TableHead>{sortableHeader("Role", "role")}</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>{sortableHeader("Created", "createdAt")}</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{users.map((user) => (
							<TableRow className="hover:bg-muted/50" key={user.id}>
								<TableCell className="font-medium">
									<Link
										aria-label={`View details for ${user.name}`}
										className="flex items-center gap-2 hover:text-primary"
										href={`/admin/users/${user.id}`}
									>
										{user.name}
										<ExternalLink aria-hidden="true" className="size-3 opacity-50" />
									</Link>
								</TableCell>
								<TableCell>{user.email}</TableCell>
								<TableCell>
									<Badge variant={(user.role ?? "user") === "admin" ? "default" : "secondary"}>
										{user.role ?? "user"}
									</Badge>
								</TableCell>
								<TableCell>
									<Badge variant={user.banned ? "destructive" : "secondary"}>
										{user.banned ? "Banned" : "Active"}
									</Badge>
								</TableCell>
								<TableCell className="text-xs">
									{new Date(user.createdAt).toLocaleDateString("en-US", {
										year: "numeric",
										month: "2-digit",
										day: "2-digit",
									})}
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													aria-label={`Actions for ${user.name}`}
													size="icon-sm"
													variant="ghost"
												/>
											}
										>
											<Ellipsis aria-hidden="true" className="size-4" />
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-48">
											<DropdownMenuItem
												disabled={(user.role ?? "user") === "admin"}
												onClick={() =>
													setRole.mutate({ userId: user.id, role: "admin" })
												}
											>
												<Crown aria-hidden="true" className="size-4" />
												Make admin
											</DropdownMenuItem>
											<DropdownMenuItem
												disabled={(user.role ?? "user") !== "admin"}
												onClick={() =>
													setRole.mutate({ userId: user.id, role: "user" })
												}
											>
												<UserCheck aria-hidden="true" className="size-4" />
												Demote to user
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											{user.banned ? (
												<DropdownMenuItem
													disabled={isSelf(user)}
													onClick={() => unbanUser.mutate(user.id)}
												>
													<UserCheck aria-hidden="true" className="size-4" />
													Unban user
												</DropdownMenuItem>
											) : (
												<DropdownMenuItem
													disabled={isSelf(user)}
													onClick={() =>
														setPendingAction({ type: "ban", user })
													}
												>
													<Ban aria-hidden="true" className="size-4" />
													Ban user
												</DropdownMenuItem>
											)}
											<DropdownMenuItem
												disabled={isSelf(user)}
												onClick={() => impersonate.mutate(user.id)}
											>
												<LogIn aria-hidden="true" className="size-4" />
												Impersonate
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => revokeSessions.mutate(user.id)}>
												<RefreshCw aria-hidden="true" className="size-4" />
												Revoke sessions
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												disabled={isSelf(user)}
												onClick={() => setPendingAction({ type: "delete", user })}
												variant="destructive"
											>
												<Trash2 aria-hidden="true" className="size-4" />
												Delete user
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{!usersQuery.isPending && users.length === 0 && (
				<div className="py-8 text-center text-muted-foreground">
					{hasActiveFilters ? "No users match your filters" : "No users found"}
				</div>
			)}

			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<div className="text-muted-foreground text-sm">
						Page {currentPage} of {totalPages}
					</div>

					<div className="flex items-center gap-2">
						<Button
							aria-label="Go to previous page"
							disabled={currentPage === 1}
							onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
							size="sm"
							variant="outline"
						>
							<ChevronLeft aria-hidden="true" className="size-4" />
							Previous
						</Button>

						<Button
							aria-label="Go to next page"
							disabled={currentPage === totalPages}
							onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
							size="sm"
							variant="outline"
						>
							Next
							<ChevronRight aria-hidden="true" className="size-4" />
						</Button>
					</div>
				</div>
			)}

			<ConfirmationModal
				cancelText="Cancel"
				confirmText={pendingAction?.type === "delete" ? "Delete User" : "Ban User"}
				description={
					pendingAction?.type === "delete"
						? `Are you sure you want to delete "${pendingAction.user.name}"? This permanently removes their account and data.`
						: `Ban "${pendingAction?.user.name}"? They will be unable to sign in.`
				}
				onConfirm={() => {
					if (!pendingAction) return;
					if (pendingAction.type === "delete") {
						removeUser.mutate(pendingAction.user.id);
					} else {
						banUser.mutate({ userId: pendingAction.user.id });
					}
				}}
				onOpenChange={(open) => {
					if (!open) setPendingAction(null);
				}}
				open={pendingAction !== null}
				title={pendingAction?.type === "delete" ? "Delete User" : "Ban User"}
				variant="destructive"
			/>
		</div>
	);
}
