import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MESSAGE_TYPES, sendExtensionMessage } from '../../utils/messaging';
import {
  DEFAULT_GALLERY_MODE_SETTINGS,
  type ExtensionState,
  type GalleryImageCount,
  type GalleryMediaSize,
  type GalleryModeSettings,
} from '../../utils/storage';
import './style.css';

type PopupStatus = 'idle' | 'loading' | 'ready' | 'error';
type ToggleSettingKey = Extract<
  keyof GalleryModeSettings,
  | 'includeGifs'
  | 'includeVideos'
  | 'showAccountInfo'
  | 'showPostTime'
  | 'showRepostContext'
  | 'showLikeCount'
  | 'showRepostCount'
  | 'showReply'
  | 'showViewCount'
  | 'showShareButton'
  | 'showLeftSidebar'
  | 'showRightSidebar'
>;

const TOGGLE_SETTINGS: Array<{
  key: ToggleSettingKey;
  label: string;
}> = [
  { key: 'includeGifs', label: 'GIF表示' },
  { key: 'includeVideos', label: '動画表示' },
  { key: 'showAccountInfo', label: 'アカウント情報表示' },
  { key: 'showPostTime', label: '投稿時間表示' },
  { key: 'showRepostContext', label: 'リポスト者表示' },
  { key: 'showLikeCount', label: 'いいね数表示' },
  { key: 'showRepostCount', label: 'リポスト数表示' },
  { key: 'showReply', label: 'リプライ表示' },
  { key: 'showViewCount', label: '再生数表示' },
  { key: 'showShareButton', label: '共有ボタン表示' },
  { key: 'showLeftSidebar', label: '左サイドメニュー表示' },
  { key: 'showRightSidebar', label: '右サイドメニュー表示' },
];

const IMAGE_COUNT_OPTIONS: GalleryImageCount[] = [1, 2, 3, 4];
const MEDIA_SIZE_OPTIONS: Array<{ value: GalleryMediaSize; label: string }> = [
  { value: 's', label: 'S' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
];

function App() {
  const [status, setStatus] = useState<PopupStatus>('idle');
  const [message, setMessage] = useState('');
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
      setMessage('');
    }
  }

  async function updateGalleryModeSettings(
    settings: Partial<GalleryModeSettings>,
  ) {
    setStatus('loading');

    const response = await sendExtensionMessage({
      type: MESSAGE_TYPES.setGalleryMode,
      settings,
    });

    if (!response.ok) {
      setStatus('error');
      setMessage(response.error);
      return;
    }

    if ('state' in response) {
      setState(response.state);
      setStatus('ready');
      setMessage('');
    }
  }

  const settings = state?.galleryMode ?? DEFAULT_GALLERY_MODE_SETTINGS;
  const isLoading = status === 'loading';
  const detailControlsDisabled = isLoading || !settings.enabled;
  const isDefaultDetails = areDetailSettingsDefault(settings);

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
            checked={settings.enabled}
            disabled={isLoading}
            aria-label="ギャラリーモード"
            onChange={(event) =>
              void updateGalleryModeSettings({
                enabled: event.currentTarget.checked,
              })
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

      <details
        className="advanced"
        data-disabled={settings.enabled ? 'false' : 'true'}
        aria-disabled={!settings.enabled}
      >
        <summary className="advanced__summary">
          <span>詳細設定</span>
          <span className="advanced__chevron" aria-hidden="true">
            ▾
          </span>
        </summary>

        <div className="advanced__body">
          <div className="setting-row setting-row--segmented">
            <div className="setting-row__copy">
              <strong>画像枚数</strong>
              <span>表示する添付画像数の上限</span>
            </div>
            <SegmentedControl
              label="画像枚数"
              options={IMAGE_COUNT_OPTIONS.map((value) => ({
                value,
                label: String(value),
              }))}
              value={settings.imageCount}
              disabled={detailControlsDisabled}
              onChange={(imageCount) =>
                void updateGalleryModeSettings({ imageCount })
              }
            />
          </div>

          <div className="setting-row setting-row--segmented">
            <div className="setting-row__copy">
              <strong>表示サイズ</strong>
              <span>S / M / L</span>
            </div>
            <SegmentedControl
              label="表示サイズ"
              options={MEDIA_SIZE_OPTIONS}
              value={settings.mediaSize}
              disabled={detailControlsDisabled}
              onChange={(mediaSize) =>
                void updateGalleryModeSettings({ mediaSize })
              }
            />
          </div>

          <fieldset className="filter-list">
            <legend className="visually-hidden">表示オプション</legend>
            {TOGGLE_SETTINGS.map((setting) => (
              <ToggleRow
                key={setting.key}
                id={setting.key}
                label={setting.label}
                checked={settings[setting.key]}
                disabled={detailControlsDisabled}
                onChange={(checked) =>
                  void updateGalleryModeSettings({
                    [setting.key]: checked,
                  } as Partial<GalleryModeSettings>)
                }
              />
            ))}
          </fieldset>

          <button
            className="reset-button"
            type="button"
            disabled={detailControlsDisabled || isDefaultDetails}
            onClick={() =>
              void updateGalleryModeSettings({
                ...DEFAULT_GALLERY_MODE_SETTINGS,
                enabled: settings.enabled,
              })
            }
          >
            詳細設定を初期値に戻す
          </button>
        </div>
      </details>

      {status === 'error' ? (
        <p className="error-message" role="alert">
          {message}
        </p>
      ) : null}
    </main>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="filter-row" htmlFor={id}>
      <span className="filter-row__copy">
        <strong>{label}</strong>
      </span>
      <input
        id={id}
        className="binary-switch__input visually-hidden"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className="binary-switch binary-switch--compact" aria-hidden="true">
        <span className="binary-switch__state binary-switch__state--on">
          ON
        </span>
        <span className="binary-switch__state binary-switch__state--off">
          OFF
        </span>
        <span className="binary-switch__thumb" />
      </span>
    </label>
  );
}

