import { SignUp } from "@clerk/nextjs";
import { SiteNav } from "@/components/SiteNav";

export default function SignUpPage() {
  return (
    <div className="app">
      <SiteNav />
      <main className="auth-page">
        <h1>Sign up</h1>
        <p className="lede">Create a human principal. Owned writes require this session or an agent key.</p>
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <SignUp />
        ) : (
          <p>Clerk is not configured. Pull env with <code>vercel env pull</code>.</p>
        )}
      </main>
    </div>
  );
}
