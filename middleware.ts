// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)'
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Protect everything except static files and Next.js internals
    "/((?!.*\\..*|_next).*)",
    "/", // root
    "/(api|trpc)(.*)", // APIs
  ],
};