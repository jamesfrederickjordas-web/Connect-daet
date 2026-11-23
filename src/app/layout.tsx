import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TIA-DAS | CONNECT-DAET.ph Subsystem 10",
  description:
    "Daet Tourism Impact Assessment and Data Analytics System for the Municipal Tourism Office of Daet, Camarines Norte.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900 flex flex-col">
        {children}
      </body>
    </html>
  );
}
