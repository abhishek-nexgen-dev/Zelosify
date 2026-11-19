export const formatDate = (dateString) => {
  if (!dateString || dateString === "N/A") return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.log(error);
    return "Invalid Date";
  }
};
