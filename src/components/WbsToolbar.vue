<script setup>
import { ref } from 'vue';

const props = defineProps({
  search: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'all'
  },
  priority: {
    type: String,
    default: 'all'
  },
  onlyMilestone: {
    type: Boolean,
    default: false
  },
  currentView: {
    type: String,
    default: 'table' // 'table' | 'gantt'
  },
  activeLevel: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits([
  'update:search',
  'update:status',
  'update:priority',
  'update:onlyMilestone',
  'update:currentView',
  'expand-all',
  'collapse-all',
  'expand-to-level',
  'export-csv',
  'export-json',
  'add-root-task',
  'reset-data'
]);

function onSearchInput(e) {
  emit('update:search', e.target.value);
}

function clearSearch() {
  emit('update:search', '');
}
</script>

<template>
  <div class="wbs-toolbar">
    <!-- 上行：常用树展开控制与视图切换 -->
    <div class="toolbar-top-row">
      <div class="toolbar-group">
        <span class="group-label">结构展开：</span>
        <button class="btn btn-secondary btn-sm" @click="$emit('expand-all')" title="展开全部任务节点">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="7 13 12 18 17 13"></polyline>
            <polyline points="7 6 12 11 17 6"></polyline>
          </svg>
          展开全部
        </button>
        <button class="btn btn-secondary btn-sm" @click="$emit('collapse-all')" title="收起所有子任务">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="17 11 12 6 7 11"></polyline>
            <polyline points="17 18 12 13 7 18"></polyline>
          </svg>
          收起全部
        </button>

        <div class="level-btn-group">
          <button
            class="level-btn"
            :class="{ active: activeLevel === 1 }"
            @click="$emit('expand-to-level', 1)"
            title="只显示 1 级主阶段"
          >
            1级主阶段
          </button>
          <button
            class="level-btn"
            :class="{ active: activeLevel === 2 }"
            @click="$emit('expand-to-level', 2)"
            title="展开至 2 级子模块"
          >
            2级子模块
          </button>
          <button
            class="level-btn"
            :class="{ active: activeLevel === 3 }"
            @click="$emit('expand-to-level', 3)"
            title="展开至 3 级工作包"
          >
            3级工作包
          </button>
        </div>
      </div>

      <!-- 视图模式切换与导出 -->
      <div class="toolbar-group right-group">
        <!-- 视图切换 Segmented Control -->
        <div class="view-switch">
          <button
            class="view-btn"
            :class="{ active: currentView === 'table' }"
            @click="$emit('update:currentView', 'table')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="3" y1="15" x2="21" y2="15"></line>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            WBS 表格
          </button>
          <button
            class="view-btn"
            :class="{ active: currentView === 'gantt' }"
            @click="$emit('update:currentView', 'gantt')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="15" y2="6"></line>
              <line x1="7" y1="12" x2="21" y2="12"></line>
              <line x1="4" y1="18" x2="18" y2="18"></line>
            </svg>
            甘特进度图
          </button>
        </div>

        <!-- 导出与新增按钮 -->
        <button class="btn btn-secondary btn-sm" @click="$emit('export-csv')" title="导出为 CSV/Excel 文件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          导出 CSV
        </button>

        <button class="btn btn-secondary btn-sm" @click="$emit('export-json')" title="导出原始 JSON 树形数据">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          JSON
        </button>

        <button class="btn btn-primary btn-sm" @click="$emit('add-root-task')" title="新增一级主阶段">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          新增主阶段
        </button>
      </div>
    </div>

    <!-- 下行：搜索与多维度筛选过滤器 -->
    <div class="toolbar-bottom-row">
      <!-- 搜索框 -->
      <div class="search-box">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          :value="search"
          @input="onSearchInput"
          placeholder="搜索任务名、WBS编号、负责人、交付物..."
          class="search-input"
        />
        <button v-if="search" class="clear-btn" @click="clearSearch" title="清空搜索">
          ✕
        </button>
      </div>

      <!-- 状态筛选 -->
      <div class="filter-item">
        <span class="filter-label">状态:</span>
        <select
          :value="status"
          @change="$emit('update:status', $event.target.value)"
          class="filter-select"
        >
          <option value="all">全部状态</option>
          <option value="completed">已完成</option>
          <option value="in_progress">进行中</option>
          <option value="delayed">已延期</option>
          <option value="pending">未开始</option>
        </select>
      </div>

      <!-- 优先级筛选 -->
      <div class="filter-item">
        <span class="filter-label">优先级:</span>
        <select
          :value="priority"
          @change="$emit('update:priority', $event.target.value)"
          class="filter-select"
        >
          <option value="all">全部优先级</option>
          <option value="critical">紧急且关键</option>
          <option value="high">高优先级</option>
          <option value="medium">普通</option>
          <option value="low">低优先级</option>
        </select>
      </div>

      <!-- 里程碑过滤开关 -->
      <label class="milestone-toggle">
        <input
          type="checkbox"
          :checked="onlyMilestone"
          @change="$emit('update:onlyMilestone', $event.target.checked)"
        />
        <span class="toggle-star">★</span>
        <span class="toggle-text">仅看里程碑</span>
      </label>

      <!-- 重置按钮 -->
      <button class="reset-filter-btn" @click="$emit('reset-data')" title="恢复为默认的预设演示数据">
        重置为初始数据
      </button>
    </div>
  </div>
</template>

<style scoped>
.wbs-toolbar {
  background: #ffffff;
  border-bottom: 1px solid var(--border-color);
  padding: 10px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.right-group {
  margin-left: auto;
}

.group-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

/* 分级快速展开按钮 */
.level-btn-group {
  display: inline-flex;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  overflow: hidden;
  margin-left: 6px;
}

.level-btn {
  background: #ffffff;
  border: none;
  border-right: 1px solid #cbd5e1;
  padding: 4px 10px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.level-btn:last-child {
  border-right: none;
}

.level-btn:hover {
  background-color: #f8fafc;
  color: #0f172a;
}

.level-btn.active {
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

/* 视图切换按钮 */
.view-switch {
  display: inline-flex;
  background-color: #f1f5f9;
  padding: 3px;
  border-radius: 8px;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.view-btn.active {
  background-color: #ffffff;
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

/* 下行筛选栏 */
.toolbar-bottom-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding-top: 4px;
}

/* 搜索框 */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 240px;
  max-width: 380px;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 32px;
  padding: 0 28px 0 32px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
}
.clear-btn:hover { color: #475569; }

/* 下拉筛选 */
.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: #64748b;
}

.filter-select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 12px;
  color: #334155;
  background-color: #ffffff;
  outline: none;
  cursor: pointer;
}
.filter-select:focus {
  border-color: #2563eb;
}

/* 里程碑复选框 */
.milestone-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 12px;
  color: #475569;
  user-select: none;
  padding: 4px 8px;
  border-radius: 6px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

.milestone-toggle:hover {
  background-color: #f1f5f9;
}

.toggle-star {
  color: #f59e0b;
  font-size: 14px;
}

.reset-filter-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #64748b;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}
.reset-filter-btn:hover {
  color: #2563eb;
}
</style>
