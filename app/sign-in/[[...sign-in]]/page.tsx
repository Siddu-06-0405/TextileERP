// app/sign-in/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex w-full h-screen items-center justify-center">
      <SignIn path="/sign-in" routing="path" />
    </div>
  );
}
