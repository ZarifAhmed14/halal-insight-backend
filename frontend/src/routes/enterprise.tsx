import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/enterprise")({
  beforeLoad: () => {
    throw redirect({ to: "/methodology" });
  },
});
