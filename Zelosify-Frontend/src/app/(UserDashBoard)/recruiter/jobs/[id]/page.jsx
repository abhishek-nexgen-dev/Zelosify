import JobDetailsPage from "@/features/recruiter/JobDetailsPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <JobDetailsPage jobId={id} />;
}
