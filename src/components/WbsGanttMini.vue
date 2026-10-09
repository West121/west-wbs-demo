<script setup>
import { computed } from 'vue';
import { STATUS_MAP } from '../utils/wbsHelper';

const props = defineProps({
  flatData: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['edit-task', 'toggle-expand']);

// 仅展示可见行
const visibleRows = computed(() => {
  return props.flatData.filter(row => row.isVisible);
});

// 计算项目全局时间跨度：以 2026-03-01 到 2026-12-01 作为基准标尺
const projectStart = new Date('2026-03-01').getTime();
const projectEnd = new Date('2026-12-01').getTime();
const totalTimeSpan = projectEnd - projectStart;

// 月份刻度线
const monthTicks = [
  { name: '3月', left: '0%' },
  { name: '4月', left: '11.1%' },
  { name: '5月', left: '22.2%' },
  { name: '6月', left: '33.3%' },
  { name: '7月', left: '44.4%' },
  { name: '8月', left: '55.5%' },
  { name: '9月', left: '66.6%' },
  { name: '10月', left: '77.7%' },
  { name: '11月', left: '88.8%' }
];

// 计算条形位置百分比
function getBarStyle(task) {
  const start = new Date(task.startDate).getTime();
  const end = new Date(task.endDate).getTime();

  let leftPercent = ((start - projectStart) / totalTimeSpan) * 100;
  let widthPercent = ((end - start) / totalTimeSpan) * 100;

  leftPercent = Math.max(0, Math.min(100, leftPercent));
  widthPercent = Math.max(1.5, Math.min(100 - leftPercent, widthPercent));

  let bgColor = '#3b82f6';
  if (task.status === 'completed') bgColor = '#10b981';
  if (task.status === 'delayed') bgColor = '#ef4444';
  if (task.status === 'pending') bgColor = '#94a3b8';

  return {
    left: `${leftPercent}%`,
    width: `${widthPercent}%`,
    backgroundColor: bgColor
  };
}
</script>

<template>
  <div class="gantt-container">
    <div class="gantt-header">
      <div class="gantt-left-header">
        <span>任务清单与工期</span>
      </div>
      <div class="gantt-right-header">
        <div class="month-timeline">
          <div
            v-for="tick in monthTicks"
            :key="tick.name"
            class="month-tick"
            :style="{ left: tick.left }"
          >
            <span class="tick-label">{{ tick.name }}</span>
            <div class="tick-line"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 甘特列表主体 -->
    <div class="gantt-body">
      <div
        v-for="row in visibleRows"
        :key="row.id"
        class="gantt-row"
        :class="{
          'level-1-row': row.level === 1,
          'level-2-row': row.level === 2,
          'milestone-row': row.isMilestone
        }"
        @click="$emit('edit-task', row)"
      >
        <!-- 左侧名称与编码 -->
        <div class="gantt-left-cell" :style="{ paddingLeft: `${16 + (row.level - 1) * 20}px` }">
          <button
            v-if="row.hasChildren"
            class="expand-btn"
            @click.stop="$emit('toggle-expand', row.id)"
          >
            {{ row.isExpanded ? '▾' : '▸' }}
          </button>
          <span v-else class="indent-bullet">•</span>

          <span class="gantt-code">{{ row.code }}</span>
          <span class="gantt-name" :title="row.name">{{ row.name }}</span>
          <span class="gantt-duration">{{ row.duration }}d</span>
        </div>

        <!-- 右侧时间轴条形 -->
        <div class="gantt-right-cell">
          <div class="gantt-track">
            <!-- 里程碑菱形显示 -->
            <div
              v-if="row.isMilestone"
              class="milestone-diamond"
              :style="{ left: getBarStyle(row).left }"
              :title="`【里程碑】${row.name} (${row.endDate})`"
            >
              ◆
            </div>

            <!-- 普通任务条 -->
            <div
              v-else
              class="gantt-bar"
              :style="getBarStyle(row)"
              :title="`${row.name}：${row.startDate} ~ ${row.endDate} (进度: ${row.progress}%)`"
            >
              <!-- 内部实际进度填充 -->
              <div
                class="bar-progress-overlay"
                :style="{ width: `${row.progress}%` }"
              ></div>
              <span class="bar-label">{{ row.progress }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gantt-container {
  background: #ffffff;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.gantt-header {
  display: flex;
  background-color: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-weight: 600;
  font-size: 12px;
  color: #475569;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.gantt-left-header {
  width: 380px;
  min-width: 380px;
  padding: 12px 16px;
  border-right: 1px solid #e2e8f0;
}

.gantt-right-header {
  flex: 1;
  position: relative;
  height: 40px;
  min-width: 600px;
}

.month-timeline {
  position: relative;
  width: 100%;
  height: 100%;
}

.month-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
}

.tick-label {
  display: block;
  padding-top: 10px;
  font-size: 11px;
  color: #64748b;
  text-align: center;
}

.gantt-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.gantt-row {
  display: flex;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.15s ease;
  min-height: 38px;
  align-items: center;
}

.gantt-row:hover {
  background-color: #f8fafc;
}

.level-1-row {
  background-color: #fcfdfe;
  font-weight: 600;
}
.level-2-row {
  font-weight: 500;
}

.gantt-left-cell {
  width: 380px;
  min-width: 380px;
  padding-right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-right: 1px solid #e2e8f0;
  overflow: hidden;
}

.expand-btn {
  background: none;
  border: none;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  width: 14px;
  text-align: center;
}

.indent-bullet {
  color: #94a3b8;
  font-size: 12px;
  width: 14px;
  text-align: center;
}

.gantt-code {
  font-family: monospace;
  font-size: 11px;
  color: #2563eb;
  font-weight: 600;
}

.gantt-name {
  font-size: 12px;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.gantt-duration {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.gantt-right-cell {
  flex: 1;
  position: relative;
  min-width: 600px;
  height: 38px;
  display: flex;
  align-items: center;
}

.gantt-track {
  position: relative;
  width: 100%;
  height: 20px;
}

.gantt-bar {
  position: absolute;
  top: 0;
  height: 18px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6px;
  transition: width 0.3s ease, left 0.3s ease;
}

.bar-progress-overlay {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.3);
}

.bar-label {
  position: relative;
  z-index: 2;
  font-size: 10px;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

.milestone-diamond {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #f59e0b;
  font-size: 20px;
  text-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
</style>
