export default function OrgUsersLoading() {
  return (
    <div className="p-6 space-y-3">
      <div className="h-6 w-60 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-[28rem] bg-gray-200 rounded animate-pulse" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}


