'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, Suspense } from 'react';
import { Bird, Fish, Beef, LayoutGrid } from 'lucide-react';

// A custom, clean vector representation of a swine/snout profile for veterinary tracking
const SwineIcon = ({ size = 14 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    <path d="M10 12h.01M14 12h.01" />
    <path d="M7 7c1-1.5 3-2.5 5-2.5s4 1 5 2.5" />
  </svg>
);

const SECTORS = [
  { id: 'All', label: 'All Sectors', icon: LayoutGrid },
  { id: 'Poultry', label: 'Poultry', icon: Bird },
  { id: 'Aquaculture', label: 'Fish', icon: Fish },
  { id: 'Livestock', label: 'Livestock', icon: Beef },
  { id: 'Swine', label: 'Swine', icon: SwineIcon },
];

function SectorToggleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentSector = searchParams.get('species') || 'All';

  const handleToggle = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'All') {
      params.delete('species');
    } else {
      params.set('species', id);
    }
    
    // Smooth, non-blocking page state switch
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div 
      className={`flex bg-slate-200/50 p-1 rounded-2xl gap-1 overflow-x-auto max-w-full no-scrollbar transition-opacity duration-200 ${
        isPending ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {SECTORS.map((sector) => {
        const Icon = sector.icon;
        const isActive = currentSector === sector.id;
        
        return (
          <button
            key={sector.id}
            type="button"
            disabled={isPending}
            onClick={() => handleToggle(sector.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
              isActive 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
            }`}
          >
            <Icon size={14} />
            <span className="uppercase tracking-wider">{sector.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Wrapped to prevent build-time de-optimization loops
export default function SectorToggle() {
  return (
    <Suspense fallback={
      <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1 w-full h-[34px] animate-pulse" />
    }>
      <SectorToggleContent />
    </Suspense>
  );
}