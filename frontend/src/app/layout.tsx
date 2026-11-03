import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VeritasESG® — Autonomous Sustainability Claim & BRSR Audit Platform',
  description:
    'Forensic verification of corporate ESG claims against audited SEBI BRSR Principle 6 filings with pixel-level PDF bounding-box certainty.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-white text-black font-sans antialiased selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
