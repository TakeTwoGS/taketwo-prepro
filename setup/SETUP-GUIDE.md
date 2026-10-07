# TakeTwo PrePro: setup guide

## Updating to the latest zip

Zip 5 (tools and learn) needs NO database changes. Just upload the files to GitHub.
If you are coming from before Zip 4 (on-set mode, slate, exports, sharing and comments), run the SQL too:

Each new zip needs the same two steps:

1. Supabase, SQL Editor, New query. Paste ALL of `supabase-setup.sql` and click Run.
   It is safe to run again. It adds any new tables, the sharing rules, and live updates.
   (Live updates need Supabase Realtime, which is on by default. If shared projects do not update live,
   check Database, Replication, that Realtime is enabled for your project.)
   If Supabase complains about the storage part, create the bucket by hand instead:
   Storage, New bucket, name it `project-images`, leave "Public bucket" OFF, then run the SQL again.
2. Upload this project's files to GitHub (replace the old ones). Vercel redeploys on its own.

## First-time setup

### Database (Supabase)
1. Create a Supabase project. SQL Editor, New query, paste everything from `supabase-setup.sql`, Run.
2. Project Settings, API Keys: copy the Publishable key. Project Settings, Data API: copy the Project URL.

### GitHub and Vercel
1. Upload this project's files to a GitHub repository.
2. Vercel: Add New, Project, import it. Before Deploy, add two Environment Variables (Type = Config):
   - VITE_SUPABASE_URL = the Project URL
   - VITE_SUPABASE_ANON_KEY = the Publishable key
3. Deploy.

### Google login
1. Google Cloud: create a project, set up the OAuth consent screen (Branding + Audience), then create an OAuth client
   (Web application). Authorized JavaScript origin = your live address. Authorized redirect URI = the callback URL
   shown in Supabase (Authentication, Sign In / Providers, Google).
2. Supabase: Authentication, Sign In / Providers, Google: turn on, paste the Client ID and Secret, Save.
3. Supabase: Authentication, URL Configuration: Site URL = your live address; Redirect URLs = your address followed by /**

## Sharing a project
1. Open a project and click Share. Invite people by the email they use for Google, and choose Editor, Commenter, or Viewer.
2. Send them the site link. When they log in with that email, the project appears on their Home page.
3. People you invited see changes live, and you see who is in the project at the top of the page.
