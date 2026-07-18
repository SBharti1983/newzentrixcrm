import { pgTable, uuid, text, bigint, integer, boolean, timestamp, foreignKey, unique, jsonb, date, numeric, char, index, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const trainingModules = pgTable("training_modules", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	uploadedBy: uuid("uploaded_by"),
	title: text().notNull(),
	description: text(),
	category: text().default('General'),
	type: text().default('Document'),
	fileUrl: text("file_url"),
	thumbnailUrl: text("thumbnail_url"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	fileSize: bigint("file_size", { mode: "number" }),
	mimeType: text("mime_type"),
	xpPoints: integer("xp_points").default(100),
	duration: text(),
	instructor: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().default('agent').notNull(),
	avatar: text(),
	phone: text(),
	department: text(),
	reportsTo: uuid("reports_to"),
	telephonyAgentId: text("telephony_agent_id"),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	xp: integer().default(0),
	level: integer().default(1),
	rankTitle: text("rank_title").default('Rookie'),
}, (table) => [
	foreignKey({
			columns: [table.reportsTo],
			foreignColumns: [table.id],
			name: "users_reports_to_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("users_tenant_id_email_key").on(table.tenantId, table.email),
]);

export const trainingProgress = pgTable("training_progress", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	userId: uuid("user_id"),
	moduleId: uuid("module_id"),
	progress: integer().default(0),
	completed: boolean().default(false),
	lastAccessed: timestamp("last_accessed", { withTimezone: true, mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	isCertified: boolean("is_certified").default(false),
	certifiedAt: timestamp("certified_at", { mode: 'string' }),
	bestScore: integer("best_score").default(0),
}, (table) => [
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [trainingModules.id],
			name: "training_progress_module_id_fkey"
		}).onDelete("cascade"),
	unique("training_progress_user_id_module_id_key").on(table.userId, table.moduleId),
]);

export const battleCards = pgTable("battle_cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	title: text().notNull(),
	category: text(),
	content: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "battle_cards_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const projectBattleCards = pgTable("project_battle_cards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	projectName: text("project_name").notNull(),
	usp: text().array().default([""]),
	objections: jsonb().default([]),
	targetAudience: text("target_audience"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const leads = pgTable("leads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	assignedTo: uuid("assigned_to"),
	projectId: uuid("project_id"),
	name: text().notNull(),
	email: text(),
	phone: text(),
	city: text(),
	source: text(),
	stage: text().default('New'),
	priority: text().default('Medium'),
	score: integer().default(0),
	budget: text(),
	propertyType: text("property_type"),
	channelPartnerId: uuid("channel_partner_id"),
	lastContactAt: timestamp("last_contact_at", { withTimezone: true, mode: 'string' }),
	status: text().default('Active'),
	notes: text(),
	nurtureReason: text("nurture_reason"),
	reconnectDate: date("reconnect_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdBy: uuid("created_by"),
	aiSummary: text("ai_summary"),
	aiNextAction: text("ai_next_action"),
	aiScore: integer("ai_score"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "leads_assigned_to_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "leads_created_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "leads_project_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "leads_tenant_id_fkey"
		}).onDelete("cascade"),
	index("idx_leads_tenant_created").on(table.tenantId, table.createdAt),
	index("idx_leads_assigned_to").on(table.assignedTo),
]);

export const interactions = pgTable("interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	leadId: uuid("lead_id"),
	userId: uuid("user_id"),
	type: text().notNull(),
	date: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	duration: integer(),
	note: text(),
	outcome: text(),
	recordingUrl: text("recording_url"),
	transcript: text(),
	sentiment: text(),
	rapportScore: numeric("rapport_score", { precision: 4, scale:  1 }),
	closingScore: numeric("closing_score", { precision: 4, scale:  1 }),
	projectsDiscussed: text("projects_discussed").array(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	callSid: text("call_sid"),
	direction: text(),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "interactions_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "interactions_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interactions_user_id_fkey"
		}).onDelete("set null"),
	index("idx_interactions_lead_id").on(table.leadId),
	index("idx_interactions_tenant_id").on(table.tenantId),
]);

export const simulationReports = pgTable("simulation_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	userId: uuid("user_id"),
	moduleId: uuid("module_id"),
	score: integer(),
	persona: text(),
	scenarioTitle: text("scenario_title"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const tenants = pgTable("tenants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	logoUrl: text("logo_url"),
	primaryColor: text("primary_color").default('#1e3a73'),
	plan: text().default('trial'),
	planExpiresAt: timestamp("plan_expires_at", { withTimezone: true, mode: 'string' }),
	maxUsers: integer("max_users").default(3),
	maxLeads: integer("max_leads").default(500),
	maxProjects: integer("max_projects").default(5),
	isActive: boolean("is_active").default(true),
	settings: jsonb().default({}),
	referralCode: text("referral_code"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	sidebarColor: text("sidebar_color"),
	accentColor: text("accent_color"),
	faviconUrl: text("favicon_url"),
	tagline: text(),
	poweredBy: boolean("powered_by").default(true),
	customDomain: text("custom_domain"),
	loginBannerText: text("login_banner_text"),
	footerText: text("footer_text"),
	supportEmail: text("support_email"),
	supportPhone: text("support_phone"),
	logoIcon: text("logo_icon"),
	companyName: text("company_name"),
}, (table) => [
	unique("tenants_slug_key").on(table.slug),
	unique("tenants_referral_code_key").on(table.referralCode),
]);

export const messageTemplates = pgTable("message_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	body: text().notNull(),
	category: text().default('General'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "message_templates_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const refreshTokens = pgTable("refresh_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	tokenHash: text("token_hash").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "refresh_tokens_user_id_fkey"
		}).onDelete("cascade"),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	location: text(),
	description: text(),
	type: text().default('Residential'),
	status: text().default('Active'),
	totalUnits: integer("total_units").default(0),
	availableUnits: integer("available_units").default(0),
	priceRange: text("price_range"),
	reraNumber: text("rera_number"),
	amenities: jsonb().default([]),
	possessionDate: date("possession_date"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "projects_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const inventory = pgTable("inventory", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	projectId: uuid("project_id"),
	unitNo: text("unit_no").notNull(),
	floor: integer(),
	areaSqft: integer("area_sqft"),
	propertyType: text("property_type"),
	facing: text(),
	basePrice: numeric("base_price", { precision: 15, scale:  2 }),
	status: text().default('Available'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "inventory_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "inventory_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	leadId: uuid("lead_id"),
	name: text().notNull(),
	email: text(),
	phone: text(),
	city: text(),
	address: text(),
	panNumber: text("pan_number"),
	aadharNumber: text("aadhar_number"),
	segment: text().default('Standard'),
	status: text().default('Active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "customers_lead_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "customers_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const followups = pgTable("followups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	leadId: uuid("lead_id"),
	assignedTo: uuid("assigned_to"),
	type: text().default('Call'),
	priority: text().default('Medium'),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }).notNull(),
	status: text().default('Pending'),
	note: text(),
	outcome: text(),
	isAiGenerated: boolean("is_ai_generated").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	notes: text(),
	assignedBy: uuid("assigned_by"),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "followups_assigned_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "followups_assigned_to_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "followups_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "followups_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const paymentPlans = pgTable("payment_plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	bookingId: uuid("booking_id"),
	planName: text("plan_name"),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "payment_plans_booking_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "payment_plans_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const bookings = pgTable("bookings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	customerId: uuid("customer_id"),
	projectId: uuid("project_id"),
	inventoryId: uuid("inventory_id"),
	unitNo: text("unit_no"),
	assignedAgentId: uuid("assigned_agent_id"),
	totalAmount: numeric("total_amount", { precision: 15, scale:  2 }),
	paymentPlan: text("payment_plan"),
	status: text().default('Pending'),
	tokenAmount: numeric("token_amount", { precision: 15, scale:  2 }).default('0'),
	tokenCollected: boolean("token_collected").default(false),
	tokenDate: date("token_date"),
	tokenMode: text("token_mode"),
	tokenReference: text("token_reference"),
	bookingDate: date("booking_date").default(sql`CURRENT_DATE`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.assignedAgentId],
			foreignColumns: [users.id],
			name: "bookings_assigned_agent_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "bookings_customer_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.inventoryId],
			foreignColumns: [inventory.id],
			name: "bookings_inventory_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "bookings_project_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "bookings_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const installments = pgTable("installments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	paymentPlanId: uuid("payment_plan_id"),
	bookingId: uuid("booking_id"),
	milestone: text().notNull(),
	percentage: numeric({ precision: 5, scale:  2 }),
	amount: numeric({ precision: 15, scale:  2 }),
	dueDate: date("due_date"),
	paidDate: date("paid_date"),
	status: text().default('Upcoming'),
	receiptNo: text("receipt_no"),
	paymentMode: text("payment_mode"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "installments_booking_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paymentPlanId],
			foreignColumns: [paymentPlans.id],
			name: "installments_payment_plan_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "installments_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const siteVisits = pgTable("site_visits", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	leadId: uuid("lead_id"),
	projectId: uuid("project_id"),
	assignedAgent: uuid("assigned_agent"),
	scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: 'string' }).notNull(),
	transport: text(),
	status: text().default('Scheduled'),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.assignedAgent],
			foreignColumns: [users.id],
			name: "site_visits_assigned_agent_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "site_visits_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "site_visits_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "site_visits_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	bookingId: uuid("booking_id"),
	customerId: uuid("customer_id"),
	uploadedBy: uuid("uploaded_by"),
	name: text().notNull(),
	type: text().default('Other'),
	fileUrl: text("file_url"),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	status: text().default('Draft'),
	notes: text(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	signedAt: timestamp("signed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.bookingId],
			foreignColumns: [bookings.id],
			name: "documents_booking_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "documents_customer_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "documents_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "documents_uploaded_by_fkey"
		}).onDelete("set null"),
]);

export const enquiries = pgTable("enquiries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	leadId: uuid("lead_id"),
	name: text(),
	phone: text(),
	email: text(),
	city: text(),
	propertyType: text("property_type"),
	budget: text(),
	source: text(),
	status: text().default('New'),
	refNo: text("ref_no"),
	subject: text(),
	message: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "enquiries_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "enquiries_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const channelPartners = pgTable("channel_partners", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	company: text(),
	email: text(),
	phone: text(),
	city: text(),
	reraNumber: text("rera_number"),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }),
	totalLeadsReferred: integer("total_leads_referred").default(0),
	totalBookings: integer("total_bookings").default(0),
	totalCommission: numeric("total_commission", { precision: 15, scale:  2 }).default('0'),
	status: text().default('Active'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "channel_partners_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const dripCampaigns = pgTable("drip_campaigns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "drip_campaigns_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const dripEnrollments = pgTable("drip_enrollments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	campaignId: uuid("campaign_id"),
	leadId: uuid("lead_id"),
	currentStepId: uuid("current_step_id"),
	status: text().default('Active'),
	nextRunAt: timestamp("next_run_at", { withTimezone: true, mode: 'string' }),
	lastRunAt: timestamp("last_run_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [dripCampaigns.id],
			name: "drip_enrollments_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.currentStepId],
			foreignColumns: [dripSteps.id],
			name: "drip_enrollments_current_step_id_fkey"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "drip_enrollments_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "drip_enrollments_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const dripSteps = pgTable("drip_steps", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	campaignId: uuid("campaign_id"),
	stepOrder: integer("step_order").notNull(),
	delayDays: integer("delay_days").default(0),
	delayHours: integer("delay_hours").default(0),
	channel: text().notNull(),
	subject: text(),
	body: text(),
	isAbTest: boolean("is_ab_test").default(false),
	subjectB: text("subject_b"),
	bodyB: text("body_b"),
	sentCountA: integer("sent_count_a").default(0),
	opensCountA: integer("opens_count_a").default(0),
	clicksCountA: integer("clicks_count_a").default(0),
	sentCountB: integer("sent_count_b").default(0),
	opensCountB: integer("opens_count_b").default(0),
	clicksCountB: integer("clicks_count_b").default(0),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [dripCampaigns.id],
			name: "drip_steps_campaign_id_fkey"
		}).onDelete("cascade"),
]);

export const dripEvents = pgTable("drip_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	campaignId: uuid("campaign_id"),
	stepId: uuid("step_id"),
	leadId: uuid("lead_id"),
	eventType: text("event_type").notNull(),
	variant: char({ length: 1 }).default('A'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [dripCampaigns.id],
			name: "drip_events_campaign_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "drip_events_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.stepId],
			foreignColumns: [dripSteps.id],
			name: "drip_events_step_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "drip_events_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const whatsappCampaigns = pgTable("whatsapp_campaigns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	messageBody: text("message_body"),
	recipientsCount: integer("recipients_count").default(0),
	status: text().default('Pending'),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "whatsapp_campaigns_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const chatbotSettings = pgTable("chatbot_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	isEnabled: boolean("is_enabled").default(false),
	botName: text("bot_name").default('Zentrix AI'),
	welcomeMsg: text("welcome_msg"),
	config: jsonb().default({}),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "chatbot_settings_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("chatbot_settings_tenant_id_key").on(table.tenantId),
]);

export const integrations = pgTable("integrations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	provider: text().notNull(),
	apiKey: text("api_key"),
	apiSecret: text("api_secret"),
	webhookUrlKey: uuid("webhook_url_key").defaultRandom(),
	isActive: boolean("is_active").default(true),
	config: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "integrations_tenant_id_fkey"
		}).onDelete("cascade"),
	unique("integrations_tenant_id_provider_key").on(table.tenantId, table.provider),
]);

