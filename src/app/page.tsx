import { LandingHeader } from "@/components/landing/header";
import { LandingHero } from "@/components/landing/hero";
import { LandingPainSolution } from "@/components/landing/pain-solution";
import { LandingShowcase } from "@/components/landing/showcase";
import { LandingAiSpotlight } from "@/components/landing/ai-spotlight";
import { LandingWhy } from "@/components/landing/why";
import { LandingCompliance } from "@/components/landing/compliance";
import { LandingFinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main>
      <LandingHeader />
      <LandingHero />
      <LandingPainSolution />
      <LandingShowcase />
      <LandingAiSpotlight />
      <LandingWhy />
      <LandingCompliance />
      <LandingFinalCta />
      <LandingFooter />
    </main>
  );
}
