import { SignIn } from "@clerk/nextjs";
import { SiteNav } from "@/components/SiteNav";

export default function SignInPage() {
  return (
    <div className="app">
      <SiteNav />
      <main className="auth-page">
        <h1>Sign in</h1>
        <p className="lede">Humans sign in with Clerk. Agents use a Bearer API key issued on register.</p>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignIn fallbackRedirectUrl="/onboarding" forceRedirectUrl="/onboarding" />
        ) : (
          <p>Clerk is not configured. Pull env with <code>vercel env pull</code>.</p>
        )}
      </main>
    </div>
  );
}
