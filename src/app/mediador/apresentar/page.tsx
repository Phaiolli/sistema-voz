import { Suspense } from "react";
import { PresentationMode } from "./presentation";

export default function ApresentarPage() {
  return (
    <Suspense>
      <PresentationMode />
    </Suspense>
  );
}
