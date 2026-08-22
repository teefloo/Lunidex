"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import LunidexLogo from "@/components/ui/LunidexLogo";

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <LunidexLogo
        alt="Lunidex"
        sizes="128px"
        className="size-32 animate-pulse-slow object-contain"
      />
      <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
        You&apos;re Offline
      </h1>
      <p className="max-w-sm text-muted-foreground">
        It looks like you&apos;ve lost your connection. Check your network and
        try again.
      </p>
      <Button
        variant="default"
        size="lg"
        onClick={() => router.refresh()}
      >
        Retry
      </Button>
    </div>
  );
}
