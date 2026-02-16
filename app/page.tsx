import { Hero } from "@/components/landing/Hero";
import { ToolCards } from "@/components/landing/ToolCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 justify-between min-h-0">
      <Hero />
      <ToolCards />
      <HowItWorks />
      <Footer />
    </div>
  );
}
