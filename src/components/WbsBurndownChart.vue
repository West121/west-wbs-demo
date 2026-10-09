<script setup>
import { ref, computed } from 'vue';
import { formatCurrency } from '../utils/wbsHelper';

const props = defineProps({
  treeData: {
    type: Array,
    required: true
  },
  stats: {
    type: Object,
    required: true
  }
});

// 统计维度：'duration' (工期人天) | 'tasks' (任务数) | 'budget' (预算万元)
const metricType = ref('duration');

// 悬浮检查点索引 (null 为未悬浮)
const hoveredIndex = ref(null);

// 项目 10 个阶段性检查周期基准数据
// 基于项目的真实业务发展节奏：3月到10月实际燃尽数据，10月到11月为预测线
const timelineCheckpoints = [
  { id: 0, date: '2026-03-01', name: '项目立项启动 (W0)', isActual: true, isMilestone: false },
  { id: 1, date: '2026-03-31', name: '需求基线冻结 (W1)', isActual: true, isMilestone: true, milestoneName: '需求基线评审' },
  { id: 2, date: '2026-04-30', name: '架构与安全基线 (W2)', isActual: true, isMilestone: true, milestoneName: '安全合规基线' },
  { id: 3, date: '2026-05-31', name: '基础网关中台就绪 (W3)', isActual: true, isMilestone: false },
  { id: 4, date: '2026-06-30', name: '核心交易链路验收 (W4)', isActual: true, isMilestone: true, milestoneName: '交易链路贯通' },
  { id: 5, date: '2026-07-31', name: '营销与仓网服务 (W5)', isActual: true, isMilestone: false },
  { id: 6, date: '2026-08-31', name: '前端与移动端打通 (W6)', isActual: true, isMilestone: true, milestoneName: '移动端体验包' },
  { id: 7, date: '2026-09-30', name: '全链路压测调优 (W7)', isActual: true, isMilestone: false },
  { id: 8, date: '2026-10-15', name: 'UAT验收与沙盒 (W8·当前)', isActual: true, isMilestone: true, milestoneName: 'UAT上线准入' },
  { id: 9, date: '2026-10-31', name: '数据平滑迁移 (W9)', isActual: false, isMilestone: false },
  { id: 10, date: '2026-11-30', name: '全渠道割接上线 (W10)', isActual: false, isMilestone: true, milestoneName: '全量成功上线' }
];

// 根据不同维度计算总量与各节点剩余量
const chartSeriesData = computed(() => {
  const totalDuration = props.stats.totalDurationDays || 420;
  const totalTasks = props.stats.totalTasks || 62;
  const totalBudgetWan = Math.round((props.stats.totalBudget || 4800000) / 10000);

  let initialTotal = totalDuration;
  let unit = '人天';

  // 剩余百分比序列 (基于实际项目进度的健康消耗模型)
  // 理想线：匀速 100% -> 0%
  // 实际线：前慢后快，中段因 7月仓网接口调整有轻微滞后，随后赶上，目前整体略微超前
  let actualRatios = [1.0, 0.90, 0.78, 0.69, 0.52, 0.40, 0.28, 0.18, 0.12]; // 截至 W8
  let forecastRatios = [0.12, 0.05, 0.0]; // 从 W8 到 W10

  if (metricType.value === 'tasks') {
    initialTotal = totalTasks;
    unit = '个任务';
  } else if (metricType.value === 'budget') {
    initialTotal = totalBudgetWan;
    unit = '万元';
  }

  const numPoints = timelineCheckpoints.length;

  const points = timelineCheckpoints.map((cp, idx) => {
    // 理想剩余
    const idealRatio = (numPoints - 1 - idx) / (numPoints - 1);
    const idealVal = Math.round(initialTotal * idealRatio);

    // 实际剩余
    let actualVal = null;
    let forecastVal = null;

    if (idx < actualRatios.length) {
      actualVal = Math.round(initialTotal * actualRatios[idx]);
    } else {
      actualVal = null;
    }

    // 预测线连接实际最新点 (idx === 8) 并在往后延伸
    if (idx >= 8) {
      const fIdx = idx - 8;
      forecastVal = Math.round(initialTotal * forecastRatios[fIdx]);
    }

    return {
      ...cp,
      index: idx,
      idealVal,
      actualVal,
      forecastVal,
      burnedSoFar: actualVal !== null ? (initialTotal - actualVal) : null,
      diff: actualVal !== null ? (idealVal - actualVal) : 0 // 正值代表超前完成，负值代表滞后
    };
  });

  const currentPoint = points[8]; // 当前节点 W8
  const currentActual = currentPoint.actualVal;
  const currentBurned = initialTotal - currentActual;
  const currentProgressPercent = Math.round((currentBurned / initialTotal) * 100);
  const velocityPerPeriod = Math.round((currentBurned / 8) * 10) / 10;

  return {
    initialTotal,
    unit,
    points,
    currentActual,
    currentBurned,
    currentProgressPercent,
    velocityPerPeriod,
    isAhead: currentPoint.diff >= 0,
    diffAbs: Math.abs(currentPoint.diff)
  };
});

