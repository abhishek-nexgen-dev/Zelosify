import VendorOpeningDetailPage from "@/features/vendor/VendorOpeningDetailPage";

export default async function Page({ params }) {
  const { id } = await params;
  return <VendorOpeningDetailPage openingId={id} />;
}
