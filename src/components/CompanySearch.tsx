"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Building2, Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/utils/supabase/client"

// Synchronous client creation for Client Components
const supabase = createClient();

interface CompanySearchProps {
  onSelect: (company: any) => void;
  placeholder: string;
  category: "LOCAL" | "FOREIGN";
}

export function CompanySearch({ onSelect, placeholder, category }: CompanySearchProps) {
  const [mounted, setMounted] = React.useState(false) 
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<any[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedName, setSelectedName] = React.useState("")

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!mounted) return;

    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('companies') 
          .select(`
            id,
            name,
            address,
            category,
            facilities (
              id,
              name,
              address,
              product_lines_local (
                id,
                name,
                products_local (
                  id,
                  name
                )
              )
            )
          `)
          .eq('category', category)
          .or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`)
          .limit(5);
        
        if (error) {
          console.error("Database search error details:", error);
        } else {
          setResults(data || []);
        }
      } catch (err: any) {
        console.error("Search fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, category, mounted]);

  // Handler for recommended new entry selection
  const handleAddNew = () => {
    const formattedName = searchTerm.trim().toUpperCase();
    
    const newCompanyPayload = {
      id: "NEW_ENTRY", 
      name: formattedName,
      address: "",
      email: "",
      category: category,
      isNew: true, // Key flag indicating inputs should stay unlocked
      facilities: []
    };

    setSelectedName(formattedName);
    onSelect(newCompanyPayload);
    setOpen(false);
  };

  if (!mounted) {
    return (
      <div className="w-full h-[54px] bg-white border border-slate-100 rounded-xl animate-pulse flex items-center px-4">
        <Search className="w-3.5 h-3.5 text-slate-200 mr-2" />
        <div className="h-2 w-32 bg-slate-50 rounded" />
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-white border-none shadow-sm p-4 h-auto rounded-xl text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate font-bold text-slate-700 uppercase">
              {selectedName || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0 shadow-2xl border-none rounded-2xl overflow-hidden mt-2" align="start">
        <Command className="rounded-none border-none">
          <CommandInput 
            placeholder="Search registry by name or location..." 
            onValueChange={setSearchTerm}
            className="h-14 border-none focus:ring-0 text-sm"
          />
          <CommandList className="max-h-[350px]">
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin w-6 h-6 text-blue-600" />
                <span className="text-[9px] font-black uppercase tracking-widest">Scanning Registry...</span>
              </div>
            )}
            
            {/* Search-or-Create Prompt when query returns no database matches */}
            {!loading && results.length === 0 && searchTerm.trim().length >= 2 && (
              <div className="p-4">
                <div className="p-4 border border-dashed border-blue-200 bg-blue-50/50 rounded-xl flex flex-col items-center text-center gap-2">
                  <Building2 className="w-6 h-6 text-blue-400" />
                  <div>
                    <p className="text-slate-600 text-xs font-bold">
                      "{searchTerm.toUpperCase()}" is not in registry.
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      Click below to use this name and enter details manually.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddNew}
                    className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Use "{searchTerm.toUpperCase()}"
                  </Button>
                </div>
              </div>
            )}

            <CommandGroup heading={`${category} Registry Results`}>
              {results.map((item) => {
                const facilityProductLines = item.facilities?.flatMap((f: any) => f.product_lines_local || []) || [];

                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.name} - ${item.address || ""}`}
                    onSelect={() => {
                      setSelectedName(item.name);
                      onSelect({ ...item, isNew: false }); 
                      setOpen(false);
                    }}
                    className="p-4 cursor-pointer flex flex-col items-start gap-1 aria-selected:bg-slate-900 aria-selected:text-white group"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-black uppercase text-[11px] tracking-tight">{item.name}</span>
                      <Check className={cn("h-4 w-4", selectedName === item.name ? "opacity-100" : "opacity-0")} />
                    </div>
                    
                    <span className="text-[9px] opacity-60 truncate w-full italic mb-1 group-aria-selected:text-blue-200">
                      {item.address || "No address on file"}
                    </span>

                    {facilityProductLines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {facilityProductLines.slice(0, 3).map((l: any) => (
                          <span key={l.id} className="text-[8px] bg-blue-500/10 text-blue-600 group-aria-selected:bg-white/10 group-aria-selected:text-white px-2 py-0.5 rounded-sm font-bold uppercase">
                            {l.name}
                          </span>
                        ))}
                        {facilityProductLines.length > 3 && (
                          <span className="text-[8px] opacity-40 px-1 py-0.5 font-bold">
                            +{facilityProductLines.length - 3} MORE
                          </span>
                        )}
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}