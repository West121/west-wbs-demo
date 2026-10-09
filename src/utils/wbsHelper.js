/**
 * WBS 树形结构与计算辅助工具库
 */

/**
 * 递归计算父节点的进度与时间范围
 * 父节点的进度由直接子节点的平均或工期加权进度聚合计算
 */
export function calculateTreeAggregations(nodes) {
  if (!nodes || !nodes.length) return;

  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      calculateTreeAggregations(node.children);

      // 计算子任务总工期与加权进度
      let totalWeight = 0;
      let weightedProgress = 0;
      let totalBudget = 0;
      let totalActualCost = 0;
      let allCompleted = true;
      let anyInProgress = false;
      let anyDelayed = false;

      node.children.forEach(child => {
        const weight = child.duration || 1;
        totalWeight += weight;
        weightedProgress += (child.progress || 0) * weight;
        totalBudget += (child.budget || 0);
        totalActualCost += (child.actualCost || 0);

        if (child.status !== 'completed') {
          allCompleted = false;
        }
        if (child.status === 'in_progress') {
          anyInProgress = true;
        }
        if (child.status === 'delayed') {
          anyDelayed = true;
        }
      });

      if (totalWeight > 0) {
        node.progress = Math.round(weightedProgress / totalWeight);
      }
      
      // 若无自定义预算，则汇总子节点
      if (!node.customBudget) {
        node.budget = totalBudget;
        node.actualCost = totalActualCost;
      }

      // 自动状态推导（除非手动锁定）
      if (!node.manuallySetStatus) {
        if (allCompleted) {
          node.status = 'completed';
        } else if (anyDelayed) {
          node.status = 'delayed';
        } else if (anyInProgress || node.progress > 0) {
          node.status = 'in_progress';
        } else {
          node.status = 'pending';
        }
      }
    }
  });
}

/**
 * 递归扁平化树形数据，用于表格视图渲染
 * @param {Array} nodes 树节点数组
 * @param {Set} expandedIds 展开的节点ID集合
 * @param {Object} filterOptions 过滤条件 { search, status, priority, onlyMilestone, level }
 * @param {Array} matchIds 命中搜索条件的节点ID集合（由外层预先查找）
 */
export function flattenWbsTree(nodes, expandedIds, filterOptions = {}, matchIds = null) {
  const result = [];

  function traverse(list, depth = 0, isParentVisible = true) {
    if (!list) return;

    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      const hasChildren = Boolean(node.children && node.children.length > 0);
      const isExpanded = expandedIds.has(node.id);

      // 判断过滤条件
      let matchesFilter = true;

      // 文本搜索匹配检查
      if (filterOptions.search && filterOptions.search.trim()) {
        matchesFilter = matchIds ? matchIds.has(node.id) : true;
      }

      // 状态过滤
      if (filterOptions.status && filterOptions.status !== 'all') {
        if (node.status !== filterOptions.status) {
          matchesFilter = false;
        }
      }

      // 优先级过滤
      if (filterOptions.priority && filterOptions.priority !== 'all') {
        if (node.priority !== filterOptions.priority) {
          matchesFilter = false;
        }
      }

      // 里程碑过滤
      if (filterOptions.onlyMilestone) {
        if (!node.isMilestone) {
          matchesFilter = false;
        }
      }

      // 层级过滤 (如只看 1 级，或 1-2 级)
      if (filterOptions.maxLevel && filterOptions.maxLevel < 99) {
        if (node.level > filterOptions.maxLevel) {
          matchesFilter = false;
        }
      }

      const flatItem = {
        ...node,
        depth,
        hasChildren,
        isExpanded,
        isVisible: isParentVisible && matchesFilter,
        isMatched: matchIds ? matchIds.has(node.id) : false
      };

      if (isParentVisible) {
        result.push(flatItem);
      }

      // 如果有子节点，且当前节点展开（如果处于搜索模式且子项命中，也可以递归展示）
      if (hasChildren) {
        const shouldShowChildren = isParentVisible && isExpanded;
        traverse(node.children, depth + 1, shouldShowChildren);
      }
    }
  }

  traverse(nodes, 0, true);
  return result;
}

/**
 * 搜索匹配函数，找出所有命中的节点及其整条祖先链路
 */
