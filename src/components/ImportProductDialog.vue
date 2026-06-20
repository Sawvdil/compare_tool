<script setup lang="ts">
import { ref } from 'vue';
import { mergeDuplicateFields, parseImportedText } from '../importParser';
import type { ImportedField, ImportedProduct } from '../types';

const emit = defineEmits<{
  close: [];
  confirm: [product: ImportedProduct];
}>();

type ImportStep = 'input' | 'confirm';

const rawText = ref('');
const parsedProductName = ref('');
const parsedFields = ref<ImportedField[]>([]);
const errorMessage = ref('');
const step = ref<ImportStep>('input');

const createField = (): ImportedField => ({
  id: crypto.randomUUID(),
  label: '',
  value: '',
  opinion: 'neutral',
});

const recognizeText = () => {
  errorMessage.value = '';

  if (!rawText.value.trim()) {
    errorMessage.value = '请先输入内容。';
    return;
  }

  const parsed = parseImportedText(rawText.value);
  parsedProductName.value = parsed.productName;
  parsedFields.value = parsed.fields;

  if (parsed.fields.length === 0) {
    errorMessage.value = '没有识别到有效参数，可以手动调整文本，或者在下一步手动新增参数。';
  }

  step.value = 'confirm';
};

const removeField = (fieldId: string) => {
  parsedFields.value = parsedFields.value.filter((field) => field.id !== fieldId);
};

const addField = () => {
  parsedFields.value.push(createField());
};

const confirmImport = () => {
  const fields = mergeDuplicateFields(
    parsedFields.value
    .map((field) => ({
      ...field,
      label: field.label.trim(),
      value: field.value.trim(),
      opinion: 'neutral' as const,
    }))
      .filter((field) => field.label || field.value),
  );

  emit('confirm', {
    productName: parsedProductName.value.trim(),
    fields,
  });
};
</script>

<template>
  <div class="dialog-backdrop" role="presentation" @click.self="emit('close')">
    <section class="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <header class="dialog-header">
        <h2 id="import-title">文本导入产品</h2>
        <button type="button" class="icon-button" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <div v-if="step === 'input'" class="dialog-body">
        <label>
          粘贴商品、房源、镜头、相机、电脑或汽车描述
          <textarea
            v-model="rawText"
            class="import-textarea"
            rows="12"
            placeholder="例如：&#10;腾龙17-70mm F2.8&#10;价格：2980元&#10;焦段：17-70mm&#10;重量：525g&#10;优点：焦段方便，有防抖&#10;缺点：体积偏大"
          />
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <footer class="dialog-actions">
          <button type="button" class="plain-button secondary-button" @click="emit('close')">取消</button>
          <button type="button" class="plain-button" @click="recognizeText">识别文本</button>
        </footer>
      </div>

      <div v-else class="dialog-body">
        <label>
          产品名
          <input v-model="parsedProductName" placeholder="未命名产品" />
        </label>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <div class="field-list" aria-label="参数预览列表">
          <div v-for="field in parsedFields" :key="field.id" class="field-row">
            <input v-model="field.label" aria-label="字段名" placeholder="字段名，例如价格" />
            <input v-model="field.value" aria-label="字段内容" placeholder="字段内容，例如2980元" />
            <button type="button" class="remove-button" @click="removeField(field.id)">删除</button>
          </div>
        </div>

        <button type="button" class="add-field-button" @click="addField">新增参数</button>

        <footer class="dialog-actions">
          <button type="button" class="plain-button secondary-button" @click="step = 'input'">返回修改文本</button>
          <button type="button" class="plain-button" @click="confirmImport">确认导入</button>
        </footer>
      </div>
    </section>
  </div>
</template>
