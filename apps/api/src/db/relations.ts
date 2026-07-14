import { relations } from "drizzle-orm/relations";
import { users, tenants, trainingModules, trainingProgress, battleCards, leads, projects, interactions, messageTemplates, refreshTokens, inventory, customers, followups, bookings, paymentPlans, installments, siteVisits, documents, enquiries, channelPartners, dripCampaigns, dripEnrollments, dripSteps, dripEvents, whatsappCampaigns, chatbotSettings, integrations, incomingLeadsLog, pushSubscriptions, workflows, activityLog, automationLogs, notifications, subscriptions, referrals } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	user: one(users, {
		fields: [users.reportsTo],
		references: [users.id],
		relationName: "users_reportsTo_users_id"
	}),
	users: many(users, {
		relationName: "users_reportsTo_users_id"
	}),
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
	leads_assignedTo: many(leads, {
		relationName: "leads_assignedTo_users_id"
	}),
	leads_createdBy: many(leads, {
		relationName: "leads_createdBy_users_id"
	}),
	interactions: many(interactions),
	refreshTokens: many(refreshTokens),
	followups: many(followups),
	bookings: many(bookings),
	siteVisits: many(siteVisits),
	documents: many(documents),
	pushSubscriptions: many(pushSubscriptions),
	activityLogs: many(activityLog),
	notifications: many(notifications),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	users: many(users),
	battleCards: many(battleCards),
	leads: many(leads),
	interactions: many(interactions),
	messageTemplates: many(messageTemplates),
	projects: many(projects),
	inventories: many(inventory),
	customers: many(customers),
	followups: many(followups),
	paymentPlans: many(paymentPlans),
	bookings: many(bookings),
	installments: many(installments),
	siteVisits: many(siteVisits),
	documents: many(documents),
	enquiries: many(enquiries),
	channelPartners: many(channelPartners),
	dripCampaigns: many(dripCampaigns),
	dripEnrollments: many(dripEnrollments),
	dripEvents: many(dripEvents),
	whatsappCampaigns: many(whatsappCampaigns),
	chatbotSettings: many(chatbotSettings),
	integrations: many(integrations),
	incomingLeadsLogs: many(incomingLeadsLog),
	pushSubscriptions: many(pushSubscriptions),
	workflows: many(workflows),
	activityLogs: many(activityLog),
	automationLogs: many(automationLogs),
	notifications: many(notifications),
	subscriptions: many(subscriptions),
	referrals_refereeId: many(referrals, {
		relationName: "referrals_refereeId_tenants_id"
	}),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_tenants_id"
	}),
}));

export const trainingProgressRelations = relations(trainingProgress, ({one}) => ({
	trainingModule: one(trainingModules, {
		fields: [trainingProgress.moduleId],
		references: [trainingModules.id]
	}),
}));

export const trainingModulesRelations = relations(trainingModules, ({many}) => ({
	trainingProgresses: many(trainingProgress),
}));

