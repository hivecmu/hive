"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Redirect to main app - wizard is accessed via sidebar
export default function WizardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main app where wizard is properly integrated
    router.replace("/app");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-muted-foreground">Redirecting to app...</div>
    </div>
  );
}
