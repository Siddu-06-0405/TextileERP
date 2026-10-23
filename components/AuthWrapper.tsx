"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SignedIn } from "@clerk/nextjs";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SignedIn>
        <AppSidebar />
      </SignedIn>
      {children}
    </SidebarProvider>
  );
}
