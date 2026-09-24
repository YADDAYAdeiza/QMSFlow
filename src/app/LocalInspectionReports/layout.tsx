// src/app/LocalInspectionReports/layout.tsx

export default function LocalInspectionReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="w-full min-h-screen">
      {/* Nested layout UI (sub-navs, sidebars, etc.) can go here */}
      {children}
    </section>
  );
}