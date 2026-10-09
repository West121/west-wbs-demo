<script setup>
import { computed } from 'vue';
import { STATUS_MAP, PRIORITY_MAP, formatCurrency } from '../utils/wbsHelper';

const props = defineProps({
  flatData: {
    type: Array,
    required: true
  },
  searchKeyword: {
    type: String,
    default: ''
  }
});

const emit = defineEmits([
  'toggle-expand',
  'edit-task',
  'add-child-task',
  'delete-task'
]);

// 过滤仅可见行
const visibleRows = computed(() => {
  return props.flatData.filter(row => row.isVisible);
});

// 头像颜色算法
const avatarColors = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#4f46e5'
];

function getAvatarColor(name) {
  if (!name) return '#94a3b8';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// 关键词高亮
function highlightText(text, keyword) {
  if (!keyword || !keyword.trim() || !text) return text;
  const regex = new RegExp(`(${keyword.trim()})`, 'gi');
  return String(text).replace(regex, '<mark class="search-highlight">$1</mark>');
}

// 获取状态对应样式
function getStatusStyle(status) {
  return STATUS_MAP[status] || STATUS_MAP.pending;
}

// 获取优先级样式
function getPriorityInfo(priority) {
  return PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
}
</script>

<template>
  <div class="wbs-table-wrapper">
    <div class="table-scroll-container">
      <table class="wbs-table">
        <thead>
          <tr>
            <th class="col-code">WBS 编码</th>
            <th class="col-name">工作分解结构任务项 / 成果物</th>
            <th class="col-level">层级</th>
            <th class="col-status">当前状态</th>
            <th class="col-progress">进度</th>
            <th class="col-owner">责任人 / 部门</th>
            <th class="col-schedule">计划工期与起止</th>
            <th class="col-priority">优先级</th>
            <th class="col-cost">预算 / 实际</th>
            <th class="col-actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in visibleRows"
            :key="row.id"
            class="wbs-row"
            :class="{
              'row-level-1': row.level === 1,
              'row-level-2': row.level === 2,
              'row-level-3': row.level === 3,
              'row-milestone': row.isMilestone,
              'row-delayed': row.status === 'delayed',
              'row-matched': row.isMatched
            }"
          >
            <!-- WBS 编码 -->
            <td class="col-code">
              <span class="code-badge" :class="`code-level-${row.level}`">
                {{ row.code }}
              </span>
            </td>

            <!-- 任务名称 + 树形缩进与折叠按钮 -->
            <td class="col-name">
              <div
                class="tree-node-content"
                :style="{ paddingLeft: `${(row.level - 1) * 24}px` }"
              >
                <!-- 展开/折叠按钮 -->
                <button
                  v-if="row.hasChildren"
                  class="expand-icon-btn"
                  @click.stop="$emit('toggle-expand', row.id)"
                  :title="row.isExpanded ? '收起子任务' : '展开子任务'"
                >
                  <svg
                    class="chevron-icon"
                    :class="{ expanded: row.isExpanded }"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
                <span v-else class="tree-leaf-placeholder">
                  <span v-if="row.isMilestone" class="milestone-star" title="战略里程碑">★</span>
                  <span v-else class="tree-bullet">●</span>
                </span>

                <!-- 任务主体 -->
                <div class="task-info-block">
                  <div class="task-name-line">
                    <span
                      class="task-name-text"
                      :class="{ 'font-bold': row.level <= 2 }"
                      v-html="highlightText(row.name, searchKeyword)"
                      @click="$emit('edit-task', row)"
                    ></span>

                    <span v-if="row.isMilestone" class="milestone-pill" title="关键节点里程碑">
                      里程碑
                    </span>
                  </div>

                  <!-- 成果物交付物辅助说明 -->
                  <div v-if="row.deliverable" class="task-deliverable" title="交付物">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span v-html="highlightText(row.deliverable, searchKeyword)"></span>
                  </div>
                </div>
              </div>
            </td>

            <!-- 层级 -->
            <td class="col-level">
              <span class="badge" :class="`badge-level-${row.level}`">
                {{ row.level === 1 ? '阶段' : row.level === 2 ? '模块' : '任务' }}
              </span>
            </td>

            <!-- 当前状态 -->
            <td class="col-status">
              <span
                class="status-pill"
                :style="{
                  color: getStatusStyle(row.status).color,
                  backgroundColor: getStatusStyle(row.status).bg,
                  borderColor: getStatusStyle(row.status).border
                }"
              >
                <span
                  class="status-dot"
                  :style="{ backgroundColor: getStatusStyle(row.status).color }"
                ></span>
                {{ getStatusStyle(row.status).label }}
              </span>
            </td>

            <!-- 进度 -->
            <td class="col-progress">
              <div class="progress-cell">
                <div class="progress-bar-container">
                  <div
                    class="progress-bar-fill"
                    :class="{
                      'fill-completed': row.progress === 100,
                      'fill-delayed': row.status === 'delayed'
                    }"
                    :style="{ width: `${row.progress}%` }"
                  ></div>
                </div>
                <span class="progress-number" :class="{ 'text-emerald': row.progress === 100 }">
                  {{ row.progress }}%
                </span>
              </div>
            </td>

            <!-- 责任人 / 部门 -->
            <td class="col-owner">
              <div class="owner-cell">
                <div
                  class="avatar-circle"
                  :style="{ backgroundColor: getAvatarColor(row.owner) }"
                  :title="`${row.owner} (${row.ownerRole || '成员'}) - ${row.department}`"
                >
                  {{ (row.owner || '?').slice(0, 1) }}
                </div>
                <div class="owner-info">
                  <div class="owner-name" v-html="highlightText(row.owner, searchKeyword)"></div>
                  <div class="owner-dept">{{ row.department }}</div>
                </div>
              </div>
            </td>

            <!-- 计划工期与起止 -->
            <td class="col-schedule">
              <div class="schedule-cell">
                <div class="schedule-dates">
                  {{ row.startDate.slice(5) }} → {{ row.endDate.slice(5) }}
                </div>
                <div class="schedule-duration">
                  工期：<strong>{{ row.duration }}</strong> 天
                </div>
              </div>
            </td>

            <!-- 优先级 -->
            <td class="col-priority">
              <span
                class="priority-tag"
                :class="row.priority"
                :style="{ color: getPriorityInfo(row.priority).text }"
              >
                {{ getPriorityInfo(row.priority).label }}
              </span>
            </td>

            <!-- 预算 / 实际 -->
            <td class="col-cost">
              <div class="cost-cell">
                <div class="cost-budget">{{ formatCurrency(row.budget) }}</div>
                <div class="cost-actual" :class="{ overbudget: row.actualCost > row.budget }">
                  实: {{ formatCurrency(row.actualCost) }}
                </div>
              </div>
            </td>

            <!-- 操作动作按钮 -->
            <td class="col-actions">
              <div class="action-btn-group">
                <button
                  class="action-btn"
                  @click.stop="$emit('add-child-task', row)"
                  title="在此节点下添加子任务"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
                <button
                  class="action-btn"
                  @click.stop="$emit('edit-task', row)"
                  title="查看或编辑任务详情"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  class="action-btn delete-btn"
                  @click.stop="$emit('delete-task', row)"
                  title="删除此任务及所有子项"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>

          <!-- 空数据状态 -->
          <tr v-if="visibleRows.length === 0">
            <td colspan="10" class="empty-cell">
              <div class="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <div class="empty-title">未匹配到符合条件的 WBS 任务</div>
                <div class="empty-desc">尝试调整筛选条件或搜索关键词</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.wbs-table-wrapper {
  background: #ffffff;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-scroll-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}

.wbs-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
  font-size: 13px;
  min-width: 1200px;
}

