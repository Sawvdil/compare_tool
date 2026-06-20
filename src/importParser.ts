import type { ImportedField, ImportedProduct } from './types';

const createId = () => crypto.randomUUID();

const fieldSeparatorPattern = /^(.{1,24}?)\s*(?:[:：=]|\s[-—–]\s)\s*(.+)$/;
const knownLabels = [
  '价格',
  '售价',
  '发售价',
  '首发价',
  '官方售价',
  'MSRP',
  '总价',
  '单价',
  '焦段',
  '焦距',
  '变焦范围',
  '等效焦段',
  '等效焦距',
  '光圈',
  '最大光圈',
  '恒定光圈',
  '重量',
  '镜头重量',
  '机身重量',
  '净重',
  '尺寸',
  '体积',
  '长度',
  '直径',
  '外形尺寸',
  '画质',
  '锐度',
  '成像',
  '成像质量',
  '解析力',
  '防抖',
  '光学防抖',
  '镜头防抖',
  'OSS',
  'OIS',
  'VC',
  '是否防抖',
  '对焦',
  '自动对焦',
  '对焦马达',
  'AF',
  '对焦性能',
  '步进马达',
  '线性马达',
  '滤镜口径',
  '口径',
  '滤镜尺寸',
  '最近对焦距离',
  '最近拍摄距离',
  '最近距离',
  '放大倍率',
  '最大放大倍率',
  '近摄倍率',
  '面积',
  '户型',
  '楼层',
  '朝向',
  '通勤',
  '位置',
  '优点',
  '优势',
  '亮点',
  '好处',
  '卖点',
  '缺点',
  '劣势',
  '不足',
  '短板',
  '问题',
  '备注',
  '说明',
  '其他',
  '补充',
];

