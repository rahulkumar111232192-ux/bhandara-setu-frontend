import { Suspense } from "react";
import { SubmitForm } from "./submit-form";
import { Loader2 } from "lucide-react";

export default function SubmitPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto max-w-4xl py-10 px-4">
        <div className="space-y-2 mb-8 text-center">
          <h1 className="text-3xl font-bold font-headline tracking-tight sm:text-4xl">
            Share a Free Meal
          </h1>
          <p className="text-muted-foreground md:text-xl">
            Let nearby people know where food is being served.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <SubmitForm />
        </Suspense>
      </div>
    </div>
  );
}

