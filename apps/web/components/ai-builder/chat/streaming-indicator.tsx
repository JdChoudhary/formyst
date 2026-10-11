import { motion } from "motion/react";
import { forwardRef, memo } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface StreamingIndicatorProps {
	streamedContent: string;
	streamError: string | null;
	/** Re-send the last prompt after an error or an explicit stop. */
	onRetry?: () => void;
}

export const StreamingIndicator = memo(
	forwardRef<HTMLDivElement, StreamingIndicatorProps>(
		({ streamedContent, streamError, onRetry }, ref) => {
			if (streamError) {
				return (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="my-2 flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
						initial={{ opacity: 0, y: 20 }}
					>
						<TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<p className="text-sm">{streamError}</p>
							{onRetry && (
								<div>
									<Button
										className="h-7 gap-1.5 px-2.5 text-xs"
										onClick={onRetry}
										size="sm"
										type="button"
										variant="outline"
									>
										<RotateCcw className="size-3" />
										Try again
									</Button>
								</div>
							)}
						</div>
					</motion.div>
				);
			}

			return (
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="my-2 rounded-2xl border border-border bg-muted/50 p-3 font-mono text-sm"
					initial={{ opacity: 0, y: 20 }}
				>
					<div
						className="scrollbar-none flex h-[90px] flex-col gap-2 overflow-auto text-muted-foreground text-xs"
						ref={ref}
						style={{ scrollBehavior: "smooth" }}
					>
						<motion.p
							animate={{ backgroundPosition: "-200% 0" }}
							className="bg-[length:200%_100%] bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-clip-text font-mono text-sm text-transparent"
							initial={{ backgroundPosition: "200% 0" }}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 2,
								ease: "linear",
							}}
						>
							Generating form...
						</motion.p>
						<motion.pre
							animate={{ backgroundPosition: "-200% 0" }}
							className="whitespace-pre-wrap break-words bg-[length:200%_100%] bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-clip-text font-mono text-sm text-transparent"
							initial={{ backgroundPosition: "200% 0" }}
							transition={{
								repeat: Number.POSITIVE_INFINITY,
								duration: 2,
								ease: "linear",
							}}
						>
							{streamedContent}
						</motion.pre>
					</div>
				</motion.div>
			);
		}
	)
);

StreamingIndicator.displayName = "StreamingIndicator";
