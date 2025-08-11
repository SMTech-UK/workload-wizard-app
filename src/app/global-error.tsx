"use client";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h2>Something went wrong</h2>
        <p>We&apos;ve logged this error. Please try refreshing the page.</p>
        {error?.digest ? (
          <small style={{ opacity: 0.7 }}>Error digest: {error.digest}</small>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <Link href="/">Go to homepage</Link>
        </div>
      </body>
    </html>
  );
}
