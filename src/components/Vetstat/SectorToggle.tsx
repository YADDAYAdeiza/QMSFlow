'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Bird, Fish, Beef, LayoutGrid } from 'lucide-react';

const sectors = [
  { id: 'All', label: 'All Sectors', icon: LayoutGrid },
  { id: 'Poultry', label: 'Poultry', icon: Bird },
  { id: 'Aquaculture', label: 'Fish', icon: Fish },
  { id: 'Livestock', label: 'Livestock', icon: Beef },
];

export default function SectorToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSector = searchParams.get('species') || 'All';

  const handleToggle = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'All') {
      params.delete('species');
    } else {
      params.set('species', id);
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex bg-slate-200/50 p-1 rounded-2xl gap-1">
      {sectors.map((sector) => {
        const Icon = sector.icon;
        const isActive = currentSector === sector.id;
        return (
          <button
            key={sector.id}
            onClick={() => handleToggle(sector.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${
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