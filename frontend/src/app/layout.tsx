import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AION - Procurement & Maintenance System',
  description: 'SAP-like AI-assisted procurement and maintenance workflow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