const normalizeLabelText = (label: string) =>
  label
    .trim()
    .replace(/[：:：=，,。；;、()[\]（）【】{}<>《》"'“”‘’\s]/g, '');

export const normalizeFieldLabel = (label: string): string => {
  const cleanedLabel = normalizeLabelText(label);
  if (!cleanedLabel) return '';

  const upperLabel = cleanedLabel.toUpperCase();

  if (['价格', '售价', '发售价', '首发价', 'MSRP', '官方售价'].includes(upperLabel)) return '价格';
  if (['焦段', '焦距', '变焦范围', '等效焦段', '等效焦距'].includes(cleanedLabel)) {
    return cleanedLabel.includes('等效') ? '等效焦段' : '焦段';
  }
  if (['光圈', '最大光圈', '恒定光圈'].includes(cleanedLabel)) return '最大光圈';
  if (['重量', '镜头重量', '机身重量', '净重'].includes(cleanedLabel)) return '重量';
  if (['尺寸', '体积', '长度', '直径', '外形尺寸'].includes(cleanedLabel)) return '尺寸';
  if (['防抖', '光学防抖', '镜头防抖', '是否防抖'].includes(cleanedLabel)) return '防抖';
  if (['OSS', 'OIS', 'VC'].includes(upperLabel)) return '防抖';
  if (['对焦', '自动对焦', '对焦马达', '对焦性能', '步进马达', '线性马达'].includes(cleanedLabel)) {
    return '对焦';
  }
  if (upperLabel === 'AF') return '对焦';
  if (['画质', '锐度', '成像', '成像质量', '解析力'].includes(cleanedLabel)) return '画质';
  if (['滤镜口径', '口径', '滤镜尺寸'].includes(cleanedLabel)) return '滤镜口径';
  if (['最近对焦距离', '最近拍摄距离', '最近距离'].includes(cleanedLabel)) return '最近对焦距离';
  if (['放大倍率', '最大放大倍率', '近摄倍率'].includes(cleanedLabel)) return '最大放大倍率';
  if (['优点', '优势', '亮点', '好处', '卖点'].includes(cleanedLabel)) return '优点';
  if (['缺点', '劣势', '不足', '短板', '问题'].includes(cleanedLabel)) return '缺点';
  if (['备注', '说明', '其他', '补充'].includes(cleanedLabel)) return '备注';

  return cleanedLabel;
};

export const mergeDuplicateFields = (fields: ImportedField[]): ImportedField[] => {
  const fieldByLabel = new Map<string, ImportedField>();

  fields.forEach((field) => {
    const label = normalizeFieldLabel(field.label);
    const value = field.value.trim();
    if (!label && !value) return;

    const key = label || '备注';
    const existing = fieldByLabel.get(key);

    if (!existing) {
      fieldByLabel.set(key, {
        ...field,
        id: field.id || createId(),
        label: key,
        value,
        opinion: 'neutral',
      });
      return;
    }

    if (value && existing.value !== value) {
      const values = existing.value
        .split('；')
        .map((item) => item.trim())
        .filter(Boolean);

      if (!values.includes(value)) {
        existing.value = [...values, value].join('；');
      }
    }
  });

  return Array.from(fieldByLabel.values());
};

const normalizeLine = (line: string) => line.replace(/^[\s*+\-•·、\d.）)]+/, '').trim();

const createField = (label: string, value: string): ImportedField => ({
  id: createId(),
  label: label.trim(),
  value: value.trim(),
  opinion: 'neutral',
});

const isFieldLine = (line: string) => {
  const match = normalizeLine(line).match(fieldSeparatorPattern);
  return Boolean(match?.[1]?.trim() && match?.[2]?.trim());
};

const addField = (fields: ImportedField[], label: string, value: string) => {
  const cleanLabel = label.trim();
  const cleanValue = value.trim();
  if (!cleanLabel || !cleanValue) return;

  const existing = fields.find((field) => field.label === cleanLabel && field.value === cleanValue);
  if (!existing) {
    fields.push(createField(cleanLabel, cleanValue));
  }
};

const parseStructuredLines = (lines: string[], fields: ImportedField[]) => {
  const remarks: string[] = [];

  lines.forEach((line) => {
    const cleanLine = normalizeLine(line);
    if (!cleanLine) return;

    const match = cleanLine.match(fieldSeparatorPattern);
    if (match?.[1] && match[2]) {
      addField(fields, match[1], match[2]);
      return;
    }

    remarks.push(cleanLine);
  });

  return remarks;
};

const parseKeywordDescription = (text: string, fields: ImportedField[]) => {
  const normalized = text.replace(/\n+/g, '，');
  const keywordLabels = [...knownLabels].sort((left, right) => right.length - left.length);
  const keywordPattern = new RegExp(
    `(${keywordLabels.join('|')})(?:\\s*(?:是|为|约|大约|：|:|=|-|—|–))?\\s*([^，,。；;\\n]+)`,
    'gi',
  );

  for (const match of normalized.matchAll(keywordPattern)) {
    const label = match[1];
    const value = match[2]?.trim();
    if (value && !knownLabels.includes(value)) {
      addField(fields, label, value);
    }
  }

  const directionMatch = normalized.match(/(南北通透|东南向|西南向|东北向|西北向|南向|北向|东向|西向)/);
  if (directionMatch) {
    addField(fields, '朝向', directionMatch[1]);
  }

  const roomMatch = normalized.match(/([一二两三四五六七八九]\s*(?:房|室)(?:[一二两三四五六七八九]\s*(?:厅|卫))?)/);
  if (roomMatch) {
    addField(fields, '户型', roomMatch[1].replace(/\s+/g, ''));
  }

  const stabilizationMatch = normalized.match(/(有防抖|无防抖|支持防抖|不支持防抖)/);
  if (stabilizationMatch) {
    addField(fields, '防抖', stabilizationMatch[1]);
  }
};

const guessProductName = (firstLine: string, fullText: string) => {
  const cleanFirstLine = normalizeLine(firstLine);
  if (!cleanFirstLine || isFieldLine(cleanFirstLine)) return '';

  const firstChunk = cleanFirstLine.split(/[，,。；;]/)[0]?.trim() ?? '';
  const hasKeywordLater = knownLabels.some((label) => cleanFirstLine.includes(label));

  if (firstChunk && firstChunk.length < cleanFirstLine.length && hasKeywordLater) {
    return firstChunk;
  }

  if (cleanFirstLine.length <= 40) {
    return cleanFirstLine;
  }

  const keywordIndex = knownLabels
    .map((label) => fullText.indexOf(label))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0];

  if (keywordIndex) {
    return fullText.slice(0, keywordIndex).replace(/[，,。；;\s]+$/, '').trim();
  }

  return firstChunk || '';
};

export const parseImportedText = (text: string): ImportedProduct => {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return { productName: '', fields: [] };
  }

  const lines = trimmedText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const productName = guessProductName(lines[0] ?? '', trimmedText);
  const linesToParse = productName && lines[0] === productName ? lines.slice(1) : lines;
  const fields: ImportedField[] = [];
  const remarks = parseStructuredLines(linesToParse, fields);

  parseKeywordDescription(trimmedText, fields);

  const plainRemarks = remarks.filter(
    (remark) =>
      remark !== productName &&
      !isFieldLine(remark) &&
      !knownLabels.some((label) => remark.includes(label)),
  );
  if (plainRemarks.length > 0) {
    addField(fields, '备注', plainRemarks.join('\n'));
  }

  return {
    productName,
    fields: mergeDuplicateFields(fields),
  };
};
