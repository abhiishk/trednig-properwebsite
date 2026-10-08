# Vercel services deployment

Use repository root as the Vercel project Root Directory. Connect abhiishk/trednig-properwebsite, production branch main. Remove old Next.js/framework/build/output overrides; service settings are in vercel.json. Include workspace files outside each service root in the build.

Public services: trendyprompt at / (including /admin, /trending and /p/:id); api-server at /api and /api/*. mockup-sandbox stays internal, without a public rewrite.

No bindings are needed: the Vite sites run in the browser and call the public same-origin /api endpoint. None of the server functions calls another service. Never put an internal binding URL in a VITE_ variable: bindings exist only in runtime functions.

## Environment variables

Set MONGO_URL to the existing MongoDB connection string (keep the existing data), DB_NAME to the existing database name (default trendyprompt), and ADMIN_PASSWORD to a strong private password. Apply to Production and Preview as needed; use a separate database for previews.

Leave VITE_API_URL unset/remove old cross-domain values. Do not set PORT or BASE_PATH in Vercel. LOG_LEVEL is optional, defaults to info.

Supabase URL and publishable key are not consumed by the current code. The Supabase user is not yet an application administrator. This deployment does not migrate MongoDB or replace admin authentication. DATABASE_URL is unused by these API routes.

Replit object storage relies on a localhost credential sidecar that does not exist on Vercel. Upload routes now return an explicit 503 there. Paste external image URLs. Existing Replit storage URLs require a separate migration; embedded database images are served by /api/prompts/:id/image/:image.

## Verification

From the repository root, install dependencies with pnpm install --frozen-lockfile. Use vercel dev -L to test services together. Check /, /admin, /trending, /p/<existing-id>, /api/healthz, /api/prompts and a returned image URL. API tests need a valid MONGO_URL. A successful build does not verify production database credentials.

After pushing, confirm Vercel deployed the commit on the project owning trendyprompt.space. Check deployment logs and /api/prompts before promoting. Do not replace the working site with a backend missing its database connection.

## Verified in this checkout

Both Vite production builds pass; workspace and API TypeScript checks pass. Vercel CLI 63.1.0 with `vercel dev -L` detects all three services. Local HTTP checks: `/`, `/admin`, `/trending`, `/p/test` return 200 HTML; `/api/healthz` returns 200 JSON. `/api/prompts` returns 500 because MONGO_URL is unset locally. Production deployment logs and database access are not yet verified.

The pnpm build-script allowlist was migrated to allowBuilds (same approved packages) after the local runner failed with ERR_PNPM_IGNORED_BUILDS. Each service pins pnpm@11.9.0 and uses a frozen lockfile installation.
