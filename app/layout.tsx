import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CircleGuard",
  description: "Safer savings circles powered by verifiable trust.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full antialiased">
      <body className="m-0 flex min-h-full w-full flex-col p-0">{children}</body>
    </html>
  );
}
