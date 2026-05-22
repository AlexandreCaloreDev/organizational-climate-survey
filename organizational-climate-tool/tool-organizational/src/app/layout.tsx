import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppToaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const interMono = Inter({
  subsets: ["latin"],
  variable: "--font-inter-mono",
});

export const metadata: Metadata = {
  title: "Atmos",
  description: "Monitorando o clima organizacional da sua empresa",
  icons: { icon: "/images/logoAtmos.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html 
      lang="pt-BR" 
      className={`${inter.className} ${interMono.className}`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-zinc-50" suppressHydrationWarning>
        <main>
          <AuthProvider>
            {children}
          </AuthProvider>
          <AppToaster />
        </main>
      </body>
    </html>
  );
}