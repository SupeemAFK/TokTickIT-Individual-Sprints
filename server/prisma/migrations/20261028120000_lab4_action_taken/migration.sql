BEGIN;

-- CreateEnum
CREATE TYPE "ActionTakenStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ActionTaken" (
    "id" SERIAL NOT NULL,
    "ticketId" INTEGER NOT NULL,
    "actionAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "status" "ActionTakenStatus" NOT NULL DEFAULT 'OPEN',
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpNote" TEXT,
    "attachmentNotes" TEXT,
    "assignedToUserId" INTEGER,
    "performedByUserId" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "idempotencyPayloadHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionTaken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionTaken_idempotencyKey_key" ON "ActionTaken"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ActionTaken_ticketId_actionAt_id_idx" ON "ActionTaken"("ticketId", "actionAt", "id");

-- Index per-Ticket active-action checks used by the resolution gate.
CREATE INDEX "ActionTaken_ticketId_status_idx" ON "ActionTaken"("ticketId", "status");

-- CreateIndex
CREATE INDEX "ActionTaken_assignedToUserId_status_actionAt_id_idx" ON "ActionTaken"("assignedToUserId", "status", "actionAt", "id");

-- CreateIndex
CREATE INDEX "Ticket_resolvedAt_id_idx" ON "Ticket"("resolvedAt", "id");

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionTaken" ADD CONSTRAINT "ActionTaken_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep normalized work fields and the conditional follow-up requirement valid at the database boundary.
ALTER TABLE "ActionTaken"
    ADD CONSTRAINT "ActionTaken_description_length_check" CHECK (char_length(btrim("description")) BETWEEN 1 AND 2000),
    ADD CONSTRAINT "ActionTaken_result_length_check" CHECK (char_length(btrim("result")) BETWEEN 1 AND 2000),
    ADD CONSTRAINT "ActionTaken_followUpNote_check" CHECK (
        ("followUpRequired" = false AND ("followUpNote" IS NULL OR char_length("followUpNote") <= 1000))
        OR
        ("followUpRequired" = true AND "followUpNote" IS NOT NULL AND char_length(btrim("followUpNote")) BETWEEN 1 AND 1000)
    ),
    ADD CONSTRAINT "ActionTaken_attachmentNotes_length_check" CHECK ("attachmentNotes" IS NULL OR char_length("attachmentNotes") <= 1000),
    ADD CONSTRAINT "ActionTaken_idempotencyPayloadHash_format_check" CHECK ("idempotencyPayloadHash" ~ '^[0-9a-f]{64}$');

COMMIT;
