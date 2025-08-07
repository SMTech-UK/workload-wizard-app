"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import posthog from "posthog-js"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const { state } = useSidebar()
  const router = useRouter()
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-nav-state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setOpenItems(new Set(parsed))
      } catch (error) {
        console.warn('Failed to parse saved sidebar state:', error)
        // Fallback to default state
        setOpenItems(new Set(items.filter(item => item.isActive).map(item => item.title)))
      }
    } else {
      // Initialize with active items if no saved state
      setOpenItems(new Set(items.filter(item => item.isActive).map(item => item.title)))
    }
  }, [items])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (openItems.size > 0 || localStorage.getItem('sidebar-nav-state')) {
      localStorage.setItem('sidebar-nav-state', JSON.stringify(Array.from(openItems)))
    }
  }, [openItems])

  const handleMainItemClick = (item: typeof items[0]) => {
    posthog.capture('main-nav-item-clicked', {
      item_title: item.title,
      item_url: item.url,
      has_sub_items: !!item.items && item.items.length > 0,
      sidebar_state: state,
    })
    // If sidebar is collapsed, navigate directly to the URL
    if (state === "collapsed") {
      router.push(item.url)
      return
    }

    // If sidebar is expanded and item has children, toggle the collapsible
    if (item.items && item.items.length > 0) {
      setOpenItems(prev => {
        const newSet = new Set(prev)
        if (newSet.has(item.title)) {
          newSet.delete(item.title)
        } else {
          newSet.add(item.title)
        }
        return newSet
      })
    } else {
      // If no children, navigate to the URL
      router.push(item.url)
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.items && item.items.length > 0 ? (
              <Collapsible
                open={openItems.has(item.title)}
                onOpenChange={(open) => {
                  setOpenItems(prev => {
                    const newSet = new Set(prev)
                    if (open) {
                      newSet.add(item.title)
                    } else {
                      newSet.delete(item.title)
                    }
                    return newSet
                  })
                }}
                className="group/collapsible"
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    tooltip={item.title}
                    onClick={(e) => {
                      // Prevent default collapsible behavior when collapsed
                      if (state === "collapsed") {
                        e.preventDefault()
                        handleMainItemClick(item)
                      }
                    }}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <a
                            href={subItem.url}
                            onClick={() => {
                              posthog.capture('sub-nav-item-clicked', {
                                sub_item_title: subItem.title,
                                sub_item_url: subItem.url,
                                parent_item_title: item.title,
                              })
                            }}
                          >
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <SidebarMenuButton 
                tooltip={item.title} 
                onClick={() => handleMainItemClick(item)}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
