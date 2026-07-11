import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "@/utils/simulationContext";
import SimulationRig from "@/components/LocalInspectionReports/SimulationRig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VMAP | Regulatory Management Portal",
  description: "Veterinary Medicine and Biologicals Regulatory System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="selection:bg-blue-100 selection:text-blue-900">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <SimulationProvider>
          {children}
          {/* Bypasses standard auth checks dynamically during local staging */}
          <SimulationRig />
        </SimulationProvider>
      </body>
    </html>
  );
}