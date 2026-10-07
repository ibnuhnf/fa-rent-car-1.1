-- Operations & operational models additive migration:
-- Drivers, Driver Ratings, Handovers (BMM/Serah-Terima), Expenses (Pengeluaran), Maintenances (Servis).
-- All constraints follow docs/rules.md §3: integer rupiah, non-negative money, score 1-5, timestamptz(6) UTC.

-- CreateEnum
CREATE TYPE "handover_type" AS ENUM ('CHECKOUT', 'CHECKIN');

-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('FUEL', 'MAINTENANCE', 'CLEANING', 'SALARY', 'OFFICE', 'PARKING_TOLL', 'OTHER');

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "sim_number" VARCHAR(64) NOT NULL,
    "daily_rate" INTEGER NOT NULL DEFAULT 150000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_ratings" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handovers" (
    "id" UUID NOT NULL,
    "booking_item_id" UUID NOT NULL,
    "type" "handover_type" NOT NULL,
    "odometer" INTEGER NOT NULL,
    "fuel_level" INTEGER NOT NULL,
    "notes" TEXT,
    "damage_report" JSONB,
    "photo_keys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extra_fee" INTEGER NOT NULL DEFAULT 0,
    "signed_by_name" TEXT NOT NULL,
    "signed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "category" "expense_category" NOT NULL,
    "amount" INTEGER NOT NULL,
    "expense_date" TIMESTAMPTZ(6) NOT NULL,
    "description" TEXT NOT NULL,
    "proof_object_key" VARCHAR(512),
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "service_date" TIMESTAMPTZ(6) NOT NULL,
    "odometer" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "next_service_date" TIMESTAMPTZ(6),
    "next_odometer" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_sim_number_key" ON "drivers"("sim_number");

-- CreateIndex
CREATE INDEX "drivers_is_active_idx" ON "drivers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "driver_ratings_driver_id_booking_id_key" ON "driver_ratings"("driver_id", "booking_id");

-- CreateIndex
CREATE INDEX "driver_ratings_driver_id_idx" ON "driver_ratings"("driver_id");

-- CreateIndex
CREATE INDEX "driver_ratings_booking_id_idx" ON "driver_ratings"("booking_id");

-- CreateIndex
CREATE INDEX "handovers_booking_item_id_idx" ON "handovers"("booking_item_id");

-- CreateIndex
CREATE INDEX "handovers_type_idx" ON "handovers"("type");

-- CreateIndex
CREATE INDEX "expenses_category_idx" ON "expenses"("category");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expenses"("expense_date");

-- CreateIndex
CREATE INDEX "maintenances_vehicle_id_idx" ON "maintenances"("vehicle_id");

-- CreateIndex
CREATE INDEX "maintenances_service_date_idx" ON "maintenances"("service_date");

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_ratings" ADD CONSTRAINT "driver_ratings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_ratings" ADD CONSTRAINT "driver_ratings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handovers" ADD CONSTRAINT "handovers_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "drivers"
    ADD CONSTRAINT "drivers_daily_rate_nonnegative" CHECK ("daily_rate" >= 0);

ALTER TABLE "driver_ratings"
    ADD CONSTRAINT "driver_ratings_score_range" CHECK ("score" >= 1 AND "score" <= 5);

ALTER TABLE "handovers"
    ADD CONSTRAINT "handovers_odometer_nonnegative" CHECK ("odometer" >= 0),
    ADD CONSTRAINT "handovers_fuel_level_range" CHECK ("fuel_level" >= 0 AND "fuel_level" <= 100),
    ADD CONSTRAINT "handovers_extra_fee_nonnegative" CHECK ("extra_fee" >= 0);

ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "maintenances"
    ADD CONSTRAINT "maintenances_odometer_nonnegative" CHECK ("odometer" >= 0),
    ADD CONSTRAINT "maintenances_cost_nonnegative" CHECK ("cost" >= 0),
    ADD CONSTRAINT "maintenances_next_odometer_nonnegative" CHECK ("next_odometer" IS NULL OR "next_odometer" >= 0);
