import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "./_components/Sidebar";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Mizan",
  description: "Personal budget tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions (e.g. RTL helpers) add classes to <html> before hydration.
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body className="bg-canvas font-sans text-ink antialiased">
        <div className="min-h-screen md:p-5">
          <div className="min-h-screen bg-shell md:flex md:min-h-[calc(100vh-2.5rem)] md:rounded-[28px] md:p-3 md:shadow-[0_20px_60px_-30px_rgb(15_60_55/0.25)]">
            <Sidebar />
            <main className="min-w-0 flex-1 bg-panel px-4 py-6 md:rounded-[22px] md:px-7 md:py-7">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
