import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "On A Trip Holidays AI Bot",
  description: "AI sales and customer support workspace for On A Trip Holidays",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
