import { defineStore } from 'pinia';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  accent: string;
}

export interface BackgroundSettings {
  enabled: boolean;
  imageUrl: string;
  opacity: number;      // 0-100
  blur: number;         // 0-50 px
  brightness: number;   // 0-200
  contentOpacity: number; // 内容区域背景透明度 0-100
}

export interface ThemePreset {
  name: string;
  label: string;
  colors: ThemeColors;
}

const THEME_STORAGE_KEY = 'deepthink_theme';

export const presets: ThemePreset[] = [
  {
    name: 'dark',
    label: '暗黑',
    colors: {
      bgPrimary: '#09090b',
      bgSecondary: '#18181b',
      bgTertiary: '#27272a',
      accent: '#22c55e',
    },
  },
  {
    name: 'blue',
    label: '深蓝',
    colors: {
      bgPrimary: '#0c1929',
      bgSecondary: '#142338',
      bgTertiary: '#1c3049',
      accent: '#3b82f6',
    },
  },
  {
    name: 'purple',
    label: '墨紫',
    colors: {
      bgPrimary: '#1a0a2e',
      bgSecondary: '#261339',
      bgTertiary: '#331c4a',
      accent: '#a855f7',
    },
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function applyThemeColors(colors: ThemeColors, bgSettings?: BackgroundSettings) {
  const root = document.documentElement;
  const hasBgImage = bgSettings?.enabled && bgSettings?.imageUrl;
  const contentAlpha = hasBgImage ? (bgSettings.contentOpacity / 100) : 1;

  // 将 hex 颜色转为带透明度的 rgba
  const toRgba = (hex: string, alpha: number) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    return hex;
  };

  root.style.setProperty('--bg-primary', toRgba(colors.bgPrimary, contentAlpha));
  root.style.setProperty('--bg-secondary', toRgba(colors.bgSecondary, contentAlpha));
  root.style.setProperty('--bg-tertiary', toRgba(colors.bgTertiary, contentAlpha));
  root.style.setProperty('--accent', colors.accent);

  // 计算 hover 颜色（稍微变亮）
  const bgRgb = hexToRgb(colors.bgTertiary);
  if (bgRgb) {
    const hoverColor = `rgba(${Math.min(255, bgRgb.r + 10)}, ${Math.min(255, bgRgb.g + 10)}, ${Math.min(255, bgRgb.b + 10)}, ${contentAlpha})`;
    root.style.setProperty('--bg-hover', hoverColor);
  }

  // 计算 accent hover 颜色（稍微变暗）
  const accentRgb = hexToRgb(colors.accent);
  if (accentRgb) {
    const accentHover = `rgb(${Math.max(0, accentRgb.r - 20)}, ${Math.max(0, accentRgb.g - 20)}, ${Math.max(0, accentRgb.b - 20)})`;
    root.style.setProperty('--accent-hover', accentHover);
    root.style.setProperty('--accent-soft', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.1)`);
    root.style.setProperty('--accent-medium', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.2)`);
    root.style.setProperty('--shadow-glow', `0 0 20px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.15)`);
  }
}

function applyBackgroundSettings(settings: BackgroundSettings) {
  const root = document.documentElement;

  if (settings.enabled && settings.imageUrl) {
    root.style.setProperty('--bg-image-url', `url(${settings.imageUrl})`);
    root.style.setProperty('--bg-image-opacity', String(settings.opacity / 100));
    root.style.setProperty('--bg-image-blur', `${settings.blur}px`);
    root.style.setProperty('--bg-image-brightness', String(settings.brightness / 100));
    root.style.setProperty('--bg-image-enabled', '1');
  } else {
    root.style.setProperty('--bg-image-enabled', '0');
    root.style.setProperty('--bg-image-url', 'none');
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentPreset: 'dark' as string,
    customColors: {
      bgPrimary: '#09090b',
      bgSecondary: '#18181b',
      bgTertiary: '#27272a',
      accent: '#22c55e',
    } as ThemeColors,
    background: {
      enabled: false,
      imageUrl: '',
      opacity: 30,
      blur: 10,
      brightness: 80,
      contentOpacity: 85,
    } as BackgroundSettings,
  }),

  getters: {
    currentColors(state): ThemeColors {
      if (state.currentPreset === 'custom') {
        return state.customColors;
      }
      const preset = presets.find(p => p.name === state.currentPreset);
      return preset?.colors || presets[0].colors;
    },
  },

  actions: {
    loadTheme() {
      try {
        const data = localStorage.getItem(THEME_STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          this.currentPreset = parsed.currentPreset || 'dark';
          if (parsed.customColors) {
            this.customColors = parsed.customColors;
          }
          if (parsed.background) {
            this.background = { ...this.background, ...parsed.background };
          }
        }
      } catch (e) {
        console.error('Failed to load theme from storage:', e);
      }
      this.applyTheme();
    },

    saveTheme() {
      try {
        localStorage.setItem(
          THEME_STORAGE_KEY,
          JSON.stringify({
            currentPreset: this.currentPreset,
            customColors: this.customColors,
            background: this.background,
          })
        );
      } catch (e) {
        console.error('Failed to save theme to storage:', e);
      }
    },

    applyTheme() {
      applyThemeColors(this.currentColors, this.background);
      applyBackgroundSettings(this.background);
    },

    setPreset(presetName: string) {
      this.currentPreset = presetName;
      this.applyTheme();
      this.saveTheme();
    },

    setCustomColor(key: keyof ThemeColors, value: string) {
      this.customColors[key] = value;
      if (this.currentPreset === 'custom') {
        this.applyTheme();
      }
      this.saveTheme();
    },

    setCustomColors(colors: Partial<ThemeColors>) {
      Object.assign(this.customColors, colors);
      if (this.currentPreset === 'custom') {
        this.applyTheme();
      }
      this.saveTheme();
    },

    setBackgroundImage(imageUrl: string) {
      this.background.imageUrl = imageUrl;
      this.background.enabled = !!imageUrl;
      this.applyTheme();
      this.saveTheme();
    },

    setBackgroundEnabled(enabled: boolean) {
      this.background.enabled = enabled;
      this.applyTheme();
      this.saveTheme();
    },

    setBackgroundOpacity(opacity: number) {
      this.background.opacity = Math.max(0, Math.min(100, opacity));
      this.applyTheme();
      this.saveTheme();
    },

    setBackgroundBlur(blur: number) {
      this.background.blur = Math.max(0, Math.min(50, blur));
      this.applyTheme();
      this.saveTheme();
    },

    setBackgroundBrightness(brightness: number) {
      this.background.brightness = Math.max(0, Math.min(200, brightness));
      this.applyTheme();
      this.saveTheme();
    },

    setContentOpacity(opacity: number) {
      this.background.contentOpacity = Math.max(0, Math.min(100, opacity));
      this.applyTheme();
      this.saveTheme();
    },

    updateBackground(settings: Partial<BackgroundSettings>) {
      Object.assign(this.background, settings);
      this.applyTheme();
      this.saveTheme();
    },

    clearBackgroundImage() {
      this.background.imageUrl = '';
      this.background.enabled = false;
      this.applyTheme();
      this.saveTheme();
    },
  },
});
