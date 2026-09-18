import type { Metadata } from "next";
import { PremieresPage } from "@/components/projects/premieres-page";

export const metadata: Metadata = {
  title: "Premieres — Upcoming AI Film Debuts",
  description: "Watch upcoming AI film premieres and new releases on Myriad Spring.",
};

export default function PremieresRoute() {
  return <PremieresPage />;
}