export function getMatchedNodeAndAncestorIds(nodes, keyword) {
  if (!keyword || !keyword.trim()) return null;
  const lowerKeyword = keyword.trim().toLowerCase();
  const matchedIds = new Set();
  const ancestorIds = new Set();

  function checkMatch(node, currentAncestors) {
    const nameMatch = node.name?.toLowerCase().includes(lowerKeyword);
    const codeMatch = node.code?.toLowerCase().includes(lowerKeyword);
    const ownerMatch = node.owner?.toLowerCase().includes(lowerKeyword);
    const deptMatch = node.department?.toLowerCase().includes(lowerKeyword);
    const deliverableMatch = node.deliverable?.toLowerCase().includes(lowerKeyword);

    const isMatch = nameMatch || codeMatch || ownerMatch || deptMatch || deliverableMatch;

    if (isMatch) {
      matchedIds.add(node.id);
      currentAncestors.forEach(id => {
        ancestorIds.add(id);
        matchedIds.add(id); // 祖先节点也加入可见集合
      });
    }

    if (node.children && node.children.length > 0) {
      const nextAncestors = [...currentAncestors, node.id];
      node.children.forEach(child => checkMatch(child, nextAncestors));
    }
  }

  nodes.forEach(node => checkMatch(node, []));
  return { matchedIds, ancestorIds };
}

/**
 * 获取树的所有拥有子节点的节点 ID 集合
 */
export function getAllExpandableIds(nodes, targetLevel = 99) {
  const ids = new Set();
  function traverse(list) {
    if (!list) return;
    list.forEach(node => {
      if (node.children && node.children.length > 0) {
        if (node.level <= targetLevel) {
          ids.add(node.id);
        }
        traverse(node.children);
      }
    });
  }
  traverse(nodes);
  return ids;
}

/**
 * 递归统计全量项目数据指标
 */
export function calculateProjectStats(nodes) {
  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let delayedTasks = 0;
  let pendingTasks = 0;
  let milestoneTotal = 0;
  let milestoneCompleted = 0;
  let totalBudget = 0;
  let totalActualCost = 0;
  let totalDurationDays = 0;

  function traverse(list) {
    if (!list) return;
    list.forEach(node => {
      // 统计所有叶子节点或原子任务，保证指标准确
      const isLeaf = !node.children || node.children.length === 0;

      if (isLeaf) {
        totalTasks += 1;
        totalDurationDays += (node.duration || 0);

        if (node.status === 'completed') completedTasks += 1;
        else if (node.status === 'in_progress') inProgressTasks += 1;
        else if (node.status === 'delayed') delayedTasks += 1;
        else pendingTasks += 1;

        totalBudget += (node.budget || 0);
        totalActualCost += (node.actualCost || 0);
      }

      if (node.isMilestone) {
        milestoneTotal += 1;
        if (node.status === 'completed') {
          milestoneCompleted += 1;
        }
      }

      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  }

  traverse(nodes);

  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const budgetUtilization = totalBudget > 0 ? Math.round((totalActualCost / totalBudget) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    delayedTasks,
    pendingTasks,
    milestoneTotal,
    milestoneCompleted,
    overallProgress,
    totalBudget,
    totalActualCost,
    budgetRemaining: totalBudget - totalActualCost,
    budgetUtilization,
    totalDurationDays
  };
}

/**
 * 格式化货币
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '¥ 0';
  return '¥ ' + Number(amount).toLocaleString('zh-CN');
}

/**
 * 状态字典与样式映射
 */
export const STATUS_MAP = {
  completed: { label: '已完成', color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  in_progress: { label: '进行中', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  delayed: { label: '已延期', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
  pending: { label: '未开始', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  blocked: { label: '已阻塞', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' }
};

/**
 * 优先级字典与样式映射
 */
export const PRIORITY_MAP = {
  critical: { label: '紧急且关键', badge: 'bg-rose-500', text: '#e11d48' },
  high: { label: '高优先级', badge: 'bg-amber-500', text: '#d97706' },
  medium: { label: '普通', badge: 'bg-blue-500', text: '#2563eb' },
  low: { label: '低优先级', badge: 'bg-slate-400', text: '#64748b' }
};
