import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Redirecting - Halal Intelligence" },
      {
        name: "description",
        content: "Redirecting to the Halal Intelligence assistant.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/assistant", replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="rounded-[2rem] border border-hairline bg-surface px-6 py-8 text-center shadow-elegant">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-jade" />
        <p className="mt-4 text-sm text-muted-foreground">Opening the assistant...</p>
      </div>
    </div>
  );
}
