"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function AuthButtons() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return (
    <span className="auth-slot">
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding">
          <button type="button" className="ghost auth-btn">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton />
      </SignedIn>
    </span>
  );
}
