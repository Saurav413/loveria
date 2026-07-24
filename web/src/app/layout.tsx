import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loveria",
  description: "A shared space for couples — memories, reminders, and more.",
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