export const incomingLeadsLog = pgTable("incoming_leads_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	provider: text().notNull(),
	payload: jsonb(),
	status: text().default('received'),
	errorMessage: text("error_message"),
	leadId: uuid("lead_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "incoming_leads_log_lead_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "incoming_leads_log_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	action: text().notNull(),
	targetId: uuid("target_id"),
	details: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	tenantId: uuid("tenant_id"),
	userId: uuid("user_id"),
	userEmail: varchar("user_email", { length: 255 }),
	resource: varchar({ length: 100 }),
	resourceId: varchar("resource_id", { length: 50 }),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
}, (table) => [
	index("idx_audit_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_audit_created").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_audit_tenant").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("idx_audit_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id"),
	tenantId: uuid("tenant_id"),
	endpoint: text().notNull(),
	p256Dh: text().notNull(),
	auth: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "push_subscriptions_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "push_subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	unique("push_subscriptions_user_id_endpoint_key").on(table.userId, table.endpoint),
]);

export const workflows = pgTable("workflows", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	name: text().notNull(),
	triggerType: text("trigger_type").notNull(),
	triggerConfig: jsonb("trigger_config").default({}),
	actionType: text("action_type").notNull(),
	actionConfig: jsonb("action_config").default({}),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "workflows_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const activityLog = pgTable("activity_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	userId: uuid("user_id"),
	type: text().notNull(),
	action: text().notNull(),
	entityId: uuid("entity_id"),
	entityType: text("entity_type"),
	oldData: jsonb("old_data"),
	newData: jsonb("new_data"),
	details: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "activity_log_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_log_user_id_fkey"
		}).onDelete("set null"),
]);

