import { ChevronDown, ChevronRight } from "lucide-react";
import { memo } from "react";

export const SidebarMenu = memo(({ children, className, ...props }) => {
  return (
    <ul
      data-sidebar="menu"
      className={`flex w-full min-w-0 flex-col gap-2 ${className || ""}`}
      {...props}
    >
      {children}
    </ul>
  );
});
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = memo(({ children, className, ...props }) => {
  return (
    <li
      data-sidebar="menu-item"
      className={`group/menu-item relative ${className || ""}`}
      {...props}
    >
      {children}
    </li>
  );
});
SidebarMenuItem.displayName = "SidebarMenuItem";

export const SidebarMenuButton = memo(
  ({
    icon: Icon,
    title,
    isActive,
    onClick,
    isOpen,
    hasSubmenu,
    isExpanded,
    className,
    ...props
  }) => {
    return (
      <button
        data-sidebar="menu-button"
        data-active={isActive}
        onClick={onClick}
        aria-label={!isOpen ? title : undefined}
        aria-current={isActive ? "page" : undefined}
        aria-expanded={hasSubmenu ? isExpanded : undefined}
        title={!isOpen ? title : undefined}
        className={`group relative flex min-h-11 w-full items-center ${isOpen ? "justify-between" : "justify-center"} gap-3 rounded-xl px-3 text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${isActive ? "bg-lime-400/[0.11] font-semibold text-lime-100 ring-1 ring-inset ring-lime-300/[0.14]" : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"} ${className || ""}`}
        {...props}
      >
        <div className={`flex min-w-0 items-center ${isOpen ? "gap-3" : "justify-center"}`}>
          {Icon && (
            <Icon
              className={`h-[1.1rem] w-[1.1rem] shrink-0 transition-colors ${isActive ? "text-lime-200" : "text-slate-500 group-hover:text-slate-200"}`}
              aria-hidden="true"
            />
          )}
          {isOpen && <span className="truncate text-left">{title}</span>}
        </div>
        {isOpen &&
          hasSubmenu &&
          (isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          ))}
      </button>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";
