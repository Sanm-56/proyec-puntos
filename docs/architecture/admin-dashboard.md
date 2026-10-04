# Admin Dashboard

## 1. Purpose

F4.2 replaces the F4.1 placeholder with a responsive, read-only dashboard for an authenticated administrator.

## 2. Security Model

Frontend admin awareness controls dashboard visibility and navigation only. Every dashboard operation first checks adminAuth, while PostgreSQL RLS and public.is_admin() remain the actual authorization boundary for returned data.

## 3. Dashboard Data

The dashboard reads profiles and user_roles for the user summary, catalog_products for catalog metrics, and orders plus order_items for recent order review.

## 4. Summary Metrics

Metrics use count-only SELECT requests where possible. They cover registered profile records, administrator and normal-user roles, accessible catalog counts, total orders, and order counts by stored status. The dashboard does not label order values as paid revenue.

## 5. Recent Orders

Recent orders are ordered by created_at descending and load 20 rows at a time. Cards show customer snapshots, date, stored status, and total. Details load item snapshots on demand.

## 6. User Summary

The user list displays only name, phone, account role, and creation date. It excludes internal UUIDs, Auth metadata, emails, credentials, and tokens. Roles are joined in memory only for the current 20-profile page.

## 7. Read-Only Scope

F4.2 contains no INSERT, UPDATE, DELETE, role mutation, order-status action, product edit, payment, or loyalty action. F4.3 owns order-status management.

## 8. Pagination

Orders and profiles request 21 rows to display 20 and determine whether Ver más is available. Data and loaded details are memory-only.

## 9. Session Lifecycle

Dashboard state is cleared and its modal is closed when adminAuth reports a signed-out or non-admin state. No dashboard data is stored in localStorage, sessionStorage, cookies, or query strings.

## 10. Error Handling

The dashboard provides safe Spanish loading and partial-failure messages. A database RLS denial is treated as authoritative; the client does not retry with another identity or credential.

## 11. Privacy

Database values are rendered with createElement and textContent. Customer data is limited to the operational snapshots needed to review a recent order.

## 12. Deferred F4.3

F4.3 may add secure order-status management with independent server-side authorization for every mutation.
