<script setup>
import { inject, watch, computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const editor = inject("editor");

const tool = computed(() => editor.currentTool);

const systemFonts = [
  "Arial",
  "Verdana",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Impact",
  "Tahoma",
  "Comic Sans MS",
  "Helvetica",
];

const aspectOptions = computed(() => [
  { label: t("crop.free"), value: NaN },
  { label: "1 : 1", value: 1 },
  { label: "4 : 3", value: 4 / 3 },
  { label: "3 : 2", value: 3 / 2 },
  { label: "16 : 9", value: 16 / 9 },
]);

// ── Filter data ───────────────────────────────────────────────────────────────
const filterNames = [
  "normal",
  "bw",
  "sepia",
  "vivid",
  "fade",
  "cool",
  "warm",
  "drama",
  "vintage",
  "chrome",
];

const filterCss = {
  normal: "none",
  bw: "grayscale(100%) contrast(108%)",
  sepia: "sepia(85%) contrast(108%)",
  vivid: "saturate(155%) contrast(128%) brightness(103%)",
  fade: "brightness(118%) contrast(78%) saturate(72%)",
  cool: "hue-rotate(-25deg) saturate(108%) contrast(106%)",
  warm: "hue-rotate(12deg) saturate(112%) brightness(105%) contrast(105%)",
  drama: "contrast(148%) saturate(118%) brightness(92%)",
  vintage: "sepia(30%) contrast(112%) brightness(95%) saturate(80%)",
  chrome: "grayscale(18%) contrast(138%) brightness(108%) saturate(82%)",
};

function setAspect(val) {
  editor.cropAspect = val;
}

function isActiveAspect(val) {
  const cur = editor.cropAspect;
  if (isNaN(val) && isNaN(cur)) return true;
  return cur === val;
}

// Resize: watch constrain toggle to auto-calc
let origW = 0,
  origH = 0;
watch(tool, (t) => {
  if (t === "resize") {
    origW = editor.resizeWidth;
    origH = editor.resizeHeight;
  }
});

function onWidthChange(e) {
  const w = Math.round(Number(e.target.value));
  if (!w || w < 1) return;
  editor.resizeWidth = w;
  if (editor.resizeConstrain && origW && origH) {
    editor.resizeHeight = Math.round(w * (origH / origW));
  }
}

function onHeightChange(e) {
  const h = Math.round(Number(e.target.value));
  if (!h || h < 1) return;
  editor.resizeHeight = h;
  if (editor.resizeConstrain && origW && origH) {
    editor.resizeWidth = Math.round(h * (origW / origH));
  }
}
</script>

<template>
  <aside class="right-panel">
    <!-- Crop Panel -->
    <template v-if="tool === 'crop'">
      <div class="panel-section">
        <div class="section-title">{{ t("crop.title") }}</div>
        <div class="aspect-grid">
          <button
            v-for="opt in aspectOptions"
            :key="opt.label"
            class="aspect-btn"
            :class="{ active: isActiveAspect(opt.value) }"
            @click="setAspect(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <div class="panel-section">
        <p class="hint-text">{{ t("crop.hint") }}</p>
      </div>
      <div class="panel-actions">
        <button class="btn-secondary" @click="editor.cancelCrop">
          {{ t("crop.cancel") }}
        </button>
        <button class="btn-primary" @click="editor.applyCrop">
          {{ t("crop.apply") }}
        </button>
      </div>
    </template>

    <!-- BG Remove Panel -->
    <template v-else-if="tool === 'bg'">
      <div class="panel-section">
        <div class="section-title">{{ t("bg.title") }}</div>
        <p class="hint-text">{{ t("bg.hint") }}</p>
      </div>
      <div class="panel-actions">
        <button
          class="btn-primary btn-full"
          :disabled="editor.isProcessing"
          @click="editor.applyBgRemove"
        >
          <svg
            v-if="!editor.isProcessing"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M7 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z"
              stroke="currentColor"
              stroke-width="1.3"
            />
            <path
              d="M4.5 7l1.8 1.8 3.2-3.6"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div v-else class="spinner-sm" />
          {{ editor.isProcessing ? t("bg.processing") : t("bg.remove") }}
        </button>
      </div>
    </template>

    <!-- Resize Panel -->
    <template v-else-if="tool === 'resize'">
      <div class="panel-section">
        <div class="section-title">{{ t("resize.title") }}</div>
        <div class="field-row">
          <label class="field-label">{{ t("resize.width") }}</label>
          <div class="field-input-wrap">
            <input
              type="number"
              class="field-input"
              :value="editor.resizeWidth"
              min="1"
              max="16000"
              @change="onWidthChange"
            />
            <span class="field-unit">px</span>
          </div>
        </div>
        <div class="constrain-row">
          <label class="toggle-label">
            <input
              type="checkbox"
              v-model="editor.resizeConstrain"
              class="toggle-check"
            />
            <span class="toggle-box" />
            <span>{{ t("resize.constrain") }}</span>
          </label>
        </div>
        <div class="field-row">
          <label class="field-label">{{ t("resize.height") }}</label>
          <div class="field-input-wrap">
            <input
              type="number"
              class="field-input"
              :value="editor.resizeHeight"
              min="1"
              max="16000"
              @change="onHeightChange"
            />
            <span class="field-unit">px</span>
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn-primary btn-full" @click="editor.applyResize">
          {{ t("resize.apply") }}
        </button>
      </div>
    </template>

    <!-- Spot Panel -->
    <template v-else-if="tool === 'spot'">
      <div class="panel-section">
        <div class="section-title">{{ t("spot.title") }}</div>
        <div class="slider-row">
          <label class="slider-label">{{ t("spot.size") }}</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="4"
              max="80"
              v-model.number="editor.spotSize"
            />
            <span class="slider-value">{{ editor.spotSize }}</span>
          </div>
        </div>
        <div class="slider-row">
          <label class="slider-label">{{ t("spot.strength") }}</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="0.05"
              max="1"
              step="0.05"
              v-model.number="editor.spotStrength"
            />
            <span class="slider-value"
              >{{ Math.round(editor.spotStrength * 100) }}%</span
            >
          </div>
        </div>
        <p class="hint-text" style="margin-top: 4px">
          {{ t("spot.hint") }}
        </p>
      </div>
    </template>

    <!-- Eraser Panel -->
    <template v-else-if="tool === 'eraser'">
      <div class="panel-section">
        <div class="section-title">{{ t("eraser.title") }}</div>
        <div class="slider-row">
          <label class="slider-label">{{ t("eraser.size") }}</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="4"
              max="200"
              v-model.number="editor.eraserSize"
            />
            <span class="slider-value">{{ editor.eraserSize }}</span>
          </div>
        </div>
        <div class="slider-row">
          <label class="slider-label">{{ t("eraser.hardness") }}</label>
          <div class="slider-wrap">
            <input
              type="range"
              class="slider"
              min="0"
              max="100"
              step="5"
              v-model.number="editor.eraserHardness"
            />
            <span class="slider-value">{{ editor.eraserHardness }}%</span>
          </div>
        </div>
        <p class="hint-text" style="margin-top: 4px">
          {{ t("eraser.hint") }}
        </p>
      </div>
    </template>

    <!-- Color Panel -->
    <template v-else-if="tool === 'color'">
      <div class="panel-section">
        <div class="section-title">{{ t("color.title") }}</div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.brightness") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorBrightness !== 0 }"
            >
              {{ editor.colorBrightness > 0 ? "+" : ""
              }}{{ editor.colorBrightness }}
            </span>
          </div>
          <input
            type="range"
            class="slider"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorBrightness"
          />
          <div class="slider-ends">
            <span>{{ t("color.darker") }}</span
            ><span>{{ t("color.lighter") }}</span>
          </div>
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.contrast") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorContrast !== 0 }"
            >
              {{ editor.colorContrast > 0 ? "+" : ""
              }}{{ editor.colorContrast }}
            </span>
          </div>
          <input
            type="range"
            class="slider"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorContrast"
          />
          <div class="slider-ends">
            <span>{{ t("color.softer") }}</span
            ><span>{{ t("color.sharper") }}</span>
          </div>
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.whiteBalance") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorTemperature !== 0 }"
            >
              {{ editor.colorTemperature > 0 ? "+" : ""
              }}{{ editor.colorTemperature }}
            </span>
          </div>
          <input
            type="range"
            class="slider slider-temp"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorTemperature"
          />
          <div class="slider-ends">
            <span>{{ t("color.cool") }}</span
            ><span>{{ t("color.warm") }}</span>
          </div>
        </div>

        <div class="slider-row">
          <div class="slider-header">
            <label class="slider-label">{{ t("color.saturation") }}</label>
            <span
              class="slider-value"
              :class="{ active: editor.colorSaturation !== 0 }"
            >
              {{ editor.colorSaturation > 0 ? "+" : ""
              }}{{ editor.colorSaturation }}
            </span>
          </div>
          <input
            type="range"
            class="slider"
            min="-100"
            max="100"
            step="1"
            v-model.number="editor.colorSaturation"
          />
          <div class="slider-ends">
            <span>{{ t("color.grey") }}</span
            ><span>{{ t("color.saturated") }}</span>
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn-ghost btn-sm" @click="editor.resetColorSliders">
          {{ t("color.reset") }}
        </button>
        <button class="btn-secondary" @click="editor.cancelColor">
          {{ t("color.cancel") }}
        </button>
        <button class="btn-primary" @click="editor.applyColor">
          {{ t("color.apply") }}
        </button>
      </div>
    </template>

    <!-- Text Panel -->
    <template v-else-if="tool === 'text'">
      <div class="panel-section">
        <div class="section-title">{{ t("text.title") }}</div>

        <!-- Text content -->
        <textarea
          class="text-input"
          :placeholder="t('text.placeholder')"
          v-model="editor.textContent"
          rows="3"
          spellcheck="false"
        />

        <!-- Font family -->
        <div class="field-row" style="margin-top: 12px">
          <label class="field-label">{{ t("text.font") }}</label>
          <select class="font-select" v-model="editor.textFont">
            <option
              v-for="f in systemFonts"
              :key="f"
              :value="f"
              :style="{ fontFamily: f }"
            >
              {{ f }}
            </option>
          </select>
        </div>

        <!-- Font size -->
        <div class="field-row">
          <label class="field-label">{{ t("text.size") }}</label>
          <div class="field-input-wrap">
            <input
              type="number"
              class="field-input"
              v-model.number="editor.textSize"
              min="8"
              max="400"
            />
            <span class="field-unit">px</span>
          </div>
        </div>

        <!-- Color -->
        <div class="field-row">
          <label class="field-label">{{ t("text.color") }}</label>
          <input type="color" class="color-pick" v-model="editor.textColor" />
        </div>

        <!-- Style toggles: B / I / U / S -->
        <div class="style-row">
          <button
            class="style-btn"
            :class="{ active: editor.textBold }"
            :title="t('text.bold')"
            @click="editor.textBold = !editor.textBold"
          >
            <strong>B</strong>
          </button>
          <button
            class="style-btn style-italic"
            :class="{ active: editor.textItalic }"
            :title="t('text.italic')"
            @click="editor.textItalic = !editor.textItalic"
          >
            <em>I</em>
          </button>
          <button
            class="style-btn"
            :class="{ active: editor.textUnderline }"
            :title="t('text.underline')"
            @click="editor.textUnderline = !editor.textUnderline"
          >
            <span class="style-u">U</span>
          </button>
          <button
            class="style-btn"
            :class="{ active: editor.textStrikethrough }"
            :title="t('text.strikethrough')"
            @click="editor.textStrikethrough = !editor.textStrikethrough"
          >
            <span class="style-s">S</span>
          </button>
        </div>

        <!-- Position hint -->
        <p class="hint-text hint-pos">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style="flex-shrink: 0"
          >
            <circle
              cx="6"
              cy="6"
              r="5"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <path
              d="M6 4v4M4 6h4"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
          {{ editor.textPos ? t("text.clickToMove") : t("text.clickHint") }}
        </p>
      </div>

      <div class="panel-actions">
        <button class="btn-secondary" @click="editor.cancelText">
          {{ t("text.cancel") }}
        </button>
        <button
          class="btn-primary"
          :disabled="!editor.textContent || !editor.textPos"
          @click="editor.applyText"
        >
          {{ t("text.apply") }}
        </button>
      </div>
    </template>

    <!-- Move / default panel -->
    <template v-else-if="tool === 'filter'">
      <div class="panel-section">
        <div class="section-title">{{ t("filter.title") }}</div>
        <div class="filter-grid">
          <button
            v-for="name in filterNames"
            :key="name"
            class="filter-btn"
            :class="{ active: editor.activeFilter === name }"
            @click="editor.applyFilterPreview(name)"
          >
            <div class="filter-thumb-wrap" :style="{ filter: filterCss[name] }">
              <img
                v-if="editor.filterThumbnail"
                :src="editor.filterThumbnail"
                class="filter-thumb-img"
                draggable="false"
              />
              <div v-else class="filter-thumb-placeholder" />
            </div>
            <span class="filter-name">{{ t("filter." + name) }}</span>
          </button>
        </div>
      </div>
      <div class="panel-actions">
        <button class="btn-secondary" @click="editor.cancelFilter">
          {{ t("filter.cancel") }}
        </button>
        <button class="btn-primary" @click="editor.applyFilter">
          {{ t("filter.apply") }}
        </button>
      </div>
    </template>

    <!-- Move / default panel -->
    <template v-else-if="tool === 'fill'">
      <div class="panel-section">
        <div class="section-title">{{ t("fill.title") }}</div>

        <!-- Mode toggle -->
        <div class="fill-mode-toggle">
          <button
            class="fill-mode-btn"
            :class="{ active: editor.fillMode === 'solid' }"
            @click="editor.fillMode = 'solid'"
          >
            {{ t("fill.solid") }}
          </button>
          <button
            class="fill-mode-btn"
            :class="{ active: editor.fillMode === 'gradient' }"
            @click="editor.fillMode = 'gradient'"
          >
            {{ t("fill.gradient") }}
          </button>
        </div>

        <!-- Solid -->
        <template v-if="editor.fillMode === 'solid'">
          <div class="field-row" style="margin-top: 12px">
            <label class="field-label">{{ t("fill.color") }}</label>
            <input type="color" class="color-pick" v-model="editor.fillColor" />
          </div>
          <div
            class="fill-solid-preview"
            :style="{ background: editor.fillColor }"
          />
        </template>

        <!-- Gradient -->
        <template v-else>
          <div class="field-row" style="margin-top: 12px">
            <label class="field-label">{{ t("fill.from") }}</label>
            <input
              type="color"
              class="color-pick"
              v-model="editor.fillColor1"
            />
          </div>
          <div class="field-row">
            <label class="field-label">{{ t("fill.to") }}</label>
            <input
              type="color"
              class="color-pick"
              v-model="editor.fillColor2"
            />
          </div>
          <div
            class="fill-grad-preview"
            :style="{
              background: `linear-gradient(${editor.fillAngle}deg, ${editor.fillColor1}, ${editor.fillColor2})`,
            }"
          />
          <div class="field-row">
            <label class="field-label">{{ t("fill.angle") }}</label>
            <div class="fill-angle-wrap">
              <div class="fill-dir-btns">
                <button
                  class="fill-dir-btn"
                  :class="{ active: editor.fillAngle === 90 }"
                  @click="editor.fillAngle = 90"
                >
                  →
                </button>
                <button
                  class="fill-dir-btn"
                  :class="{ active: editor.fillAngle === 180 }"
                  @click="editor.fillAngle = 180"
                >
                  ↓
                </button>
                <button
                  class="fill-dir-btn"
                  :class="{ active: editor.fillAngle === 135 }"
                  @click="editor.fillAngle = 135"
                >
                  ↘
                </button>
                <button
                  class="fill-dir-btn"
                  :class="{ active: editor.fillAngle === 45 }"
                  @click="editor.fillAngle = 45"
                >
                  ↗
                </button>
              </div>
              <div class="field-input-wrap">
                <input
                  type="number"
                  class="field-input"
                  v-model.number="editor.fillAngle"
                  min="0"
                  max="360"
                />
                <span class="field-unit">°</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="panel-actions">
        <button class="btn-primary btn-full" @click="editor.applyFill">
          {{ t("fill.apply") }}
        </button>
      </div>
    </template>

    <!-- Move / default panel -->
    <template v-else>
      <div class="panel-section empty-panel">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle
              cx="16"
              cy="16"
              r="13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-dasharray="3 2"
            />
            <path
              d="M16 10v6l3.5 3.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </div>
        <p>{{ t("move.hint") }}</p>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.right-panel {
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid var(--border);
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Aspect ratio grid */
.aspect-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.aspect-btn {
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  transition: all 0.12s;
}
.aspect-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-light);
}
.aspect-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}

