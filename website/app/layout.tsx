import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OWN — OATHome Intelligence",
  description: "Your AI workspace. Your choice of models. Powered by your own OATHome runtime.",
  applicationName: "OWN",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
