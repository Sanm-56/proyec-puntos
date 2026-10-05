# Password Recovery

## User Flow

The login modal offers **¿Olvidaste tu contraseña?**. The customer enters an email address, receives a Supabase recovery email, returns to the application, creates a new password, and is signed out before logging in again with that password.

## Recovery Request

The recovery-request form is part of the existing authentication modal and includes an email label, loading state, live status message, and a return-to-login action. It trims the email and uses the existing browser Supabase client:

`supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/" })`.

Successful requests always use a generic confirmation: **“Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña.”** This avoids user enumeration. Rate-limit responses use a safe Spanish message and are not retried automatically.

## Redirect URL

The redirect URL is built from `window.location.origin + "/"`; it does not hardcode localhost, include a user ID, or put passwords/tokens into the URL. For the current deployment this resolves to `https://proyec-puntos.vercel.app/`.

## Supabase URL Configuration

Password recovery requires the application origin in **Supabase Dashboard → Authentication → URL Configuration**. The verified current Site URL and Redirect URL are `https://proyec-puntos.vercel.app/`.

When a custom domain is added later, it must also be added to Supabase Authentication URL Configuration before password recovery is tested on that domain.

## PASSWORD_RECOVERY Event

The existing central `onAuthStateChange` listener detects `PASSWORD_RECOVERY`. It enters recovery mode instead of rendering the ordinary signed-in experience. No additional auth-state listener is created.

Recovery mode suppresses the ordinary account/admin/header experience, closes account and admin modals, closes the cart overlay when available, and displays the dedicated new-password form.

## Recovery Session

Supabase manages the authorized temporary recovery session. GO TIENDA does not access `auth.users`, store tokens itself, or persist recovery-mode state in local/session storage.

## New Password

The form requests a new password and confirmation using `autocomplete="new-password"`. It reuses the registration minimum: non-empty, at least six characters, and matching confirmation. On valid input it calls only:

`supabase.auth.updateUser({ password })`.

No user ID, role, email authority, service key, or password value is stored or logged.

## Success and Sign-Out

After a successful password update, the form is cleared and the application calls the normal Supabase `signOut` path. It then shows the login form with a message directing the customer to sign in with the new password.

If signing out fails after the update succeeds, the UI still reports that the password was changed and asks the customer to close/reopen the page or sign out manually. It never submits the password update twice.

## Invalid / Expired Links

Recovery URL errors, expired links, or a recovery URL that cannot establish a session show a safe invalid-link message and the recovery-request form. The customer can request a new link without seeing raw Auth errors, tokens, or request identifiers.

## URL Token Cleanup

The module inspects recovery URL state only to determine recovery/error mode. It does not log it. After Supabase establishes recovery mode or the link is determined invalid, `history.replaceState` removes Auth query/fragment material without reloading and preserves the normal path and unrelated query parameters.

## Anti User Enumeration

The success response does not reveal whether an account exists. Error handling never displays a “user not found” message.

## Rate Limiting

The request button is disabled while the request runs. Supabase rate-limit responses become: **“Espera un momento antes de solicitar otro enlace.”**

## Privacy

Passwords, recovery URL tokens, sessions, and raw Auth error payloads are never logged or manually stored. Password fields exist only for the active form submission and are cleared after a successful update.

## CSP

No CSP change is required. Recovery uses the existing exact Supabase project origin already allowed by `connect-src`; no new third-party origin, wildcard, or `unsafe-eval` is added.
