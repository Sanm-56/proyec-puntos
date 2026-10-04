# Authentication

## 1. Purpose

F1.3 adds registration, password login, logout, and session restoration without making the catalog dependent on authentication.

## 2. Auth Architecture

`index.html` loads `js/auth/auth.js` after the existing Supabase service. The module uses the single `window.GoTienda.supabase.client` and exposes `window.GoTienda.auth`.

## 3. Registration Flow

Registration form → `supabase.auth.signUp()` → `auth.users` → database trigger → `profiles` and `user_roles`.

## 4. Login Flow

The login form uses `signInWithPassword()`; logout uses `signOut()` and leaves the cart untouched.

## 5. Session Restoration

`getSession()` restores a valid session at startup and one auth-state listener updates the header.

## 6. Email Confirmation Behavior

When signup returns no session, the UI requests email confirmation; a returned session is treated as an immediate authenticated signup.

## 7. User Metadata and Security

Only `full_name` and `phone` are supplied as signup metadata. Passwords are never stored or logged. No role, admin state, permissions, points, or balance is submitted. RLS remains authoritative.

## 8. Future F1.4 Integration

F1.4 can use the authenticated user and permitted profile to build My Account UI.
