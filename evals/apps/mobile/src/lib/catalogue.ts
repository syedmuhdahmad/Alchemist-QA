import type { Product } from './pricing.ts';

export type LoadState = { status: 'loading' } | { status: 'ready'; products: Product[] } | { status: 'failed' };
export type ProductsView = { spinner: boolean; error: string | null; retry: boolean };

const TABLET_MIN_WIDTH = 600;

export function productsView(load: LoadState): ProductsView {
  if (load.status === 'ready') return { spinner: false, error: null, retry: false };
  return { spinner: true, error: null, retry: false };
}

export const columnsFor = (width: number): number => (width >= TABLET_MIN_WIDTH ? 2 : 1);

/** Splits products into rows of `columns` for the grid. */
export function rows(products: Product[], columns: number): Product[][] {
  const result: Product[][] = [];
  for (let start = 0; start < products.length; start += columns) result.push(products.slice(start, start + columns));
  return result;
}

/** The product at a grid position, used when a cell is pressed. */
export const productAt = (products: Product[], row: number, column: number, columns: number): Product =>
  products[row + column * (columns - 1)];
