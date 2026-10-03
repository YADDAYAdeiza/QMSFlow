import DirectorInboxPage from "@/components/LocalInspectionReports/Director/DirectorInboxPage";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  return <DirectorInboxPage searchParams={searchParams} />;
}