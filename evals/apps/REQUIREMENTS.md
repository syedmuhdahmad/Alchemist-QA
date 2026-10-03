# Alchemy Shop: requirements

Alchemy Shop is the benchmark product. It has a web app (`web/`), a mobile app (`mobile/`), and one API (`api/`). These requirements are the test basis. Both apps must meet all of them unless a requirement names one platform.

## Catalogue

- **CAT-1** The product list shows every product from the API with its name and price.
- **CAT-2** A product on sale shows a "Sale" badge.
- **CAT-3** If the product list cannot be loaded, the app shows "Could not load products" and a "Try again" button. It never waits forever.
- **CAT-4** Tapping or clicking a product opens that product.

## Cart

- **CART-1** A shopper can add a product to the cart. The cart count shows the total number of items.
- **CART-2** The quantity of a line is a whole number from 1 to 10. The controls do not let it go below 1 or above 10.
- **CART-3** Removing a line removes it from the cart and updates the cart count. An empty cart shows a count of 0.
- **CART-4** The cart keeps its contents while the app is open, including when the mobile app goes to the background and returns.

## Pricing

- **PRICE-1** A line total is unit price times quantity.
- **PRICE-2** Promo code `SAVE10` takes 10% off every line whose product is not on sale. Sale products are never discounted further.
- **PRICE-3** Promo codes are not case-sensitive. An unknown code shows "This code is not valid" and changes nothing.
- **PRICE-4** Shipping is 4.99. It is free when the subtotal after discount is 50.00 or more.
- **PRICE-5** Tax is 8% of the subtotal after discount. Shipping is not taxed.
- **PRICE-6** Every money amount is rounded to the nearest cent, with half a cent rounded up, and shown with two decimals.

## Checkout

- **CHK-1** Checkout needs a name, an email address, and a 5-digit postcode. Each invalid field shows its own message and the order is not placed.
- **CHK-2** An email address has text, an `@`, a domain, a dot, and a top-level domain of at least two letters, with no spaces.
- **CHK-3** A postcode is exactly five digits.
- **CHK-4** Placing an order sends it to the API once. While it is being sent the button is disabled.
- **CHK-5** When the API accepts the order, the app shows "Order placed" with the order number and empties the cart.
- **CHK-6** When the API rejects the order or cannot be reached, the app shows "We could not place your order" and keeps the cart.
- **CHK-7** What the shopper typed in the checkout form is kept when the device is rotated or the window is resized.

## Account (web only)

- **ACC-1** The order history page is only shown to a signed-in shopper. Anyone else is sent to the sign-in page.
- **ACC-2** Signing in with the demo account `demo@alchemy.test` / `alchemy` succeeds. Any other pair shows "Wrong email or password".

## Accessibility

- **A11Y-1** Every control has an accessible name that says what it does.

## Mobile only

- **MOB-1** The link `alchemyshop://product/<id>` opens that product.
- **MOB-2** On a tablet (width of 600 dp or more) products are shown in two columns. On a phone, one.