thead {
  position: sticky;
  top: 0;
  z-index: 20;
}

thead th {
  background-color: #f8fafc;
  border-bottom: 2px solid #cbd5e1;
  box-shadow: inset 0 -1px 0 #cbd5e1;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background-color: #f8fafc;
}

/* 一级主阶段样式加重 */
.row-level-1 {
  background-color: #ffffff;
  font-weight: 600;
  border-top: 1px solid #e2e8f0;
}
.row-level-1 td {
  padding-top: 14px;
  padding-bottom: 14px;
}

/* 二级模块 */
.row-level-2 {
  background-color: #fafbfc;
}

/* 里程碑行特别标识 */
.row-milestone {
  background-color: #fffdf5 !important;
}

.row-delayed {
  background-color: #fffbfa;
}

/* 单元格尺寸与间距 */
td {
  padding: 10px 14px;
  vertical-align: middle;
}

/* WBS 编码徽章 */
.code-badge {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #334155;
}

.code-level-1 {
  background-color: #dbeafe;
  color: #1e40af;
  font-weight: 700;
}
.code-level-2 {
  background-color: #ede9fe;
  color: #5b21b6;
}

/* 树节点内容 */
.tree-node-content {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.expand-icon-btn {
  background: none;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #475569;
  margin-top: 2px;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.expand-icon-btn:hover {
  border-color: #2563eb;
  color: #2563eb;
  background-color: #eff6ff;
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.chevron-icon.expanded {
  transform: rotate(90deg);
}

.tree-leaf-placeholder {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.tree-bullet {
  font-size: 6px;
  color: #94a3b8;
}

.milestone-star {
  color: #f59e0b;
  font-size: 14px;
}

.task-info-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.task-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-name-text {
  color: #0f172a;
  cursor: pointer;
  line-height: 1.4;
}

.task-name-text:hover {
  color: #2563eb;
  text-decoration: underline;
}

.milestone-pill {
  font-size: 10px;
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.task-deliverable {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 状态药丸 */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* 进度条 */
.progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 100px;
}

.progress-bar-container {
  flex: 1;
  height: 7px;
  background-color: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: #2563eb;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.fill-completed {
  background-color: #10b981;
}

.fill-delayed {
  background-color: #ef4444;
}

.progress-number {
  font-size: 11px;
  font-weight: 600;
  color: #475569;
  width: 32px;
  text-align: right;
}

.text-emerald {
  color: #059669;
}

/* 负责人单元格 */
.owner-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.owner-info {
  display: flex;
  flex-direction: column;
}

.owner-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.2;
}

.owner-dept {
  font-size: 10px;
  color: #64748b;
}

/* 工期时间单元格 */
.schedule-cell {
  display: flex;
  flex-direction: column;
  font-size: 11px;
}

.schedule-dates {
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.schedule-duration {
  color: #64748b;
}

/* 优先级 */
.priority-tag {
  font-size: 11px;
  font-weight: 600;
}

/* 成本 */
.cost-cell {
  display: flex;
  flex-direction: column;
  font-size: 11px;
}

.cost-budget {
  font-weight: 600;
  color: #1e293b;
}

.cost-actual {
  color: #64748b;
}

.cost-actual.overbudget {
  color: #ef4444;
  font-weight: 600;
}

/* 操作列按钮组 */
.action-btn-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background-color: #f1f5f9;
  color: #2563eb;
  border-color: #cbd5e1;
}

.action-btn.delete-btn:hover {
  background-color: #fef2f2;
  color: #ef4444;
  border-color: #fecaca;
}

/* 空状态 */
.empty-cell {
  padding: 60px 20px;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #475569;
}

.empty-desc {
  font-size: 13px;
  color: #94a3b8;
}

/* 搜索高亮 */
:deep(.search-highlight) {
  background-color: #fef08a;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
