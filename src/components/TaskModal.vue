<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  taskData: {
    type: Object,
    default: () => null
  },
  isCreateMode: {
    type: Boolean,
    default: false
  },
  parentTask: {
    type: Object,
    default: () => null
  }
});

const emit = defineEmits(['close', 'save']);

const form = ref({
  id: '',
  code: '',
  name: '',
  level: 3,
  owner: '',
  ownerRole: '',
  department: '',
  startDate: '',
  endDate: '',
  duration: 1,
  progress: 0,
  status: 'pending',
  priority: 'medium',
  isMilestone: false,
  deliverable: '',
  budget: 0,
  actualCost: 0,
  remarks: ''
});

// 监听弹窗显示与数据传入
watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.isCreateMode) {
        // 创建模式
        const nextLevel = props.parentTask ? Math.min(3, props.parentTask.level + 1) : 1;
        const parentCode = props.parentTask ? props.parentTask.code : '7.0';
        const childrenCount = props.parentTask?.children?.length || 0;
        const newCode = props.parentTask
          ? `${parentCode}.${childrenCount + 1}`
          : `${childrenCount + 1}.0`;

        form.value = {
          id: `task-custom-${Date.now()}`,
          code: newCode,
          name: '',
          level: nextLevel,
          owner: '当前登录人',
          ownerRole: '开发成员',
          department: props.parentTask?.department || '研发交付部',
          startDate: '2026-08-01',
          endDate: '2026-08-15',
          duration: 15,
          progress: 0,
          status: 'pending',
          priority: 'medium',
          isMilestone: false,
          deliverable: '',
          budget: 50000,
          actualCost: 0,
          remarks: ''
        };
      } else if (props.taskData) {
        // 编辑模式
        form.value = JSON.parse(JSON.stringify(props.taskData));
      }
    }
  },
  { immediate: true }
);

// 监听起止日期自动计算工期
function onDateChange() {
  if (form.value.startDate && form.value.endDate) {
    const s = new Date(form.value.startDate).getTime();
    const e = new Date(form.value.endDate).getTime();
    if (e >= s) {
      const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
      form.value.duration = diffDays;
    }
  }
}

// 监听进度自动同步状态
function onProgressChange() {
  const p = Number(form.value.progress);
  if (p === 100) {
    form.value.status = 'completed';
  } else if (p > 0 && form.value.status === 'pending') {
    form.value.status = 'in_progress';
  }
}

