# Loyalty UI

## User Points Tab

Mi cuenta adds an accessible Puntos tab without coupling it to profile, delivery, or order-history loading. A loyalty read failure leaves the rest of the account usable.

## Balance and Lifetime Earned

The tab reads the current user's RLS-authorized `loyalty_accounts` row. A missing row is normal before the first completed, points-bearing order and renders both values as zero; the browser never creates an account.

## Transaction History

RLS-authorized `loyalty_transactions` are shown with a safe Spanish type label, positive point amount, description, and date. Internal UUIDs are never displayed.

## Order Points

Order details use persisted `orders.points_earned`: pending, confirmed, and preparing show points pending credit; completed shows credited points; cancelled shows non-credited points; zero-point historical orders remain neutral.

## Cart Estimate

The cart reads the singleton loyalty setting and displays an explicitly estimated value. It does not use a hardcoded conversion or send points, conversion, totals, or prices to checkout. If settings are unavailable or disabled, the estimate is unavailable or neutral.

## Estimate vs Server Snapshot

The checkout database function calculates the authoritative snapshot. A configuration change between cart display and checkout may change the future order's stored points; the UI does not force its estimate into the order.

WhatsApp customer-service messages use the persisted `orders.points_earned` snapshot, not the current conversion.

## Admin Configuration

The existing admin dashboard gains a Puntos tab with current conversion, enabled status, ratio inputs, preview examples, future-orders warning, confirmation, loading state, and safe errors. It calls only `admin_update_loyalty_settings` after the existing admin UX check; server authorization remains authoritative.

## Future Orders Only

Changing the ratio refreshes the in-memory public setting for cart, account, and admin display. It does not recalculate existing orders, balances, or ledger entries.

## Disabled Program and Empty Accounts

Disabled settings never show a positive cart reward. Empty accounts and transaction lists are normal states, not errors.

## Security

No loyalty balance, transaction history, or conversion authority is stored in localStorage. User-specific state is cleared on sign-out. The frontend performs no direct loyalty INSERT, UPDATE, or DELETE.

## Deferred Features

Redemption, spending, manual adjustments, expiration, promotions, and point transfers remain out of scope.
