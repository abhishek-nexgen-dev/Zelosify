import multer from "multer";
import { ENV } from "../env.js";










const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/jpg",
] as const;




const FILE_SIZE_LIMIT = ENV.MAX_FILE_SIZE_BYTES;








const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG, PNG files are allowed."
      )
    );
  }
};





export const uploadConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_SIZE_LIMIT,
  },
  fileFilter,
});




export { ALLOWED_MIME_TYPES, FILE_SIZE_LIMIT, fileFilter };
