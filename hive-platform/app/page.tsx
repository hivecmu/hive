import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </>
  );
}
