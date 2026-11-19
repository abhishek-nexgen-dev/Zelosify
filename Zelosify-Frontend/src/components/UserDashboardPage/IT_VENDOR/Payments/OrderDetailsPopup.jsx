import { Mail, Printer, Upload, X } from "lucide-react";

export default function OrderDetailsPopup({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-[500px]">
        {}
        <div className="rounded-t-lg flex items-center justify-between p-4 border-b border-border bg-black dark:bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="text-sm text-white font-medium">Contract #192541</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-200 hover:text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {}
        <div className="p-4 text-foreground">
          {}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center font-medium text-gray-200">
                EH
              </div>
              <div className="font-medium">Esther Howard</div>
            </div>
            <div className="ml-2 flex items-center gap-5 mb-2">
              <Mail className="h-4 w-4 " />
              <div className="text-sm ">brodrigues@gmail.com</div>
            </div>
            {}
          </div>

          {}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Contract Details :</h3>
            <ul className="list-disc pl-5 space-y-3 text-sm ">
              <li>
                <span className="">Contract Name</span>
                <br />
                <span className="font-medium">#192541</span>
                <br />
                <span className="">$1,590.00</span>
                <br />
                <span className="">Feb 1, 2025 to March 1, 2025</span>
              </li>
            </ul>
          </div>

          {}
          <div className="pt-4 border-t border-border border-dashed">
            <div className="flex justify-between">
              <span className="font-medium">Total:</span>
              <span className="font-medium">$1,927.89</span>
            </div>
          </div>
        </div>

        {}
        <div className="rounded-b-lg flex items-center justify-between p-4 border-t border-border bg-tableHeader">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md">
              <Upload className="h-4 w-4" /> Export
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md">
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
          <button className="text-foreground">•••</button>
        </div>
      </div>
    </div>
  );
}
