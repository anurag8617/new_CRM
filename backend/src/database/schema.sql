-- =====================================================================
-- ADVANCED AI-NATIVE CRM PLATFORM — CORE DATABASE SCHEMA
-- Target Engine: MySQL 8.0+ / InnoDB
-- Collation: utf8mb4_unicode_ci
-- Architectural Guidelines: Section 0 (Multi-tenancy), Section 1 (RBAC), Section 51 (MySQL specifics)
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. ORGANIZATIONS (Tenant Foundation)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organizations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `logo_url` VARCHAR(500) NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC',
  `fiscal_year_start_month` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `status` ENUM('active', 'trial', 'suspended', 'cancelled') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_org_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 2. WORKSPACES (Tenant Workspaces)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workspaces` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_workspace_slug` (`organization_id`, `slug`),
  INDEX `idx_workspace_org` (`organization_id`),
  CONSTRAINT `fk_workspace_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 3. ORGANIZATION SETTINGS & FEATURE FLAGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `organization_settings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `settings_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_settings` (`organization_id`),
  CONSTRAINT `fk_settings_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organization_features` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `feature_key` VARCHAR(100) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `limit_value` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_feature` (`organization_id`, `feature_key`),
  CONSTRAINT `fk_features_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4. TEAMS & HIERARCHIES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teams` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `parent_team_id` BIGINT UNSIGNED NULL,
  `manager_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_teams_org` (`organization_id`),
  CONSTRAINT `fk_team_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_parent` FOREIGN KEY (`parent_team_id`) REFERENCES `teams` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_team_manager` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5. USERS & SESSIONS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `workspace_id` BIGINT UNSIGNED NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `phone` VARCHAR(50) NULL,
  `job_title` VARCHAR(100) NULL,
  `status` ENUM('active', 'invited', 'suspended', 'inactive') NOT NULL DEFAULT 'active',
  `last_login_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_email` (`organization_id`, `email`),
  INDEX `idx_users_org` (`organization_id`),
  INDEX `idx_users_email` (`email`),
  CONSTRAINT `fk_user_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_workspace` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `team_members` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `team_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_member` (`team_id`, `user_id`),
  CONSTRAINT `fk_team_member_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_team_member_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `refresh_token_hash` VARCHAR(255) NOT NULL,
  `user_agent` VARCHAR(255) NULL,
  `ip_address` VARCHAR(50) NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_session_user` (`user_id`),
  INDEX `idx_session_token` (`refresh_token_hash`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6. ROLES & PERMISSIONS SYSTEM (RBAC + Field-Level + Record-Level)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_system_role` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_org_role_name` (`organization_id`, `name`),
  INDEX `idx_roles_org` (`organization_id`),
  CONSTRAINT `fk_role_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_module_action` (`module`, `action`),
  INDEX `idx_permissions_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `permission_id` BIGINT UNSIGNED NOT NULL,
  `scope` ENUM('none', 'own', 'team', 'all') NOT NULL DEFAULT 'all',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  INDEX `idx_rp_role` (`role_id`),
  INDEX `idx_rp_perm` (`permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `field_permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `object_type` VARCHAR(100) NOT NULL,
  `field_key` VARCHAR(100) NOT NULL,
  `access` ENUM('hidden', 'view', 'edit') NOT NULL DEFAULT 'edit',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_field_access` (`role_id`, `object_type`, `field_key`),
  INDEX `idx_fp_role_obj` (`role_id`, `object_type`),
  CONSTRAINT `fk_fp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role_id` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`, `role_id`),
  INDEX `idx_ur_user` (`user_id`),
  INDEX `idx_ur_role` (`role_id`),
  CONSTRAINT `fk_ur_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7. AUDIT LOGGING (Section 40 & Section 54 Governance)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `actor_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(50) NOT NULL,
  `object_type` VARCHAR(50) NOT NULL,
  `record_id` BIGINT UNSIGNED NULL,
  `before_json` JSON NULL,
  `after_json` JSON NULL,
  `ip_address` VARCHAR(50) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_org_time` (`organization_id`, `created_at`),
  INDEX `idx_audit_actor` (`actor_id`),
  INDEX `idx_audit_target` (`object_type`, `record_id`),
  CONSTRAINT `fk_audit_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8. COMPANIES (Standard Object - Spec §7)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `companies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `owner_id` BIGINT UNSIGNED NULL,
  `parent_company_id` BIGINT UNSIGNED NULL,
  `name` VARCHAR(255) NOT NULL,
  `domain` VARCHAR(255) NULL,
  `industry` VARCHAR(100) NULL,
  `phone` VARCHAR(50) NULL,
  `annual_revenue` DECIMAL(15,2) NULL,
  `employee_count` INT NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `country` VARCHAR(100) NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_companies_org` (`organization_id`),
  INDEX `idx_companies_org_name` (`organization_id`, `name`),
  INDEX `idx_companies_org_domain` (`organization_id`, `domain`),
  INDEX `idx_companies_owner` (`owner_id`),
  INDEX `idx_companies_parent` (`parent_company_id`),
  CONSTRAINT `fk_companies_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_companies_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_companies_parent` FOREIGN KEY (`parent_company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 9. CONTACTS (Standard Object - Spec §6)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `company_id` BIGINT UNSIGNED NULL,
  `owner_id` BIGINT UNSIGNED NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `job_title` VARCHAR(100) NULL,
  `lifecycle_stage` ENUM('subscriber', 'lead', 'marketing_qualified_lead', 'sales_qualified_lead', 'opportunity', 'customer', 'evangelist', 'other') NOT NULL DEFAULT 'lead',
  `lead_status` ENUM('new', 'open', 'in_progress', 'open_deal', 'unqualified', 'attempted_contact', 'connected', 'bad_timing') NOT NULL DEFAULT 'new',
  `source` VARCHAR(100) NULL DEFAULT 'Direct',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_contacts_org` (`organization_id`),
  INDEX `idx_contacts_org_email` (`organization_id`, `email`),
  INDEX `idx_contacts_org_name` (`organization_id`, `last_name`, `first_name`),
  INDEX `idx_contacts_company` (`company_id`),
  INDEX `idx_contacts_owner` (`owner_id`),
  INDEX `idx_contacts_stage` (`organization_id`, `lifecycle_stage`),
  CONSTRAINT `fk_contacts_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_contacts_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_contacts_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 10. UNIFIED ACTIVITY TIMELINE (Spec §10)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `record_type` ENUM('contact', 'company', 'deal', 'ticket', 'lead', 'custom_record') NOT NULL,
  `record_id` BIGINT UNSIGNED NOT NULL,
  `activity_type` ENUM('note', 'email', 'call', 'meeting', 'task', 'status_change', 'creation', 'ai_action') NOT NULL,
  `payload_json` JSON NOT NULL,
  `actor_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_activities_target` (`organization_id`, `record_type`, `record_id`, `created_at`),
  INDEX `idx_activities_actor` (`actor_id`),
  CONSTRAINT `fk_activities_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activities_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 11. SALES PIPELINES & STAGES (Spec §9)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pipelines` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_pipelines_org` (`organization_id`),
  CONSTRAINT `fk_pipelines_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pipeline_stages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pipeline_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `stage_order` INT UNSIGNED NOT NULL DEFAULT 1,
  `probability` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `color` VARCHAR(30) NULL DEFAULT '#6366f1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_stages_pipeline` (`pipeline_id`, `stage_order`),
  CONSTRAINT `fk_stages_pipeline` FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 12. DEALS & OPPORTUNITIES (Spec §9)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `deals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `pipeline_id` BIGINT UNSIGNED NOT NULL,
  `stage_id` BIGINT UNSIGNED NOT NULL,
  `company_id` BIGINT UNSIGNED NULL,
  `contact_id` BIGINT UNSIGNED NULL,
  `owner_id` BIGINT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `value` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
  `expected_close_date` DATE NULL,
  `status` ENUM('open', 'won', 'lost') NOT NULL DEFAULT 'open',
  `win_loss_reason` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_deals_org` (`organization_id`),
  INDEX `idx_deals_pipeline_stage` (`organization_id`, `pipeline_id`, `stage_id`),
  INDEX `idx_deals_company` (`company_id`),
  INDEX `idx_deals_contact` (`contact_id`),
  INDEX `idx_deals_owner` (`owner_id`),
  INDEX `idx_deals_status` (`organization_id`, `status`),
  CONSTRAINT `fk_deals_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deals_pipeline` FOREIGN KEY (`pipeline_id`) REFERENCES `pipelines` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_deals_stage` FOREIGN KEY (`stage_id`) REFERENCES `pipeline_stages` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_deals_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deals_contact` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deals_owner` FOREIGN KEY (`owner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 13. DEAL LINE ITEMS (Spec §9)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `deal_line_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `deal_id` BIGINT UNSIGNED NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  `unit_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_deal_items_deal` (`deal_id`),
  CONSTRAINT `fk_deal_items_deal` FOREIGN KEY (`deal_id`) REFERENCES `deals` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 14. CUSTOM OBJECTS (Spec §2.2 Core Differentiator)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_objects` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `singular_name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT 'Database',
  `color` VARCHAR(30) NOT NULL DEFAULT '#6366f1',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_custom_objects_org_slug` (`organization_id`, `slug`),
  INDEX `idx_custom_objects_org` (`organization_id`),
  CONSTRAINT `fk_custom_objects_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 15. CUSTOM FIELDS (Spec §2.3 Dynamic Fields)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_fields` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `custom_object_id` BIGINT UNSIGNED NULL,
  `standard_object` ENUM('contacts', 'companies', 'deals', 'activities') NULL,
  `field_key` VARCHAR(100) NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `field_type` ENUM('text', 'number', 'currency', 'date', 'select', 'boolean', 'json') NOT NULL DEFAULT 'text',
  `options_json` JSON NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_filterable` BOOLEAN NOT NULL DEFAULT TRUE,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_custom_fields_org` (`organization_id`),
  INDEX `idx_custom_fields_object` (`organization_id`, `custom_object_id`),
  INDEX `idx_custom_fields_standard` (`organization_id`, `standard_object`),
  CONSTRAINT `fk_custom_fields_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_custom_fields_object` FOREIGN KEY (`custom_object_id`) REFERENCES `custom_objects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 16. CUSTOM RECORDS (Spec §2.3 Hybrid JSON Datastore)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `custom_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `custom_object_id` BIGINT UNSIGNED NOT NULL,
  `record_name` VARCHAR(255) NOT NULL,
  `data_json` JSON NOT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_custom_records_org_obj` (`organization_id`, `custom_object_id`, `created_at`),
  INDEX `idx_custom_records_name` (`organization_id`, `record_name`),
  CONSTRAINT `fk_custom_records_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_custom_records_object` FOREIGN KEY (`custom_object_id`) REFERENCES `custom_objects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_custom_records_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 17. OBJECT RELATIONSHIPS & LINKS (Spec §2.4 Cross-Object Graph)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `object_relationships` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `from_object` VARCHAR(50) NOT NULL,
  `to_object` VARCHAR(50) NOT NULL,
  `relationship_type` ENUM('one_to_one', 'one_to_many', 'many_to_many') NOT NULL DEFAULT 'one_to_many',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_obj_rel_org` (`organization_id`),
  CONSTRAINT `fk_obj_rel_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `relationship_links` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `relationship_id` BIGINT UNSIGNED NOT NULL,
  `from_record_id` BIGINT UNSIGNED NOT NULL,
  `to_record_id` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_rel_links` (`relationship_id`, `from_record_id`, `to_record_id`),
  CONSTRAINT `fk_rel_links_rel` FOREIGN KEY (`relationship_id`) REFERENCES `object_relationships` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 18. WORKFLOW AUTOMATION ENGINE (Spec §15)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `workflows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `object_type` ENUM('deal', 'contact', 'company', 'custom_record') NOT NULL,
  `trigger_type` ENUM('record_created', 'record_updated', 'stage_changed', 'field_updated', 'manual') NOT NULL,
  `trigger_config_json` JSON NULL,
  `status` ENUM('draft', 'published', 'paused') NOT NULL DEFAULT 'published',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_workflows_org_obj` (`organization_id`, `object_type`, `status`),
  CONSTRAINT `fk_workflows_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_workflows_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workflow_conditions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workflow_id` BIGINT UNSIGNED NOT NULL,
  `condition_group` INT UNSIGNED NOT NULL DEFAULT 1,
  `field` VARCHAR(100) NOT NULL,
  `operator` ENUM('equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty') NOT NULL DEFAULT 'equals',
  `value` VARCHAR(255) NULL,
  `logic` ENUM('AND', 'OR') NOT NULL DEFAULT 'AND',
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `idx_wf_conditions_wf` (`workflow_id`, `condition_group`),
  CONSTRAINT `fk_wf_conditions_wf` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workflow_actions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workflow_id` BIGINT UNSIGNED NOT NULL,
  `sort_order` INT UNSIGNED NOT NULL DEFAULT 1,
  `action_type` ENUM('create_note', 'update_field', 'send_notification', 'webhook') NOT NULL,
  `config_json` JSON NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_wf_actions_wf` (`workflow_id`, `sort_order`),
  CONSTRAINT `fk_wf_actions_wf` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workflow_executions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `workflow_id` BIGINT UNSIGNED NOT NULL,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `record_type` ENUM('deal', 'contact', 'company', 'custom_record') NOT NULL,
  `record_id` BIGINT UNSIGNED NOT NULL,
  `trigger_event` VARCHAR(100) NOT NULL,
  `status` ENUM('running', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'running',
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` TIMESTAMP NULL,
  `error_message` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_wf_executions_wf` (`workflow_id`, `started_at`),
  INDEX `idx_wf_executions_rec` (`record_type`, `record_id`),
  CONSTRAINT `fk_wf_executions_wf` FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wf_executions_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `workflow_execution_steps` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `execution_id` BIGINT UNSIGNED NOT NULL,
  `action_id` BIGINT UNSIGNED NULL,
  `action_type` VARCHAR(50) NOT NULL,
  `status` ENUM('pending', 'running', 'completed', 'failed', 'skipped') NOT NULL DEFAULT 'completed',
  `input_json` JSON NULL,
  `output_json` JSON NULL,
  `duration_ms` INT UNSIGNED NOT NULL DEFAULT 0,
  `error_message` TEXT NULL,
  `executed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_wf_exec_steps_exec` (`execution_id`),
  CONSTRAINT `fk_wf_exec_steps_exec` FOREIGN KEY (`execution_id`) REFERENCES `workflow_executions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wf_exec_steps_action` FOREIGN KEY (`action_id`) REFERENCES `workflow_actions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 19. TASKS (Spec §12)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `record_type` ENUM('deal', 'contact', 'company', 'custom_record') NULL,
  `record_id` BIGINT UNSIGNED NULL,
  `assigned_to` BIGINT UNSIGNED NULL,
  `due_date` DATE NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  `completed_at` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tasks_org_status` (`organization_id`, `status`, `due_date`),
  INDEX `idx_tasks_assigned` (`assigned_to`),
  INDEX `idx_tasks_record` (`record_type`, `record_id`),
  CONSTRAINT `fk_tasks_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 20. IN-APP NOTIFICATIONS (Spec §23)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'success', 'warning', 'mention', 'task', 'deal', 'system') NOT NULL DEFAULT 'info',
  `link_url` VARCHAR(255) NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notifications_user` (`organization_id`, `user_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notifications_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 21. EMAIL MESSAGES & TRACKING (Spec §13, §23)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `record_type` ENUM('deal', 'contact', 'company', 'custom_record') NULL,
  `record_id` BIGINT UNSIGNED NULL,
  `from_email` VARCHAR(255) NOT NULL,
  `to_email` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_html` MEDIUMTEXT NOT NULL,
  `body_text` TEXT NULL,
  `status` ENUM('draft', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced') NOT NULL DEFAULT 'sent',
  `opened_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `clicked_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `sent_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email_messages_record` (`record_type`, `record_id`),
  INDEX `idx_email_messages_org` (`organization_id`, `sent_at`),
  CONSTRAINT `fk_email_messages_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 22. EMAIL TEMPLATES (Spec §13)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `body_template` MEDIUMTEXT NOT NULL,
  `category` ENUM('sales', 'onboarding', 'follow_up', 'support', 'marketing') NOT NULL DEFAULT 'sales',
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_email_templates_org` (`organization_id`, `category`),
  CONSTRAINT `fk_email_templates_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_email_templates_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 23. CALLS & TELEPHONY LOG (Spec §23 Telephony)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calls_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT UNSIGNED NOT NULL,
  `record_type` ENUM('deal', 'contact', 'company', 'custom_record') NULL,
  `record_id` BIGINT UNSIGNED NULL,
  `from_number` VARCHAR(50) NOT NULL,
  `to_number` VARCHAR(50) NOT NULL,
  `direction` ENUM('inbound', 'outbound') NOT NULL DEFAULT 'outbound',
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('completed', 'missed', 'busy', 'failed') NOT NULL DEFAULT 'completed',
  `recording_url` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `user_id` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_calls_record` (`record_type`, `record_id`),
  INDEX `idx_calls_org` (`organization_id`, `created_at`),
  CONSTRAINT `fk_calls_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_calls_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
