-- CreateEnum
CREATE TYPE "DogGender" AS ENUM ('male', 'female');

-- CreateTable
CREATE TABLE "Dog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "birthYear" TEXT,
    "gender" "DogGender" NOT NULL,
    "personality" TEXT[],
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dog_ownerId_idx" ON "Dog"("ownerId");

-- AddForeignKey
ALTER TABLE "Dog" ADD CONSTRAINT "Dog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
