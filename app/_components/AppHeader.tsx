import { SidebarTrigger } from "@/components/ui/sidebar";
import React from "react";

import ProfileAvatar from "./ProfileAvatar";
import Link from "next/link";

function AppHeader({ hideSidebar = false }) {
  return (
    <div className="p-4 shadow-sm flex items-center justify-between w-full">
      {!hideSidebar && <SidebarTrigger />}

      <div className="flex items-center gap-4">
        <ProfileAvatar />
        <Link
          href="/dashboard"
          className="text-indigo-600 hover:text-teal-500 gradient-background2 p-1 rounded-lg border border-teal-500"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

export default AppHeader;
