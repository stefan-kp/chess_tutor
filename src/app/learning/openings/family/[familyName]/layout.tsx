// Server component layout for static export.
// Lets the family training route pre-render for `output: 'export'` while the
// page itself stays a client component.
import { getAllFamilyNames } from '@/lib/openingTrainer/openingLoader';

export function generateStaticParams() {
  return getAllFamilyNames().map((familyName) => ({
    familyName: encodeURIComponent(familyName),
  }));
}

export default function FamilyNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