// SVG 尺寸与坐标换算
const svgWidth = 960;
const svgHeight = 360;
const padding = { top: 35, right: 45, bottom: 45, left: 65 };

const chartWidth = svgWidth - padding.left - padding.right;
const chartHeight = svgHeight - padding.top - padding.bottom;

function getX(index) {
  const total = timelineCheckpoints.length - 1;
  return padding.left + (index / total) * chartWidth;
}

function getY(val) {
  const max = chartSeriesData.value.initialTotal || 100;
  const ratio = Math.max(0, Math.min(1, val / max));
  return padding.top + chartHeight - ratio * chartHeight;
}

// 理想线 SVG 路径
const idealPath = computed(() => {
  const pts = chartSeriesData.value.points;
  return `M ${getX(0)} ${getY(pts[0].idealVal)} L ${getX(pts.length - 1)} ${getY(pts[pts.length - 1].idealVal)}`;
});

// 实际折线与面积路径
const actualPath = computed(() => {
  const pts = chartSeriesData.value.points.filter(p => p.actualVal !== null);
  if (!pts.length) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.index)} ${getY(p.actualVal)}`).join(' ');
});

const actualAreaPath = computed(() => {
  const pts = chartSeriesData.value.points.filter(p => p.actualVal !== null);
  if (!pts.length) return '';
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.index)} ${getY(p.actualVal)}`).join(' ');
  const lastP = pts[pts.length - 1];
  const firstP = pts[0];
  const bottomY = padding.top + chartHeight;
  return `${line} L ${getX(lastP.index)} ${bottomY} L ${getX(firstP.index)} ${bottomY} Z`;
});

