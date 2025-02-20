import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Calendar,
  CircleDollarSign,
  Home,
  Inbox,
  Paintbrush,
  Search,
  Settings,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";

const items = [
  {
    title: "Workspace",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Designs",
    url: "/design",
    icon: Paintbrush,
  },
  {
    title: "Credits",
    url: "/credits",
    icon: CircleDollarSign,
  },
];

export function AppSidebar() {
  const path = usePathname();

  console.log(path);

  return (
    <Sidebar>
      <SidebarHeader className="gradient-background2">
        <div className="p-6 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-900 to-indigo-700">
          <Link href={"/"}>
            <Image
              src={"/logo.jpg"}
              alt="logo"
              width={100}
              height={100}
              className="w-full h-full object-contain rounded-lg border-2 border-teal-500 px-2 bg-black"
            />
          </Link>

          <h2 className="text-sm text-gray-100 text-center">Build Awesome</h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="gradient-background2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-5 ">
              {items.map((item, index) => (
                <a
                  href={item.url}
                  key={index}
                  className={`p-2 text-lg text-white flex gap-2 items-center
                                 hover:bg-indigo-500 rounded-lg ${
                                   path == item.url && "bg-indigo-500"
                                 }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </a>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {/* Custom Footer */}
    </Sidebar>
  );
}
