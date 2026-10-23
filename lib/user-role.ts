"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export interface UserRole {
  role: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserRole(): UserRole {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    // Get role from Clerk's publicMetadata
    const userRole = user.publicMetadata?.role as string;
    setRole(userRole || null);
    setIsLoading(false);
  }, [user, isLoaded]);

  return { role, isLoading, error };
}

export function hasPermissionToChangeOrderStatus(role: string | null): boolean {
  return role === "owner" || role === "manager";
}

export function hasPermissionToChangeOrderStatusFromRole(role: string | null): boolean {
  return role === "owner" || role === "manager";
}

export function hasPermissionToAddAgent(role: string | null): boolean {
  return role === "owner";
}

export function hasPermissionToEditAgent(role: string | null): boolean {
  return role === "owner";
}