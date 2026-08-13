"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function ConditionalPublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/curator")) return null;
  return <>{children}</>;
}
