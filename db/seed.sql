-- Seed data matching the current in-app station/train lists

-- Stations
INSERT INTO stations (display_name, code) VALUES
  ('SURAT (ST)', 'ST'),
  ('AHMEDABAD JN (ADI)', 'ADI'),
  ('BILIMORA (BIM)', 'BIM'),
  ('VALSAD (BL)', 'BL'),
  ('VADODARA (BRC)', 'BRC'),
  ('VAPI (VAPI)', 'VAPI'),
  ('BHILAD (BLD)', 'BLD'),
  ('BHARUCH JN (BH)', 'BH')
ON CONFLICT (display_name) DO NOTHING;

-- Routes / distances (store both directions)
WITH s AS (
  SELECT id, display_name FROM stations
)
INSERT INTO routes (from_station_id, to_station_id, distance_km)
SELECT sf.id, st.id, d.distance_km
FROM (
  VALUES
    ('SURAT (ST)', 'AHMEDABAD JN (ADI)', 229),
    ('SURAT (ST)', 'BILIMORA (BIM)', 45),
    ('SURAT (ST)', 'VALSAD (BL)', 68),
    ('SURAT (ST)', 'VADODARA (BRC)', 130),
    ('SURAT (ST)', 'VAPI (VAPI)', 95),
    ('SURAT (ST)', 'BHILAD (BLD)', 107),
    ('SURAT (ST)', 'BHARUCH JN (BH)', 60),

    ('AHMEDABAD JN (ADI)', 'SURAT (ST)', 229),
    ('BILIMORA (BIM)', 'SURAT (ST)', 45),
    ('VALSAD (BL)', 'SURAT (ST)', 68),
    ('VADODARA (BRC)', 'SURAT (ST)', 130),
    ('VAPI (VAPI)', 'SURAT (ST)', 95),
    ('BHILAD (BLD)', 'SURAT (ST)', 107),
    ('BHARUCH JN (BH)', 'SURAT (ST)', 60)
) AS d(from_station, to_station, distance_km)
JOIN s sf ON sf.display_name = d.from_station
JOIN s st ON st.display_name = d.to_station
ON CONFLICT (from_station_id, to_station_id) DO NOTHING;

-- Trains
-- Helper CTE to locate route ids by station names
WITH s AS (
  SELECT id, display_name FROM stations
), r AS (
  SELECT routes.id, sf.display_name AS from_name, st.display_name AS to_name
  FROM routes
  JOIN stations sf ON sf.id = routes.from_station_id
  JOIN stations st ON st.id = routes.to_station_id
)
INSERT INTO trains (route_id, display_name, departure_time, arrival_time, class_name, fare, seat_type)
SELECT r.id, t.display_name, t.departure_time::time, t.arrival_time::time, t.class_name, t.fare, t.seat_type
FROM (
  VALUES
    -- SURAT -> VAPI
    ('SURAT (ST)', 'VAPI (VAPI)', '12932/MMCT DOUBLE DECKER', '09:07', '10:20', 'CHAIR CAR (CC)', 305, 'DOUBLE_DECKER'),
    ('SURAT (ST)', 'VAPI (VAPI)', '22930/Dahanu Road SF Express', '08:35', '09:53', 'CHAIR CAR (CC)', 305, 'CC_STANDARD'),

    -- VAPI -> SURAT
    ('VAPI (VAPI)', 'SURAT (ST)', '12931/ADI DOUBLE DECKER', '16:28', '17:52', 'CHAIR CAR (CC)', 305, 'DOUBLE_DECKER'),
    ('VAPI (VAPI)', 'SURAT (ST)', '20901/GNC VANDE BHARAT', '07:53', '09:05', 'CHAIR CAR (CC)', 700, 'VANDE_BHARAT'),
    ('VAPI (VAPI)', 'SURAT (ST)', '12921/FLYING RANEE', '20:08', '22:35', 'CHAIR CAR (CC)', 305, 'CC_STANDARD'),

    -- SURAT -> BILIMORA
    ('SURAT (ST)', 'BILIMORA (BIM)', '20908/SAYAJI NAGARI SUPERFAST EXP', '09:55', '10:38', 'CHAIR CAR (CC)', 305, 'CC_STANDARD'),
    ('SURAT (ST)', 'BILIMORA (BIM)', '22930/Dahanu Road SF Express', '08:35', '09:13', 'CHAIR CAR (CC)', 305, 'CC_STANDARD'),

    -- SURAT -> AHMEDABAD
    ('SURAT (ST)', 'AHMEDABAD JN (ADI)', '20960/VDG VALSAD SUP', '06:40', '10:10', 'CHAIR CAR (CC)', 450, 'CC_STANDARD'),

    -- AHMEDABAD -> SURAT (Tejas)
    ('AHMEDABAD JN (ADI)', 'SURAT (ST)', '82902/IRCTC TEJAS EXP', '06:35', '09:19', 'CHAIR CAR (CC)', 1200, 'CC_STANDARD'),

    -- SURAT -> BHILAD
    ('SURAT (ST)', 'BHILAD (BLD)', '22930/Dahanu Road SF Express', '08:32', '10:03', 'CHAIR CAR (CC)', 305, 'CC_STANDARD'),

    -- SURAT -> VADODARA
    ('SURAT (ST)', 'VADODARA (BRC)', '12834/AHMEDABAD SF Express', '08:00', '09:34', 'CHAIR CAR (CC)', 305, 'CC_STANDARD'),

    -- VADODARA -> SURAT
    ('VADODARA (BRC)', 'SURAT (ST)', '12905/SHALIMAR SF Express', '17:26', '21:15', 'AC 3 TIER (3A)', 550, 'AC_3_TIER'),

    -- BHARUCH -> SURAT
    ('BHARUCH JN (BH)', 'SURAT (ST)', '12844/PURI SF EXPRESS', '21:44', '22:50', 'AC 3 TIER (3A)', 550, 'AC_3_TIER')
) AS t(from_station, to_station, display_name, departure_time, arrival_time, class_name, fare, seat_type)
JOIN r ON r.from_name = t.from_station AND r.to_name = t.to_station
ON CONFLICT (route_id, display_name, departure_time) DO NOTHING;
