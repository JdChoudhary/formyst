import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback } from "react";
import { Loader } from "@/components/ui/loader";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { ChatPanelProps } from "@/lib/ai-builder/types";
import { ChatHeader } from "./chat-header";
import { ChatInput } from "./chat-input";
import { ChatMessageItem } from "./chat-message-item";
import { ChatSuggestions } from "./chat-suggestions";
import { StreamingIndicator } from "./streaming-indicator";
import { WelcomeMessage } from "./welcome-message";

export const ChatPanel = memo(function ChatPanel({
	messages,
	isLoading,
	isStreaming,
	streamedContent,
	streamError,
	showSuggestions,
	suggestions,
	setInput,
	input,
	handleSend,
	handleStopGeneration,
	retryLastSend,
	setShowSuggestions,
	setStreamedContent,
	setStreamError,
	streamingRef,
	messagesEndRef,
	mounted,
	sessions,
	sessionId,
	startNewChat,
	openSession,
	deleteSession,
	isDeletingSession,
	isHydratingHistory,
}: ChatPanelProps) {
	const shouldShowSuggestions = showSuggestions && messages.length === 0;

	const handleSuggestionClick = useCallback(
		(text: string) => {
			setInput(text);
			setShowSuggestions(false);
		},
		[setInput, setShowSuggestions]
	);

	return (
		<div className="flex h-full min-h-0 grow flex-col gap-4">
			<ChatHeader
				deleteSession={deleteSession}
				isDeletingSession={isDeletingSession}
				isHydratingHistory={isHydratingHistory}
				openSession={openSession}
				sessionId={sessionId}
				sessions={sessions}
				startNewChat={startNewChat}
			/>
			<ScrollArea className="relative min-h-0 flex-1 p-4">
				<div
					aria-live="polite"
					aria-relevant="additions"
					className="flex flex-col gap-4"
					role="log"
				>
					{messages.length === 0 && <WelcomeMessage mounted={mounted} />}
					<AnimatePresence>
						{messages.map((message, index) => (
							<ChatMessageItem
								index={index}
								key={`${message.role}-${index}-${message.content.slice(0, 50)}`}
								message={message}
							/>
						))}
					</AnimatePresence>
					{isLoading && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className="flex gap-3"
							initial={{ opacity: 0, y: 20 }}
						>
							<Loader />
						</motion.div>
					)}
					{isStreaming && (
						<StreamingIndicator
							ref={streamingRef}
							onRetry={retryLastSend}
							streamError={streamError}
							streamedContent={streamedContent}
						/>
					)}
					<div ref={messagesEndRef} />
				</div>
			</ScrollArea>
			<div className="mt-auto">
				{shouldShowSuggestions && (
					<div className="mx-auto w-full max-w-3xl p-4">
						<ChatSuggestions
							onSuggestionClick={handleSuggestionClick}
							suggestions={suggestions}
						/>
					</div>
				)}
				<Separator />
				<ChatInput
					input={input}
					isLoading={isLoading}
					onSubmit={handleSend}
					onStop={handleStopGeneration}
					setInput={setInput}
				/>
			</div>
		</div>
	);
});
