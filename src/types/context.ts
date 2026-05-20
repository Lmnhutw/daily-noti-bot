import type { Context, SessionFlavor } from "grammy";

export interface SessionData {
  lastCommandAt?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export function initialSession(): SessionData {
  return {};
}
