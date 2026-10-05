# TakeTwo PrePro: setup guide (Zip 1)

## 1. Database (Supabase)
1. Sign in at supabase.com and create a project named taketwo-prepro. Save the database password.
2. Open SQL Editor, then New query. Paste everything from `supabase-setup.sql` (in this folder) and click Run.
   It should say "Success. No rows returned".
3. Open Project Settings, then API. Copy:
   - Project URL
   - the anon public key (or "publishable key" if that is what your dashboard calls it)
4. Open Authentication and find the Email provider settings. Turn "Confirm email" OFF for now so new
   members can sign up without waiting on email. (Dashboard labels move around. Look for "Providers" or "Sign In".)

## 2. GitHub
Create a repository named taketwo-prepro. Unzip this project into a NEW EMPTY folder, then upload everything
inside that folder (not the folder itself) to the repository and commit.

## 3. Vercel
1. Add New, then Project, and import the repository.
2. Open Environment Variables and add:
   - VITE_SUPABASE_URL = your Project URL
   - VITE_SUPABASE_ANON_KEY = your anon public key
3. Click Deploy and wait for Ready.

## 4. Tell Supabase your site address
Authentication, then URL Configuration:
- Site URL = your live address (for example https://taketwo-prepro.vercel.app)
- Redirect URLs = add the same address followed by /** (for example https://taketwo-prepro.vercel.app/**)
This makes password reset emails open the right page. If you add a custom domain later, add it here too.

## 5. Try it
Open the site, create an account, and you will land on Home with a demo project already in your list.
