-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "categoriaQueja" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "cru" TEXT;

-- CreateIndex
CREATE INDEX "Ticket_estudianteId_idx" ON "Ticket"("estudianteId");

-- CreateIndex
CREATE INDEX "Ticket_departamentoActualId_idx" ON "Ticket"("departamentoActualId");

-- CreateIndex
CREATE INDEX "Ticket_tipoId_idx" ON "Ticket"("tipoId");

-- CreateIndex
CREATE INDEX "TicketAttachment_ticketId_idx" ON "TicketAttachment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_ticketId_idx" ON "TicketMessage"("ticketId");

-- CreateIndex
CREATE INDEX "TicketMessage_autorUserId_idx" ON "TicketMessage"("autorUserId");
