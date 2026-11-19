


export interface FileListResponse {

  files: Array<{

    key: string;

    lastModified: Date;

    size: number;
  }>;
}
