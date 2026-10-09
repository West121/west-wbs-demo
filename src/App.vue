<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { initialProjectInfo, initialWbsData } from './data/mockData';
import {
  calculateTreeAggregations,
  flattenWbsTree,
  getMatchedNodeAndAncestorIds,
  getAllExpandableIds,
  calculateProjectStats
} from './utils/wbsHelper';
import { exportToCsv, exportToJson } from './utils/exportHelper';

import WbsHeader from './components/WbsHeader.vue';
import WbsToolbar from './components/WbsToolbar.vue';
import WbsTable from './components/WbsTable.vue';
import WbsGanttMini from './components/WbsGanttMini.vue';
import WbsBurndownChart from './components/WbsBurndownChart.vue';
import TaskModal from './components/TaskModal.vue';

// 项目数据
const projectInfo = ref({ ...initialProjectInfo });
const treeData = ref(JSON.parse(JSON.stringify(initialWbsData)));

// 展开状态集合
const expandedIds = ref(new Set());

// 筛选与视图状态
const searchKeyword = ref('');
const statusFilter = ref('all');
const priorityFilter = ref('all');
const onlyMilestone = ref(false);
const currentView = ref('table'); // 'table' | 'gantt'
const activeLevel = ref(3);

// 弹窗状态
const modalVisible = ref(false);
const modalIsCreate = ref(false);
const modalCurrentTask = ref(null);
const modalParentTask = ref(null);

// 初始化树形聚合计算并默认展开 1~2 级
onMounted(() => {
  recalculateTree();
  // 默认展开所有 1 级和 2 级节点
  const initialIds = getAllExpandableIds(treeData.value, 2);
  expandedIds.value = initialIds;
  activeLevel.value = 2;
});

// 重新递归聚合计算树
function recalculateTree() {
  calculateTreeAggregations(treeData.value);
}

// 项目综合 KPI 统计
const stats = computed(() => {
  return calculateProjectStats(treeData.value);
});

// 搜索命中与整条祖先链路
const searchResults = computed(() => {
  if (!searchKeyword.value.trim()) return null;
  return getMatchedNodeAndAncestorIds(treeData.value, searchKeyword.value);
});

// 扁平化数据（响应式响应展开、搜索和过滤）
const flatData = computed(() => {
  // 如果处于搜索模式，自动展开命中项的所有祖先
  const effectiveExpandedIds = new Set(expandedIds.value);
  if (searchResults.value) {
    searchResults.value.ancestorIds.forEach(id => effectiveExpandedIds.add(id));
  }

  const filterOptions = {
    search: searchKeyword.value,
    status: statusFilter.value,
    priority: priorityFilter.value,
    onlyMilestone: onlyMilestone.value
  };

  return flattenWbsTree(
    treeData.value,
    effectiveExpandedIds,
    filterOptions,
    searchResults.value ? searchResults.value.matchedIds : null
  );
});

// 切换单节点展开/折叠
function toggleExpand(id) {
  const next = new Set(expandedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedIds.value = next;
}

// 全部展开
function expandAll() {
  expandedIds.value = getAllExpandableIds(treeData.value, 99);
  activeLevel.value = 3;
}

// 全部收起
function collapseAll() {
  expandedIds.value = new Set();
  activeLevel.value = 0;
}

// 展开到指定层级
function expandToLevel(level) {
  activeLevel.value = level;
  if (level === 1) {
    expandedIds.value = new Set();
  } else {
    expandedIds.value = getAllExpandableIds(treeData.value, level - 1);
  }
}

// 打开编辑弹窗
function openEditModal(task) {
  modalCurrentTask.value = task;
  modalParentTask.value = null;
  modalIsCreate.value = false;
  modalVisible.value = true;
}

// 打开新增子任务弹窗
function openAddChildModal(parentTask) {
  modalParentTask.value = parentTask;
  modalCurrentTask.value = null;
  modalIsCreate.value = true;
  modalVisible.value = true;
}

// 打开新增一级主阶段弹窗
function openAddRootModal() {
  modalParentTask.value = null;
  modalCurrentTask.value = null;
  modalIsCreate.value = true;
  modalVisible.value = true;
}

// 保存任务（新增或更新）
function handleSaveTask(taskFormData) {
  if (modalIsCreate.value) {
    if (modalParentTask.value) {
      // 插入到父任务 children 中
      function appendToParent(list) {
        for (const item of list) {
          if (item.id === modalParentTask.value.id) {
            if (!item.children) item.children = [];
            item.children.push({
              ...taskFormData,
              children: []
            });
            // 确保父节点展开
            const next = new Set(expandedIds.value);
            next.add(item.id);
            expandedIds.value = next;
            return true;
          }
          if (item.children && item.children.length > 0) {
            if (appendToParent(item.children)) return true;
          }
        }
        return false;
      }
      appendToParent(treeData.value);
    } else {
      // 作为新的一级阶段
      treeData.value.push({
        ...taskFormData,
        children: []
      });
    }
  } else {
    // 更新已有节点
    function updateNode(list) {
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === taskFormData.id) {
          list[i] = {
            ...list[i],
            ...taskFormData,
            children: list[i].children // 保留原有的子节点
          };
          return true;
        }
        if (list[i].children && list[i].children.length > 0) {
          if (updateNode(list[i].children)) return true;
        }
      }
      return false;
    }
    updateNode(treeData.value);
  }

  // 重新计算全树聚合
  recalculateTree();
  modalVisible.value = false;
}

