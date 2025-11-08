-- CreateEnum
CREATE TYPE "LiveChatType" AS ENUM ('INDIVIDUAL', 'GROUP');

-- CreateEnum
CREATE TYPE "LiveMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "LiveMediaType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateTable
CREATE TABLE "live_chats" (
    "id" TEXT NOT NULL,
    "type" "LiveChatType" NOT NULL DEFAULT 'INDIVIDUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "live_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_participants" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_messages" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrl" TEXT,
    "mediaType" "LiveMediaType",
    "status" "LiveMessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_message_reads" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liveChatId" TEXT,

    CONSTRAINT "live_message_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_chats_createdById_idx" ON "live_chats"("createdById");

-- CreateIndex
CREATE INDEX "live_chats_type_idx" ON "live_chats"("type");

-- CreateIndex
CREATE INDEX "chat_participants_chatId_idx" ON "chat_participants"("chatId");

-- CreateIndex
CREATE INDEX "chat_participants_userId_idx" ON "chat_participants"("userId");

-- CreateIndex
CREATE INDEX "live_messages_chatId_idx" ON "live_messages"("chatId");

-- CreateIndex
CREATE INDEX "live_messages_senderId_idx" ON "live_messages"("senderId");

-- CreateIndex
CREATE INDEX "live_messages_createdAt_idx" ON "live_messages"("createdAt");

-- CreateIndex
CREATE INDEX "live_message_reads_messageId_idx" ON "live_message_reads"("messageId");

-- CreateIndex
CREATE INDEX "live_message_reads_userId_idx" ON "live_message_reads"("userId");

-- CreateIndex
CREATE INDEX "live_message_reads_liveChatId_idx" ON "live_message_reads"("liveChatId");

-- CreateIndex
CREATE UNIQUE INDEX "live_message_reads_messageId_userId_key" ON "live_message_reads"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "live_chats" ADD CONSTRAINT "live_chats_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "live_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "live_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_messages" ADD CONSTRAINT "live_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_message_reads" ADD CONSTRAINT "live_message_reads_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "live_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_message_reads" ADD CONSTRAINT "live_message_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_message_reads" ADD CONSTRAINT "live_message_reads_liveChatId_fkey" FOREIGN KEY ("liveChatId") REFERENCES "live_chats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
