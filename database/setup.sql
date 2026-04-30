-- Attendance System Database Schema for SQL Server
-- Run this script to create the database and tables

-- Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AttendanceDB')
BEGIN
    CREATE DATABASE AttendanceDB;
END
GO

USE AttendanceDB;
GO

-- Users table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        email NVARCHAR(255) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(255) NOT NULL,
        phone NVARCHAR(50),
        role NVARCHAR(20) NOT NULL DEFAULT 'employee',
        profile_pic_url NVARCHAR(500),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_Users_email ON Users(email);
    CREATE INDEX IX_Users_role ON Users(role);
END
GO

-- Locations table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Locations')
BEGIN
    CREATE TABLE Locations (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name NVARCHAR(255) NOT NULL,
        latitude DECIMAL(18, 10) NOT NULL,
        longitude DECIMAL(18, 10) NOT NULL,
        radius_meters INT NOT NULL DEFAULT 100,
        qr_data NVARCHAR(MAX),
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX IX_Locations_name ON Locations(name);
END
GO

-- Shifts table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Shifts')
BEGIN
    CREATE TABLE Shifts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        location_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(255) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        days_mask INT NOT NULL DEFAULT 127,
        is_active BIT DEFAULT 1,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (location_id) REFERENCES Locations(id)
    );
    
    CREATE INDEX IX_Shifts_location ON Shifts(location_id);
END
GO

-- UserShifts junction table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserShifts')
BEGIN
    CREATE TABLE UserShifts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        shift_id UNIQUEIDENTIFIER NOT NULL,
        effective_from DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (shift_id) REFERENCES Shifts(id),
        UNIQUE (user_id, shift_id, effective_from)
    );
    
    CREATE INDEX IX_UserShifts_user ON UserShifts(user_id);
    CREATE INDEX IX_UserShifts_shift ON UserShifts(shift_id);
END
GO

-- AttendanceLogs table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AttendanceLogs')
BEGIN
    CREATE TABLE AttendanceLogs (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        location_id UNIQUEIDENTIFIER NOT NULL,
        latitude DECIMAL(18, 10) NOT NULL,
        longitude DECIMAL(18, 10) NOT NULL,
        distance_from_center DECIMAL(10, 2),
        is_within_geofence BIT DEFAULT 0,
        face_photo_url NVARCHAR(500),
        device_info NVARCHAR(500),
        shift_id UNIQUEIDENTIFIER,
        status NVARCHAR(20) DEFAULT 'present',
        scan_time DATETIME2 NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (location_id) REFERENCES Locations(id),
        FOREIGN KEY (shift_id) REFERENCES Shifts(id)
    );
    
    CREATE INDEX IX_AttendanceLogs_user ON AttendanceLogs(user_id);
    CREATE INDEX IX_AttendanceLogs_location ON AttendanceLogs(location_id);
    CREATE INDEX IX_AttendanceLogs_scan_time ON AttendanceLogs(scan_time);
END
GO

-- CorrectionRequests table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CorrectionRequests')
BEGIN
    CREATE TABLE CorrectionRequests (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        attendance_id UNIQUEIDENTIFIER,
        request_type NVARCHAR(50) NOT NULL,
        reason NVARCHAR(MAX),
        status NVARCHAR(20) DEFAULT 'pending',
        reviewer_id UNIQUEIDENTIFIER,
        reviewer_notes NVARCHAR(MAX),
        request_date DATETIME2 DEFAULT GETDATE(),
        reviewed_date DATETIME2,
        FOREIGN KEY (user_id) REFERENCES Users(id),
        FOREIGN KEY (attendance_id) REFERENCES AttendanceLogs(id),
        FOREIGN KEY (reviewer_id) REFERENCES Users(id)
    );
    
    CREATE INDEX IX_CorrectionRequests_user ON CorrectionRequests(user_id);
    CREATE INDEX IX_CorrectionRequests_status ON CorrectionRequests(status);
END
GO

-- AuditTrail table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditTrail')
BEGIN
    CREATE TABLE AuditTrail (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        actor_id UNIQUEIDENTIFIER,
        action NVARCHAR(100) NOT NULL,
        target_type NVARCHAR(100),
        target_id NVARCHAR(255),
        details NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT GETDATE(),
        FOREIGN KEY (actor_id) REFERENCES Users(id)
    );
    
    CREATE INDEX IX_AuditTrail_actor ON AuditTrail(actor_id);
    CREATE INDEX IX_AuditTrail_action ON AuditTrail(action);
    CREATE INDEX IX_AuditTrail_created_at ON AuditTrail(created_at);
END
GO

PRINT 'Database schema created successfully!';
GO

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================
-- Note: The default administrator account is automatically seeded by the 
-- Node.js backend (backend/src/index.ts) on its first startup.
-- 
-- Default Admin Credentials:
-- Email:    admin@csc.in
-- Password: 12345678
-- ==============================================================================