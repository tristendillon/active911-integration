-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create alerts table with the new structure
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(255) PRIMARY KEY,
    agency_name VARCHAR(255) NOT NULL,
    agency_id INTEGER NOT NULL,
    agency_timezone VARCHAR(50) NOT NULL,
    alert_city VARCHAR(255),
    alert_coordinate_source VARCHAR(100),
    alert_cross_street TEXT,
    alert_description TEXT,
    alert_details TEXT,
    alert_lat FLOAT,
    alert_lon FLOAT,
    alert_map_address TEXT,
    alert_map_code VARCHAR(255),
    alert_place VARCHAR(255),
    alert_priority VARCHAR(50),
    alert_received VARCHAR(50),
    alert_source VARCHAR(100),
    alert_state VARCHAR(50),
    alert_unit VARCHAR(50),
    alert_units VARCHAR(255),
    alert_pagegroups JSONB, -- Store as JSON array
    alert_stamp FLOAT,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on alert status for faster queries
CREATE INDEX alerts_status_idx ON alerts (status);
CREATE INDEX alerts_agency_id_idx ON alerts (agency_id);
CREATE INDEX alerts_received_idx ON alerts (alert_received);
CREATE INDEX alerts_state_city_idx ON alerts (alert_state, alert_city);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at timestamp on alerts table
CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();