/* Resize fields */
.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.field-label {
  font-size: 12.5px;
  color: var(--text-secondary);
}
.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 4px 8px;
}
.field-input {
  width: 64px;
  border: none;
  background: transparent;
  text-align: right;
  color: var(--text-primary);
  font-weight: 500;
}
.field-unit {
  font-size: 11px;
  color: var(--text-tertiary);
}

.constrain-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  margin-bottom: 4px;
}
.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12.5px;
  color: var(--text-secondary);
  user-select: none;
}
.toggle-check {
  display: none;
}
.toggle-box {
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: var(--border-strong);
  position: relative;
  transition: background 0.15s;
  flex-shrink: 0;
}
.toggle-box::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: white;
  transition: transform 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
.toggle-check:checked ~ .toggle-box {
  background: var(--accent);
}
.toggle-check:checked ~ .toggle-box::after {
  transform: translateX(14px);
}

/* Sliders */
.slider-row {
  margin-bottom: 14px;
}
.slider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.slider-label {
  display: block;
  font-size: 12.5px;
  color: var(--text-secondary);
}
.slider-ends {
  display: flex;
  justify-content: space-between;
  margin-top: 3px;
  font-size: 10.5px;
  color: var(--text-tertiary);
}
.slider-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slider {
  flex: 1;
  width: 100%;
  height: 4px;
  appearance: none;
  background: var(--bg-input);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 1px 4px rgba(78, 124, 246, 0.4);
  cursor: pointer;
  transition: transform 0.1s;
}
.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
.slider-temp {
  background: linear-gradient(to right, #a8c8f8, #e0e0e0 50%, #f8c8a0);
}
.slider-value {
  min-width: 32px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  transition: color 0.15s;
}
.slider-value.active {
  color: var(--accent);
  font-weight: 600;
}

/* Actions */
.panel-actions {
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  margin-top: auto;
}
.btn-primary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-weight: 500;
  font-size: 13px;
  transition:
    background 0.12s,
    opacity 0.12s;
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}
.btn-primary:disabled {
  opacity: 0.45;
  cursor: default;
}
.btn-full {
  width: 100%;
}

.btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-strong);
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 13px;
  transition:
    background 0.12s,
    color 0.12s;
}
.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.12s,
    color 0.12s;
}
.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}
.btn-sm {
  padding: 6px 10px;
  font-size: 12px;
}

/* Empty state */
.empty-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12.5px;
  padding: 40px 20px;
  border-bottom: none;
}
.empty-icon {
  color: var(--text-tertiary);
}

/* Spinner */
.spinner-sm {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Text tool ────────────────────────────────────────────────── */
.text-input {
  width: 100%;
  min-height: 72px;
  resize: vertical;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  transition: border-color 0.12s;
}
.text-input:focus {
  outline: none;
  border-color: var(--accent);
}

.font-select {
  font-size: 12px;
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  color: var(--text-primary);
  cursor: pointer;
  max-width: 148px;
}
.font-select:focus {
  outline: none;
  border-color: var(--accent);
}

.color-pick {
  width: 36px;
  height: 26px;
  padding: 2px 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: none;
  cursor: pointer;
}

.style-row {
  display: flex;
  gap: 6px;
  margin-top: 12px;
}
.style-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  color: var(--text-secondary);
  font-size: 14px;
  transition:
    border-color 0.12s,
    background 0.12s,
    color 0.12s;
}
.style-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.style-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: white;
}
.style-italic {
  font-style: italic;
}
.style-u {
  text-decoration: underline;
}
.style-s {
  text-decoration: line-through;
}

