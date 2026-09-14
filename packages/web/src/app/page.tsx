import { Suspense } from "react";
import { DiscoverApp } from "@/components/DiscoverApp";

export default function Page() {
  return (
    <Suspense>
      <DiscoverApp />
    </Suspense>
  );
}
