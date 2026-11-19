import JobDetailsPage from "@/features/candidate/JobDetailsPage";

export default async function JobPage({ params }) {
  const { id } = await params;
  return <JobDetailsPage jobId={id} />;
}
