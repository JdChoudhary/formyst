"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
	{ label: "Analytics", segment: "analytics" },
	{ label: "Responses", segment: "submissions" },
] as const;

export default function FormDetailLayout({ children }: { children: React.ReactNode }) {
	const params = useParams<{ id: string }>();
	const pathname = usePathname();
	const id = params?.id ?? "";

	return (
		<div className="flex h-full min-h-0 flex-col">
			{/* Section tabs — Analytics | Responses */}
			<div className="shrink-0 border-border border-b bg-card px-4 sm:px-6 lg:px-8">
				<nav aria-label="Form sections" className="flex gap-1">
					{TABS.map((tab) => {
						const href = `/dashboard/forms/${id}/${tab.segment}`;
						const active = pathname?.startsWith(href) ?? false;
						return (
							<Link
								aria-current={active ? "page" : undefined}
								className={cn(
									"relative -mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors",
									active
										? "border-primary text-foreground"
										: "border-transparent text-muted-foreground hover:text-foreground",
								)}
								href={href}
								key={tab.segment}
							>
								{tab.label}
							</Link>
						);
					})}
				</nav>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
		</div>
	);
}
