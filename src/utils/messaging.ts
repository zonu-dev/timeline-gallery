import type { ExtensionState } from './storage';

export const MESSAGE_TYPES = {
  ping: 'timeline-gallery/ping',
  getState: 'timeline-gallery/get-state',
  setGalleryMode: 'timeline-gallery/set-gallery-mode',
  contentReady: 'timeline-gallery/content-ready',
} as const;

export type MessageSource = 'background' | 'content' | 'popup';

export type PingMessage = {
  type: typeof MESSAGE_TYPES.ping;
  source: MessageSource;
};

export type GetStateMessage = {
  type: typeof MESSAGE_TYPES.getState;
};

export type SetGalleryModeMessage = {
  type: typeof MESSAGE_TYPES.setGalleryMode;
  enabled: boolean;
};

export type ContentReadyMessage = {
  type: typeof MESSAGE_TYPES.contentReady;
  page: {
    title: string;
    url: string;
  };
};

export type ExtensionMessage =
  | PingMessage
  | GetStateMessage
  | SetGalleryModeMessage
  | ContentReadyMessage;

export type PingResponse = {
  ok: true;
  message: string;
  receivedAt: number;
};

export type StateResponse = {
  ok: true;
  state: ExtensionState;
};

export type ContentReadyResponse = {
  ok: true;
  state: ExtensionState;
};

export type ErrorResponse = {
  ok: false;
  error: string;
};

export type ExtensionResponse =
  | PingResponse
  | StateResponse
  | ContentReadyResponse
  | ErrorResponse;

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeMessage = value as { type?: unknown };
  return (
    maybeMessage.type === MESSAGE_TYPES.ping ||
    maybeMessage.type === MESSAGE_TYPES.getState ||
    maybeMessage.type === MESSAGE_TYPES.setGalleryMode ||
    maybeMessage.type === MESSAGE_TYPES.contentReady
  );
}

export async function sendExtensionMessage(
  message: ExtensionMessage,
): Promise<ExtensionResponse> {
  return chrome.runtime.sendMessage(message) as Promise<ExtensionResponse>;
}
