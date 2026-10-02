import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Complaint Management System | Gautam Buddha University",
    template: "%s | GBU Complaint Management System",
  },
  description:
    "Gautam Buddha University's centralized complaint and hostel management platform for submitting, tracking, and resolving campus concerns.",
  applicationName: "GBU Complaint Management System",
  keywords: [
    "Gautam Buddha University",
    "GBU",
    "Complaint Management System",
    "Grievance Management",
    "Hostel Management",
  ],
  authors: [
    {
      name: "Gautam Buddha University",
    },
  ],
  creator: "Gautam Buddha University",
  publisher: "Gautam Buddha University",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}