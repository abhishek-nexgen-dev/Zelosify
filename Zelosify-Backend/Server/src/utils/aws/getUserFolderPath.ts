export const getUserFolderPath = (
  pathPrefix: string,
  tenantId: string,
  department: string,
  userId: string
): string => {

  if (!pathPrefix || !userId || !tenantId || !department) {
    throw new Error("User information is incomplete or missing");
  }


  const normalizedDepartment = department.toLowerCase();

  const baseFolderPath = `${pathPrefix}/${tenantId}/${normalizedDepartment}`;


  return `${baseFolderPath}/${userId}`;
};
