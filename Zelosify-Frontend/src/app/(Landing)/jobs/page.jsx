import JobSearchPage from "@/features/candidate/JobSearchPage";

export default async function JobsPage({ searchParams }) {
  const params = await searchParams;
  const initialFilters = {
    search: typeof params?.search === "string" ? params.search : "",
    location: typeof params?.location === "string" ? params.location : "",
  };
  return (
    <JobSearchPage
      key={`${initialFilters.search}:${initialFilters.location}`}
      initialFilters={initialFilters}
    />
  );
}
