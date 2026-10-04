# User Account

## 1. Purpose

F1.4 provides the authenticated customer's **Mi cuenta** experience while leaving catalog, cart, and WhatsApp flows independent.

## 2. Architecture

Authentication is owned by `window.GoTienda.auth`. Account/profile state and UI are owned by `window.GoTienda.account` in `js/account/account.js`. The account module reuses the single Supabase client and is notified by the existing auth-state listener; it does not create another listener or client.

## 3. Data Sources

- Email and account creation date: Supabase Auth user (`email`, `created_at`).
- Name and phone: `public.profiles`.
- Account type: the current user's `public.user_roles` row.

## 4. Profile Read Flow

The authenticated session supplies the user ID. The account module selects the matching profile and, separately, its role. A missing profile is shown as a safe support-oriented error; the browser never creates replacement rows. A role read failure falls back to the display label **Usuario** without interrupting profile use.

## 5. Profile Update Flow

Only trimmed `full_name` (maximum 120 characters) and `phone` (maximum 40 characters) are submitted through `UPDATE public.profiles`. Submission is disabled while saving and result messages are safe Spanish UI messages.

## 6. RLS Enforcement

The UI filters by the authenticated user's ID, but the database policy is authoritative: F1.2 permits an authenticated user to select and update only a profile where `auth.uid() = profiles.id`. The update does not send ID, email, role, timestamps, points, or permissions.

## 7. Role Safety

The displayed role is read-only, used only as an account label, and is not authorization. This module has no role controls and never calls `set_user_role()`. Future admin authorization must remain server-side and RLS-enforced.

## 8. Session Synchronization

The F1.3 auth listener remains the single source of auth events. Signed-in and refreshed sessions reload the account profile; sign-out closes the modal and clears account data from memory. No profile or role is persisted in localStorage.

## 9. First Real Account Validation

Use a legitimate registration: Auth registration creates `auth.users`; the F1.2 trigger creates `profiles` and `user_roles` with role `user`; after confirmation (when enabled) and login, **Mi cuenta** reads the profile. This phase does not create a test account or bypass email confirmation.

## 10. Deferred Features

- Auth email change (email is read-only in this UI).
- Purchase history.
- Admin dashboard and controls.
- Persistent loyalty points or balance.
