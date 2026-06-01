<script setup>
import { inject, computed, ref, nextTick } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const editor = inject("editor");

// Inline rename state
const editingId = ref(null);
const editingName = ref("");

function startRename(layer) {
  editingId.value = layer.id;
  editingName.value = layer.name;
  nextTick(() => {
    document.getElementById("layer-rename-" + layer.id)?.select();
  });
}

function commitRename() {
  if (editingId.value !== null) {
    editor.renameLayer(editingId.value, editingName.value);
    editingId.value = null;
  }
}

function onRenameKeydown(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.target.blur(); // blur triggers commitRename
  } else if (e.key === "Escape") {
    editingId.value = null; // hide without saving; blur will fire but editingId is null → no-op
  }
}

// Display reversed: top of list = top render layer (highest index)
const reversedLayers = computed(() => [...(editor.layers ?? [])].reverse());

// Generate thumbnails reactively — re-runs when layer.version or layer.canvas changes
const thumbUrls = computed(() => {
  const SIZE = 40;
  const result = {};
  for (const layer of editor.layers ?? []) {
    const _v = layer.version; // track version so thumbnail refreshes after pixel ops
    const tmp = document.createElement("canvas");
    tmp.width = SIZE;
    tmp.height = SIZE;
    const ctx = tmp.getContext("2d");
    const cw = layer.canvas.width;
    const ch = layer.canvas.height;
    if (cw > 0 && ch > 0) {
      const scale = Math.min(SIZE / cw, SIZE / ch);
      const w = cw * scale;
      const h = ch * scale;
      ctx.drawImage(layer.canvas, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    }
    result[layer.id] = tmp.toDataURL();
  }
  return result;
});

const canMoveUp = computed(() => {
  const arr = editor.layers ?? [];
  const idx = arr.findIndex((l) => l.id === editor.activeId);
  return idx >= 0 && idx < arr.length - 1;
});

const canMoveDown = computed(() => {
  const arr = editor.layers ?? [];
  const idx = arr.findIndex((l) => l.id === editor.activeId);
  return idx > 0;
});
</script>

<template>
  <aside class="layers-panel">
    <!-- Header -->
    <div class="layers-header">
      <span class="layers-title">{{ t("layers.title") }}</span>
      <div class="layers-toolbar">
        <button
          class="lbtn"
          :title="t('layers.moveUp')"
          :disabled="!canMoveUp"
          @click="editor.moveActiveLayerUp()"
        >
          <!-- Arrow up -->
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2L1 9h10L6 2z" fill="currentColor" />
          </svg>
        </button>
        <button
          class="lbtn"
          :title="t('layers.moveDown')"
          :disabled="!canMoveDown"
          @click="editor.moveActiveLayerDown()"
        >
          <!-- Arrow down -->
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 10L1 3h10l-5 7z" fill="currentColor" />
          </svg>
        </button>
        <button
          class="lbtn"
          :title="t('layers.add')"
          @click="editor.addLayer()"
        >
          <!-- Plus -->
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          class="lbtn danger"
          :title="t('layers.remove')"
          :disabled="(editor.layers ?? []).length <= 1"
          @click="editor.removeActiveLayer()"
        >
          <!-- Minus / trash -->
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 6h10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Layer list (top layer at top of list) -->
    <div class="layers-list">
      <div
        v-for="layer in reversedLayers"
        :key="layer.id"
        class="layer-item"
        :class="{
          active: layer.id === editor.activeId,
          locked: layer.locked,
          invisible: !layer.visible,
        }"
        @click="editor.setActiveLayer(layer.id)"
      >
        <!-- Visibility toggle -->
        <button
          class="icon-btn"
          :class="{ dimmed: !layer.visible }"
          :title="layer.visible ? t('layers.hide') : t('layers.show')"
          @click.stop="editor.toggleLayerVisible(layer.id)"
        >
          <!-- Eye open -->
          <svg
            v-if="layer.visible"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
              stroke="currentColor"
              stroke-width="2"
            />
            <circle
              cx="12"
              cy="12"
              r="3"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <!-- Eye closed -->
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path
              d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <line
              x1="1"
              y1="1"
              x2="23"
              y2="23"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <!-- Lock toggle -->
        <button
          class="icon-btn"
          :class="{ accent: layer.locked }"
          :title="layer.locked ? t('layers.unlock') : t('layers.lock')"
          @click.stop="editor.toggleLayerLock(layer.id)"
        >
          <!-- Lock closed -->
          <svg
            v-if="layer.locked"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M7 11V7a5 5 0 0110 0v4"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <!-- Lock open -->
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="11"
              width="18"
              height="11"
              rx="2"
              stroke="currentColor"
              stroke-width="2"
            />
            <path
              d="M7 11V7a5 5 0 0110 0"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="4 3"
            />
          </svg>
        </button>

        <!-- Thumbnail -->
        <div class="layer-thumb-wrap">
          <img
            :src="thumbUrls[layer.id]"
            class="layer-thumb"
            alt=""
            draggable="false"
          />
          <span v-if="layer.type === 'text'" class="layer-type-badge">T</span>
        </div>

        <!-- Name -->
        <input
          v-if="editingId === layer.id"
          :id="'layer-rename-' + layer.id"
          class="layer-name-input"
          v-model="editingName"
          @blur="commitRename"
          @keydown="onRenameKeydown"
          @click.stop
        />
        <span
          v-else
          class="layer-name"
          :title="layer.name"
          @dblclick.stop="startRename(layer)"
          >{{ layer.name }}</span
        >
      </div>
    </div>
  </aside>
</template>

<style scoped>
.layers-panel {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 220px;
  flex-shrink: 0;
  overflow: hidden;
}

.layers-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.layers-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-tertiary);
  user-select: none;
}

.layers-toolbar {
  display: flex;
  gap: 2px;
}

.lbtn {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.12s,
    color 0.12s;
}
.lbtn:hover:not(:disabled) {
  background: var(--bg-app);
  color: var(--text-primary);
}
.lbtn:disabled {
  opacity: 0.3;
  cursor: default;
}
.lbtn.danger:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.layers-list {
  flex: 1;
  overflow-y: auto;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
  min-height: 46px;
  box-sizing: border-box;
}
.layer-item:hover {
  background: var(--bg-app);
}
.layer-item.active {
  background: var(--accent-light);
}
.layer-item.invisible {
  opacity: 0.45;
}

.icon-btn {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 3px;
  transition:
    color 0.12s,
    background 0.12s;
}
.icon-btn:hover {
  background: var(--bg-app);
  color: var(--text-primary);
}
.icon-btn.dimmed {
  opacity: 0.35;
}
.icon-btn.accent {
  color: var(--accent);
}

.layer-thumb-wrap {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--border);
  position: relative;
  /* Checkerboard for transparency */
  background-image:
    linear-gradient(45deg, #e0e0e8 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e8 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e8 75%);
  background-size: 8px 8px;
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0px;
  background-color: #f8f8f8;
}

.layer-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.layer-type-badge {
  position: absolute;
  bottom: 1px;
  right: 1px;
  font-size: 7px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: var(--accent);
  border-radius: 2px;
  padding: 1px 2px;
  pointer-events: none;
  user-select: none;
}

.layer-name {
  font-size: 12px;
  color: var(--text-primary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  user-select: none;
}
.layer-item.locked .layer-name {
  color: var(--text-tertiary);
}

.layer-name-input {
  font-size: 12px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--accent);
  border-radius: var(--radius-xs);
  outline: none;
  padding: 0 4px;
  height: 20px;
  flex: 1;
  min-width: 0;
}
</style>
