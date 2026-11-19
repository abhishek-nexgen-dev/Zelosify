import ApplicantsPage from "@/features/recruiter/ApplicantsPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <ApplicantsPage jobId={id} />;
}
