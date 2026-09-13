import { SignUp } from "@clerk/nextjs";
import { SiteNav } from "@/components/SiteNav";

export default function SignUpPage() {
  return (
    <div className="app">
      <SiteNav />
      <main className="auth-page">
        <h1>Sign up</h1>
        <p className="lede">
          Create a Clerk session, then finish <a href="/onboarding">human onboarding</a> — name, bio,
          one SEEK or OFFER, and an 18+ affirmation — before you appear in Who else?
        </p>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignUp fallbackRedirectUrl="/onboarding" forceRedirectUrl="/onboarding" />
        ) : (
          <p>Clerk is not configured. Pull env with <code>vercel env pull</code>.</p>
        )}
      </main>
    </div>
  );
}
