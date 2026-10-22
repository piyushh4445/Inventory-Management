import "./globals.css";
import Link from "next/link";
import NavbarClient from "./NavbarClient";

export const metadata = {
  title: "Mini E-Commerce Order Management System",
  description: "Intern Practical Assignment - Order Management System with PostgreSQL and Drizzle ORM",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">
        {/* Top Header / Navigation Bar */}
        <NavbarClient />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Simple Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
          Mini E-Commerce Order Management System
        </footer>
      </body>
    </html>
  );
}
