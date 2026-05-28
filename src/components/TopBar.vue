<script setup>
import { inject, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const editor = inject("editor");
const fileInput = ref(null);

function openFile() {
  fileInput.value.click();
}

function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) editor.loadFile(file);
  e.target.value = "";
}

function zoomStep(dir) {
  const steps = [
    0.1, 0.15, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 6, 8,
  ];
  const cur = editor.zoom;
  if (dir > 0) {
    const next = steps.find((s) => s > cur + 0.001);
    if (next) editor.setZoom(next);
  } else {
    const prev = [...steps].reverse().find((s) => s < cur - 0.001);
    if (prev) editor.setZoom(prev);
  }
}

function fitZoom() {
  editor.setZoom(1);
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-name">Imago</span>
      </div>
    </div>

    <div class="topbar-center">
      <template v-if="editor.hasImage">
        <div class="zoom-control">
          <button
            class="icon-btn"
            @click="zoomStep(-1)"
            :disabled="editor.zoom <= 0.1"
            :title="t('topbar.zoomOut')"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7h10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            class="zoom-value"
            @click="fitZoom"
            :title="t('topbar.resetZoom')"
          >
            {{ Math.round(editor.zoom * 100) }}%
          </button>
          <button
            class="icon-btn"
            @click="zoomStep(1)"
            :disabled="editor.zoom >= 8"
            :title="t('topbar.zoomIn')"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 2v10M2 7h10"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </template>
    </div>

    <div class="topbar-right">
      <div class="history-btns" v-if="editor.hasImage">
        <button
          class="icon-btn"
          @click="editor.performUndo"
          :disabled="!editor.canUndo"
          :title="t('topbar.undo')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3.5 6H9a4 4 0 010 8H5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3.5 6L6 3.5M3.5 6L6 8.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        <button
          class="icon-btn"
          @click="editor.performRedo"
          :disabled="!editor.canRedo"
          :title="t('topbar.redo')"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M12.5 6H7a4 4 0 000 8h4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12.5 6L10 3.5M12.5 6L10 8.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <div class="divider" v-if="editor.hasImage" />

      <button class="btn-ghost" @click="openFile">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1.5 3.5h3L6 2h6a.5.5 0 01.5.5v9a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-8z"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linejoin="round"
          />
        </svg>
        {{ t("topbar.open") }}
      </button>

      <button
        v-if="editor.hasImage"
        class="btn-accent"
        @click="editor.openExport"
      >
        {{ t("topbar.export") }}
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        style="display: none"
        @change="onFileSelected"
      />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  height: var(--topbar-h);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  z-index: 100;
}

.topbar-left {
  display: flex;
  align-items: center;
  min-width: 120px;
}
.topbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  justify-content: flex-end;
}

.logo {
  display: flex;
  align-items: center;
  gap: 7px;
  user-select: none;
}
.logo-icon {
  font-size: 18px;
  color: var(--accent);
  line-height: 1;
}
.logo-name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text-primary);
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  padding: 2px;
}
.zoom-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 3px 8px;
  border-radius: 5px;
  min-width: 46px;
  text-align: center;
  transition: background 0.12s;
}
.zoom-value:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-xs);
  color: var(--text-secondary);
  transition:
    background 0.12s,
    color 0.12s;
}
.icon-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.history-btns {
  display: flex;
  align-items: center;
  gap: 2px;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border-strong);
}

.btn-ghost {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-weight: 500;
  transition:
    background 0.12s,
    color 0.12s;
}
.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.btn-accent {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  background: var(--accent);
  color: white;
  font-weight: 500;
  transition:
    background 0.12s,
    opacity 0.12s;
}
.btn-accent:hover {
  background: var(--accent-hover);
}
</style>
