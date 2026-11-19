import JobFormPage from "@/features/recruiter/JobFormPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <JobFormPage jobId={id} />;
}
