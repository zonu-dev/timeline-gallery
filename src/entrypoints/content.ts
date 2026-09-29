import { defineContentScript } from 'wxt/utils/define-content-script';
import { MESSAGE_TYPES, sendExtensionMessage } from '../utils/messaging';
import {
  DEFAULT_GALLERY_MODE_SETTINGS,
  EXTENSION_STATE_KEY,
  type GalleryModeSettings,
  normalizeExtensionState,
} from '../utils/storage';
import { getXPageKind } from '../utils/x-page';
import {
  AD_LABEL_CLASS,
  NATIVE_MENU_BUTTON_CLASS,
  NOT_INTERESTED_BUTTON_CLASS,
  applyXGalleryMode,
  setXGalleryModeEnabled,
} from '../utils/x-gallery';

const X_MATCHES = ['https://x.com/*', 'https://twitter.com/*'];
const TEST_PAGE_MATCHES = [
  'http://localhost/*',
  'http://127.0.0.1/*',
  'https://example.com/*',
];
const CONTENT_SCRIPT_MATCHES = [
  ...X_MATCHES,
  ...(import.meta.env.DEV || import.meta.env.MODE === 'test'
    ? TEST_PAGE_MATCHES
    : []),
];

export default defineContentScript({
  matches: CONTENT_SCRIPT_MATCHES,
  runAt: 'document_idle',
  main() {
    document.documentElement.dataset.timelineGalleryExtension = 'ready';
    const galleryController = createGalleryController();

    void sendExtensionMessage({
      type: MESSAGE_TYPES.contentReady,
      page: {
        title: document.title,
        url: location.href,
      },
    }).then((response) => {
      if (response.ok && 'state' in response) {
        galleryController.apply(response.state.galleryMode);
      }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') {
        return;
      }

      const stateChange = changes[EXTENSION_STATE_KEY];
      if (!stateChange) {
        return;
      }

      const nextState = normalizeExtensionState(stateChange.newValue);
      const previousState = normalizeExtensionState(stateChange.oldValue);
      if (
        areGalleryModeSettingsEqual(
          previousState.galleryMode,
          nextState.galleryMode,
        )
      ) {
        return;
      }

      galleryController.apply(nextState.galleryMode);
    });

    installNavigationListener(() => {
      galleryController.scheduleApply({
        delayFrames: 2,
        delayMs: 80,
      });
    });
  },
});

type ApplyScheduleOptions = {
  delayFrames?: number;
  delayMs?: number;
};

function createGalleryController() {
  let currentSettings: GalleryModeSettings | null = null;
  let observer: MutationObserver | null = null;
  let scheduled = false;
  let scheduledTimer: number | null = null;

  function apply(settings: GalleryModeSettings): void {
    currentSettings = settings;

    if (!settings.enabled) {
      disableGalleryMode();
      return;
    }

    ensureObserver();
    applyCurrentPage();
  }

  function applyCurrentPage(): void {
    if (!currentSettings?.enabled) {
      disableGalleryMode();
      return;
    }

    const settings = currentSettings;
    runWithObserverPaused(() => {
      const pageKind = getXPageKind(location.pathname);
      if (pageKind === 'post-detail' || pageKind === 'other') {
        setXGalleryModeEnabled(document, true, {
          settings,
          simplifyPosts: false,
        });
        return;
      }

      setXGalleryModeEnabled(document, true, {
        settings,
        simplifyPosts: true,
      });
      applyXGalleryMode(document, settings);
    });
  }

  function disableGalleryMode(): void {
    cancelScheduledApply();
    setXGalleryModeEnabled(document, false);
    observer?.disconnect();
    observer = null;
  }

  function ensureObserver(): void {
    if (observer) {
      return;
    }

    observer = new MutationObserver((records) => {
      if (shouldIgnoreMutationRecords(records)) {
        return;
      }

      scheduleApply();
    });

    observeMutations();
  }

  function observeMutations(): void {
    observer?.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function runWithObserverPaused(callback: () => void): void {
    const shouldResume = Boolean(observer);
    observer?.disconnect();

    try {
      callback();
    } finally {
      if (shouldResume) {
        observeMutations();
      }
    }
  }

  function scheduleApply(options: ApplyScheduleOptions = {}): void {
    if (scheduled || !currentSettings?.enabled) {
      return;
    }

    scheduled = true;
    const runAfterFrames = (remainingFrames: number): void => {
      if (remainingFrames <= 0) {
        scheduled = false;
        scheduledTimer = null;

        applyCurrentPage();
        return;
      }

      window.requestAnimationFrame(() => {
        runAfterFrames(remainingFrames - 1);
      });
    };
    const start = (): void => {
      runAfterFrames(options.delayFrames ?? 1);
    };

    if (options.delayMs && options.delayMs > 0) {
      scheduledTimer = window.setTimeout(start, options.delayMs);
      return;
    }

    start();
  }

  function cancelScheduledApply(): void {
    if (scheduledTimer !== null) {
      window.clearTimeout(scheduledTimer);
      scheduledTimer = null;
    }

    scheduled = false;
  }

  return {
    apply,
    scheduleApply,
  };
}

function areGalleryModeSettingsEqual(
  first: GalleryModeSettings,
  second: GalleryModeSettings,
): boolean {
  const keys = Object.keys(DEFAULT_GALLERY_MODE_SETTINGS) as Array<
    keyof GalleryModeSettings
  >;

  return keys.every((key) => first[key] === second[key]);
}

function shouldIgnoreMutationRecords(records: MutationRecord[]): boolean {
  return records.every((record) => {
    const changedNodes = [...record.addedNodes, ...record.removedNodes];
    if (changedNodes.length === 0) {
      return false;
    }

    return changedNodes.every(isGalleryOwnedOrMenuNode);
  });
}

function isGalleryOwnedOrMenuNode(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return true;
  }

  const element = node as Element;
  return Boolean(
    element.closest(
      [
        `.${NOT_INTERESTED_BUTTON_CLASS}`,
        `.${AD_LABEL_CLASS}`,
        `.${NATIVE_MENU_BUTTON_CLASS}`,
        '[role="menu"]',
        '[role="menuitem"]',
        '[role="menuitemradio"]',
        '[data-testid="Dropdown"]',
      ].join(','),
    ),
  );
}

function installNavigationListener(onNavigate: () => void): void {
  const pushState = history.pushState;
  const replaceState = history.replaceState;
  let lastHref = location.href;

  const notifyIfLocationChanged = (): void => {
    if (location.href === lastHref) {
      return;
    }

    lastHref = location.href;
    onNavigate();
  };

  history.pushState = function patchedPushState(...args) {
    const result = pushState.apply(this, args);
    notifyIfLocationChanged();
    return result;
  };

  history.replaceState = function patchedReplaceState(...args) {
    const result = replaceState.apply(this, args);
    notifyIfLocationChanged();
    return result;
  };

  window.addEventListener('popstate', notifyIfLocationChanged);
  window.addEventListener('hashchange', notifyIfLocationChanged);
  window.setInterval(notifyIfLocationChanged, 250);
}