export const battleCardsRelations = relations(battleCards, ({one}) => ({
	tenant: one(tenants, {
		fields: [battleCards.tenantId],
		references: [tenants.id]
	}),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	user_assignedTo: one(users, {
		fields: [leads.assignedTo],
		references: [users.id],
		relationName: "leads_assignedTo_users_id"
	}),
	user_createdBy: one(users, {
		fields: [leads.createdBy],
		references: [users.id],
		relationName: "leads_createdBy_users_id"
	}),
	project: one(projects, {
		fields: [leads.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [leads.tenantId],
		references: [tenants.id]
	}),
	interactions: many(interactions),
	customers: many(customers),
	followups: many(followups),
	siteVisits: many(siteVisits),
	enquiries: many(enquiries),
	dripEnrollments: many(dripEnrollments),
	dripEvents: many(dripEvents),
	incomingLeadsLogs: many(incomingLeadsLog),
	automationLogs: many(automationLogs),
	notifications: many(notifications),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	leads: many(leads),
	tenant: one(tenants, {
		fields: [projects.tenantId],
		references: [tenants.id]
	}),
	inventories: many(inventory),
	bookings: many(bookings),
	siteVisits: many(siteVisits),
}));

export const interactionsRelations = relations(interactions, ({one}) => ({
	lead: one(leads, {
		fields: [interactions.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [interactions.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [interactions.userId],
		references: [users.id]
	}),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({one}) => ({
	tenant: one(tenants, {
		fields: [messageTemplates.tenantId],
		references: [tenants.id]
	}),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));

export const inventoryRelations = relations(inventory, ({one, many}) => ({
	project: one(projects, {
		fields: [inventory.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [inventory.tenantId],
		references: [tenants.id]
	}),
	bookings: many(bookings),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	lead: one(leads, {
		fields: [customers.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [customers.tenantId],
		references: [tenants.id]
	}),
	bookings: many(bookings),
	documents: many(documents),
}));

export const followupsRelations = relations(followups, ({one}) => ({
	user: one(users, {
		fields: [followups.assignedTo],
		references: [users.id]
	}),
	lead: one(leads, {
		fields: [followups.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [followups.tenantId],
		references: [tenants.id]
	}),
}));

export const paymentPlansRelations = relations(paymentPlans, ({one, many}) => ({
	booking: one(bookings, {
		fields: [paymentPlans.bookingId],
		references: [bookings.id]
	}),
	tenant: one(tenants, {
		fields: [paymentPlans.tenantId],
		references: [tenants.id]
	}),
	installments: many(installments),
}));

export const bookingsRelations = relations(bookings, ({one, many}) => ({
	paymentPlans: many(paymentPlans),
	user: one(users, {
		fields: [bookings.assignedAgentId],
		references: [users.id]
	}),
	customer: one(customers, {
		fields: [bookings.customerId],
		references: [customers.id]
	}),
	inventory: one(inventory, {
		fields: [bookings.inventoryId],
		references: [inventory.id]
	}),
	project: one(projects, {
		fields: [bookings.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [bookings.tenantId],
		references: [tenants.id]
	}),
	installments: many(installments),
	documents: many(documents),
}));

export const installmentsRelations = relations(installments, ({one}) => ({
	booking: one(bookings, {
		fields: [installments.bookingId],
		references: [bookings.id]
	}),
	paymentPlan: one(paymentPlans, {
		fields: [installments.paymentPlanId],
		references: [paymentPlans.id]
	}),
	tenant: one(tenants, {
		fields: [installments.tenantId],
		references: [tenants.id]
	}),
}));

export const siteVisitsRelations = relations(siteVisits, ({one}) => ({
	user: one(users, {
		fields: [siteVisits.assignedAgent],
		references: [users.id]
	}),
	lead: one(leads, {
		fields: [siteVisits.leadId],
		references: [leads.id]
	}),
	project: one(projects, {
		fields: [siteVisits.projectId],
		references: [projects.id]
	}),
	tenant: one(tenants, {
		fields: [siteVisits.tenantId],
		references: [tenants.id]
	}),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	booking: one(bookings, {
		fields: [documents.bookingId],
		references: [bookings.id]
	}),
	customer: one(customers, {
		fields: [documents.customerId],
		references: [customers.id]
	}),
	tenant: one(tenants, {
		fields: [documents.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [documents.uploadedBy],
		references: [users.id]
	}),
}));

export const enquiriesRelations = relations(enquiries, ({one}) => ({
	lead: one(leads, {
		fields: [enquiries.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [enquiries.tenantId],
		references: [tenants.id]
	}),
}));

export const channelPartnersRelations = relations(channelPartners, ({one}) => ({
	tenant: one(tenants, {
		fields: [channelPartners.tenantId],
		references: [tenants.id]
	}),
}));

export const dripCampaignsRelations = relations(dripCampaigns, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [dripCampaigns.tenantId],
		references: [tenants.id]
	}),
	dripEnrollments: many(dripEnrollments),
	dripSteps: many(dripSteps),
	dripEvents: many(dripEvents),
}));

export const dripEnrollmentsRelations = relations(dripEnrollments, ({one}) => ({
	dripCampaign: one(dripCampaigns, {
		fields: [dripEnrollments.campaignId],
		references: [dripCampaigns.id]
	}),
	dripStep: one(dripSteps, {
		fields: [dripEnrollments.currentStepId],
		references: [dripSteps.id]
	}),
	lead: one(leads, {
		fields: [dripEnrollments.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [dripEnrollments.tenantId],
		references: [tenants.id]
	}),
}));

export const dripStepsRelations = relations(dripSteps, ({one, many}) => ({
	dripEnrollments: many(dripEnrollments),
	dripCampaign: one(dripCampaigns, {
		fields: [dripSteps.campaignId],
		references: [dripCampaigns.id]
	}),
	dripEvents: many(dripEvents),
}));

export const dripEventsRelations = relations(dripEvents, ({one}) => ({
	dripCampaign: one(dripCampaigns, {
		fields: [dripEvents.campaignId],
		references: [dripCampaigns.id]
	}),
	lead: one(leads, {
		fields: [dripEvents.leadId],
		references: [leads.id]
	}),
	dripStep: one(dripSteps, {
		fields: [dripEvents.stepId],
		references: [dripSteps.id]
	}),
	tenant: one(tenants, {
		fields: [dripEvents.tenantId],
		references: [tenants.id]
	}),
}));

export const whatsappCampaignsRelations = relations(whatsappCampaigns, ({one}) => ({
	tenant: one(tenants, {
		fields: [whatsappCampaigns.tenantId],
		references: [tenants.id]
	}),
}));

export const chatbotSettingsRelations = relations(chatbotSettings, ({one}) => ({
	tenant: one(tenants, {
		fields: [chatbotSettings.tenantId],
		references: [tenants.id]
	}),
}));

export const integrationsRelations = relations(integrations, ({one}) => ({
	tenant: one(tenants, {
		fields: [integrations.tenantId],
		references: [tenants.id]
	}),
}));

export const incomingLeadsLogRelations = relations(incomingLeadsLog, ({one}) => ({
	lead: one(leads, {
		fields: [incomingLeadsLog.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [incomingLeadsLog.tenantId],
		references: [tenants.id]
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({one}) => ({
	tenant: one(tenants, {
		fields: [pushSubscriptions.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [pushSubscriptions.userId],
		references: [users.id]
	}),
}));

export const workflowsRelations = relations(workflows, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [workflows.tenantId],
		references: [tenants.id]
	}),
	automationLogs: many(automationLogs),
}));

export const activityLogRelations = relations(activityLog, ({one}) => ({
	tenant: one(tenants, {
		fields: [activityLog.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [activityLog.userId],
		references: [users.id]
	}),
}));

export const automationLogsRelations = relations(automationLogs, ({one}) => ({
	lead: one(leads, {
		fields: [automationLogs.leadId],
		references: [leads.id]
	}),
	tenant: one(tenants, {
		fields: [automationLogs.tenantId],
		references: [tenants.id]
	}),
	workflow: one(workflows, {
		fields: [automationLogs.workflowId],
		references: [workflows.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	lead: one(leads, {
		fields: [notifications.leadId],
		references: [leads.id]
	}),
	user: one(users, {
		fields: [notifications.sentBy],
		references: [users.id]
	}),
	tenant: one(tenants, {
		fields: [notifications.tenantId],
		references: [tenants.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one}) => ({
	tenant: one(tenants, {
		fields: [subscriptions.tenantId],
		references: [tenants.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one}) => ({
	tenant_refereeId: one(tenants, {
		fields: [referrals.refereeId],
		references: [tenants.id],
		relationName: "referrals_refereeId_tenants_id"
	}),
	tenant_referrerId: one(tenants, {
		fields: [referrals.referrerId],
		references: [tenants.id],
		relationName: "referrals_referrerId_tenants_id"
	}),
}));