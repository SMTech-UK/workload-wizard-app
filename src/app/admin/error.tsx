"use client";

export default function AdminError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2">Admin area error</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}
