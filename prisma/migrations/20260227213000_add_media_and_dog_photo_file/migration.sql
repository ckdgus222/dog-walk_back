-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('DOG_PROFILE', 'FEED_POST');

-- AlterTable
ALTER TABLE "Dog"
ADD COLUMN "photoFileId" TEXT;

-- AlterTable
ALTER TABLE "Dog"
DROP COLUMN "photoUrl";

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaderUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dog_photoFileId_key" ON "Dog"("photoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_storageKey_key" ON "Media"("storageKey");

-- CreateIndex
CREATE INDEX "Media_purpose_idx" ON "Media"("purpose");

-- CreateIndex
CREATE INDEX "Media_uploaderUserId_idx" ON "Media"("uploaderUserId");

-- AddForeignKey
ALTER TABLE "Dog" ADD CONSTRAINT "Dog_photoFileId_fkey" FOREIGN KEY ("photoFileId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
