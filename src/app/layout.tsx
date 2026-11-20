import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'IchthyoGenesis · 2D Image → 3D Procedural Fish Synthesizer',
  description:
    'Upload any 2D fish image — sharks, lionfish, seahorses, eels, or never-seen-before alien creatures — and procedurally synthesize a hyper-realistic living 3D fish with accurate anatomy, fins, cylindrical UV skin patterns, scales, and dermal skin tags.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#08131c] text-[#dce7ef] antialiased">{children}</body>
    </html>
  );
}
