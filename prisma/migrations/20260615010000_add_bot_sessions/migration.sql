CREATE TABLE "bot_sessions" (
  "key" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "bot_sessions_pkey" PRIMARY KEY ("key")
);
