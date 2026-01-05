import LODEntryForm from "@/components/LODEntryForm";

export default async function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          QMS Workflow System
        </h1>
        
        {/* Our LOD Form */}
        <LODEntryForm />
        
      </div>
    </main>
  );
}