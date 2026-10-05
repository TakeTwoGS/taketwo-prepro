# TakeTwo PrePro: setup guide

People log in with Google. Setup has two sides: Google and Supabase.

## 1. Database (Supabase)
1. Create a Supabase project named taketwo-prepro.
2. SQL Editor, New query, paste everything from `supabase-setup.sql`, Run.
3. Project Settings, API Keys: copy the Publishable key (sb_publishable_...).
   Project Settings, Data API: copy the Project URL (https://xxxx.supabase.co).

## 2. GitHub and Vercel
1. Upload this project's files to a GitHub repository named taketwo-prepro.
2. Vercel: Add New, Project, import it. Before Deploy, add two Environment Variables, both with Type = Config:
   - VITE_SUPABASE_URL = the Project URL
   - VITE_SUPABASE_ANON_KEY = the Publishable key
3. Deploy.

## 3. Google login
### Google Cloud
1. Go to console.cloud.google.com and create a project named TakeTwo PrePro.
2. Open the menu, then APIs & Services, then OAuth consent screen (it may be called Google Auth Platform).
   Fill in the app name, your email, choose External, and finish.
3. Publish the app (Audience, then Publish app) so anyone can log in, not only test users.
4. Credentials, Create credentials, OAuth client ID, Application type: Web application.
   - Authorized JavaScript origins: your live address, e.g. https://taketwo-prepro.vercel.app
   - Authorized redirect URIs: the callback URL shown in Supabase (Authentication, Sign In / Providers, Google).
     It looks like https://YOURPROJECT.supabase.co/auth/v1/callback
5. Create, then copy the Client ID and Client Secret.

### Supabase
1. Authentication, Sign In / Providers, Google: turn it on, paste the Client ID and Client Secret, Save.
2. Authentication, URL Configuration:
   - Site URL = your live address
   - Redirect URLs = add your live address followed by /**
