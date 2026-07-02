// Server component layout for static export
// This allows generateStaticParams while the page remains a client component

// Must cover every pattern linked from the learning page (lower-cased IDs),
// otherwise the static mobile export 404s those routes.
export async function generateStaticParams() {
  const patterns = [
    'pin',
    'skewer',
    'fork',
    'discovered_check',
    'double_attack',
    // 'overloading' omitted: unsound fixture (see learning page).
    'back_rank_weakness',
    'trapped_piece',
  ];
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
