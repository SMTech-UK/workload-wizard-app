"use client"

import { WandSparkles } from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function TeamSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
          <div 
            className="flex aspect-square size-8 items-center justify-center rounded-lg text-white"
            style={{ backgroundColor: '#0F59FF' }}
          >
            <WandSparkles className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">WorkloadWizard</span>
            <span className="truncate text-xs text-muted-foreground">v0.0.1</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
