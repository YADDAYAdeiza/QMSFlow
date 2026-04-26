import { LayoutDashboard, FileText, ClipboardList, BarChart3, Settings } from 'lucide-react';

export default function VetstatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 p-6 flex flex-col">
        <div className="mb-10">
          <h1 className="text-white font-bold text-xl tracking-tight">VMD Command Console</h1>
          <p className="text-slate-500 text-xs mt-1">NAFDAC Regulatory Division</p>
        </div>
        
        <nav className="space-y-2 flex-grow">
          <NavItem icon={LayoutDashboard} label="Overview" href="/Vetstat" />
          <NavItem icon={FileText} label="API Permits" href="/Vetstat/Permits" />
          <NavItem icon={ClipboardList} label="Finished Goods Ledger" href="/Vetstat/Ledger" />
          <NavItem icon={BarChart3} label="AMS Reporting" href="/Vetstat/Reporting" />
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <NavItem icon={Settings} label="System Settings" href="/Vetstat/Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

function NavItem({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
  return (
    <a href={href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition-all">
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
    </a>
  );
}