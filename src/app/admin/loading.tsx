export default function AdminLoading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-6 w-52 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-[28rem] bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
