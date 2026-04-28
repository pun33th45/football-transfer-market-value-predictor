import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Football Transfer Market Value Predictor",
  description: "Machine learning dashboard for estimating football player transfer market value"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
