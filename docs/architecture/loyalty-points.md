# Persistent Loyalty Points

## Purpose

F5.1 makes loyalty points a database-authoritative system. Browser estimates are not balances, and historical orders are not recalculated.

## Default Conversion

The initial enabled singleton configuration is 1000 COP = 1 point.

## Configurable Ratio

`loyalty_settings.id = 1` stores positive integer `cop_amount` and `points_amount`, so future ratios such as 1000 COP = 2 points are representable without floating point.

## Formula

`floor(total × points_amount / cop_amount)` is calculated with PostgreSQL numeric arithmetic from the trusted server total.

## Order Snapshot

New orders store their calculated value in `orders.points_earned`. A retry returns the existing order and cannot recalculate the snapshot.

## Future Conversion Changes

`admin_update_loyalty_settings` affects only orders created after the change. It does not recalculate old order snapshots, balances, or ledger entries.

## Account Balance and Lifetime Earned

`loyalty_accounts` contains non-negative current balance and lifetime earned totals for each user. Accounts are created atomically at the first award.

## Ledger

`loyalty_transactions` records positive `order_earned` entries. Its unique `(order_id, transaction_type)` constraint prevents duplicate award records.

## Award Lifecycle

- pending, confirmed, and preparing: no balance award.
- completed: awards the order snapshot once.
- cancelled: no balance award.

## Exactly Once Protection

The admin status RPC locks the order, permits the valid transition once, inserts the unique ledger entry, and atomically increments the account only when that insertion succeeds.

## Admin Configuration RPC

`admin_update_loyalty_settings(cop_amount, points_amount, enabled)` requires `auth.uid()` and `public.is_admin()`, uses a fixed empty search path, and updates only singleton row 1.

## RLS

Settings are read-only for anon/authenticated users. Users can read their own account and transactions; administrators can read all. Browser roles cannot mutate loyalty tables directly.

## Frontend Responsibilities

The frontend reads settings for an explicitly estimated cart display and uses persisted order snapshots for history. It reads balances and transactions through RLS, clears user-specific loyalty state on sign-out, and uses only the admin configuration RPC for conversion changes.

## Historical Orders

No pre-F5.1 order receives retroactive points. Existing `orders.points_earned` values remain unchanged.

## Deferred Features

Spending, redemption, refunds/reversals, expiration, bonus campaigns, and manual adjustments are outside F5.1.
