import { Hero } from "@/components/landing/Hero";
import { ToolCards } from "@/components/landing/ToolCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-full">
      <Hero />
      <ToolCards />
      <HowItWorks />
      <Footer />
    </div>
  );
}
