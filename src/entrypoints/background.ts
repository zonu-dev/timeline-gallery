import { defineBackground } from 'wxt/utils/define-background';
import {
  type ContentReadyMessage,
  type ExtensionMessage,
  MESSAGE_TYPES,
  isExtensionMessage,
} from '../utils/messaging';
import {
  DEFAULT_EXTENSION_STATE,
  readExtensionState,
  updateExtensionState,
  writeExtensionState,
} from '../utils/storage';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void ensureInitialState();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isExtensionMessage(message)) {
      return false;
    }

    void handleMessage(message)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    return true;
  });
});

async function ensureInitialState(): Promise<void> {
  const current = await readExtensionState();
  await writeExtensionState({
    ...DEFAULT_EXTENSION_STATE,
    ...current,
    installedAt: current.installedAt ?? Date.now(),
  });
}

async function handleMessage(message: ExtensionMessage) {
  switch (message.type) {
    case MESSAGE_TYPES.ping:
      return {
        ok: true,
        message: `pong from ${message.source}`,
        receivedAt: Date.now(),
      };

    case MESSAGE_TYPES.getState:
      return {
        ok: true,
        state: await readExtensionState(),
      };

    case MESSAGE_TYPES.setGalleryMode:
      return {
        ok: true,
        state: await updateExtensionState((current) => ({
          ...current,
          galleryMode: {
            ...current.galleryMode,
            enabled: message.enabled,
          },
        })),
      };

    case MESSAGE_TYPES.contentReady:
      return handleContentReady(message);

    default:
      return {
        ok: false,
        error: 'Unsupported message',
      };
  }
}

async function handleContentReady(message: ContentReadyMessage) {
  const state = await updateExtensionState((current) => ({
    ...current,
    contentReadyCount: current.contentReadyCount + 1,
    lastContentPage: {
      title: message.page.title,
      url: message.page.url,
      seenAt: Date.now(),
    },
  }));

  return {
    ok: true,
    state,
  };
}
