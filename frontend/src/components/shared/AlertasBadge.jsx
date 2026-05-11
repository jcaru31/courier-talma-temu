export default function AlertasBadge({ count }) {
  if (!count || count === 0) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 border border-danger text-danger text-xs font-bold">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 1 21h22L12 2zm0 7 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
      </svg>
      {count}
    </span>
  );
}
