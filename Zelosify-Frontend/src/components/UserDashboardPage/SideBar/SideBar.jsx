"use client";

import { useEffect, useRef, memo, useState, createContext, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import SidebarHeader from "./SidebarHeader";
import useAuth from "@/hooks/Auth/useAuth";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./components/SideBarMenu";
import { SidebarMenuSub, SidebarMenuSubItem } from "./components/SideBarMenuSub";
import { getSidebarSectionsByRole, signOutItem } from "./Routes/ItemRoutes";

const SidebarContext = createContext(null);

function routeIsActive(pathname, href) {
  if (pathname === href) return true;
  if (href === "/admin/recruiters" || href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
}

const Sidebar = memo(({ isOpen, toggleSidebar }) => {
  const pathname = usePathname();
  const router = useRouter();
  const sidebarRef = useRef(null);
  const [expandedItems, setExpandedItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const { user, handleOpenSignoutConfirmation } = useAuth();

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const updateMobile = () => setIsMobile(media.matches);
    updateMobile();
    media.addEventListener("change", updateMobile);
    return () => media.removeEventListener("change", updateMobile);
  }, []);

  const sidebarSections = useMemo(() => {
    const role = typeof user?.role === "string" ? user.role.trim().toUpperCase() : "";
    if (!role) return [];
    return getSidebarSectionsByRole(role, Array.isArray(user.permissions) ? user.permissions : []);
  }, [user]);

  useEffect(() => {
    const itemsToExpand = [];
    for (const section of sidebarSections) {
      for (const item of section.items) {
        if (
          item.hasSubmenu &&
          item.submenu.some((subItem) => routeIsActive(pathname, subItem.href))
        ) {
          itemsToExpand.push(item.title);
        }
      }
    }
    if (itemsToExpand.length > 0) {
      setExpandedItems((previous) => [
        ...previous,
        ...itemsToExpand.filter((item) => !previous.includes(item)),
      ]);
    }
  }, [pathname, sidebarSections]);

  useEffect(() => {
    if (!isOpen || !isMobile) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") toggleSidebar();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, isMobile, toggleSidebar]);

  const toggleSubmenu = useCallback((title) => {
    setExpandedItems((previous) =>
      previous.includes(title) ? previous.filter((item) => item !== title) : [...previous, title]
    );
  }, []);

  const sidebarContextValue = useMemo(
    () => ({ isOpen, toggleSidebar, expandedItems, setExpandedItems, toggleSubmenu }),
    [isOpen, toggleSidebar, expandedItems, toggleSubmenu]
  );

  const navigate = useCallback(
    (href) => {
      router.push(href);
      if (isMobile && isOpen) toggleSidebar();
    },
    [router, isMobile, isOpen, toggleSidebar]
  );

  const createMenuItemClickHandler = useCallback(
    (item) => () => {
      if (!isOpen && item.hasSubmenu) {
        toggleSidebar();
        setExpandedItems((previous) =>
          previous.includes(item.title) ? previous : [...previous, item.title]
        );
      } else if (item.hasSubmenu) {
        toggleSubmenu(item.title);
      } else {
        navigate(item.href);
      }
    },
    [isOpen, toggleSidebar, toggleSubmenu, navigate]
  );

  const renderSidebarSections = useMemo(() => {
    if (!sidebarSections.length) {
      return isOpen ? (
        <p className="rounded-xl border border-dashed border-white/[0.1] px-3 py-4 text-xs leading-5 text-slate-500">
          No menu items are assigned to this account.
        </p>
      ) : null;
    }

    return sidebarSections.map((section) => (
      <section key={section.title} className="space-y-2.5" aria-label={section.title}>
        {isOpen && (
          <h2 className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
            {section.title}
          </h2>
        )}
        <SidebarMenu className="gap-1">
          {section.items.map((item) => {
            const onScoreRoute = pathname.startsWith("/applications/");
            const scoreSectionActive =
              onScoreRoute &&
              ((user?.role === "CANDIDATE" && item.href === "/candidate/applications") ||
                (["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(user?.role) &&
                  item.href === "/recruiter/jobs"));
            const isActive =
              scoreSectionActive ||
              routeIsActive(pathname, item.href) ||
              (item.hasSubmenu &&
                item.submenu.some((subItem) => routeIsActive(pathname, subItem.href)));
            const isExpanded = expandedItems.includes(item.title);

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  icon={item.icon}
                  title={item.title}
                  isActive={isActive}
                  isOpen={isOpen}
                  hasSubmenu={item.hasSubmenu}
                  isExpanded={isExpanded}
                  onClick={createMenuItemClickHandler(item)}
                />
                {item.hasSubmenu && (
                  <SidebarMenuSub isOpen={isOpen} isExpanded={isExpanded}>
                    {item.submenu.map((subItem) => (
                      <SidebarMenuSubItem
                        key={subItem.title}
                        item={subItem}
                        isActive={routeIsActive(pathname, subItem.href)}
                        isOpen={isOpen}
                        onNavigate={() => {
                          if (isMobile && isOpen) toggleSidebar();
                        }}
                      />
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </section>
    ));
  }, [
    isOpen,
    isMobile,
    pathname,
    expandedItems,
    createMenuItemClickHandler,
    sidebarSections,
    toggleSidebar,
    user?.role,
  ]);

  const footerButtonClass =
    "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300";

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      {isOpen && isMobile && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={toggleSidebar}
          className="fixed inset-0 z-[55] cursor-default bg-black/65 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <aside
        ref={sidebarRef}
        aria-label="Main navigation"
        aria-hidden={isMobile && !isOpen}
        inert={isMobile && !isOpen}
        className={`fixed inset-y-0 left-0 z-[60] flex h-dvh flex-col border-r border-white/[0.07] bg-[#0b0b0b] transition-[width,transform] duration-300 ease-out ${
          isMobile
            ? `w-[min(18rem,calc(100vw-2.5rem))] ${isOpen ? "translate-x-0 shadow-2xl shadow-black/50" : "-translate-x-full"}`
            : `${isOpen ? "w-64" : "w-20"} translate-x-0 shadow-[12px_0_34px_rgba(0,0,0,0.2)]`
        }`}
      >
        <SidebarHeader isOpen={isOpen} isMobile={isMobile} toggleSidebar={toggleSidebar} />
        <nav
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5"
          aria-label="Workspace sections"
        >
          <div className="space-y-7">{renderSidebarSections}</div>
        </nav>
        <div className="shrink-0 space-y-1 border-t border-white/[0.07] px-3 py-3">
          <button
            type="button"
            onClick={handleOpenSignoutConfirmation}
            aria-label={signOutItem.title}
            title={!isOpen ? signOutItem.title : undefined}
            className={`${footerButtonClass} text-rose-300 hover:bg-rose-400/[0.08] hover:text-rose-200`}
          >
            <signOutItem.icon className="h-[1.1rem] w-[1.1rem] shrink-0" aria-hidden="true" />
            {isOpen && <span>{signOutItem.title}</span>}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  );
});

Sidebar.displayName = "Sidebar";
export default Sidebar;
