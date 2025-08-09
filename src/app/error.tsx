export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body className="p-6">
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </body>
    </html>
  );
}


