// Streams the shell immediately; the page body fills in when its API calls finish.
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="skeleton h-8 w-56 rounded-xl" />
      <div className="skeleton h-4 w-80 max-w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-3xl" />)}
      </div>
      <div className="skeleton h-72 rounded-3xl" />
    </div>
  );
}