function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented-control" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          className="segmented-control__button"
          type="button"
          disabled={disabled}
          data-active={option.value === value ? 'true' : 'false'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function areDetailSettingsDefault(settings: GalleryModeSettings): boolean {
  return (
    settings.includeVideos === DEFAULT_GALLERY_MODE_SETTINGS.includeVideos &&
    settings.includeGifs === DEFAULT_GALLERY_MODE_SETTINGS.includeGifs &&
    settings.imageCount === DEFAULT_GALLERY_MODE_SETTINGS.imageCount &&
    settings.mediaSize === DEFAULT_GALLERY_MODE_SETTINGS.mediaSize &&
    settings.showAccountInfo ===
      DEFAULT_GALLERY_MODE_SETTINGS.showAccountInfo &&
    settings.showPostTime === DEFAULT_GALLERY_MODE_SETTINGS.showPostTime &&
    settings.showRepostContext ===
      DEFAULT_GALLERY_MODE_SETTINGS.showRepostContext &&
    settings.showLikeCount === DEFAULT_GALLERY_MODE_SETTINGS.showLikeCount &&
    settings.showRepostCount ===
      DEFAULT_GALLERY_MODE_SETTINGS.showRepostCount &&
    settings.showReply === DEFAULT_GALLERY_MODE_SETTINGS.showReply &&
    settings.showViewCount === DEFAULT_GALLERY_MODE_SETTINGS.showViewCount &&
    settings.showShareButton ===
      DEFAULT_GALLERY_MODE_SETTINGS.showShareButton &&
    settings.showLeftSidebar ===
      DEFAULT_GALLERY_MODE_SETTINGS.showLeftSidebar &&
    settings.showRightSidebar === DEFAULT_GALLERY_MODE_SETTINGS.showRightSidebar
  );
}

createRoot(document.querySelector('#root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
