import { LandingHeader } from "@/components/landing/header";
import { LandingHero } from "@/components/landing/hero";
import { LandingWhy } from "@/components/landing/why";
import { LandingFeatures } from "@/components/landing/features";
import { LandingHow } from "@/components/landing/how";
import { LandingCompliance } from "@/components/landing/compliance";
import { LandingTestimonials } from "@/components/landing/testimonials";
import { LandingFinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main>
      <LandingHeader />
      <LandingHero />
      <LandingWhy />
      <LandingFeatures />
      <LandingHow />
      <LandingCompliance />
      <LandingTestimonials />
      <LandingFinalCta />
      <LandingFooter />
    </main>
  );
}
