import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Property Management Voice Ticketing",
  description: "Agency-specific voice ticket intake for property management teams.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
