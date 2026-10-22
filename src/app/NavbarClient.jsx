"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ShoppingBag, ListOrdered, History } from "lucide-react";

export default function NavbarClient() {
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: "Products & Inventory", icon: Package },
    { href: "/orders/new", label: "Create Order", icon: ShoppingBag },
    { href: "/orders", label: "Orders List", icon: ListOrdered },
    { href: "/inventory-logs", label: "Inventory Movement Log", icon: History },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold text-lg shadow-sm">
              OMS
            </div>
            <div>
              <Link href="/" className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition">
                Mini E-Commerce OMS
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1 whitespace-nowrap px-2.5 py-1.5 rounded-md text-xs font-medium ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
