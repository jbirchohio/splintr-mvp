# Admin Roles

Admins are determined by Supabase user metadata: `app_metadata.role === 'admin'`.

## Grant/Revoke Admin

Prerequisites:
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in your environment.

Commands:
- Grant: `npm run admin:grant <userId>`
- Revoke: `npm run admin:revoke <userId>`

These commands use the Supabase Admin API to update the user’s `app_metadata.role`.

## Notes
- Admin checks on sensitive API routes use this role. The legacy env allowlist has been removed.
- Cache: admin lookups are cached briefly in Redis for performance.

