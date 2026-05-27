import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/transparency")({
  beforeLoad: () => {
    throw redirect({ to: "/methodology" });
  },
});
