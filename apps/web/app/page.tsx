import {
  Navbar,
  Hero,
  Clients,
  Features,
  Capabilities,
  HowItWorks,
  Testimonials,
  Pricing,
  FAQ,
  CTA,
  Footer,
} from "@/components/marketing";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Clients />
        <Features />
        <Capabilities />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
