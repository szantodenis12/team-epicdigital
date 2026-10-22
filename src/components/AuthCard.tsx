export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/edh-mark-emerald.svg" alt="Epic Digital Hub" className="mb-8 h-5 w-auto" />
        <h1 className="mb-6 font-display text-xl font-bold tracking-tight">{title}</h1>
        {children}
      </div>
    </main>
  );
}
