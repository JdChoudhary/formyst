import { badRequestError } from "../../errors";
import type { AIBuilderChatMessage } from "../model";

/**
 * Prompt-injection detection, ported from the ikiform reference implementation
 * (`src/lib/utils/prompt-injection.ts`). Patterns are kept deliberately simple
 * — no nested groups or backtracking-heavy quantifiers — because every one is
 * run against free-form user input.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /\bignore\b.*\b(previous|prior|earlier)\b.*\b(instruction|prompt|directive|rule)s?\b/i,
  /\bforget\b.*\b(previous|prior|earlier)\b.*\b(instruction|prompt|directive|rule)s?\b/i,
  /\byou\s+are\s+now\b/i,
  /\byou\s+were\s+previously\b/i,
  /\bact\s+as\b/i,
  /\bpretend\s+(to\s+be|that\s+you\s+are)\b/i,
  /\bsimulate\b.*\byou\s+are\b/i,
  /\boverride\b.*\b(system|previous|prior)\b.*\b(instruction|prompt|directive|rule)s?\b/i,
  /\bsystem\s*:?\s*(prompt|instruction|directive|rule)/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /\[INST\s+SYSTEM\]/i,
  /###\s*(system|instruction|prompt)/i,
  /---\s*(system|instruction|prompt)/i,
  /\bbegin\b.*\b(new|newer)\b.*\b(system|instruction|prompt)s?\b/i,
  /\bstart\b.*\b(new|newer)\b.*\b(system|instruction|prompt)s?\b/i,
  /\bexecute\b.*\b(following|below)\b.*\b(instruction|command|code)s?\b/i,
  /\brun\b.*\b(following|below)\b.*\b(instruction|command|code)s?\b/i,
  /\bprint\b.*\b(system|internal|hidden)\b.*\b(prompt|instruction)s?\b/i,
  /\breveal\b.*\b(system|internal|hidden)\b.*\b(prompt|instruction)s?\b/i,
  /\b(show|leak|disclose|output)\b.*\b(system|internal|hidden)\b.*\b(prompt|instruction)s?\b/i,
  /\b(what|tell|repeat|echo)\b.*\b(system|initial|original)\b.*\b(instruction|prompt|directive)s?\b/i,
  /\brole\s*:?\s*(system|admin|developer|assistant)\b/i,
  /\byou\s+must\s+(always|never)\b/i,
  /\byou\s+should\s+(always|never)\b/i,
  /\byou\s+can\s+(now|always)\b/i,
  /\bfrom\s+now\s+on\b/i,
  /\bstarting\s+now\b/i,
  /\bhere\s+are\b.*\b(new|updated|revised)\b.*\b(instruction|prompt|directive|rule)s?\b/i,
  /\b(new|updated|revised)\s+(instruction|prompt|directive|rule)s?\s*:?\b/i,
  /\b(change|modify|update|alter)\b.*\b(your|the)\b.*\b(instruction|prompt|directive|rule|behavior)s?\b/i,
  /\b(switch|change)\b.*\b(to|mode|persona)\b/i,
  /\benter\b.*\b(developer|debug|admin|system)\s+mode\b/i,
  /\benable\b.*\b(developer|debug|admin|system)\s+mode\b/i,
  /\b(disable|bypass|remove)\b.*\b(safety|security|filtering|restriction)s?\b/i,
  /\bjailbreak\b/i,
  /\bdan\s+mode\b/i,
  /\b(developer|debug|admin|system)\s+mode\b/i,
];

export function detectPromptInjection(input: string): boolean {
  if (typeof input !== "string" || !input.trim()) return false;
  const normalizedInput = input.trim().toLowerCase();
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalizedInput)) return true;
  }
  return false;
}

export function validateMessageRole(role: string): role is "user" | "assistant" {
  return role === "user" || role === "assistant";
}

/**
 * Strip anything that looks like markup/control noise from free-form text.
 *
 * The ikiform reference used `sanitize-html`; this monorepo has no such
 * dependency, so this covers the same intent with zero deps: drop angle-bracket
 * tags, collapse control characters, and trim. It never mangles newlines, which
 * the chat UI renders.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .trim();
}

export interface ValidatedMessages {
  messages: AIBuilderChatMessage[];
}

/**
 * Validate + sanitize the conversation sent to the model.
 *
 * - rejects non-array / empty payloads and malformed messages
 * - drops `system` messages (the system prompt is server-controlled)
 * - sanitizes markup/control characters
 * - rejects messages that look like prompt-injection attempts
 */
export function validateAndSanitizeMessages(raw: unknown): ValidatedMessages {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw badRequestError("Invalid messages array");
  }

  const messages: AIBuilderChatMessage[] = [];

  for (const msg of raw) {
    if (
      typeof msg !== "object" ||
      msg === null ||
      typeof (msg as { role?: unknown }).role !== "string" ||
      typeof (msg as { content?: unknown }).content !== "string"
    ) {
      throw badRequestError("Invalid message format");
    }

    const { role, content } = msg as { role: string; content: string };
    if (!validateMessageRole(role)) {
      throw badRequestError("Invalid message role");
    }

    const sanitized = sanitizeString(content);
    if (!sanitized) {
      throw badRequestError("Message content cannot be empty");
    }

    if (detectPromptInjection(sanitized)) {
      throw badRequestError(
        "Invalid input detected. Please rephrase your request without using system instructions or prompt manipulation.",
      );
    }

    messages.push({ role, content: sanitized });
  }

  return { messages };
}

/** Single user-message sanitizer for the message-save endpoint. */
export function sanitizeSingleMessage(content: string): string {
  const sanitized = sanitizeString(content);
  if (!sanitized) {
    throw badRequestError("Message content cannot be empty");
  }
  if (detectPromptInjection(sanitized)) {
    throw badRequestError(
      "Invalid input detected. Please rephrase your request without using system instructions or prompt manipulation.",
    );
  }
  return sanitized;
}