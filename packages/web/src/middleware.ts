import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

/**
 * Clerk populates the session; it does not lock the app.
 * Find / read stay public. Write routes enforce auth in the handler
 * (Clerk cookie or Bearer agent key).
 */
export default async function middleware(req: NextRequest, evt: NextFetchEvent) {
  if (!process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return NextResponse.next();
  }
  const { clerkMiddleware } = await import("@clerk/nextjs/server");
  return clerkMiddleware()(req, evt);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
