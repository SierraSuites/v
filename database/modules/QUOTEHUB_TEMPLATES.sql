-- ============================================
-- QUOTEHUB PRE-BUILT CONSTRUCTION TEMPLATES
-- ============================================
-- Professional quote templates for construction projects
-- Ready to use with the QuoteHub system

-- Note: Replace 'YOUR_COMPANY_ID' with actual company UUID when seeding
-- Note: These templates can be customized per company or used globally

-- ============================================
-- RESIDENTIAL CONSTRUCTION TEMPLATE
-- ============================================

INSERT INTO quote_templates (
  company_id,
  name,
  category,
  description,
  estimated_duration_days,
  template_data,
  is_active,
  use_count
) VALUES (
  'YOUR_COMPANY_ID', -- Replace with actual company UUID or NULL for global
  'Residential New Construction',
  'residential',
  'Complete new home construction package including foundation, framing, systems, and finishes',
  120,
  '{
    "sections": [
      {
        "name": "Foundation & Site Work",
        "description": "Site preparation and foundation installation",
        "line_items": [
          {
            "description": "Site Survey & Engineering",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2500.00,
            "category": "foundation",
            "is_taxable": false,
            "is_optional": false,
            "notes": "Professional site survey and engineering drawings"
          },
          {
            "description": "Site Clearing & Grading",
            "item_type": "labor",
            "quantity": 1,
            "unit": "lot",
            "unit_price": 5000.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Excavation",
            "item_type": "equipment",
            "quantity": 40,
            "unit": "hours",
            "unit_price": 150.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Foundation Forms & Rebar",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8000.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Concrete Pouring (Foundation & Slab)",
            "item_type": "material",
            "quantity": 80,
            "unit": "cubic yards",
            "unit_price": 175.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Foundation Waterproofing",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Framing & Structure",
        "description": "Complete structural framing package",
        "line_items": [
          {
            "description": "Lumber Package (Walls, Floors, Roof)",
            "item_type": "material",
            "quantity": 1,
            "unit": "package",
            "unit_price": 35000.00,
            "category": "framing",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Engineered lumber package for 2,500 sq ft home"
          },
          {
            "description": "Framing Labor",
            "item_type": "labor",
            "quantity": 320,
            "unit": "hours",
            "unit_price": 65.00,
            "category": "framing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Roof Trusses",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "framing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Windows & Doors Package",
            "item_type": "material",
            "quantity": 1,
            "unit": "package",
            "unit_price": 18000.00,
            "category": "framing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Exterior Sheathing & House Wrap",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 6500.00,
            "category": "framing",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Electrical Systems",
        "description": "Complete electrical installation",
        "line_items": [
          {
            "description": "Electrical Rough-In",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Electrical Materials & Wire",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 5500.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Electrical Panel & Breakers",
            "item_type": "material",
            "quantity": 1,
            "unit": "panel",
            "unit_price": 2500.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Light Fixtures & Switches",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 4000.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Homeowner selection allowance"
          },
          {
            "description": "Electrical Finish & Inspection",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Plumbing Systems",
        "description": "Complete plumbing installation",
        "line_items": [
          {
            "description": "Plumbing Rough-In",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 9500.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Supply & Drain Pipes",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 6500.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Water Heater Installation",
            "item_type": "material",
            "quantity": 1,
            "unit": "unit",
            "unit_price": 2200.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Plumbing Fixtures Package",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 5500.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Homeowner selection allowance - sinks, toilets, tubs"
          },
          {
            "description": "Plumbing Finish & Inspection",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2500.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "HVAC Systems",
        "description": "Heating, ventilation, and air conditioning",
        "line_items": [
          {
            "description": "HVAC System Design",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 1500.00,
            "category": "hvac",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "HVAC Equipment (Furnace & AC Unit)",
            "item_type": "material",
            "quantity": 1,
            "unit": "system",
            "unit_price": 8500.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Ductwork Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 4500.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Ductwork Materials",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Thermostat & Controls",
            "item_type": "material",
            "quantity": 1,
            "unit": "system",
            "unit_price": 800.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "HVAC Testing & Balancing",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 1200.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Interior Finishes",
        "description": "Drywall, flooring, trim, and paint",
        "line_items": [
          {
            "description": "Insulation Installation",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 4500.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Drywall Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Interior Paint",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Two coat system, walls and ceilings"
          },
          {
            "description": "Flooring Package",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 15000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Homeowner selection allowance"
          },
          {
            "description": "Flooring Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 6500.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Interior Trim & Doors",
            "item_type": "material",
            "quantity": 1,
            "unit": "package",
            "unit_price": 8500.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Trim Installation Labor",
            "item_type": "labor",
            "quantity": 80,
            "unit": "hours",
            "unit_price": 55.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Kitchen Cabinets & Countertops",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 18000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Homeowner selection allowance"
          },
          {
            "description": "Cabinet Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Exterior Finishes",
        "description": "Roofing, siding, and exterior paint",
        "line_items": [
          {
            "description": "Roofing Materials (Shingles)",
            "item_type": "material",
            "quantity": 30,
            "unit": "squares",
            "unit_price": 180.00,
            "category": "exterior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Roofing Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "exterior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Gutters & Downspouts",
            "item_type": "material",
            "quantity": 200,
            "unit": "linear feet",
            "unit_price": 12.00,
            "category": "exterior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Exterior Siding",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 14000.00,
            "category": "exterior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Siding Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 9500.00,
            "category": "exterior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Exterior Paint",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 6500.00,
            "category": "exterior",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Landscaping & Final",
        "description": "Site completion and landscaping",
        "line_items": [
          {
            "description": "Driveway & Walkways",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "landscaping",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Grading & Drainage",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 4500.00,
            "category": "landscaping",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Lawn & Landscaping",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 6000.00,
            "category": "landscaping",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Final Cleanup",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2000.00,
            "category": "final",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Permits & Overhead",
        "description": "Administrative costs and permits",
        "line_items": [
          {
            "description": "Building Permits & Fees",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 5000.00,
            "category": "permits",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Project Management",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 15000.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Insurance & Bonding",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 4500.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Contractor Profit",
            "item_type": "profit",
            "quantity": 1,
            "unit": "job",
            "unit_price": 35000.00,
            "category": "profit",
            "is_taxable": false,
            "is_optional": false
          }
        ]
      }
    ]
  }'::jsonb,
  true,
  0
);

-- ============================================
-- COMMERCIAL RENOVATION TEMPLATE
-- ============================================

INSERT INTO quote_templates (
  company_id,
  name,
  category,
  description,
  estimated_duration_days,
  template_data,
  is_active,
  use_count
) VALUES (
  'YOUR_COMPANY_ID',
  'Commercial Office Renovation',
  'commercial',
  'Complete commercial office space renovation including demolition, systems upgrade, and build-out',
  90,
  '{
    "sections": [
      {
        "name": "Demolition & Site Prep",
        "description": "Selective demolition and site preparation",
        "line_items": [
          {
            "description": "Site Protection & Barriers",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Dust barriers, floor protection, temporary walls"
          },
          {
            "description": "Selective Demolition",
            "item_type": "labor",
            "quantity": 80,
            "unit": "hours",
            "unit_price": 75.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Debris Removal & Dumpsters",
            "item_type": "equipment",
            "quantity": 4,
            "unit": "dumpsters",
            "unit_price": 850.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Asbestos Testing & Abatement",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": true,
            "notes": "If required based on testing"
          }
        ]
      },
      {
        "name": "Structural Modifications",
        "description": "Structural changes and reinforcement",
        "line_items": [
          {
            "description": "Structural Engineering Review",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 4500.00,
            "category": "structural",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Load-Bearing Wall Modifications",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "structural",
            "is_taxable": true,
            "is_optional": true,
            "notes": "If required for open floor plan"
          },
          {
            "description": "Steel Beam Installation",
            "item_type": "material",
            "quantity": 3,
            "unit": "beams",
            "unit_price": 3500.00,
            "category": "structural",
            "is_taxable": true,
            "is_optional": true
          },
          {
            "description": "Framing for New Walls",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "structural",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "MEP Systems Upgrade",
        "description": "Mechanical, electrical, and plumbing modernization",
        "line_items": [
          {
            "description": "Electrical System Upgrade",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 18000.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Panel upgrade, new circuits, LED lighting"
          },
          {
            "description": "Data/Network Cabling",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Cat6 cabling throughout office"
          },
          {
            "description": "HVAC Zone Modifications",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 15000.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "New HVAC Units",
            "item_type": "material",
            "quantity": 2,
            "unit": "units",
            "unit_price": 6500.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": true
          },
          {
            "description": "Plumbing Fixture Upgrades",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false,
            "notes": "ADA-compliant restroom fixtures"
          },
          {
            "description": "Fire Suppression System Update",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 14000.00,
            "category": "safety",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Interior Build-Out",
        "description": "Walls, ceilings, flooring, and finishes",
        "line_items": [
          {
            "description": "Drywall Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 16000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Acoustic Ceiling Tile System",
            "item_type": "material",
            "quantity": 5000,
            "unit": "square feet",
            "unit_price": 4.50,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Commercial Flooring",
            "item_type": "material",
            "quantity": 5000,
            "unit": "square feet",
            "unit_price": 8.50,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false,
            "notes": "LVT or carpet tile"
          },
          {
            "description": "Flooring Installation",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Interior Paint",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 11000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Doors & Hardware",
            "item_type": "material",
            "quantity": 1,
            "unit": "package",
            "unit_price": 9500.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Commercial grade with ADA-compliant hardware"
          },
          {
            "description": "Window Treatments",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 6000.00,
            "category": "interior",
            "is_taxable": true,
            "is_optional": true
          }
        ]
      },
      {
        "name": "Compliance & Permits",
        "description": "Building codes, ADA compliance, permits",
        "line_items": [
          {
            "description": "Building Permits",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "permits",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "ADA Compliance Upgrades",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "compliance",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Ramps, door widths, restroom modifications"
          },
          {
            "description": "Life Safety Systems",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "safety",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Emergency lighting, exit signs, alarms"
          },
          {
            "description": "Code Compliance Review",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2500.00,
            "category": "compliance",
            "is_taxable": false,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Final Inspection & Certification",
        "description": "Final inspections and project closeout",
        "line_items": [
          {
            "description": "Building Inspections",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2000.00,
            "category": "final",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Final Cleaning",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "final",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Punch List Completion",
            "item_type": "labor",
            "quantity": 40,
            "unit": "hours",
            "unit_price": 85.00,
            "category": "final",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Project Management",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 22000.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "General Conditions & Insurance",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Contractor Profit",
            "item_type": "profit",
            "quantity": 1,
            "unit": "job",
            "unit_price": 45000.00,
            "category": "profit",
            "is_taxable": false,
            "is_optional": false
          }
        ]
      }
    ]
  }'::jsonb,
  true,
  0
);

-- ============================================
-- INDUSTRIAL WAREHOUSE TEMPLATE
-- ============================================

INSERT INTO quote_templates (
  company_id,
  name,
  category,
  description,
  estimated_duration_days,
  template_data,
  is_active,
  use_count
) VALUES (
  'YOUR_COMPANY_ID',
  'Industrial Warehouse Build-Out',
  'industrial',
  'Complete warehouse facility construction including site work, structure, and systems',
  180,
  '{
    "sections": [
      {
        "name": "Site Development",
        "description": "Site preparation and civil work",
        "line_items": [
          {
            "description": "Site Survey & Geotechnical Testing",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "site",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Site Clearing & Grubbing",
            "item_type": "equipment",
            "quantity": 1,
            "unit": "acre",
            "unit_price": 12000.00,
            "category": "site",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Bulk Excavation & Grading",
            "item_type": "equipment",
            "quantity": 200,
            "unit": "hours",
            "unit_price": 185.00,
            "category": "site",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Stormwater Management System",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 35000.00,
            "category": "site",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Utilities Connection",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 45000.00,
            "category": "site",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Water, sewer, electric, gas connections"
          }
        ]
      },
      {
        "name": "Foundation & Slab",
        "description": "Heavy-duty foundation system",
        "line_items": [
          {
            "description": "Foundation Engineering",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 12000.00,
            "category": "foundation",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Pier & Grade Beam Foundation",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 85000.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Reinforced Concrete Slab",
            "item_type": "material",
            "quantity": 800,
            "unit": "cubic yards",
            "unit_price": 195.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false,
            "notes": "6-inch reinforced slab with wire mesh"
          },
          {
            "description": "Slab Finishing & Sealing",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 28000.00,
            "category": "foundation",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Structural Steel",
        "description": "Pre-engineered metal building structure",
        "line_items": [
          {
            "description": "Structural Engineering & Design",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 18000.00,
            "category": "structural",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Pre-Engineered Metal Building Package",
            "item_type": "material",
            "quantity": 1,
            "unit": "building",
            "unit_price": 285000.00,
            "category": "structural",
            "is_taxable": true,
            "is_optional": false,
            "notes": "50,000 sq ft warehouse structure"
          },
          {
            "description": "Steel Erection",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 95000.00,
            "category": "structural",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Metal Roof & Wall Panels",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 125000.00,
            "category": "structural",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Loading Docks & Doors",
        "description": "Material handling infrastructure",
        "line_items": [
          {
            "description": "Loading Dock Pits",
            "item_type": "material",
            "quantity": 6,
            "unit": "docks",
            "unit_price": 8500.00,
            "category": "docks",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Dock Levelers",
            "item_type": "material",
            "quantity": 6,
            "unit": "units",
            "unit_price": 4500.00,
            "category": "docks",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Dock Seals & Bumpers",
            "item_type": "material",
            "quantity": 6,
            "unit": "sets",
            "unit_price": 2200.00,
            "category": "docks",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Overhead Doors (Truck Height)",
            "item_type": "material",
            "quantity": 6,
            "unit": "doors",
            "unit_price": 6500.00,
            "category": "doors",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Personnel Doors",
            "item_type": "material",
            "quantity": 8,
            "unit": "doors",
            "unit_price": 1800.00,
            "category": "doors",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Industrial Systems",
        "description": "Electrical, HVAC, and fire protection",
        "line_items": [
          {
            "description": "Industrial Electrical Service",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 85000.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false,
            "notes": "400A service, distribution, lighting"
          },
          {
            "description": "LED High-Bay Lighting",
            "item_type": "material",
            "quantity": 120,
            "unit": "fixtures",
            "unit_price": 450.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "HVAC System (Office Area)",
            "item_type": "material",
            "unit": "job",
            "quantity": 1,
            "unit_price": 35000.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Warehouse Ventilation System",
            "item_type": "material",
            "quantity": 1,
            "unit": "job",
            "unit_price": 28000.00,
            "category": "hvac",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Fire Sprinkler System",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 95000.00,
            "category": "safety",
            "is_taxable": true,
            "is_optional": false,
            "notes": "ESFR system for warehouse"
          },
          {
            "description": "Fire Alarm & Detection",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 22000.00,
            "category": "safety",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Office Build-Out",
        "description": "Administrative office space",
        "line_items": [
          {
            "description": "Office Framing & Drywall",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 32000.00,
            "category": "office",
            "is_taxable": true,
            "is_optional": false,
            "notes": "3,000 sq ft office area"
          },
          {
            "description": "Office Flooring",
            "item_type": "material",
            "quantity": 3000,
            "unit": "square feet",
            "unit_price": 6.50,
            "category": "office",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Office HVAC",
            "item_type": "material",
            "quantity": 1,
            "unit": "system",
            "unit_price": 18000.00,
            "category": "office",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Office Electrical & Data",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 15000.00,
            "category": "office",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Office Restrooms",
            "item_type": "material",
            "quantity": 2,
            "unit": "rooms",
            "unit_price": 12000.00,
            "category": "office",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Office Finishes & Paint",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 8500.00,
            "category": "office",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Site Improvements",
        "description": "Paving, fencing, and landscaping",
        "line_items": [
          {
            "description": "Asphalt Paving (Parking & Drive)",
            "item_type": "material",
            "quantity": 15000,
            "unit": "square feet",
            "unit_price": 4.25,
            "category": "paving",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Concrete Truck Apron",
            "item_type": "material",
            "quantity": 200,
            "unit": "cubic yards",
            "unit_price": 185.00,
            "category": "paving",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Striping & Signage",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 4500.00,
            "category": "paving",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Security Fencing",
            "item_type": "material",
            "quantity": 800,
            "unit": "linear feet",
            "unit_price": 35.00,
            "category": "security",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Security Gate",
            "item_type": "material",
            "quantity": 1,
            "unit": "gate",
            "unit_price": 12000.00,
            "category": "security",
            "is_taxable": true,
            "is_optional": true
          },
          {
            "description": "Landscaping & Irrigation",
            "item_type": "subcontractor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 18000.00,
            "category": "landscaping",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Project Management & Overhead",
        "description": "Management, permits, and insurance",
        "line_items": [
          {
            "description": "Building Permits & Engineering",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 35000.00,
            "category": "permits",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Project Management",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 95000.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "General Conditions",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 65000.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false,
            "notes": "Temporary facilities, utilities, security"
          },
          {
            "description": "Insurance & Bonding",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 45000.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Contractor Profit",
            "item_type": "profit",
            "quantity": 1,
            "unit": "job",
            "unit_price": 175000.00,
            "category": "profit",
            "is_taxable": false,
            "is_optional": false
          }
        ]
      }
    ]
  }'::jsonb,
  true,
  0
);

-- ============================================
-- KITCHEN REMODEL TEMPLATE (Smaller Project)
-- ============================================

INSERT INTO quote_templates (
  company_id,
  name,
  category,
  description,
  estimated_duration_days,
  template_data,
  is_active,
  use_count
) VALUES (
  'YOUR_COMPANY_ID',
  'Kitchen Remodel',
  'residential',
  'Complete kitchen renovation including cabinets, countertops, appliances, and finishes',
  21,
  '{
    "sections": [
      {
        "name": "Demolition & Prep",
        "line_items": [
          {
            "description": "Kitchen Demolition",
            "item_type": "labor",
            "quantity": 16,
            "unit": "hours",
            "unit_price": 65.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Debris Removal",
            "item_type": "equipment",
            "quantity": 1,
            "unit": "dumpster",
            "unit_price": 650.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Cabinets & Countertops",
        "line_items": [
          {
            "description": "Custom Kitchen Cabinets",
            "item_type": "material",
            "quantity": 1,
            "unit": "kitchen",
            "unit_price": 15000.00,
            "category": "cabinets",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Quartz Countertops",
            "item_type": "material",
            "quantity": 40,
            "unit": "square feet",
            "unit_price": 85.00,
            "category": "countertops",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Cabinet & Countertop Installation",
            "item_type": "labor",
            "quantity": 40,
            "unit": "hours",
            "unit_price": 75.00,
            "category": "installation",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Appliances",
        "line_items": [
          {
            "description": "Appliance Package",
            "item_type": "material",
            "quantity": 1,
            "unit": "package",
            "unit_price": 8500.00,
            "category": "appliances",
            "is_taxable": true,
            "is_optional": false,
            "notes": "Refrigerator, range, dishwasher, microwave"
          },
          {
            "description": "Appliance Installation",
            "item_type": "labor",
            "quantity": 8,
            "unit": "hours",
            "unit_price": 85.00,
            "category": "installation",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Plumbing & Electrical",
        "line_items": [
          {
            "description": "Plumbing Updates",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2500.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Kitchen Sink & Faucet",
            "item_type": "material",
            "quantity": 1,
            "unit": "set",
            "unit_price": 850.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Electrical Updates",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2200.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Light Fixtures",
            "item_type": "material",
            "quantity": 1,
            "unit": "allowance",
            "unit_price": 1200.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Finishes",
        "line_items": [
          {
            "description": "Tile Backsplash",
            "item_type": "material",
            "quantity": 35,
            "unit": "square feet",
            "unit_price": 18.00,
            "category": "tile",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Tile Installation",
            "item_type": "labor",
            "quantity": 16,
            "unit": "hours",
            "unit_price": 65.00,
            "category": "tile",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Flooring",
            "item_type": "material",
            "quantity": 200,
            "unit": "square feet",
            "unit_price": 8.50,
            "category": "flooring",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Flooring Installation",
            "item_type": "labor",
            "quantity": 16,
            "unit": "hours",
            "unit_price": 55.00,
            "category": "flooring",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Paint",
            "item_type": "labor",
            "quantity": 1,
            "unit": "room",
            "unit_price": 1200.00,
            "category": "paint",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Project Management",
        "line_items": [
          {
            "description": "Permits",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 500.00,
            "category": "permits",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Project Management",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Contractor Profit",
            "item_type": "profit",
            "quantity": 1,
            "unit": "job",
            "unit_price": 6500.00,
            "category": "profit",
            "is_taxable": false,
            "is_optional": false
          }
        ]
      }
    ]
  }'::jsonb,
  true,
  0
);

-- ============================================
-- BATHROOM REMODEL TEMPLATE
-- ============================================

INSERT INTO quote_templates (
  company_id,
  name,
  category,
  description,
  estimated_duration_days,
  template_data,
  is_active,
  use_count
) VALUES (
  'YOUR_COMPANY_ID',
  'Bathroom Remodel',
  'residential',
  'Full bathroom renovation including fixtures, tile, and finishes',
  14,
  '{
    "sections": [
      {
        "name": "Demolition",
        "line_items": [
          {
            "description": "Bathroom Demolition",
            "item_type": "labor",
            "quantity": 12,
            "unit": "hours",
            "unit_price": 65.00,
            "category": "demolition",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Plumbing",
        "line_items": [
          {
            "description": "Plumbing Rough-In Updates",
            "item_type": "labor",
            "quantity": 1,
            "unit": "job",
            "unit_price": 2200.00,
            "category": "plumbing",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Vanity & Sink",
            "item_type": "material",
            "quantity": 1,
            "unit": "unit",
            "unit_price": 1500.00,
            "category": "fixtures",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Toilet",
            "item_type": "material",
            "quantity": 1,
            "unit": "unit",
            "unit_price": 450.00,
            "category": "fixtures",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Shower/Tub Unit",
            "item_type": "material",
            "quantity": 1,
            "unit": "unit",
            "unit_price": 2800.00,
            "category": "fixtures",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Faucets & Accessories",
            "item_type": "material",
            "quantity": 1,
            "unit": "set",
            "unit_price": 850.00,
            "category": "fixtures",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Tile Work",
        "line_items": [
          {
            "description": "Floor Tile",
            "item_type": "material",
            "quantity": 60,
            "unit": "square feet",
            "unit_price": 12.00,
            "category": "tile",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Wall Tile (Shower Surround)",
            "item_type": "material",
            "quantity": 120,
            "unit": "square feet",
            "unit_price": 15.00,
            "category": "tile",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Tile Installation",
            "item_type": "labor",
            "quantity": 32,
            "unit": "hours",
            "unit_price": 65.00,
            "category": "tile",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Finishes",
        "line_items": [
          {
            "description": "Drywall Repair",
            "item_type": "labor",
            "quantity": 8,
            "unit": "hours",
            "unit_price": 65.00,
            "category": "drywall",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Paint",
            "item_type": "labor",
            "quantity": 1,
            "unit": "room",
            "unit_price": 650.00,
            "category": "paint",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Mirror & Lighting",
            "item_type": "material",
            "quantity": 1,
            "unit": "set",
            "unit_price": 750.00,
            "category": "finishes",
            "is_taxable": true,
            "is_optional": false
          },
          {
            "description": "Exhaust Fan",
            "item_type": "material",
            "quantity": 1,
            "unit": "unit",
            "unit_price": 350.00,
            "category": "electrical",
            "is_taxable": true,
            "is_optional": false
          }
        ]
      },
      {
        "name": "Management & Profit",
        "line_items": [
          {
            "description": "Permits",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 300.00,
            "category": "permits",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Project Management",
            "item_type": "overhead",
            "quantity": 1,
            "unit": "job",
            "unit_price": 1800.00,
            "category": "overhead",
            "is_taxable": false,
            "is_optional": false
          },
          {
            "description": "Contractor Profit",
            "item_type": "profit",
            "quantity": 1,
            "unit": "job",
            "unit_price": 3500.00,
            "category": "profit",
            "is_taxable": false,
            "is_optional": false
          }
        ]
      }
    ]
  }'::jsonb,
  true,
  0
);

-- ============================================
-- HELPER: View all templates
-- ============================================

-- Query to view all template summaries
-- SELECT
--   name,
--   category,
--   description,
--   estimated_duration_days,
--   is_active,
--   use_count
-- FROM quote_templates
-- ORDER BY category, name;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================

-- 1. Replace 'YOUR_COMPANY_ID' with actual company UUID
-- 2. Or set to NULL for global templates accessible by all companies
-- 3. Run this SQL file against your Supabase database
-- 4. Templates will be available in the QuoteHub template gallery
-- 5. Users can create quotes from templates using quoteService.createFromTemplate()

-- Example: Create a quote from the residential template
-- SELECT id FROM quote_templates WHERE name = 'Residential New Construction';
-- Then in your app:
-- await quoteService.createFromTemplate(templateId, projectId, clientId);
