"use client";

// Removed useEffect as it's redundant with RootLayout setting the body class

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render a div instead of a nested body tag
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {children}
    </div>
  );
}
