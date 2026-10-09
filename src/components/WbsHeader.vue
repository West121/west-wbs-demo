<script setup>
import { ref } from 'vue';
import { formatCurrency } from '../utils/wbsHelper';

const props = defineProps({
  projectInfo: {
    type: Object,
    required: true
  },
  stats: {
    type: Object,
    required: true
  }
});

const isCollapsed = ref(false);

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <header class="wbs-header-container">
    <!-- 项目主要信息横幅 -->
    <div class="project-banner">
      <div class="banner-left">
        <div class="project-tag-row">
          <span class="project-code-badge">{{ projectInfo.code }}</span>
          <span class="project-version-badge">{{ projectInfo.version }}</span>
          <span class="project-sponsor">发起方：{{ projectInfo.sponsor }}</span>
        </div>
        <div class="title-row">
          <h1 class="project-title">{{ projectInfo.name }}</h1>
          <!-- 紧凑概括指标 -->
          <div class="quick-stats-badge">
            <span class="quick-pill success">完成度 {{ stats.overallProgress }}%</span>
            <span class="quick-pill info">任务 {{ stats.totalTasks }} 项</span>
            <span class="quick-pill amber">里程碑 {{ stats.milestoneCompleted }}/{{ stats.milestoneTotal }}</span>
          </div>
        </div>
        <div class="meta-row">
          <div class="meta-item">
            <span class="meta-label">项目总监：</span>
            <span class="meta-val font-semibold">{{ projectInfo.manager }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">计划周期：</span>
            <span class="meta-val">{{ projectInfo.period }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">项目核定预算：</span>
            <span class="meta-val highlight-val">{{ formatCurrency(projectInfo.totalBudget) }}</span>
          </div>
        </div>
      </div>

      <div class="banner-right">
        <!-- 切换折叠大指标卡片的按钮 -->
        <button class="toggle-dashboard-btn" @click="toggleCollapse" :title="isCollapsed ? '展开指标看板' : '收起看板腾出表格高度'">
          <svg
            class="chevron-arrow"
            :class="{ collapsed: isCollapsed }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span>{{ isCollapsed ? '展开看板' : '收起看板' }}</span>
        </button>

        <!-- 整体大进度圆环/仪表 -->
        <div v-show="!isCollapsed" class="progress-ring-card">
          <div class="progress-ring-wrapper">
            <svg class="ring-svg" viewBox="0 0 100 100">
              <circle
                class="ring-bg"
                cx="50"
                cy="50"
                r="42"
                stroke-width="8"
                fill="none"
              />
              <circle
                class="ring-fill"
                cx="50"
                cy="50"
                r="42"
                stroke-width="8"
                fill="none"
                :stroke-dasharray="264"
                :stroke-dashoffset="264 - (264 * stats.overallProgress) / 100"
              />
            </svg>
            <div class="ring-text">
              <span class="ring-number">{{ stats.overallProgress }}%</span>
              <span class="ring-sub">综合进度</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 核心 KPI 统计卡片 (支持展开/折叠) -->
    <div v-show="!isCollapsed" class="kpi-grid">
      <!-- 卡片1: 任务整体规模 -->
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-title">工作包与任务总数</span>
          <span class="kpi-icon-badge blue">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </span>
        </div>
        <div class="kpi-number">{{ stats.totalTasks }} <span class="unit">个任务</span></div>
        <div class="kpi-meta-split">
          <span class="text-success">已完成 {{ stats.completedTasks }}</span>
          <span class="divider">/</span>
          <span class="text-primary">进行中 {{ stats.inProgressTasks }}</span>
          <span class="divider">/</span>
          <span class="text-danger">延期 {{ stats.delayedTasks }}</span>
        </div>
      </div>

      <!-- 卡片2: 关键里程碑达成 -->
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-title">战略核心里程碑</span>
          <span class="kpi-icon-badge amber">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </span>
        </div>
        <div class="kpi-number">
          {{ stats.milestoneCompleted }} <span class="unit">/ {{ stats.milestoneTotal }} 已达成</span>
        </div>
        <div class="kpi-progress-bar">
          <div
            class="kpi-bar-fill amber-bar"
            :style="{ width: stats.milestoneTotal ? `${(stats.milestoneCompleted / stats.milestoneTotal) * 100}%` : '0%' }"
          ></div>
        </div>
      </div>

      <!-- 卡片3: 预算执行情况 -->
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-title">预算消耗与执行率</span>
          <span class="kpi-icon-badge emerald">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </span>
        </div>
        <div class="kpi-number">{{ formatCurrency(stats.totalActualCost) }}</div>
        <div class="kpi-meta-split">
          <span>总概算 {{ formatCurrency(stats.totalBudget) }}</span>
          <span class="badge-usage" :class="stats.budgetUtilization > 90 ? 'danger' : 'normal'">
            消耗 {{ stats.budgetUtilization }}%
          </span>
        </div>
      </div>

      <!-- 卡片4: 计划工期总量 -->
      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-title">计划工期总量</span>
          <span class="kpi-icon-badge indigo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </span>
        </div>
        <div class="kpi-number">{{ stats.totalDurationDays }} <span class="unit">人天</span></div>
        <div class="kpi-meta-split">
          <span class="text-muted">待启动 {{ stats.pendingTasks }} 项</span>
          <span class="tag-status-ok">健康度受控</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.wbs-header-container {
  background: #ffffff;
  border-bottom: 1px solid var(--border-color);
  padding: 14px 24px;
  flex-shrink: 0; /* 防止被 flex 挤压 */
  transition: all 0.2s ease;
}

.project-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.project-tag-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.project-code-badge {
  background-color: #2563eb;
  color: #ffffff;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.project-version-badge {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.project-sponsor {
  font-size: 11px;
  color: var(--text-muted);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.project-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.01em;
}

.quick-stats-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.quick-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 9999px;
}
.quick-pill.success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.quick-pill.info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.quick-pill.amber { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }

.meta-row {
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

.meta-label {
  color: #64748b;
}

.meta-val {
  color: #1e293b;
}

.highlight-val {
  color: #2563eb;
  font-weight: 600;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toggle-dashboard-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toggle-dashboard-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.chevron-arrow {
  transition: transform 0.2s ease;
}
.chevron-arrow.collapsed {
  transform: rotate(180deg);
}

/* 进度圆环 */
.progress-ring-card {
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  padding: 6px 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.progress-ring-wrapper {
  position: relative;
  width: 58px;
  height: 58px;
}

.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  stroke: #e2e8f0;
}

.ring-fill {
  stroke: #2563eb;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease;
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.ring-number {
  font-size: 13px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.ring-sub {
  font-size: 8px;
  color: #64748b;
  transform: scale(0.85);
}

/* KPI 卡片组 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 12px;
  animation: fadeIn 0.2s ease;
}

.kpi-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.kpi-title {
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
}

.kpi-icon-badge {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.kpi-icon-badge.blue { background-color: #eff6ff; color: #2563eb; }
.kpi-icon-badge.amber { background-color: #fffbeb; color: #d97706; }
.kpi-icon-badge.emerald { background-color: #ecfdf5; color: #059669; }
.kpi-icon-badge.indigo { background-color: #eef2ff; color: #4f46e5; }

.kpi-number {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  margin-bottom: 4px;
}

.kpi-number .unit {
  font-size: 11px;
  font-weight: normal;
  color: #64748b;
}

.kpi-meta-split {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.text-success { color: #10b981; font-weight: 600; }
.text-primary { color: #3b82f6; font-weight: 600; }
.text-danger { color: #ef4444; font-weight: 600; }
.divider { color: #cbd5e1; }

.kpi-progress-bar {
  width: 100%;
  height: 5px;
  background-color: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
  margin-top: 4px;
}

.amber-bar {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  height: 100%;
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.badge-usage {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
}
.badge-usage.normal { background: #eff6ff; color: #1d4ed8; }
.badge-usage.danger { background: #fef2f2; color: #b91c1c; }

.tag-status-ok {
  background: #ecfdf5;
  color: #047857;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
}
</style>
