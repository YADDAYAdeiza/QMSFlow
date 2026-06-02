'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Plus } from 'lucide-react';

interface Company {
  id: string;
  companies_amr?: { company_name: string } | null;
  company_name?: string; 
}

interface CompanySelectProps {
  companiesCatalog: Company[];
  selectedCompanyId: string;
  onSelect: (value: string) => void;
  name?: string;
}

export default function CompanySelect({ 
  companiesCatalog, 
  selectedCompanyId, 
  onSelect,
  name = "company_id"
}: CompanySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const getCompanyName = (c: Company) => 
    c.companies_amr?.company_name || c.company_name || "Unnamed Entity";

  // Check if current selection is an existing ID in our catalog
  const existingRecord = companiesCatalog.find(c => c.id === selectedCompanyId);
  const displayValue = existingRecord ? getCompanyName(existingRecord) : selectedCompanyId;

  const filteredCompanies = companiesCatalog.filter(c => 
    getCompanyName(c).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      {/* We hold the ID or the Raw String here */}
      <input type="hidden" name={name} value={selectedCompanyId} />

      <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
        Authorized Importer / Entity
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-100 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-left font-medium text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        <span className="truncate flex items-center gap-2">
          <Building2 size={16} className="text-slate-400" />
          {selectedCompanyId ? displayValue : <span className="text-slate-400">Select or enter new entity...</span>}
        </span>
        <ChevronsUpDown size={16} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute z-[120] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <input
              autoFocus
              type="text"
              placeholder="Search or type new entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>

          <div className="overflow-y-auto">
            {search && !filteredCompanies.find(c => getCompanyName(c).toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                onClick={() => { onSelect(search); setIsOpen(false); setSearch(''); }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-emerald-700 bg-emerald-50 flex items-center gap-2"
              >
                <Plus size={16} /> Use "{search}" as new entity
              </button>
            )}

            {filteredCompanies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => { onSelect(company.id); setIsOpen(false); setSearch(''); }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex justify-between items-center"
              >
                {getCompanyName(company)}
                {company.id === selectedCompanyId && <Check size={16} className="text-emerald-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}