import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Umrah Quotation System V2",
  description: "Production-ready Umrah quotation and management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
