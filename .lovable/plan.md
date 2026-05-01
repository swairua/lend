
## Plan: Build preview + fix login for demo users

### What's wrong today

1. **Build is broken** — `pages/Login.tsx` references `form.client_type` but `client_type` is not in the `useState` shape, so TypeScript fails. Until this compiles, the preview can't fully load.
2. **`borrower@lending.com` does not exist** in the database. The PHP `bootstrap()` only seeds `admin@lending.com`. The original SQL seeded `borrower@example.com` with a placeholder hash (`$2a$10$examplepassword`) that is **not** the bcrypt of `Pass123`, so even if it existed, login would fail.
3. **`admin@lending.com` may also be unusable**. Two seed paths exist:
   - `lending_db.sql` inserts the admin with the placeholder hash `$2a$10$examplepassword` (invalid).
   - `api.php bootstrap()` only inserts the admin if no row exists yet. If the SQL ran first, bootstrap skips it and the password stays broken.
4. **Frontend → backend wiring is fine.** Vite dev proxies `/auth` and `/api` to `https://lending.wayrus.co.ke/api.php`, and `api.php` accepts `POST /auth/login` returning `{ token, user }`. (The `lab.wayrus.co.ke` / Atterberg requests in the console logs are from a different project — ignore them.)

### Changes

**1. Fix `pages/Login.tsx` so the build succeeds**

- Add `client_type: 'individual'` to the `useState` initial form object and type it.
- The `<input type="radio" ...>` registration block already references `form.client_type` — keep the UI but make it conditional only on the register flow (already inside `!isLogin`).
- Pass `client_type` through to `authApi.register` (extend the call signature in `utils/api.ts` and the register payload type).
- Remove the unused `Checkbox` import (currently imported but not used — would warn under stricter configs).

**2. Seed / reset demo users with valid `Pass123` bcrypt hashes**

The PHP backend is the source of truth. Add a one-shot, idempotent seeding step to `api.php bootstrap()` that:
- Ensures `admin@lending.com` exists with a freshly computed `password_hash('Pass123', PASSWORD_BCRYPT)` and `role='admin'`.
- Ensures `borrower@lending.com` exists with the same hash and `role='borrower'`, and creates a matching `borrowers` row (`user_id` FK).
- For both users, if the row already exists but `password_verify('Pass123', stored)` returns false, update the password to a fresh hash. This recovers from the broken `$2a$10$examplepassword` seed without dropping data.

This means anyone hitting any endpoint once will trigger bootstrap and the demo accounts become usable. No manual SQL.

**3. Verify end-to-end after deploy**

- Run the dev server / build to confirm TypeScript is clean.
- From the login page, log in as `admin@lending.com` / `Pass123` → should land on `/admin`.
- Log out, log in as `borrower@lending.com` / `Pass123` → should land on `/dashboard`.
- Confirm `localStorage.token` and `localStorage.user` are set, and `PrivateRoute` permits the matching role.

### Files modified

- `pages/Login.tsx` — extend form state with `client_type`, fix type errors, pass field to register.
- `utils/api.ts` — widen `authApi.register` payload to include `client_type?: 'individual' | 'corporate'`.
- `api.php` — extend `bootstrap()` to upsert `admin@lending.com` and `borrower@lending.com` with valid `Pass123` bcrypt hashes and a borrower row for the borrower user; update password if `password_verify` fails.

### Out of scope

- Token refresh / session-restore behavior (logs about session-restore timeout came from an unrelated app).
- Changing the API contract or auth flow.
- Removing the Atterberg-related console noise (not from this project).

