import { useRouter } from "next/navigation";
import { memo, useCallback } from "react";

export const SidebarMenuSub = memo(({ children, isOpen, isExpanded, className, ...props }) => {
  const isVisible = isOpen && isExpanded;

  return (
    <div
      className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isVisible ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <ul
        data-sidebar="menu-sub"
        className={`ml-3 pl-1 border-l border-border mt-1 space-y-1 ${
          isVisible ? "pointer-events-auto" : "pointer-events-none"
        } ${className || ""}`}
        {...props}
      >
        {children}
      </ul>
    </div>
  );
});
SidebarMenuSub.displayName = "SidebarMenuSub";

export const SidebarMenuSubItem = memo(({ item, isActive, isOpen, onNavigate, ...props }) => {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(item.href);
  }, [router, item.href]);

  return (
    <li {...props}>
      <button
        onClick={() => {
          handleClick();
          onNavigate?.();
        }}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${isActive ? "bg-lime-400/[0.1] font-semibold text-lime-100" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}
      >
        {item.icon && (
          <item.icon
            className={`h-4 w-4 shrink-0 ${isActive ? "text-lime-200" : "text-slate-500"}`}
            aria-hidden="true"
          />
        )}
        {isOpen && <span>{item.title}</span>}
      </button>
    </li>
  );
});
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";
