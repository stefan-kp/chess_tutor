// Server component layout for static export
// This allows generateStaticParams while the page remains a client component

export async function generateStaticParams() {
  // Generate params for root ECO codes (A00-E99)
  // This creates 500 static pages for the mobile build
  const ecoRoots = [];
  for (const letter of ['A', 'B', 'C', 'D', 'E']) {
    for (let num = 0; num <= 99; num++) {
      const eco = `${letter}${String(num).padStart(2, '0')}`;
      ecoRoots.push({ openingId: eco });
    }
  }
  return ecoRoots;
}

export default function OpeningIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
