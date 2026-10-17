import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "EditLoop",
  description: "A support copilot that turns your edits into rules you can read.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
