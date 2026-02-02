<template>
  <div class="theme-settings-overlay" @click.self="$emit('close')">
    <div class="theme-settings-panel">
      <div class="panel-header">
        <h2>主题设置</h2>
        <button class="close-btn" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="panel-content">
        <!-- 预设主题 -->
        <section class="settings-section">
          <h3>预设主题</h3>
          <div class="preset-grid">
            <div
              v-for="preset in presets"
              :key="preset.name"
              class="preset-card"
              :class="{ active: themeStore.currentPreset === preset.name }"
              @click="themeStore.setPreset(preset.name)"
            >
              <div class="preset-preview">
                <div class="preview-bg" :style="{ background: preset.colors.bgPrimary }">
                  <div class="preview-sidebar" :style="{ background: preset.colors.bgSecondary }"></div>
                  <div class="preview-accent" :style="{ background: preset.colors.accent }"></div>
                </div>
              </div>
              <span class="preset-label">{{ preset.label }}</span>
            </div>
            <!-- 自定义选项 -->
            <div
              class="preset-card"
              :class="{ active: themeStore.currentPreset === 'custom' }"
              @click="themeStore.setPreset('custom')"
            >
              <div class="preset-preview custom-preview">
                <div class="preview-bg" :style="{ background: themeStore.customColors.bgPrimary }">
                  <div class="preview-sidebar" :style="{ background: themeStore.customColors.bgSecondary }"></div>
                  <div class="preview-accent" :style="{ background: themeStore.customColors.accent }"></div>
                </div>
                <svg class="custom-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </div>
              <span class="preset-label">自定义</span>
            </div>
          </div>
        </section>

        <!-- 自定义颜色 -->
        <section v-if="themeStore.currentPreset === 'custom'" class="settings-section">
          <h3>自定义颜色</h3>
          <div class="color-options">
            <div class="color-option">
              <label>主背景</label>
              <div class="color-input-wrapper">
                <input
                  type="color"
                  :value="themeStore.customColors.bgPrimary"
                  @input="(e) => themeStore.setCustomColor('bgPrimary', (e.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ themeStore.customColors.bgPrimary }}</span>
              </div>
            </div>
            <div class="color-option">
              <label>次背景</label>
              <div class="color-input-wrapper">
                <input
                  type="color"
                  :value="themeStore.customColors.bgSecondary"
                  @input="(e) => themeStore.setCustomColor('bgSecondary', (e.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ themeStore.customColors.bgSecondary }}</span>
              </div>
            </div>
            <div class="color-option">
              <label>卡片背景</label>
              <div class="color-input-wrapper">
                <input
                  type="color"
                  :value="themeStore.customColors.bgTertiary"
                  @input="(e) => themeStore.setCustomColor('bgTertiary', (e.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ themeStore.customColors.bgTertiary }}</span>
              </div>
            </div>
            <div class="color-option">
              <label>强调色</label>
              <div class="color-input-wrapper">
                <input
                  type="color"
                  :value="themeStore.customColors.accent"
                  @input="(e) => themeStore.setCustomColor('accent', (e.target as HTMLInputElement).value)"
                />
                <span class="color-value">{{ themeStore.customColors.accent }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 背景图片设置 -->
        <section class="settings-section">
          <div class="section-header">
            <h3>背景图片</h3>
            <label class="toggle-switch">
              <input
                type="checkbox"
                :checked="themeStore.background.enabled"
                @change="(e) => themeStore.setBackgroundEnabled((e.target as HTMLInputElement).checked)"
                :disabled="!themeStore.background.imageUrl"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="background-input-group">
            <label>图片地址</label>
            <div class="url-input-row">
              <input
                type="text"
                v-model="imageUrlInput"
                placeholder="输入图片 URL 或点击上传"
                @blur="applyImageUrl"
                @keydown.enter="applyImageUrl"
              />
              <input type="file" ref="fileInputRef" accept="image/*" @change="handleFileUpload" class="file-input-hidden" />
              <button type="button" class="upload-btn" @click="fileInputRef?.click()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </button>
              <button v-if="themeStore.background.imageUrl" class="clear-btn" @click="clearImage">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 背景图片预览 -->
          <div v-if="themeStore.background.imageUrl" class="background-preview">
            <img :src="themeStore.background.imageUrl" alt="背景预览" />
          </div>

          <!-- 背景效果调节 -->
          <div v-if="themeStore.background.imageUrl" class="background-controls">
            <div class="slider-option">
              <div class="slider-header">
                <label>透明度</label>
                <span class="slider-value">{{ themeStore.background.opacity }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                :value="themeStore.background.opacity"
                @input="(e) => themeStore.setBackgroundOpacity(Number((e.target as HTMLInputElement).value))"
              />
            </div>

            <div class="slider-option">
              <div class="slider-header">
                <label>模糊度</label>
                <span class="slider-value">{{ themeStore.background.blur }}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                :value="themeStore.background.blur"
                @input="(e) => themeStore.setBackgroundBlur(Number((e.target as HTMLInputElement).value))"
              />
            </div>

            <div class="slider-option">
              <div class="slider-header">
                <label>亮度</label>
                <span class="slider-value">{{ themeStore.background.brightness }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                :value="themeStore.background.brightness"
                @input="(e) => themeStore.setBackgroundBrightness(Number((e.target as HTMLInputElement).value))"
              />
            </div>

            <div class="slider-option">
              <div class="slider-header">
                <label>内容透明度</label>
                <span class="slider-value">{{ themeStore.background.contentOpacity }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                :value="themeStore.background.contentOpacity"
                @input="(e) => themeStore.setContentOpacity(Number((e.target as HTMLInputElement).value))"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useThemeStore, presets } from '@/stores/themeStore';

defineEmits<{
  (e: 'close'): void;
}>();

const themeStore = useThemeStore();
const imageUrlInput = ref(themeStore.background.imageUrl);
const fileInputRef = ref<HTMLInputElement | null>(null);

watch(() => themeStore.background.imageUrl, (newUrl) => {
  imageUrlInput.value = newUrl;
});

function applyImageUrl() {
  const url = imageUrlInput.value.trim();
  if (url !== themeStore.background.imageUrl) {
    themeStore.setBackgroundImage(url);
  }
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      imageUrlInput.value = dataUrl;
      themeStore.setBackgroundImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }
}

function clearImage() {
  imageUrlInput.value = '';
  themeStore.clearBackgroundImage();
}
</script>

<style scoped>
.theme-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease;
}

.theme-settings-panel {
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleIn 0.2s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.panel-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  padding: 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h3 {
  margin-bottom: 0;
}

/* 预设主题网格 */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.preset-card {
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.preset-preview {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}

.preset-card:hover .preset-preview {
  border-color: var(--border);
}

.preset-card.active .preset-preview {
  border-color: var(--accent);
}

.preview-bg {
  width: 100%;
  height: 100%;
  position: relative;
}

.preview-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
}

.preview-accent {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.custom-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-icon {
  position: absolute;
  color: var(--text-secondary);
  opacity: 0.6;
}

.preset-label {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.preset-card.active .preset-label {
  color: var(--accent);
  font-weight: 500;
}

/* 颜色选项 */
.color-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.color-option {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-option label {
  font-size: 12px;
  color: var(--text-muted);
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.color-input-wrapper input[type="color"] {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: none;
}

.color-input-wrapper input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-input-wrapper input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: var(--radius-sm);
}

.color-value {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
  text-transform: uppercase;
}

/* 开关 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch .toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--bg-tertiary);
  border-radius: 11px;
  transition: background 0.2s;
}

.toggle-switch .toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked + .toggle-slider::after {
  transform: translateX(18px);
  background: white;
}

.toggle-switch input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 背景图片输入 */
.background-input-group {
  margin-bottom: 12px;
}

.background-input-group label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.url-input-row {
  display: flex;
  gap: 8px;
}

.url-input-row input[type="text"] {
  flex: 1;
  padding: 10px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.url-input-row input[type="text"]:focus {
  border-color: var(--accent);
}

.url-input-row input[type="text"]::placeholder {
  color: var(--text-muted);
}

.file-input-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.upload-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.clear-btn:hover {
  background: var(--danger-soft);
  border-color: var(--danger);
  color: var(--danger);
}

/* 背景预览 */
.background-preview {
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}

.background-preview img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

/* 滑块控制 */
.background-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.slider-option {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-header label {
  font-size: 12px;
  color: var(--text-muted);
}

.slider-value {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-secondary);
}

.slider-option input[type="range"] {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider-option input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s;
}

.slider-option input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider-option input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* 移动端适配 */
@media (max-width: 480px) {
  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .color-options {
    grid-template-columns: 1fr;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
