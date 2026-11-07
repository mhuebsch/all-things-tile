# All Things Tile

A separate Next.js preview of https://www.allthingstile.net/. The gallery has search, multiple photos per post, a modal viewer, and links to the original Facebook posts.

## Run locally

Use Node 24. Copy `.env.example` to `.env.local` if you have provider credentials. Keep keys and tokens out of source control.

```sh
npm ci
npm run dev -- --port 3100
npm run build
npm test
```

Smoke tests expect a running site on port 3100. Set `BASE_URL` to check a different accessible instance.

## Preview configuration

Add these variables to the Preview environment of the `all-things-tile-preview` Vercel project and redeploy.

| Variable | Value |
| --- | --- |
| `FACEBOOK_PAGE_ID` | All Things Tile Page ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Page token obtained after authorizing the owner's Meta app |
| `FACEBOOK_GRAPH_VERSION` | Graph API version verified in Meta's Graph API Explorer |
| `RESEND_API_KEY` | Resend sending key |
| `CONTACT_FROM_EMAIL` | Sender on a verified Resend domain |
| `CONTACT_TO_EMAIL` | Inbox designated to receive inquiries |

Next.js reads up to 100 published Facebook posts on the server and caches responses for 15 minutes. A bundled, labeled snapshot keeps the gallery available while authorization is pending or Facebook is unavailable.

The contact form validates the request and sends plain text through Resend, using the visitor's address for replies. It has a honeypot and an in-memory throttle per running server instance. Resend acceptance triggers the success message. The site does not store submissions. The inbox is the inquiry record.

On the protected preview, check `/api/health` for the feed source and contact configuration. Open a live post and check its photos against Facebook. Submit a clearly labeled test inquiry to an inbox you control and confirm receipt before retiring the old project. Export any old inquiries you need to keep before deleting it.
