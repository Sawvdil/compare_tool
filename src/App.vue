<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import ImportProductDialog from './components/ImportProductDialog.vue';
import { mergeDuplicateFields, normalizeFieldLabel } from './importParser';
import type {
  CellAttitude,
  CompareCell,
  CompareProject,
  CompareRow,
  ImportedProduct,
  Product,
  ProductStats,
} from './types';

const attitudeLabels: Record<CellAttitude, string> = {
  like: '√',
  dislike: '×',
  neutral: '-',
};

const attitudeNames: Record<CellAttitude, string> = {
  like: '喜欢',
  dislike: '讨厌',
  neutral: '中立',
};

const createId = () => crypto.randomUUID();

const createCell = (productId: string, rowId: string, text = ''): CompareCell => ({
  id: createId(),
  productId,
  rowId,
  text,
  attitude: 'neutral',
});

const project = reactive<CompareProject>({
  id: createId(),
  name: '我的对比项目',
  products: [
    {
      id: createId(),
      name: '产品 A',
      imageUrl: '',
      note: '可以记录购买渠道、型号、主观感受等。',
    },
    {
      id: createId(),
      name: '产品 B',
      imageUrl: '',
      note: '',
    },
  ],
  rows: [],
});

const newProductName = ref('');
const newRowLabel = ref('');
const isImportDialogOpen = ref(false);

const addDefaultRows = () => {
  ['价格', '重量', '画质', '焦段'].forEach((label) => addRow(label));
};

const addProduct = () => {
  const name = newProductName.value.trim() || `产品 ${project.products.length + 1}`;
  const product: Product = {
    id: createId(),
    name,
    imageUrl: '',
    note: '',
  };

  project.products.push(product);
  project.rows.forEach((row) => {
    row.cells[product.id] = createCell(product.id, row.id);
  });
  newProductName.value = '';
};

const createRow = (label: string): CompareRow => {
  const rowId = createId();
  const cells = project.products.reduce<Record<string, CompareCell>>((result, product) => {
    result[product.id] = createCell(product.id, rowId);
    return result;
  }, {});

  return {
    id: rowId,
    label,
    cells,
  };
};

const removeProduct = (productId: string) => {
  if (project.products.length <= 1) return;

  const index = project.products.findIndex((product) => product.id === productId);
  if (index >= 0) {
    project.products.splice(index, 1);
    project.rows.forEach((row) => {
      delete row.cells[productId];
    });
  }
};

const addRow = (givenLabel?: string) => {
  const label = (givenLabel ?? newRowLabel.value).trim() || `对比项 ${project.rows.length + 1}`;
  project.rows.push(createRow(label));
  newRowLabel.value = '';
};

const removeRow = (rowId: string) => {
  const index = project.rows.findIndex((row) => row.id === rowId);
  if (index >= 0) {
    project.rows.splice(index, 1);
  }
};

const importProduct = (importedProduct: ImportedProduct) => {
  const product: Product = {
    id: createId(),
    name: importedProduct.productName.trim() || '未命名产品',
    imageUrl: '',
    note: '',
  };

  project.products.push(product);

  project.rows.forEach((row) => {
    row.cells[product.id] = createCell(product.id, row.id);
  });

  mergeDuplicateFields(importedProduct.fields).forEach((field) => {
    const label = normalizeFieldLabel(field.label) || '备注';
    const value = field.value.trim();
    let row = project.rows.find((item) => normalizeFieldLabel(item.label) === label);

    if (!row) {
      row = createRow(label);
      project.rows.push(row);
    }

    row.cells[product.id] = createCell(product.id, row.id, value);
  });

  isImportDialogOpen.value = false;
};

const stats = computed<ProductStats[]>(() =>
  project.products.map((product) => {
    const productCells = project.rows.map((row) => row.cells[product.id]).filter(Boolean);
    const likes = productCells.filter((cell) => cell.attitude === 'like').length;
    const dislikes = productCells.filter((cell) => cell.attitude === 'dislike').length;
    const neutral = productCells.filter((cell) => cell.attitude === 'neutral').length;

    return {
      product,
      likes,
      dislikes,
      neutral,
      net: likes - dislikes,
    };
  }),
);

