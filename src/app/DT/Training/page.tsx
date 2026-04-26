import FactoryStream from '@/components/DT/FactoryStream';

export default function TrainingPage() {
    return (
        <main className="min-h-screen bg-slate-950 p-8">
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-extrabold text-white">VMD Digital Twin: Meat Factory</h1>
                <p className="text-slate-400">Remote Inspection & Training Module</p>
            </header>

            <FactoryStream />
        </main>
    );
}