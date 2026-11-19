import React from "react";

export default function Table({
  handleContractClick,
  handleSelectContract,
  selectedContracts,
  handleSelectAll,
  contracts,
}) {
  return (
    <div className="mt-6 bg-[#0b0b0b] border border-white/[0.08] rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[#0b0b0b]">
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                className="rounded border-gray-700"
                checked={selectedContracts.length === contracts.length}
                onChange={handleSelectAll}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Contract No.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Vendor name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Approver
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.08]">
          {contracts.map((contract) => (
            <tr
              key={contract.id}
              className="hover:bg-[#0b0b0b] cursor-pointer"
              onClick={() => handleContractClick(contract)}
            >
              <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="rounded border-gray-700"
                  checked={selectedContracts.includes(contract.id)}
                  onChange={() => handleSelectContract(contract.id)}
                />
              </td>
              <td className="px-6 py-4 text-sm text-gray-100">{contract.id}</td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center text-sm font-medium text-gray-200">
                    {contract.customer.initials}
                  </div>
                  <span className="ml-3 text-sm text-gray-100">{contract.customer.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-100">{contract.type}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                  {contract.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-100">{contract.total}</td>
              <td className="px-6 py-4 text-sm text-gray-100">{contract.date}</td>
              <td className="px-6 py-4 text-sm text-gray-100">{contract.people}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
