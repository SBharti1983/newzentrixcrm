-- Migration: Database Schema Logical Access & Restricted Roles
--
-- Restricts Express API connection credentials to their respective vertical slices.
-- Prevents cross-module data pollution.

-- 1. Create schemas for vertical slices
CREATE SCHEMA IF NOT EXISTS crm_leads;
CREATE SCHEMA IF NOT EXISTS crm_billing;
CREATE SCHEMA IF NOT EXISTS crm_telephony;

-- 2. Create restricted roles
CREATE ROLE crm_leads_role;
CREATE ROLE crm_billing_role;
CREATE ROLE crm_telephony_role;

-- 3. Grant schema permissions
GRANT USAGE ON SCHEMA crm_leads TO crm_leads_role;
GRANT USAGE ON SCHEMA crm_billing TO crm_billing_role;
GRANT USAGE ON SCHEMA crm_telephony TO crm_telephony_role;

-- 4. Limit Table-level permissions to slice ownership
-- CRM Leads Role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crm_leads TO crm_leads_role;
-- CRM Billing Role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crm_billing TO crm_billing_role;
-- CRM Telephony Role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crm_telephony TO crm_telephony_role;

-- 5. Revoke default public schema access to prevent direct DB joins
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO crm_leads_role, crm_billing_role, crm_telephony_role;