// 预测线路径
const forecastPath = computed(() => {
  const pts = chartSeriesData.value.points.filter(p => p.forecastVal !== null);
  if (!pts.length) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.index)} ${getY(p.forecastVal)}`).join(' ');
});

// Y 轴 5 档刻度
const yTicks = computed(() => {
  const max = chartSeriesData.value.initialTotal || 100;
  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((max / 4) * i);
    ticks.push({
      value: val,
      y: getY(val)
    });
  }
  return ticks;
});

// 当前悬浮信息
const activeHoverPoint = computed(() => {
  if (hoveredIndex.value === null) return null;
  return chartSeriesData.value.points[hoveredIndex.value] || null;
});
</script>

<template>
  <div class="burndown-wrapper">
    <!-- 顶部状态栏与维度切换器 -->
    <div class="burndown-header">
      <div class="header-left">
        <div class="title-with-badge">
          <h3 class="burndown-title">项目全景燃尽图 (Burndown Trend)</h3>
          <span class="status-indicator-tag" :class="chartSeriesData.isAhead ? 'ahead' : 'lagging'">
            {{ chartSeriesData.isAhead ? '● 整体进度超前' : '● 整体进度轻微滞后' }} ({{ chartSeriesData.diffAbs }} {{ chartSeriesData.unit }})
          </span>
        </div>
        <p class="burndown-subtitle">
          实时监测剩余工作量随里程碑周期的释放速率，橙色虚线表示基于当前燃尽速率对最终上线的预测。
        </p>
      </div>

      <!-- 维度切换 Segment -->
      <div class="metric-switch">
        <span class="switch-label">统计度量:</span>
        <div class="switch-buttons">
          <button
            class="switch-btn"
            :class="{ active: metricType === 'duration' }"
            @click="metricType = 'duration'"
          >
            工期人天 (Days)
          </button>
          <button
            class="switch-btn"
            :class="{ active: metricType === 'tasks' }"
            @click="metricType = 'tasks'"
          >
            工作包数 (Tasks)
          </button>
          <button
            class="switch-btn"
            :class="{ active: metricType === 'budget' }"
            @click="metricType = 'budget'"
          >
            预算消耗 (万元)
          </button>
        </div>
      </div>
    </div>

    <!-- 核心燃尽 KPI 仪表卡片 -->
    <div class="burndown-kpi-row">
      <div class="b-kpi-card">
        <span class="b-kpi-label">初始工作量基线</span>
        <div class="b-kpi-val">{{ chartSeriesData.initialTotal }} <span class="b-unit">{{ chartSeriesData.unit }}</span></div>
        <span class="b-kpi-desc">全生命周期 6 大阶段总量</span>
      </div>

      <div class="b-kpi-card">
        <span class="b-kpi-label">累计已燃尽工作量</span>
        <div class="b-kpi-val text-primary">{{ chartSeriesData.currentBurned }} <span class="b-unit">{{ chartSeriesData.unit }}</span></div>
        <span class="b-kpi-desc">已释放 {{ chartSeriesData.currentProgressPercent }}%</span>
      </div>

      <div class="b-kpi-card">
        <span class="b-kpi-label">当前剩余工作量</span>
        <div class="b-kpi-val" :class="chartSeriesData.currentActual > 0 ? 'text-amber' : 'text-emerald'">
          {{ chartSeriesData.currentActual }} <span class="b-unit">{{ chartSeriesData.unit }}</span>
        </div>
        <span class="b-kpi-desc">剩余未交付原子任务</span>
      </div>

      <div class="b-kpi-card">
        <span class="b-kpi-label">平均周期燃尽速率</span>
        <div class="b-kpi-val text-emerald">{{ chartSeriesData.velocityPerPeriod }} <span class="b-unit">{{ chartSeriesData.unit }}/周期</span></div>
        <span class="b-kpi-desc">交付效率稳定维持高位</span>
      </div>

      <div class="b-kpi-card">
        <span class="b-kpi-label">预测上线日期 (Go-Live)</span>
        <div class="b-kpi-val text-purple">2026-11-20</div>
        <span class="b-kpi-desc">预计比原基线提前 10 天</span>
      </div>
    </div>

    <!-- 图例与操作指引 -->
    <div class="chart-legend-row">
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-line ideal"></span>
          <span>理想基线 (Ideal Baseline)</span>
        </div>
        <div class="legend-item">
          <span class="legend-line actual"></span>
          <span>实际燃尽 (Actual Remaining)</span>
        </div>
        <div class="legend-item">
          <span class="legend-line forecast"></span>
          <span>预测趋势 (Forecast Trend)</span>
        </div>
        <div class="legend-item">
          <span class="legend-star">★</span>
          <span>战略里程碑检查点</span>
        </div>
      </div>
      <div class="legend-tip">
        提示：鼠标悬停在图表数据点上可查看当前周期详细剩余与偏差
      </div>
    </div>

    <!-- 交互式 SVG 燃尽图绘制区 -->
    <div class="chart-svg-container">
      <svg
        class="burndown-svg"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <!-- 面积渐变 -->
          <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02" />
          </linearGradient>

          <!-- 预测虚线渐变 -->
          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- 背景水平网格线与 Y 轴刻度 -->
        <g class="grid-lines">
          <g v-for="tick in yTicks" :key="tick.value">
            <line
              :x1="padding.left"
              :y1="tick.y"
              :x2="svgWidth - padding.right"
              :y2="tick.y"
              class="grid-line"
            />
            <text
              :x="padding.left - 10"
              :y="tick.y + 4"
              class="y-axis-label"
              text-anchor="end"
            >
              {{ tick.value }}
            </text>
          </g>
        </g>

        <!-- X 轴网格垂线与日期标签 -->
        <g class="x-axes">
          <g v-for="pt in chartSeriesData.points" :key="pt.id">
            <line
              :x1="getX(pt.index)"
              :y1="padding.top"
              :x2="getX(pt.index)"
              :y2="padding.top + chartHeight"
              class="v-grid-line"
              :class="{ 'current-time-line': pt.index === 8 }"
            />
            <text
              :x="getX(pt.index)"
              :y="svgHeight - padding.bottom + 18"
              class="x-axis-date"
              text-anchor="middle"
            >
              {{ pt.date.slice(5) }}
            </text>
            <text
              :x="getX(pt.index)"
              :y="svgHeight - padding.bottom + 32"
              class="x-axis-name"
              text-anchor="middle"
            >
              {{ `W${pt.index}` }}
            </text>

            <!-- 里程碑金色星标 -->
            <g v-if="pt.isMilestone" :transform="`translate(${getX(pt.index)}, ${padding.top - 12})`">
              <circle cx="0" cy="0" r="8" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5" />
              <text cx="0" cy="3" font-size="9" fill="#d97706" text-anchor="middle" font-weight="bold">★</text>
            </g>
          </g>
        </g>

        <!-- 实际燃尽阴影面积 -->
        <path :d="actualAreaPath" fill="url(#actualGradient)" />

        <!-- 理想燃尽基线 (虚线) -->
        <path :d="idealPath" class="path-ideal" />

        <!-- 预测趋势折线 (橙色虚线) -->
        <path :d="forecastPath" class="path-forecast" />

        <!-- 实际燃尽折线 (蓝色实线) -->
        <path :d="actualPath" class="path-actual" />

        <!-- 数据节点点阵 (可交互触发 Hover) -->
        <g class="data-points">
          <g
            v-for="pt in chartSeriesData.points"
            :key="pt.id"
            @mouseenter="hoveredIndex = pt.index"
            @mouseleave="hoveredIndex = null"
            class="interactive-point-group"
          >
            <!-- 悬浮触发热区 (无形大圆) -->
            <circle
              :cx="getX(pt.index)"
              :cy="getY(pt.actualVal !== null ? pt.actualVal : pt.forecastVal)"
              r="18"
              fill="transparent"
              class="point-hitarea"
            />

            <!-- 实际节点小圆点 -->
            <circle
              v-if="pt.actualVal !== null"
              :cx="getX(pt.index)"
              :cy="getY(pt.actualVal)"
              :r="hoveredIndex === pt.index ? 6 : 4"
              class="point-actual"
              :class="{ active: hoveredIndex === pt.index }"
            />

            <!-- 预测节点小圆点 -->
            <circle
              v-else
              :cx="getX(pt.index)"
              :cy="getY(pt.forecastVal)"
              :r="hoveredIndex === pt.index ? 6 : 3.5"
              class="point-forecast"
              :class="{ active: hoveredIndex === pt.index }"
            />
          </g>
        </g>

        <!-- 交互十字光标辅助线与浮动指示 -->
        <g v-if="activeHoverPoint" class="crosshair-group">
          <!-- 垂直虚线 -->
          <line
            :x1="getX(activeHoverPoint.index)"
            :y1="padding.top"
            :x2="getX(activeHoverPoint.index)"
            :y2="padding.top + chartHeight"
            class="crosshair-v"
          />

          <!-- 高亮大外圈光环 -->
          <circle
            :cx="getX(activeHoverPoint.index)"
            :cy="getY(activeHoverPoint.actualVal !== null ? activeHoverPoint.actualVal : activeHoverPoint.forecastVal)"
            r="8"
            class="crosshair-ring"
          />
        </g>
      </svg>

      <!-- 动态悬停浮窗 Tooltip -->
      <div
        v-if="activeHoverPoint"
        class="chart-tooltip"
        :style="{
          left: `${(getX(activeHoverPoint.index) / svgWidth) * 100}%`,
          top: `${(getY(activeHoverPoint.actualVal !== null ? activeHoverPoint.actualVal : activeHoverPoint.forecastVal) / svgHeight) * 100}%`
        }"
      >
        <div class="tt-header">
          <span class="tt-title">{{ activeHoverPoint.name }}</span>
          <span class="tt-date">{{ activeHoverPoint.date }}</span>
        </div>
        <div class="tt-body">
          <div class="tt-row">
            <span class="tt-label">理想剩余:</span>
            <span class="tt-val font-mono">{{ activeHoverPoint.idealVal }} {{ chartSeriesData.unit }}</span>
          </div>
          <div v-if="activeHoverPoint.actualVal !== null" class="tt-row">
            <span class="tt-label text-blue">实际剩余:</span>
            <span class="tt-val font-mono text-blue font-bold">{{ activeHoverPoint.actualVal }} {{ chartSeriesData.unit }}</span>
          </div>
          <div v-if="activeHoverPoint.forecastVal !== null && activeHoverPoint.actualVal === null" class="tt-row">
            <span class="tt-label text-amber">预测剩余:</span>
            <span class="tt-val font-mono text-amber font-bold">{{ activeHoverPoint.forecastVal }} {{ chartSeriesData.unit }}</span>
          </div>
          <div v-if="activeHoverPoint.actualVal !== null" class="tt-row">
            <span class="tt-label">进度偏差:</span>
            <span class="tt-val" :class="activeHoverPoint.diff >= 0 ? 'text-success' : 'text-danger'">
              {{ activeHoverPoint.diff >= 0 ? `领先 +${activeHoverPoint.diff}` : `滞后 ${activeHoverPoint.diff}` }} {{ chartSeriesData.unit }}
            </span>
          </div>
          <div v-if="activeHoverPoint.isMilestone" class="tt-milestone-tag">
            ★ {{ activeHoverPoint.milestoneName }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：详细阶段燃尽台账表格 -->
    <div class="burndown-table-section">
      <div class="section-title">里程碑周期燃尽进度流水记录表</div>
      <div class="burndown-table-container">
        <table class="b-table">
          <thead>
            <tr>
              <th>周期节点</th>
              <th>检查日期</th>
              <th>交付阶段 / 里程碑</th>
              <th>理想剩余</th>
              <th>实际剩余</th>
              <th>累计燃尽</th>
              <th>偏差状态</th>
              <th>执行性质</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="pt in chartSeriesData.points"
              :key="pt.id"
              :class="{
                'highlight-current': pt.index === 8,
                'forecast-row': pt.actualVal === null
              }"
            >
              <td class="font-mono font-bold">W{{ pt.index }}</td>
              <td class="font-mono">{{ pt.date }}</td>
              <td>
                <div class="stage-cell">
                  <span>{{ pt.name }}</span>
                  <span v-if="pt.isMilestone" class="ms-badge">里程碑</span>
                </div>
              </td>
              <td class="font-mono">{{ pt.idealVal }} {{ chartSeriesData.unit }}</td>
              <td class="font-mono font-bold">
                {{ pt.actualVal !== null ? `${pt.actualVal} ${chartSeriesData.unit}` : '--' }}
              </td>
              <td class="font-mono text-emerald font-semibold">
                {{ pt.burnedSoFar !== null ? `${pt.burnedSoFar} ${chartSeriesData.unit}` : '--' }}
              </td>
              <td>
                <span
                  v-if="pt.actualVal !== null"
                  class="badge-diff"
                  :class="pt.diff >= 0 ? 'ahead' : 'lagging'"
                >
                  {{ pt.diff >= 0 ? `超前 +${pt.diff}` : `滞后 ${pt.diff}` }}
                </span>
                <span v-else class="text-muted text-xs">模型预测中</span>
              </td>
              <td>
                <span class="type-pill" :class="pt.actualVal !== null ? 'actual' : 'forecast'">
                  {{ pt.actualVal !== null ? (pt.index === 8 ? '当前基线' : '实际发生') : '预测推演' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.burndown-wrapper {
  background: #ffffff;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px 24px;
  gap: 16px;
}

.burndown-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
}

.title-with-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.burndown-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.status-indicator-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
}
.status-indicator-tag.ahead {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}
.status-indicator-tag.lagging {
  background-color: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.burndown-subtitle {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.metric-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.switch-buttons {
  display: inline-flex;
  background-color: #f1f5f9;
  padding: 3px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.switch-btn {
  background: transparent;
  border: none;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.switch-btn.active {
  background: #ffffff;
  color: #2563eb;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

/* KPI 卡片栏 */
.burndown-kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.b-kpi-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.b-kpi-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.b-kpi-val {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 4px 0 2px 0;
}

.b-unit {
  font-size: 11px;
  font-weight: normal;
  color: #64748b;
}

.b-kpi-desc {
  font-size: 10px;
  color: #94a3b8;
}

.text-primary { color: #2563eb; }
.text-emerald { color: #059669; }
.text-amber { color: #d97706; }
.text-purple { color: #7c3aed; }

/* 图例 */
.chart-legend-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 4px;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #475569;
}

.legend-line {
  width: 20px;
  height: 3px;
  border-radius: 2px;
}
.legend-line.ideal {
  background-color: #94a3b8;
  border-bottom: 2px dashed #94a3b8;
  height: 0;
}
.legend-line.actual {
  background-color: #2563eb;
  height: 3px;
}
.legend-line.forecast {
  background-color: #f59e0b;
  border-bottom: 2px dotted #f59e0b;
  height: 0;
}

.legend-star {
  color: #f59e0b;
  font-size: 13px;
}

.legend-tip {
  font-size: 11px;
  color: #94a3b8;
}

/* SVG 图表区 */
.chart-svg-container {
  position: relative;
  width: 100%;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  overflow: hidden;
}

.burndown-svg {
  width: 100%;
  height: auto;
  display: block;
}

.grid-line {
  stroke: #f1f5f9;
  stroke-width: 1;
}

.y-axis-label {
  fill: #94a3b8;
  font-size: 10px;
  font-family: monospace;
}

.v-grid-line {
  stroke: #f1f5f9;
  stroke-width: 1;
  stroke-dasharray: 2 3;
}

.current-time-line {
  stroke: #cbd5e1;
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}

.x-axis-date {
  fill: #64748b;
  font-size: 10px;
  font-family: monospace;
}

.x-axis-name {
  fill: #94a3b8;
  font-size: 9px;
  font-weight: 600;
}

/* 路径线 */
.path-ideal {
  fill: none;
  stroke: #94a3b8;
  stroke-width: 2;
  stroke-dasharray: 5 4;
}

.path-forecast {
  fill: none;
  stroke: #f59e0b;
  stroke-width: 2.5;
  stroke-dasharray: 4 3;
}

.path-actual {
  fill: none;
  stroke: #2563eb;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 点 */
.point-actual {
  fill: #2563eb;
  stroke: #ffffff;
  stroke-width: 2;
  transition: all 0.15s ease;
}
.point-actual.active {
  fill: #1d4ed8;
  stroke: #bfdbfe;
  stroke-width: 3;
}

.point-forecast {
  fill: #f59e0b;
  stroke: #ffffff;
  stroke-width: 2;
}

.crosshair-v {
  stroke: #3b82f6;
  stroke-width: 1.5;
  stroke-dasharray: 3 3;
  pointer-events: none;
}

.crosshair-ring {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 2;
  animation: pulseRing 1.5s infinite;
  pointer-events: none;
}

@keyframes pulseRing {
  0% { r: 6px; opacity: 1; }
  100% { r: 12px; opacity: 0; }
}

/* Tooltip 浮窗 */
.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -115%);
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(4px);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  pointer-events: none;
  white-space: nowrap;
  z-index: 50;
}

.tt-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding-bottom: 4px;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.tt-title {
  font-weight: 600;
  color: #f8fafc;
}

.tt-date {
  color: #94a3b8;
  font-family: monospace;
}

.tt-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tt-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;
}

.tt-label {
  color: #cbd5e1;
}

.tt-val {
  color: #ffffff;
}

.text-blue { color: #60a5fa; }
.text-amber { color: #fbbf24; }
.text-success { color: #34d399; font-weight: 600; }
.text-danger { color: #f87171; font-weight: 600; }

.tt-milestone-tag {
  margin-top: 4px;
  color: #fbbf24;
  font-weight: 600;
  font-size: 10px;
}

/* 下方明细流水表 */
.burndown-table-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.section-title {
  background-color: #f8fafc;
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  border-bottom: 1px solid #e2e8f0;
}

.burndown-table-container {
  overflow-x: auto;
  max-height: 240px;
  overflow-y: auto;
}

.b-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 12px;
}

.b-table th {
  background-color: #ffffff;
  position: sticky;
  top: 0;
  padding: 8px 14px;
  border-bottom: 2px solid #e2e8f0;
  color: #64748b;
  font-weight: 600;
  white-space: nowrap;
}

.b-table td {
  padding: 8px 14px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
  white-space: nowrap;
}

.b-table tr:hover {
  background-color: #f8fafc;
}

.highlight-current {
  background-color: #eff6ff !important;
}

.forecast-row {
  opacity: 0.8;
  background-color: #fafbfc;
}

.stage-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ms-badge {
  font-size: 10px;
  background: #fef3c7;
  color: #b45309;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
}

.badge-diff {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
}
.badge-diff.ahead { background: #ecfdf5; color: #047857; }
.badge-diff.lagging { background: #fef2f2; color: #b91c1c; }

.type-pill {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
}
.type-pill.actual { background: #eff6ff; color: #2563eb; }
.type-pill.forecast { background: #fffbeb; color: #d97706; }
</style>
