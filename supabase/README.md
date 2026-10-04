# Supabase migrations

This directory will contain versioned, additive SQL migrations for GO TIENDA once schema work begins in F1.2.

- Create migrations through the Supabase CLI so their versioned names follow the installed CLI convention.
- Apply migrations in filename/version order.
- Do not manually alter production schema outside reviewed, versioned migrations after schema work starts.
- Do not place credentials, exports containing secrets, or application code in this directory.

F1.1 intentionally creates no application migration, tables, policies, or database functions.
