import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MESSAGE_TYPES, sendExtensionMessage } from '../../utils/messaging';
import type { ExtensionState } from '../../utils/storage';
import './style.css';

type PopupStatus = 'idle' | 'loading' | 'ready' | 'error';

function App() {
  const [status, setStatus] = useState<PopupStatus>('idle');
  const [message, setMessage] = useState('Ready');
  const [state, setState] = useState<ExtensionState | null>(null);

  useEffect(() => {
    void loadState();
  }, []);

  async function loadState() {
    setStatus('loading');

    const response = await sendExtensionMessage({
      type: MESSAGE_TYPES.getState,
    });

    if (!response.ok) {
      setStatus('error');
      setMessage(response.error);
      return;
    }

    if ('state' in response) {
      setState(response.state);
      setStatus('ready');
      setMessage('Background connected');
    }
  }

  async function setGalleryMode(enabled: boolean) {
    setStatus('loading');

    const response = await sendExtensionMessage({
      type: MESSAGE_TYPES.setGalleryMode,
      enabled,
    });

    if (!response.ok) {
      setStatus('error');
      setMessage(response.error);
      return;
    }

    if ('state' in response) {
      setState(response.state);
      setStatus('ready');
      setMessage(`Gallery mode ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  const galleryModeEnabled = state?.galleryMode.enabled ?? false;

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div className="title-copy">
          <h1>Timeline Gallery</h1>
          <p>タイムラインを画像ギャラリーに</p>
        </div>
        <div className="title-icon" aria-hidden="true">
          <img src="/icon/128.png" alt="" />
        </div>
      </header>

      <section className="site-strip" aria-label="ギャラリーモード">
        <label className="field-card field-card--toggle" htmlFor="gallery-mode">
          <span className="field-card__label">ギャラリーモード</span>
          <input
            id="gallery-mode"
            className="binary-switch__input visually-hidden"
            type="checkbox"
            checked={galleryModeEnabled}
            disabled={status === 'loading'}
            aria-label="ギャラリーモード"
            onChange={(event) =>
              void setGalleryMode(event.currentTarget.checked)
            }
          />
          <span className="binary-switch" aria-hidden="true">
            <span className="binary-switch__state binary-switch__state--on">
              オン
            </span>
            <span className="binary-switch__state binary-switch__state--off">
              オフ
            </span>
            <span className="binary-switch__thumb" />
          </span>
        </label>
      </section>

      {status === 'error' ? (
        <p className="error-message" role="alert">
          {message}
        </p>
      ) : null}
    </main>
  );
}

createRoot(document.querySelector('#root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
