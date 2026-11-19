CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "hiringProfile"
ADD COLUMN "recommendationStatus" "RecommendationStatus" NOT NULL DEFAULT 'PENDING';
