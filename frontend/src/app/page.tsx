import Hero from '@/components/home/Hero';
import Features from '@/components/home/Features';
import CTA from '@/components/home/CTA';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Features />
      <CTA />
    </div>
  );
}
