<script setup>
import { inject } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const editor = inject("editor");

const tools = [
  {
    id: "move",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2v14M2 9h14M9 2L6.5 4.5M9 2l2.5 2.5M9 16l-2.5-2.5M9 16l2.5-2.5M2 9l2.5-2.5M2 9l2.5 2.5M16 9l-2.5-2.5M16 9l-2.5 2.5"
        stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "crop",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 2v10a1 1 0 001 1h10M14 16V6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M2 4h2M16 13h-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <rect x="5" y="5" width="8" height="8" rx="0.5" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 1.5"/>
    </svg>`,
  },
  {
    id: "bg",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" fill="#d0d0e0" rx="1"/>
      <rect x="10" y="2" width="6" height="6" fill="white" rx="1" stroke="var(--border-strong)" stroke-width="0.8"/>
      <rect x="2" y="10" width="6" height="6" fill="white" rx="1" stroke="var(--border-strong)" stroke-width="0.8"/>
      <rect x="10" y="10" width="6" height="6" fill="#d0d0e0" rx="1"/>
      <circle cx="13" cy="13" r="4" fill="white" stroke="currentColor" stroke-width="1.3"/>
      <path d="M11.2 13l1.2 1.2 2.4-2.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: "resize",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" stroke-width="1.4"/>
      <path d="M14 10v4M10 14h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M13 10l3 3M10 13l3 3" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="1.5 1"/>
    </svg>`,
  },
  {
    id: "spot",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="5" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="9" cy="9" r="2" fill="currentColor" opacity="0.35"/>
      <path d="M9 4V2M9 16v-2M4 9H2M16 9h-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "color",
    icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.4"/>
      <path d="M9 2v14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>
      <path d="M9 2a7 7 0 010 14" fill="currentColor" opacity="0.12"/>
      <circle cx="6" cy="6.5" r="1.4" fill="currentColor" opacity="0.7"/>
      <circle cx="12" cy="6.5" r="1.4" fill="currentColor" opacity="0.7"/>
      <circle cx="9" cy="12" r="1.4" fill="currentColor" opacity="0.7"/>
    </svg>`,
  },
];
</script>

<template>
  <aside class="sidebar">
    <nav class="tool-list">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="tool-btn"
        :class="{ active: editor.currentTool === tool.id }"
        :disabled="!editor.hasImage && tool.id !== 'move'"
        :title="t('tools.' + tool.id)"
        @click="editor.setTool(tool.id)"
      >
        <span class="tool-icon" v-html="tool.icon" />
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 10px 0;
  z-index: 10;
}

.tool-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition:
    background 0.12s,
    color 0.12s;
  position: relative;
}

.tool-btn:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tool-btn.active {
  background: var(--accent-light);
  color: var(--accent);
}

.tool-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
