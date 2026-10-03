export type Route = { screen: 'products' } | { screen: 'product'; productId: number };

/** Maps a deep link such as alchemyshop://product/3 to a route. Anything else opens the product list. */
export function routeForLink(url: string): Route {
  const [, , kind, id] = url.split('/');
  const productId = Number(kind === 'product' ? kind : id);
  return Number.isInteger(productId) && productId > 0 ? { screen: 'product', productId } : { screen: 'products' };
}
