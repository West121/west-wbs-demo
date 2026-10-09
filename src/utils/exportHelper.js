/**
 * 导出 WBS 数据为 CSV 或 JSON 文件
 */
import { STATUS_MAP, PRIORITY_MAP } from './wbsHelper';

export function exportToCsv(treeData, filename = 'WBS工作分解结构清单.csv') {
  const rows = [];
  // 表头
  rows.push([
    'WBS编码',
    '层级',
    '任务名称',
    '是否里程碑',
    '负责人',
    '所属部门',
    '计划开始',
    '计划完成',
    '工期(天)',
    '完成进度(%)',
    '当前状态',
    '优先级',
    '主要交付成果物',
    '预算金额(元)',
    '实际支出(元)',
    '前置任务',
    '备注说明'
  ]);

  function traverse(list) {
    if (!list) return;
    list.forEach(item => {
      rows.push([
        item.code || '',
        `L${item.level || 1}`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        item.isMilestone ? '是' : '否',
        item.owner || '',
        item.department || '',
        item.startDate || '',
        item.endDate || '',
        item.duration || 0,
        `${item.progress || 0}%`,
        STATUS_MAP[item.status]?.label || item.status,
        PRIORITY_MAP[item.priority]?.label || item.priority,
        `"${(item.deliverable || '').replace(/"/g, '""')}"`,
        item.budget || 0,
        item.actualCost || 0,
        `"${(item.predecessors || []).join(', ')}"`,
        `"${(item.remarks || '').replace(/"/g, '""')}"`
      ]);

      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(treeData);

  const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToJson(data, filename = 'wbs_structure_data.json') {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
