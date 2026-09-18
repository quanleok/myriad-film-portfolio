# Local demo tools

These tools are for a disposable Supabase instance on your computer. They refuse production mode, non-loopback database URLs and runs without explicit confirmation. They do not fall back to known demo passwords.

## Database setup

Set these values in a private `.env.local` file using your local Supabase configuration:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=
MYRIAD_SEED_CONFIRM=local-demo-only
```

Then choose a database-only tool, for example `npx tsx seed/seed-music.ts`, `npx tsx seed/seed-courses.ts` or `npx tsx seed/populate-engagement.ts`. Passwords are generated with Node's cryptographic random generator and are never logged or stored in profiles. If you need to sign in as a demo account, set a new private password through your local Supabase administration tools.

## Optional development media

`npm run seed` and `npm run seed:clean` also require a dedicated development Bunny library. They use separately named variables and do not inherit the application's normal Bunny credentials:

```dotenv
MYRIAD_SEED_MEDIA_CONFIRM=dedicated-dev-library-only
MYRIAD_SEED_BUNNY_API_KEY=
MYRIAD_SEED_BUNNY_LIBRARY_ID=
MYRIAD_SEED_BUNNY_CDN_HOSTNAME=
```

Media upload and deletion affect that explicitly configured external development library. Leave these values unset unless you intend to use it. Use only media you own or have permission to upload.

Creator fixture folders contain `profile.json`, an optional avatar, and optional video folders with `meta.json`, a video and a thumbnail. A profile needs a display name, username, an address such as `demo@example.test`, biography and genre focus. It must not contain a password. The upload and cleanup tools reject email addresses outside the reserved example.test domain.

The one-off production-account, channel-splitting and downloaded-media import utilities are not part of this portfolio copy. Internal account-creation data was also omitted from migration slots; application schema is retained.