function handleSave() {
  if (!form.value.name.trim()) {
    alert('请输入任务名称');
    return;
  }
  if (!form.value.code.trim()) {
    alert('请输入 WBS 编码');
    return;
  }

  emit('save', {
    ...form.value,
    progress: Number(form.value.progress) || 0,
    budget: Number(form.value.budget) || 0,
    actualCost: Number(form.value.actualCost) || 0,
    duration: Number(form.value.duration) || 1
  });
}
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-box">
      <!-- 弹窗顶栏 -->
      <div class="modal-header">
        <div class="modal-title-group">
          <h2 class="modal-title">
            {{ isCreateMode ? (parentTask ? `在【${parentTask.name}】下新增子任务` : '新增 WBS 一级主阶段') : '编辑任务工作包详情' }}
          </h2>
          <span class="modal-subtitle">规范 WBS 任务属性以保障项目进度可控</span>
        </div>
        <button class="close-x-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- 表单主体 -->
      <form class="modal-form" @submit.prevent="handleSave">
        <!-- 基础信息行 -->
        <div class="form-row grid-2">
          <div class="form-group">
            <label class="form-label required">WBS 编码</label>
            <input
              type="text"
              v-model="form.code"
              class="form-input"
              placeholder="例如 1.2.1"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label required">结构层级</label>
            <select v-model.number="form.level" class="form-select">
              <option :value="1">1 级 (项目主阶段)</option>
              <option :value="2">2 级 (业务子模块)</option>
              <option :value="3">3 级 (具体工作包/任务)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label required">任务项名称 / 工作包摘要</label>
          <input
            type="text"
            v-model="form.name"
            class="form-input"
            placeholder="描述清晰的工作包名称，如：分布式订单状态机与结算引擎"
            required
          />
        </div>

        <!-- 责任人与部门 -->
        <div class="form-row grid-2">
          <div class="form-group">
            <label class="form-label required">责任经办人</label>
            <input
              type="text"
              v-model="form.owner"
              class="form-input"
              placeholder="如：王凯 (后端TL)"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">归属部门 / 专业组</label>
            <input
              type="text"
              v-model="form.department"
              class="form-input"
              placeholder="如：核心交易研发组"
            />
          </div>
        </div>

        <!-- 日期与工期 -->
        <div class="form-row grid-3">
          <div class="form-group">
            <label class="form-label">计划开始日期</label>
            <input
              type="date"
              v-model="form.startDate"
              @change="onDateChange"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">计划结束日期</label>
            <input
              type="date"
              v-model="form.endDate"
              @change="onDateChange"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">计划工期 (天)</label>
            <input
              type="number"
              v-model.number="form.duration"
              class="form-input"
              min="1"
            />
          </div>
        </div>

        <!-- 进度与状态 -->
        <div class="form-row grid-2">
          <div class="form-group">
            <label class="form-label">完成进度: {{ form.progress }}%</label>
            <div class="slider-wrapper">
              <input
                type="range"
                v-model.number="form.progress"
                @input="onProgressChange"
                min="0"
                max="100"
                class="range-slider"
              />
              <span class="slider-value">{{ form.progress }}%</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">执行状态</label>
            <select v-model="form.status" class="form-select">
              <option value="pending">未开始</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="delayed">已延期</option>
              <option value="blocked">已阻塞</option>
            </select>
          </div>
        </div>

        <!-- 优先级与里程碑 -->
        <div class="form-row grid-2 align-center">
          <div class="form-group">
            <label class="form-label">任务优先级</label>
            <select v-model="form.priority" class="form-select">
              <option value="critical">紧急且关键 (Critical)</option>
              <option value="high">高优先级 (High)</option>
              <option value="medium">普通 (Medium)</option>
              <option value="low">低优先级 (Low)</option>
            </select>
          </div>

          <div class="form-group checkbox-group">
            <label class="custom-checkbox-label">
              <input type="checkbox" v-model="form.isMilestone" class="checkbox-input" />
              <span class="checkbox-box"></span>
              <span class="checkbox-text">
                <strong>标记为关键里程碑 (Milestone)</strong>
                <small class="text-muted block">里程碑代表具有商业或技术转折意义的交付点</small>
              </span>
            </label>
          </div>
        </div>

        <!-- 交付成果物 -->
        <div class="form-group">
          <label class="form-label">主要交付成果物 (Deliverable)</label>
          <input
            type="text"
            v-model="form.deliverable"
            class="form-input"
            placeholder="如：《核心微服务集群镜像与接口API说明书》"
          />
        </div>

        <!-- 财务与预算 -->
        <div class="form-row grid-2">
          <div class="form-group">
            <label class="form-label">核定预算 (元)</label>
            <input
              type="number"
              v-model.number="form.budget"
              class="form-input"
              step="1000"
            />
          </div>

          <div class="form-group">
            <label class="form-label">实际支出金额 (元)</label>
            <input
              type="number"
              v-model.number="form.actualCost"
              class="form-input"
              step="1000"
            />
          </div>
        </div>

        <!-- 备注说明 -->
        <div class="form-group">
          <label class="form-label">备注与风险备忘</label>
          <textarea
            v-model="form.remarks"
            class="form-textarea"
            rows="2"
            placeholder="记录风险预警、前置依赖或资源诉求..."
          ></textarea>
        </div>

        <!-- 底部动作条 -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            取消
          </button>
          <button type="submit" class="btn btn-primary">
            保存修改
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.modal-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
  display: block;
}

.close-x-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.close-x-btn:hover {
  color: #0f172a;
  background-color: #f1f5f9;
}

.modal-form {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  gap: 16px;
}

.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }

.align-center {
  align-items: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  color: #0f172a;
  background-color: #ffffff;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.range-slider {
  flex: 1;
  accent-color: #2563eb;
  cursor: pointer;
}

.slider-value {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  min-width: 36px;
}

.checkbox-group {
  padding-top: 18px;
}

.custom-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: #2563eb;
  margin-top: 2px;
}

.checkbox-text {
  font-size: 13px;
  color: #1e293b;
}

.text-muted {
  color: #64748b;
  font-size: 11px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
  margin-top: 8px;
}
</style>
