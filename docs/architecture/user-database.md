# User Database

## 1. Purpose

F1.2 establishes the database foundation for Supabase Auth users, application profiles, and protected roles. Authentication remains owned by `auth.users`; this phase adds no browser login or account UI.

## 2. Tables

### `profiles`

- `id`: the one-to-one authenticated user ID; primary key and cascading reference to `auth.users(id)`.
- `full_name`: optional customer display/name data supplied at signup.
- `phone`: optional customer phone data supplied at signup.
- `created_at` and `updated_at`: server-maintained timestamps.

No password or duplicate email is stored. Supabase Auth remains authoritative for both.

### `user_roles`

- `user_id`: the one-to-one authenticated user ID; primary key and cascading reference to `auth.users(id)`.
- `role`: one of `user` or `admin`, enforced by a database CHECK constraint.
- `created_at` and `updated_at`: server-maintained timestamps.

## 3. Auth Integration

```text
auth.users INSERT
  -> public.handle_new_user() trigger
  -> public.profiles
  -> public.user_roles
```

The trigger uses optional signup metadata only for profile display fields. It always inserts the role literal `user`, so metadata can never authorize an administrator.

## 4. Default Role

Every signup begins as `user`. Authorization data is server-controlled and never obtained from editable browser state or Auth user metadata.

## 5. RLS Model

- `anon`: receives no table grants and cannot read protected data.
- Authenticated user: can read and update only their own profile and read only their own role.
- Admin: can read profiles and roles through policies using `public.is_admin()`; profile updates and all direct role writes remain denied unless separately authorized in a future phase.

`profiles` and `user_roles` both have RLS enabled. There are no insert or delete policies for browser clients.

## 6. Admin Authorization

`public.is_admin()` is a stable, schema-qualified SECURITY DEFINER helper. It derives the caller only from `auth.uid()` and reads `user_roles` without RLS recursion. Its execution is granted only to `authenticated`.

## 7. Role Management

Direct table writes to `user_roles` are not granted and no write policy exists. `public.set_user_role(target_user_id, new_role)` is callable only by authenticated users, then independently verifies the caller is already an admin, validates the enum-like role value, verifies the target Auth user exists, and rejects self-role changes.

## 8. First Admin Bootstrap

No user or administrator is created by this migration. After a legitimate account has been created, a trusted database administrator may manually update that account’s `public.user_roles.role` to `admin` using a secured SQL/admin operation outside the browser. Subsequent changes should use the protected RPC. Never hardcode an email or UUID in a migration.

## 9. Security Guarantees

- The browser cannot control admin roles or promote users.
- No secret/service-role credential is present in frontend code.
- Passwords are never stored in application tables.
- Role data uses RLS, no direct browser write grants, and a constrained administrator RPC.
- Supabase Security Advisor confirms anonymous callers cannot execute any SECURITY DEFINER function. Its remaining authenticated-execution notices are intentional: `is_admin()` supports RLS checks and `set_user_role()` is the restricted authenticated admin RPC.

## 10. Future Integration

F1.3 will use Supabase Auth to register/sign in a user. The Auth trigger will create their profile and default `user` role automatically; UI code will only read/update the caller’s allowed profile fields.
