-- First drop the default
ALTER TABLE deviations ALTER COLUMN category DROP DEFAULT;

-- Drop the old enum and create new one with updated categories
ALTER TYPE deviation_category RENAME TO deviation_category_old;

CREATE TYPE deviation_category AS ENUM (
  'not_applicable',
  'access_exit',
  'chemical_handling',
  'confined_space',
  'contractor_management',
  'driving_safety',
  'electrical_safety',
  'ergonomics',
  'excavations',
  'fire',
  'housekeeping',
  'load_handling',
  'lighting',
  'loto',
  'manual_load_handling',
  'noise',
  'machinery',
  'ppe',
  'procedures',
  'scaffolding',
  'signage',
  'slip_trip_fall',
  'storage',
  'wellbeing',
  'work_at_height'
);

-- Update the column to use the new enum
ALTER TABLE deviations 
ALTER COLUMN category TYPE deviation_category 
USING (
  CASE category::text
    WHEN 'access_exit' THEN 'access_exit'::deviation_category
    WHEN 'chemical_products' THEN 'chemical_handling'::deviation_category
    WHEN 'electrical' THEN 'electrical_safety'::deviation_category
    WHEN 'fire' THEN 'fire'::deviation_category
    WHEN 'ergonomics' THEN 'ergonomics'::deviation_category
    WHEN 'ppe' THEN 'ppe'::deviation_category
    WHEN 'machinery' THEN 'machinery'::deviation_category
    WHEN 'fall_protection' THEN 'work_at_height'::deviation_category
    WHEN 'confined_space' THEN 'confined_space'::deviation_category
    WHEN 'other' THEN 'not_applicable'::deviation_category
    ELSE 'not_applicable'::deviation_category
  END
);

-- Set a new default
ALTER TABLE deviations ALTER COLUMN category SET DEFAULT 'not_applicable'::deviation_category;

-- Drop the old enum
DROP TYPE deviation_category_old;

-- Create classification enum
CREATE TYPE deviation_classification AS ENUM (
  'audit',
  'environment',
  'health_safety',
  'property_security',
  'social_responsibility'
);

-- Add classification column to deviations table
ALTER TABLE deviations 
ADD COLUMN classification deviation_classification DEFAULT 'health_safety';