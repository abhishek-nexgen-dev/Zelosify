import { X } from "lucide-react";

export default function Notification({ notificationRef, setShowNotifications }) {
  return (
    <div
      ref={notificationRef}
      className="absolute right-6 mt-80 w-80 bg-[#0b0b0b] dark:bg-[#0b0b0b] rounded-md shadow-lg dark:shadow-gray-900/20 border border-border"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06] dark:border-gray-800">
        <h3 className="font-medium text-gray-100 dark:text-white">Notifications</h3>
        <button
          onClick={() => setShowNotifications(false)}
          className="text-gray-400 dark:text-gray-400 hover:text-gray-200 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div data-lenis-prevent className="max-h-[300px] overflow-y-auto">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="p-4 border-b border-white/[0.06] dark:border-gray-800 last:border-0 hover:bg-[#0b0b0b] dark:hover:bg-[#171717]"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 mt-2 bg-lime-300 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm text-gray-100 dark:text-gray-200">
                  New message from the team
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">2 hours ago</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
