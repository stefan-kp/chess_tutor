// Server component layout for static export
// This allows generateStaticParams while the page remains a client component

export async function generateStaticParams() {
  const patterns = ['pin', 'skewer', 'fork', 'discovered_attack', 'discovered_check'];
  return patterns.map((pattern) => ({
    pattern,
  }));
}

export default function TacticsPatternLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
