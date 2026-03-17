"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Building2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
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
import { supabase } from "@/lib/supabase"

interface CompanySearchProps {
  onSelect: (company: any) => void;
  placeholder: string;
  category: "LOCAL" | "FOREIGN"; // Changed from 'table' to 'category'
}

export function CompanySearch({ onSelect, placeholder, category }: CompanySearchProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<any[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedName, setSelectedName] = React.useState("")

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      // We always hit the 'companies' table, but filter by category
      console.log('Category', category);
      const { data } = await supabase
        .from('companies') 
        .select("*")
        .eq('category', category)
        .ilike('name', `%${searchTerm}%`)
        .limit(5);
      
      setResults(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, category]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-white border-none shadow-sm p-4 h-auto rounded-xl text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate font-bold text-slate-700">
              {selectedName || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[450px] p-0 shadow-2xl border-none rounded-2xl overflow-hidden mt-2">
        <Command className="rounded-none border-none">
          <CommandInput 
            placeholder="Search company registry..." 
            onValueChange={setSearchTerm}
            className="h-14 border-none focus:ring-0 text-sm"
          />
          <CommandList className="max-h-[350px]">
            {loading && (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="animate-spin w-6 h-6 text-blue-600" />
                <span className="text-[9px] font-black uppercase tracking-widest">Searching...</span>
              </div>
            )}
            <CommandEmpty className="p-10 text-center flex flex-col items-center gap-2">
              <Building2 className="w-8 h-8 text-slate-100" />
              <p className="text-slate-400 text-[10px] font-black uppercase italic">No record found</p>
            </CommandEmpty>
            <CommandGroup heading={`${category} Companies`}>
              {results.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    setSelectedName(item.name);
                    onSelect(item);
                    setOpen(false);
                  }}
                  className="p-4 cursor-pointer flex flex-col items-start gap-1 aria-selected:bg-blue-600 aria-selected:text-white"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black uppercase text-[11px] tracking-tight">{item.name}</span>
                    <Check className={cn("h-4 w-4", selectedName === item.name ? "opacity-100" : "opacity-0")} />
                  </div>
                  <span className="text-[9px] opacity-60 truncate w-full italic">{item.address}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}