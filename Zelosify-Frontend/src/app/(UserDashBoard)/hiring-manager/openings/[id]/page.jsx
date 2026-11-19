import HiringManagerCandidatesPage from "@/features/hiring-manager/HiringManagerCandidatesPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <HiringManagerCandidatesPage openingId={id} />;
}
