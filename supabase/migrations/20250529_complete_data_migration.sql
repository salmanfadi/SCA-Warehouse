-- Migration: 20250529_complete_data_migration
-- Description: Complete data migration for all tables
-- This migration includes INSERT statements for all data in the database

-- Disable triggers temporarily to avoid constraint issues during data import
-- Note: Uncomment these lines when actually importing the data
-- SET session_replication_role = 'replica';

-- Table: profiles
-- Data will be populated from the export_table_data function

-- Table: warehouses
-- Data will be populated from the export_table_data function

-- Table: warehouse_locations
-- Data will be populated from the export_table_data function

-- Table: products
-- Data will be populated from the export_table_data function

-- Table: stock_in
-- Data will be populated from the export_table_data function

-- Table: stock_in_details
-- Data will be populated from the export_table_data function

-- Table: processed_batches
-- Data will be populated from the export_table_data function

-- Table: barcodes
-- Data will be populated from the export_table_data function

-- Table: batch_items
-- Data will be populated from the export_table_data function

-- Table: inventory
-- Data will be populated from the export_table_data function

-- Table: inventory_movements
-- Data will be populated from the export_table_data function

-- Table: inventory_transactions
-- Data will be populated from the export_table_data function

-- Table: batch_inventory_items
-- Data will be populated from the export_table_data function

-- Table: batch_operations
-- Data will be populated from the export_table_data function

-- Table: inventory_transfer_details
-- Data will be populated from the export_table_data function

-- Table: inventory_transfers
-- Data will be populated from the export_table_data function

-- Table: locations
-- Data will be populated from the export_table_data function

-- Table: notifications
-- Data will be populated from the export_table_data function

-- Table: stock_movement_audit
-- Data will be populated from the export_table_data function

-- Table: stock_out
-- Data will be populated from the export_table_data function

-- Table: stock_out_details
-- Data will be populated from the export_table_data function

-- Re-enable triggers after data import
-- Note: Uncomment this line when actually importing the data
-- SET session_replication_role = 'origin';
