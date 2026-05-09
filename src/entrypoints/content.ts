import { defineContentScript } from 'wxt/utils/define-content-script';
import { MESSAGE_TYPES, sendExtensionMessage } from '../utils/messaging';
import {
  EXTENSION_STATE_KEY,
  type GalleryModeSettings,
  normalizeExtensionState,
} from '../utils/storage';
import { isXPostDetailPath } from '../utils/x-page';
import { applyXGalleryMode, setXGalleryModeEnabled } from '../utils/x-gallery';

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
      galleryController.apply(nextState.galleryMode);
    });

    installNavigationListener(() => {
      galleryController.scheduleApply();
    });
  },
});

function createGalleryController() {
  let currentSettings: GalleryModeSettings | null = null;
  let observer: MutationObserver | null = null;
  let scheduled = false;

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

    if (isXPostDetailPath(location.pathname)) {
      setXGalleryModeEnabled(document, true, { simplifyPosts: false });
      return;
    }

    setXGalleryModeEnabled(document, true, { simplifyPosts: true });
    applyXGalleryMode(document, currentSettings);
  }

  function disableGalleryMode(): void {
    setXGalleryModeEnabled(document, false);
    observer?.disconnect();
    observer = null;
  }

  function ensureObserver(): void {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      scheduleApply();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function scheduleApply(): void {
    if (scheduled || !currentSettings?.enabled) {
      return;
    }

    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;

      applyCurrentPage();
    });
  }

  return {
    apply,
    scheduleApply,
  };
}

function installNavigationListener(onNavigate: () => void): void {
  const pushState = history.pushState;
  const replaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    const result = pushState.apply(this, args);
    onNavigate();
    return result;
  };

  history.replaceState = function patchedReplaceState(...args) {
    const result = replaceState.apply(this, args);
    onNavigate();
    return result;
  };

  window.addEventListener('popstate', onNavigate);
}
