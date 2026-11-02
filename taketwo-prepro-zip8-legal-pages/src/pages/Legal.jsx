import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'

// Change this if you want a different public contact address.
const CONTACT = 'loopymtb@gmail.com'
const UPDATED = 'November 2, 2026'

function Shell({ title, children }) {
  return (
    <div className="center-screen" style={{ alignItems: 'flex-start' }}>
      <div className="auth-card" style={{ maxWidth: 720, textAlign: 'left' }}>
        <div className="auth-logo"><Logo to="/" size="lg" /></div>
        <h1 className="auth-title">{title}</h1>
        <p className="muted-text">Last updated {UPDATED}</p>
        {children}
        <div className="auth-links" style={{ gap: 16 }}>
          <Link className="link-btn" to="/privacy">Privacy Policy</Link>
          <Link className="link-btn" to="/terms">Terms of Service</Link>
          <Link className="link-btn" to="/">Home</Link>
        </div>
      </div>
    </div>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy">
      <p>TakeTwo PrePro is a film pre-production tool. This page explains what information it uses and why.</p>
      <h3>What we collect</h3>
      <p>When you log in with Google, we receive your name, email address and profile picture. We use them only to create your account and show who you are to people you share a project with.</p>
      <p>We also store the content you create in the app: scripts, storyboards, shot lists, schedules, cast and crew details, files you upload, and comments.</p>
      <h3>How it is used</h3>
      <p>Your information is used only to run the app: signing you in, saving your projects and letting you collaborate with people you invite. We do not sell your information, show ads, or share it with advertisers.</p>
      <h3>Where it is stored</h3>
      <p>Data is stored with our infrastructure providers (Supabase for the database, storage and sign-in, and Vercel for hosting). Sign-in is handled by Google. We only receive basic profile details, never your Google password, and we do not access your Google Drive, Gmail or other Google data.</p>
      <h3>Sharing</h3>
      <p>Projects are private to you until you invite someone. People you invite can see the project and your name and email.</p>
      <h3>Your choices</h3>
      <p>You can delete projects at any time. To have your account and all of its data deleted, email {CONTACT} and we will remove it.</p>
      <h3>Contact</h3>
      <p>Questions about privacy: {CONTACT}</p>
    </Shell>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Service">
      <p>By using TakeTwo PrePro you agree to these terms.</p>
      <h3>Your content</h3>
      <p>You own everything you write and upload. You give us permission to store and display it only as needed to run the app for you and the people you share with.</p>
      <h3>Acceptable use</h3>
      <p>Do not use the app to break the law, upload content you have no right to share, or try to disrupt or gain access to other people's projects.</p>
      <h3>No guarantees</h3>
      <p>The app is provided as is. We work to keep it reliable, but we cannot promise it will always be available or free of errors, so keep your own backups of important work. You can export your projects from the Exports page.</p>
      <h3>Accounts</h3>
      <p>You are responsible for activity on your account. We may suspend accounts that misuse the app.</p>
      <h3>Changes and contact</h3>
      <p>We may update these terms and will change the date above when we do. Questions: {CONTACT}</p>
    </Shell>
  )
}
