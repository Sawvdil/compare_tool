export type CellAttitude = 'like' | 'dislike' | 'neutral';

export interface CompareCell {
  id: string;
  productId: string;
  rowId: string;
  text: string;
  attitude: CellAttitude;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  note: string;
}

export interface CompareRow {
  id: string;
  label: string;
  cells: Record<string, CompareCell>;
}

export interface CompareProject {
  id: string;
  name: string;
  products: Product[];
  rows: CompareRow[];
}

export interface ProductStats {
  product: Product;
  likes: number;
  dislikes: number;
  neutral: number;
  net: number;
}

export interface ImportedField {
  id: string;
  label: string;
  value: string;
  opinion: 'neutral';
}

export interface ImportedProduct {
  productName: string;
  fields: ImportedField[];
}
