export default function TCGIllustratorLoading() {
  return (
    <div className="app-page" aria-busy="true">
      <main className="page-shell page-shell--header-offset space-y-6 pb-24 pt-4">
        <div className="h-11 w-48 animate-pulse rounded-sm bg-card/60" aria-hidden="true" />
        <div className="glass-surface h-44 animate-pulse rounded-sm" aria-hidden="true" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="aspect-[2.15/3] animate-pulse rounded-[0.95rem] bg-card/50" aria-hidden="true" />
          ))}
        </div>
      </main>
    </div>
  );
}
