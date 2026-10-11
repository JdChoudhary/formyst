"use client";

import {
	Ban,
	Crown,
	KeyRound,
	LogIn,
	Shield,
	Trash2,
	UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmationModal } from "@/components/dashboard/modals/form-delete-confirmation-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

interface AdminControlsProps {
	userId: string;
	userName: string;
	role: string | null;
	banned: boolean | null;
}

export function AdminControls({ userId, userName, role, banned }: AdminControlsProps) {
	const router = useRouter();
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showBanConfirm, setShowBanConfirm] = useState(false);
	const [pending, setPending] = useState(false);

	const isAdmin = (role ?? "user") === "admin";

	const run = async (
		action: () => Promise<{ error: { message?: string } | null }>,
		successMessage: string
	) => {
		setPending(true);
		try {
			const { error } = await action();
			if (error) {
				toast.error(error.message ?? "Something went wrong");
				return;
			}
			toast.success(successMessage);
			router.refresh();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Something went wrong");
		} finally {
			setPending(false);
		}
	};

	const handleRoleToggle = () =>
		run(
			() =>
				authClient.admin.setRole({
					userId,
					role: isAdmin ? "user" : "admin",
				}),
			isAdmin ? "User demoted to user" : "User promoted to admin"
		);

	const handleUnban = () =>
		run(() => authClient.admin.unbanUser({ userId }), "User unbanned");

	const handleBan = () =>
		run(
			() =>
				authClient.admin.banUser({
					userId,
					banReason: "Banned by an administrator",
				}),
			"User banned"
		);

	const handleDelete = () =>
		run(async () => {
			const result = await authClient.admin.removeUser({ userId });
			if (!result.error) {
				router.push("/admin");
			}
			return result;
		}, "User deleted");

	const handleRevokeSessions = () =>
		run(
			() => authClient.admin.revokeUserSessions({ userId }),
			"Sessions revoked"
		);

	const handleImpersonate = () =>
		run(async () => {
			const result = await authClient.admin.impersonateUser({ userId });
			if (!result.error) {
				router.push("/dashboard");
			}
			return result;
		}, "Now impersonating user");

	return (
		<Card className="gap-0 border-orange-200 bg-orange-50/50 p-4 shadow-none md:p-6">
			<CardHeader className="p-0">
				<CardTitle className="flex items-center gap-2 text-orange-700">
					<Shield className="size-5" />
					Admin Controls
				</CardTitle>
				<p className="text-muted-foreground text-sm">
					Manage this user's role and access via the Better Auth admin plugin
				</p>
			</CardHeader>
			<CardContent className="p-0">
				<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div className="flex flex-col gap-2">
						<div className="font-medium text-muted-foreground text-sm">Role</div>
						<Button
							className="border-blue-300 text-blue-600 hover:bg-blue-50"
							disabled={pending}
							onClick={handleRoleToggle}
							size="sm"
							type="button"
							variant="outline"
						>
							<Crown className="size-4" />
							{isAdmin ? "Demote to user" : "Make admin"}
						</Button>
					</div>

					<div className="flex flex-col gap-2">
						<div className="font-medium text-muted-foreground text-sm">Access</div>
						{banned ? (
							<Button
								className="border-green-300 text-green-600 hover:bg-green-50"
								disabled={pending}
								onClick={handleUnban}
								size="sm"
								type="button"
								variant="outline"
							>
								<UserCheck className="size-4" />
								Unban user
							</Button>
						) : (
							<Button
								className="border-red-300 text-red-600 hover:bg-red-50"
								disabled={pending}
								onClick={() => setShowBanConfirm(true)}
								size="sm"
								type="button"
								variant="outline"
							>
								<Ban className="size-4" />
								Ban user
							</Button>
						)}
					</div>

					<div className="flex flex-col gap-2">
						<div className="font-medium text-muted-foreground text-sm">Sessions</div>
						<Button
							className="border-amber-300 text-amber-600 hover:bg-amber-50"
							disabled={pending}
							onClick={handleRevokeSessions}
							size="sm"
							type="button"
							variant="outline"
						>
							<KeyRound className="size-4" />
							Revoke sessions
						</Button>
					</div>

					<div className="flex flex-col gap-2">
						<div className="font-medium text-muted-foreground text-sm">Impersonate</div>
						<Button
							className="border-purple-300 text-purple-600 hover:bg-purple-50"
							disabled={pending}
							onClick={handleImpersonate}
							size="sm"
							type="button"
							variant="outline"
						>
							<LogIn className="size-4" />
							Impersonate user
						</Button>
					</div>

					<div className="flex flex-col gap-2">
						<div className="font-medium text-muted-foreground text-sm">Danger Zone</div>
						<Button
							disabled={pending}
							onClick={() => setShowDeleteConfirm(true)}
							size="sm"
							type="button"
							variant="destructive"
						>
							<Trash2 className="size-4" />
							Delete User
						</Button>
					</div>
				</div>

				<div className="mt-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
					<p className="text-xs text-yellow-800">
						<strong>Warning:</strong> Deleting a user permanently removes all their forms,
						responses, and data. This action cannot be undone.
					</p>
				</div>
			</CardContent>

			<ConfirmationModal
				cancelText="Cancel"
				confirmText="Ban User"
				description={`Ban "${userName}"? They will be unable to sign in.`}
				onConfirm={handleBan}
				onOpenChange={setShowBanConfirm}
				open={showBanConfirm}
				title="Ban User"
				variant="destructive"
			/>

			<ConfirmationModal
				cancelText="Cancel"
				confirmText="Delete User"
				description={`Are you sure you want to delete "${userName}"? This action cannot be undone and deletes all their forms and data.`}
				onConfirm={handleDelete}
				onOpenChange={setShowDeleteConfirm}
				open={showDeleteConfirm}
				title="Delete User"
				variant="destructive"
			/>
		</Card>
	);
}