.hint-pos {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-top: 12px;
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* ── Filter panel ─────────────────────────────────────────────────────────── */
.filter-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 6px;
}

.filter-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 6px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  cursor: pointer;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.filter-btn:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}
.filter-btn.active {
  border-color: var(--accent);
  background: var(--bg-active);
}

.filter-thumb-wrap {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  background: #ddd;
}
.filter-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.filter-thumb-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #d0d0d8 0%, #b8b8c4 100%);
}

.filter-name {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: center;
  white-space: nowrap;
}

/* ── Fill panel ───────────────────────────────────────────────────────────── */
.fill-mode-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-top: 8px;
}
.fill-mode-btn {
  flex: 1;
  padding: 5px 0;
  font-size: 12px;
  font-family: inherit;
  border: none;
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.fill-mode-btn.active {
  background: var(--accent);
  color: #fff;
}

.fill-solid-preview {
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  margin-top: 10px;
}
.fill-grad-preview {
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  margin-top: 10px;
  margin-bottom: 4px;
}

.fill-angle-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.fill-dir-btns {
  display: flex;
  gap: 3px;
}
.fill-dir-btn {
  width: 26px;
  height: 26px;
  font-size: 13px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-input);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    border-color 0.12s,
    background 0.12s,
    color 0.12s;
}
.fill-dir-btn.active {
  border-color: var(--accent);
  background: var(--accent-light);
  color: var(--accent);
}
.fill-dir-btn:hover:not(.active) {
  border-color: var(--accent);
}
</style>