export const automationLogs = pgTable("automation_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	workflowId: uuid("workflow_id"),
	leadId: uuid("lead_id"),
	status: text(),
	details: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "automation_logs_lead_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "automation_logs_tenant_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [workflows.id],
			name: "automation_logs_workflow_id_fkey"
		}).onDelete("cascade"),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	leadId: uuid("lead_id"),
	sentBy: uuid("sent_by"),
	type: text(),
	channel: text(),
	recipient: text(),
	subject: text(),
	body: text(),
	status: text().default('Sent'),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "notifications_lead_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.sentBy],
			foreignColumns: [users.id],
			name: "notifications_sent_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "notifications_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	plan: text().notNull(),
	status: text().default('active'),
	amount: numeric({ precision: 15, scale:  2 }),
	currency: text().default('INR'),
	billingCycle: text("billing_cycle").default('monthly'),
	gateway: text(),
	gatewaySubId: text("gateway_sub_id"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "subscriptions_tenant_id_fkey"
		}).onDelete("cascade"),
]);

export const referrals = pgTable("referrals", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	referrerId: uuid("referrer_id"),
	refereeId: uuid("referee_id"),
	status: text().default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.refereeId],
			foreignColumns: [tenants.id],
			name: "referrals_referee_id_fkey"
		}),
	foreignKey({
			columns: [table.referrerId],
			foreignColumns: [tenants.id],
			name: "referrals_referrer_id_fkey"
		}),
]);

export const aiEmployeePersonas = pgTable("ai_employee_personas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id"),
	employeeName: text("employee_name").default("Rohan Mishra"),
	employeeCode: text("employee_code").default("ZEN-AI-001"),
	role: text("role").default("Senior Sales Associate"),
	avatarUrl: text("avatar_url"),
	personaConfig: jsonb("persona_config").default({}),
	voiceConfig: jsonb("voice_config").default({}),
	knowledgeScope: jsonb("knowledge_scope").default({}),
	escalationRules: jsonb("escalation_rules").default({}),
	isActive: boolean("is_active").default(true),
	shiftStartTime: text("shift_start_time"),
	shiftEndTime: text("shift_end_time"),
	cooldownSeconds: integer("cooldown_seconds").default(45),
	maxConcurrentCalls: integer("max_concurrent_calls").default(2),
	currentStatus: text("current_status").default("offline"),
	userId: uuid("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.tenantId],
		foreignColumns: [tenants.id],
		name: "ai_employee_personas_tenant_id_fkey"
	}).onDelete("cascade"),
]);

