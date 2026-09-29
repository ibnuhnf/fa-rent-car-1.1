-- Rental core: customers, bookings, documents, invoices, payments, pricing rules.
-- Invariants (docs/rules.md §3): no deposit, no payment gateway, integer rupiah,
-- timestamptz(6) UTC, soft delete, invoice versions are immutable snapshots.

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('KTP', 'SIM_A');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "pricing_rule_type" AS ENUM ('WEEKEND', 'HOLIDAY', 'HIGH_SEASON', 'LONG_DURATION');

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "nik" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" VARCHAR(32) NOT NULL,
    "email" VARCHAR(254),
    "address" TEXT NOT NULL,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "blacklist_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_code" VARCHAR(32) NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "hold_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "pickup_office" TEXT NOT NULL DEFAULT 'Kantor FA RENT CAR, Kedawung',
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_items" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "with_driver" BOOLEAN NOT NULL DEFAULT false,
    "driver_per_day" INTEGER NOT NULL DEFAULT 0,
    "driver_id" UUID,
    "vehicle_amount" INTEGER NOT NULL,
    "driver_amount" INTEGER NOT NULL,
    "surcharge_amount" INTEGER NOT NULL,
    "promo_discount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_documents" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "type" "document_type" NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "verified_by" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_access_tokens" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(32) NOT NULL,
    "booking_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "invoice_status" NOT NULL DEFAULT 'UNPAID',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "bank_account" JSONB NOT NULL,
    "terms" TEXT,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ(6),
    "pdf_object_key" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_date" TIMESTAMPTZ(6) NOT NULL,
    "bank_name" VARCHAR(128) NOT NULL,
    "account_holder" VARCHAR(128),
    "proof_object_key" VARCHAR(512) NOT NULL,
    "confirmed_by" UUID NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID,
    "name" VARCHAR(128) NOT NULL,
    "type" "pricing_rule_type" NOT NULL,
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6) NOT NULL,
    "multiplier_basis_points" INTEGER,
    "fixed_surcharge" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_nik_key" ON "customers"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "customers_whatsapp_key" ON "customers"("whatsapp");

-- CreateIndex
CREATE INDEX "customers_is_blacklisted_idx" ON "customers"("is_blacklisted");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "bookings_customer_id_idx" ON "bookings"("customer_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_hold_expires_at_idx" ON "bookings"("hold_expires_at");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "booking_items_booking_id_idx" ON "booking_items"("booking_id");

-- CreateIndex
CREATE INDEX "booking_items_vehicle_id_idx" ON "booking_items"("vehicle_id");

-- CreateIndex
CREATE INDEX "booking_items_period_idx" ON "booking_items"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "booking_documents_booking_id_idx" ON "booking_documents"("booking_id");

-- CreateIndex
CREATE INDEX "booking_documents_status_idx" ON "booking_documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "booking_access_tokens_token_hash_key" ON "booking_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "booking_access_tokens_booking_id_idx" ON "booking_access_tokens"("booking_id");

-- CreateIndex
CREATE INDEX "booking_access_tokens_expires_at_idx" ON "booking_access_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_booking_id_version_key" ON "invoices"("booking_id", "version");

-- CreateIndex
CREATE INDEX "invoices_booking_id_idx" ON "invoices"("booking_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "pricing_rules_vehicle_id_idx" ON "pricing_rules"("vehicle_id");

-- CreateIndex
CREATE INDEX "pricing_rules_type_idx" ON "pricing_rules"("type");

-- CreateIndex
CREATE INDEX "pricing_rules_period_idx" ON "pricing_rules"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "pricing_rules_is_active_idx" ON "pricing_rules"("is_active");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_documents" ADD CONSTRAINT "booking_documents_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_documents" ADD CONSTRAINT "booking_documents_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_access_tokens" ADD CONSTRAINT "booking_access_tokens_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "booking_items"
    ADD CONSTRAINT "booking_items_period_valid" CHECK ("end_date" >= "start_date"),
    ADD CONSTRAINT "booking_items_driver_per_day_nonnegative" CHECK ("driver_per_day" >= 0),
    ADD CONSTRAINT "booking_items_vehicle_amount_nonnegative" CHECK ("vehicle_amount" >= 0),
    ADD CONSTRAINT "booking_items_driver_amount_nonnegative" CHECK ("driver_amount" >= 0),
    ADD CONSTRAINT "booking_items_surcharge_amount_nonnegative" CHECK ("surcharge_amount" >= 0),
    ADD CONSTRAINT "booking_items_promo_discount_nonnegative" CHECK ("promo_discount" >= 0),
    ADD CONSTRAINT "booking_items_total_amount_nonnegative" CHECK ("total_amount" >= 0);

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_version_positive" CHECK ("version" >= 1),
    ADD CONSTRAINT "invoices_subtotal_nonnegative" CHECK ("subtotal" >= 0),
    ADD CONSTRAINT "invoices_discount_nonnegative" CHECK ("discount" >= 0),
    ADD CONSTRAINT "invoices_total_amount_nonnegative" CHECK ("total_amount" >= 0);

ALTER TABLE "invoice_items"
    ADD CONSTRAINT "invoice_items_quantity_nonnegative" CHECK ("quantity" >= 0),
    ADD CONSTRAINT "invoice_items_unit_price_nonnegative" CHECK ("unit_price" >= 0),
    ADD CONSTRAINT "invoice_items_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "payments"
    ADD CONSTRAINT "payments_amount_nonnegative" CHECK ("amount" >= 0);

ALTER TABLE "pricing_rules"
    ADD CONSTRAINT "pricing_rules_period_valid" CHECK ("end_date" >= "start_date"),
    ADD CONSTRAINT "pricing_rules_multiplier_basis_points_nonnegative" CHECK ("multiplier_basis_points" IS NULL OR "multiplier_basis_points" >= 0),
    ADD CONSTRAINT "pricing_rules_fixed_surcharge_nonnegative" CHECK ("fixed_surcharge" IS NULL OR "fixed_surcharge" >= 0);

-- Portal tokens are SHA-256 hex digests (>= 32 bytes of entropy).
ALTER TABLE "booking_access_tokens"
    ADD CONSTRAINT "booking_access_tokens_token_hash_length" CHECK (char_length("token_hash") = 64);