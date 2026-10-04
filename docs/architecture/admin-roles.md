# Secure Admin Roles

## 1. Purpose

F4.1 adds frontend awareness of the authenticated user’s administrative role and a minimal protected navigation shell. It does not implement administrative data management.

## 2. Source of Truth

The only role source is public.user_roles, queried through the existing authenticated Supabase client and its RLS policies.

## 3. Allowed Roles

Allowed stored roles are user and admin. Missing, unknown, or failed role reads are treated as no administrative access.

## 4. Frontend Admin Awareness

js/admin/admin-auth.js keeps role, loading, and isAdmin state only in memory. Its sole client-side responsibility is visibility and navigation UX. It does not grant any permission.

## 5. Database Authorization

PostgreSQL remains authoritative. Future administrative table policies and RPCs must independently verify public.is_admin() or an equivalent server-side authorization rule. Server code must never trust window.GoTienda.adminAuth.isAdmin().

## 6. Session Lifecycle

The existing auth module notifies adminAuth on restored sessions, sign-in, token refresh, and sign-out. A signed-out user clears role state and closes the admin modal. No localStorage, sessionStorage, cookie, query parameter, or HTML attribute stores authorization state.

## 7. Fail-Closed Design

The entry point is hidden unless public.user_roles returns exactly admin. A role lookup error, missing row, unknown value, guest session, or normal user has isAdmin false. Calling openAdmin directly displays a safe access-denied message instead of administrative shell content.

## 8. Initial Admin Bootstrap

New registrations always receive user. The existing set_user_role RPC requires an already authenticated administrator, so the first administrator requires a separate trusted database/operator promotion. This phase never promotes the first user, a particular email, the repository owner, or any visitor automatically.

## 9. Role Mutation

F4.1 has no role mutation UI and makes no set_user_role call. Promotion and demotion controls are out of scope.

## 10. Future F4.2

F4.2 may add an administrative dashboard, but each protected operation must retain independent database authorization.

## 11. Future F4.3

F4.3 may add secure order management after server-side authorization is defined for every mutation.