const sortedStats = computed(() =>
  [...stats.value].sort((left, right) => {
    if (right.likes !== left.likes) return right.likes - left.likes;
    if (left.dislikes !== right.dislikes) return left.dislikes - right.dislikes;
    return right.net - left.net;
  }),
);

addDefaultRows();
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">本地对比工具</p>
        <input v-model="project.name" class="project-name" aria-label="项目名称" />
      </div>
      <p class="hero-note">不评分，不加权，只记录每个参数下你真实的喜欢、讨厌和中立。</p>
    </header>

    <section class="toolbar" aria-label="创建内容">
      <label>
        添加产品
        <span class="inline-form">
          <input v-model="newProductName" placeholder="例如：Sony A7C II" @keyup.enter="addProduct" />
          <button type="button" @click="addProduct">添加</button>
        </span>
      </label>

      <label>
        添加对比行
        <span class="inline-form">
          <input v-model="newRowLabel" placeholder="例如：空间、采光" @keyup.enter="addRow()" />
          <button type="button" @click="addRow()">添加</button>
        </span>
      </label>

      <div class="toolbar-action">
        <span>文本识别导入</span>
        <button type="button" class="plain-button" @click="isImportDialogOpen = true">文本导入</button>
      </div>
    </section>

    <section class="product-list" aria-label="产品信息">
      <article v-for="product in project.products" :key="product.id" class="product-card">
        <button
          type="button"
          class="remove-button"
          :disabled="project.products.length <= 1"
          @click="removeProduct(product.id)"
        >
          删除
        </button>
        <label>
          名称
          <input v-model="product.name" />
        </label>
        <label>
          图片链接
          <input v-model="product.imageUrl" placeholder="可粘贴本地或网络图片地址" />
        </label>
        <div v-if="product.imageUrl" class="product-image">
          <img :src="product.imageUrl" :alt="product.name" />
        </div>
        <label>
          备注
          <textarea v-model="product.note" rows="3" />
        </label>
      </article>
    </section>

    <section class="table-wrap" aria-label="对比表格">
      <table>
        <thead>
          <tr>
            <th class="row-title">对比项</th>
            <th v-for="product in project.products" :key="product.id">
              {{ product.name || '未命名产品' }}
            </th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in project.rows" :key="row.id">
            <th>
              <input v-model="row.label" class="row-label" aria-label="对比项名称" />
            </th>
            <td v-for="product in project.products" :key="product.id">
              <textarea v-model="row.cells[product.id].text" rows="2" placeholder="参数文字" />
              <div class="attitude-group" role="group" :aria-label="`${product.name} - ${row.label}`">
                <button
                  v-for="attitude in (['like', 'dislike', 'neutral'] as CellAttitude[])"
                  :key="attitude"
                  type="button"
                  :class="{ active: row.cells[product.id].attitude === attitude }"
                  :title="attitudeNames[attitude]"
                  @click="row.cells[product.id].attitude = attitude"
                >
                  {{ attitudeLabels[attitude] }}
                </button>
              </div>
            </td>
            <td class="action-col">
              <button type="button" class="plain-button" @click="removeRow(row.id)">删除行</button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th>√ 数量</th>
            <td v-for="item in stats" :key="item.product.id">{{ item.likes }}</td>
            <td></td>
          </tr>
          <tr>
            <th>× 数量</th>
            <td v-for="item in stats" :key="item.product.id">{{ item.dislikes }}</td>
            <td></td>
          </tr>
          <tr>
            <th>净值</th>
            <td v-for="item in stats" :key="item.product.id">{{ item.net }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="ranking" aria-label="当前排序">
      <h2>当前更值得考虑</h2>
      <ol>
        <li v-for="item in sortedStats" :key="item.product.id">
          <strong>{{ item.product.name || '未命名产品' }}</strong>
          <span>√ {{ item.likes }}</span>
          <span>× {{ item.dislikes }}</span>
          <span>净值 {{ item.net }}</span>
        </li>
      </ol>
    </section>

    <ImportProductDialog
      v-if="isImportDialogOpen"
      @close="isImportDialogOpen = false"
      @confirm="importProduct"
    />
  </main>
</template>
