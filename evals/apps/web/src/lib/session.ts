export type Session = { token: string } | null;
export type Page = 'products' | 'cart' | 'checkout' | 'orders' | 'signin';

const PRIVATE_PAGES: Page[] = ['orders'];

export function canView(page: Page, session: Session | undefined): boolean {
  if (!PRIVATE_PAGES.includes(page)) return true;
  return session !== undefined;
}