// 删除任务
function handleDeleteTask(task) {
  const confirmMsg = task.children && task.children.length > 0
    ? `确定要删除任务【${task.name}】及其下属的所有 ${task.children.length} 个子项吗？`
    : `确定要删除任务【${task.name}】吗？`;

  if (!confirm(confirmMsg)) return;

  function removeNode(list) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === task.id) {
        list.splice(i, 1);
        return true;
      }
      if (list[i].children && list[i].children.length > 0) {
        if (removeNode(list[i].children)) return true;
      }
    }
    return false;
  }

  removeNode(treeData.value);
  recalculateTree();
}

// 重置数据
function handleResetData() {
  if (confirm('确认恢复为预设的演示数据吗？你所做的修改将被清除。')) {
    treeData.value = JSON.parse(JSON.stringify(initialWbsData));
    recalculateTree();
    expandToLevel(2);
    searchKeyword.value = '';
    statusFilter.value = 'all';
    priorityFilter.value = 'all';
    onlyMilestone.value = false;
  }
}

// 导出 CSV
function handleExportCsv() {
  exportToCsv(treeData.value, `${projectInfo.value.name}_WBS清单.csv`);
}

// 导出 JSON
function handleExportJson() {
  exportToJson(treeData.value, `${projectInfo.value.code}_WBS.json`);
}
</script>

<template>
  <div class="app-layout">
    <!-- 项目顶栏与指标卡片 -->
    <WbsHeader
      :project-info="projectInfo"
      :stats="stats"
    />

    <!-- 操作与过滤工具栏 -->
    <WbsToolbar
      v-model:search="searchKeyword"
      v-model:status="statusFilter"
      v-model:priority="priorityFilter"
      v-model:only-milestone="onlyMilestone"
      v-model:current-view="currentView"
      :active-level="activeLevel"
      @expand-all="expandAll"
      @collapse-all="collapseAll"
      @expand-to-level="expandToLevel"
      @export-csv="handleExportCsv"
      @export-json="handleExportJson"
      @add-root-task="openAddRootModal"
      @reset-data="handleResetData"
    />

    <!-- 主展示区：表格视图 OR 甘特视图 -->
    <main class="main-content">
      <div v-show="currentView === 'table'" class="view-panel">
        <WbsTable
          :flat-data="flatData"
          :search-keyword="searchKeyword"
          @toggle-expand="toggleExpand"
          @edit-task="openEditModal"
          @add-child-task="openAddChildModal"
          @delete-task="handleDeleteTask"
        />
      </div>

      <div v-show="currentView === 'gantt'" class="view-panel">
        <WbsGanttMini
          :flat-data="flatData"
          @toggle-expand="toggleExpand"
          @edit-task="openEditModal"
        />
      </div>

      <div v-show="currentView === 'burndown'" class="view-panel">
        <WbsBurndownChart
          :tree-data="treeData"
          :stats="stats"
        />
      </div>
    </main>

    <!-- 底部状态说明条 -->
    <footer class="app-footer">
      <div class="footer-left">
        <span>当前共显示 <strong>{{ flatData.filter(r => r.isVisible).length }}</strong> 项任务</span>
        <span class="footer-divider">|</span>
        <span class="footer-hint">支持无限级 WBS 树形分解、工期自动联动、父任务进度智能加权计算与一键导出</span>
      </div>
      <div class="footer-right">
        <span>Vue 3 Composition API + 响应式树形表格引擎</span>
      </div>
    </footer>

    <!-- 新增 / 编辑任务弹窗 -->
    <TaskModal
      :visible="modalVisible"
      :task-data="modalCurrentTask"
      :is-create-mode="modalIsCreate"
      :parent-task="modalParentTask"
      @close="modalVisible = false"
      @save="handleSaveTask"
    />
  </div>
</template>

<style scoped>
.app-layout {
  height: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  overflow: hidden;
}

.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 24px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.view-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.app-footer {
  flex-shrink: 0;
  background: #ffffff;
  border-top: 1px solid var(--border-color);
  padding: 8px 24px;
  font-size: 11px;
  color: #64748b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-divider {
  color: #cbd5e1;
}

.footer-hint {
  color: #94a3b8;
}

.footer-right {
  font-weight: 500;
  color: #475569;
}
</style>
