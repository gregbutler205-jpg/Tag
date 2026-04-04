# Daily Pool Setup

## 1. Run the migration

Open the Supabase SQL Editor for your project and run `daily_pool_migration.sql`. This creates the `daily_pool` table and its indexes.

## 2. Seed the 97 plates

After the migration completes, run `seed_daily_pool.sql` in the same SQL Editor. All 97 curated plates will be inserted with `status = 'approved'`. The statements use `ON CONFLICT DO NOTHING` so the file is safe to re-run.

## 3. Set ADMIN_USER_IDS on Render

Add the environment variable `ADMIN_USER_IDS` to your Render service. Set the value to a comma-separated list of Supabase user UUIDs who should have admin access, for example:

```
ADMIN_USER_IDS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

You can find a user's UUID in the Supabase Dashboard under Authentication > Users.

## 4. Access the admin panel

The admin panel is available at `/admin` in the app (e.g. `https://tag.iwonde.com/admin`). Sign in with an account whose UUID is in `ADMIN_USER_IDS`. The panel shows:

- **Pending tab** — user-submitted plates waiting for review. Approve or reject each one.
- **Full Pool tab** — all plates in the pool with their status, times shown, source, and metadata.
