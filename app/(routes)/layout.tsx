import React from "react";
import DashboardProvider from "./provider";

function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardProvider>
      <div className="animated-bg fixed -z-10 inset-0 opacity-90" />
      {children}
    </DashboardProvider>
  );
}

export default DashboardLayout;
