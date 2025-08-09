"use client";

export default function OrgError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-2">Organisation area error</h2>
      <p className="text-sm text-muted-foreground">{error.message}</p>
    </div>
  );
}


