import type { ReactNode } from "react";
import { AdminThemeProvider } from "@/components/voz/admin-theme-provider";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AdminThemeProvider>
      {children}
      <Toaster position="bottom-center" />
    </AdminThemeProvider>
  );
}
