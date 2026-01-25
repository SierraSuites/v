/**
 * Task Templates for Common Construction Workflows
 *
 * Pre-defined templates for standard construction phases and activities
 * Users can select these to quickly populate tasks for a project
 */

export interface TaskTemplate {
  title: string
  description: string
  estimated_hours: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies?: number[] // Indices of tasks that must complete first
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'residential' | 'commercial' | 'renovation' | 'infrastructure' | 'general'
  icon: string
  tasks: TaskTemplate[]
}

export const workflowTemplates: WorkflowTemplate[] = [
  // RESIDENTIAL CONSTRUCTION
  {
    id: 'residential-new-home',
    name: 'New Home Construction',
    description: 'Complete workflow for building a new residential home from foundation to finish',
    category: 'residential',
    icon: '🏡',
    tasks: [
      {
        title: 'Site Preparation & Excavation',
        description: 'Clear site, mark boundaries, excavate for foundation',
        estimated_hours: 40,
        priority: 'high'
      },
      {
        title: 'Foundation & Footings',
        description: 'Pour concrete foundation and footings, install waterproofing',
        estimated_hours: 80,
        priority: 'critical',
        dependencies: [0]
      },
      {
        title: 'Rough Framing',
        description: 'Frame walls, install floor joists, roof trusses',
        estimated_hours: 120,
        priority: 'critical',
        dependencies: [1]
      },
      {
        title: 'Roof Installation',
        description: 'Install roof sheathing, underlayment, shingles or tiles',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Exterior Windows & Doors',
        description: 'Install all exterior windows and doors, ensure weather sealing',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Rough Plumbing',
        description: 'Install water supply lines, drain pipes, and vents',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Rough Electrical',
        description: 'Install electrical panels, wiring, outlets, and switches',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'HVAC Installation',
        description: 'Install heating, ventilation, and air conditioning systems',
        estimated_hours: 50,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Insulation',
        description: 'Install wall and attic insulation per energy code',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [5, 6, 7]
      },
      {
        title: 'Drywall Installation',
        description: 'Hang, tape, and finish drywall on walls and ceilings',
        estimated_hours: 80,
        priority: 'medium',
        dependencies: [8]
      },
      {
        title: 'Interior Trim & Doors',
        description: 'Install baseboards, crown molding, interior doors',
        estimated_hours: 60,
        priority: 'medium',
        dependencies: [9]
      },
      {
        title: 'Flooring Installation',
        description: 'Install hardwood, tile, carpet per specifications',
        estimated_hours: 60,
        priority: 'medium',
        dependencies: [9]
      },
      {
        title: 'Kitchen Cabinets & Countertops',
        description: 'Install kitchen cabinetry and countertops',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [9]
      },
      {
        title: 'Bathroom Fixtures',
        description: 'Install toilets, sinks, tubs, showers, vanities',
        estimated_hours: 30,
        priority: 'medium',
        dependencies: [9]
      },
      {
        title: 'Painting & Finishing',
        description: 'Prime and paint all interior and exterior surfaces',
        estimated_hours: 80,
        priority: 'medium',
        dependencies: [10, 11]
      },
      {
        title: 'Final Electrical & Plumbing',
        description: 'Install light fixtures, outlets, faucets, appliances',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [12, 13, 14]
      },
      {
        title: 'Final Inspection & Walkthrough',
        description: 'Complete building inspection and client walkthrough',
        estimated_hours: 8,
        priority: 'critical',
        dependencies: [15]
      }
    ]
  },

  // KITCHEN RENOVATION
  {
    id: 'residential-kitchen-remodel',
    name: 'Kitchen Renovation',
    description: 'Complete kitchen remodel workflow',
    category: 'renovation',
    icon: '🍳',
    tasks: [
      {
        title: 'Demolition & Removal',
        description: 'Remove old cabinets, countertops, appliances, and flooring',
        estimated_hours: 16,
        priority: 'high'
      },
      {
        title: 'Plumbing Rough-In',
        description: 'Relocate or install new plumbing lines as needed',
        estimated_hours: 24,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Electrical Rough-In',
        description: 'Install new electrical circuits, outlets, and lighting',
        estimated_hours: 20,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Drywall Repair & Prep',
        description: 'Repair walls, patch holes, ensure smooth surfaces',
        estimated_hours: 16,
        priority: 'medium',
        dependencies: [1, 2]
      },
      {
        title: 'Flooring Installation',
        description: 'Install new kitchen flooring (tile, hardwood, etc.)',
        estimated_hours: 24,
        priority: 'medium',
        dependencies: [3]
      },
      {
        title: 'Cabinet Installation',
        description: 'Install new base and upper cabinets, ensure level',
        estimated_hours: 32,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Countertop Installation',
        description: 'Template, fabricate, and install countertops',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [5]
      },
      {
        title: 'Backsplash Installation',
        description: 'Install tile or other backsplash material',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Appliance Installation',
        description: 'Install refrigerator, stove, dishwasher, microwave',
        estimated_hours: 8,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Painting & Touch-ups',
        description: 'Paint walls, trim, and any exposed areas',
        estimated_hours: 16,
        priority: 'medium',
        dependencies: [7]
      },
      {
        title: 'Final Fixtures & Hardware',
        description: 'Install sink, faucet, lighting, cabinet hardware',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [8, 9]
      },
      {
        title: 'Final Cleanup & Inspection',
        description: 'Clean job site, final walkthrough with client',
        estimated_hours: 4,
        priority: 'high',
        dependencies: [10]
      }
    ]
  },

  // BATHROOM RENOVATION
  {
    id: 'residential-bathroom-remodel',
    name: 'Bathroom Renovation',
    description: 'Full bathroom remodel from demo to finish',
    category: 'renovation',
    icon: '🚿',
    tasks: [
      {
        title: 'Demolition & Removal',
        description: 'Remove old fixtures, tile, vanity, and flooring',
        estimated_hours: 12,
        priority: 'high'
      },
      {
        title: 'Plumbing Rough-In',
        description: 'Relocate or install new plumbing for tub/shower, toilet, sink',
        estimated_hours: 20,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Electrical Rough-In',
        description: 'Install circuits for lights, fans, outlets, heated floors',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Waterproofing & Backer Board',
        description: 'Install waterproof membrane and cement backer board',
        estimated_hours: 12,
        priority: 'critical',
        dependencies: [1, 2]
      },
      {
        title: 'Tile Installation',
        description: 'Install floor and wall tile, shower surround',
        estimated_hours: 32,
        priority: 'high',
        dependencies: [3]
      },
      {
        title: 'Vanity & Cabinet Installation',
        description: 'Install bathroom vanity and storage cabinets',
        estimated_hours: 8,
        priority: 'medium',
        dependencies: [4]
      },
      {
        title: 'Countertop & Sink Installation',
        description: 'Install vanity countertop and undermount or vessel sink',
        estimated_hours: 6,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Shower/Tub Installation',
        description: 'Install shower door, tub surround, or shower enclosure',
        estimated_hours: 12,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Toilet Installation',
        description: 'Install new toilet and wax ring',
        estimated_hours: 4,
        priority: 'medium',
        dependencies: [4]
      },
      {
        title: 'Final Fixtures',
        description: 'Install faucets, shower heads, towel bars, mirrors',
        estimated_hours: 8,
        priority: 'medium',
        dependencies: [6, 7, 8]
      },
      {
        title: 'Painting & Finishing',
        description: 'Paint walls and ceiling, caulk all joints',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [9]
      },
      {
        title: 'Final Cleanup & Inspection',
        description: 'Clean and polish, final walkthrough',
        estimated_hours: 4,
        priority: 'high',
        dependencies: [10]
      }
    ]
  },

  // COMMERCIAL BUILD-OUT
  {
    id: 'commercial-office-buildout',
    name: 'Office Build-Out',
    description: 'Commercial office space tenant improvement',
    category: 'commercial',
    icon: '🏢',
    tasks: [
      {
        title: 'Site Survey & Planning',
        description: 'Measure space, create layout plan, obtain permits',
        estimated_hours: 24,
        priority: 'critical'
      },
      {
        title: 'Demolition (if needed)',
        description: 'Remove existing walls, ceilings, fixtures',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Metal Framing',
        description: 'Frame new office walls and partition walls',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Electrical Rough-In',
        description: 'Install power, data, lighting circuits per code',
        estimated_hours: 80,
        priority: 'critical',
        dependencies: [2]
      },
      {
        title: 'HVAC Modifications',
        description: 'Modify or extend HVAC system for new layout',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Fire Suppression & Alarms',
        description: 'Install sprinklers, smoke detectors, alarms',
        estimated_hours: 40,
        priority: 'critical',
        dependencies: [2]
      },
      {
        title: 'Drywall Installation',
        description: 'Hang and finish drywall on walls and ceilings',
        estimated_hours: 80,
        priority: 'medium',
        dependencies: [3, 4, 5]
      },
      {
        title: 'Ceiling Tile Installation',
        description: 'Install drop ceiling and ceiling tiles',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Flooring Installation',
        description: 'Install carpet, tile, or LVT flooring',
        estimated_hours: 60,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Door & Hardware Installation',
        description: 'Install doors, frames, locksets, accessibility hardware',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Painting',
        description: 'Prime and paint all walls and trim',
        estimated_hours: 60,
        priority: 'medium',
        dependencies: [7, 9]
      },
      {
        title: 'Lighting & Electrical Trim',
        description: 'Install light fixtures, switches, outlets, data jacks',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [7, 10]
      },
      {
        title: 'Final Inspection & Certificate of Occupancy',
        description: 'Complete inspections, obtain CO for client move-in',
        estimated_hours: 16,
        priority: 'critical',
        dependencies: [11]
      }
    ]
  },

  // DECK CONSTRUCTION
  {
    id: 'residential-deck',
    name: 'Outdoor Deck Construction',
    description: 'Build a new outdoor deck',
    category: 'residential',
    icon: '🏗️',
    tasks: [
      {
        title: 'Permits & Site Layout',
        description: 'Obtain permits, mark deck location, check utilities',
        estimated_hours: 8,
        priority: 'critical'
      },
      {
        title: 'Excavation & Footings',
        description: 'Dig post holes, pour concrete footings',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Install Posts & Beams',
        description: 'Set pressure-treated posts, install support beams',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Install Joists',
        description: 'Install floor joists at proper spacing',
        estimated_hours: 12,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Install Decking',
        description: 'Install deck boards with proper spacing and fasteners',
        estimated_hours: 24,
        priority: 'medium',
        dependencies: [3]
      },
      {
        title: 'Stairs Construction',
        description: 'Build and install deck stairs with stringers',
        estimated_hours: 16,
        priority: 'medium',
        dependencies: [4]
      },
      {
        title: 'Railing Installation',
        description: 'Install posts, rails, and balusters per code',
        estimated_hours: 20,
        priority: 'high',
        dependencies: [4, 5]
      },
      {
        title: 'Staining/Sealing',
        description: 'Apply stain and weather sealant to all wood surfaces',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Final Inspection',
        description: 'Building inspector final inspection and approval',
        estimated_hours: 4,
        priority: 'critical',
        dependencies: [7]
      }
    ]
  },

  // ROOF REPLACEMENT
  {
    id: 'residential-roof-replacement',
    name: 'Roof Replacement',
    description: 'Complete roof tear-off and replacement',
    category: 'residential',
    icon: '🏠',
    tasks: [
      {
        title: 'Obtain Permits & Order Materials',
        description: 'Get roofing permit, order shingles, underlayment, and supplies',
        estimated_hours: 4,
        priority: 'critical'
      },
      {
        title: 'Protect Landscaping & Property',
        description: 'Cover plants, set up dumpster, protect driveway',
        estimated_hours: 2,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Tear Off Old Roofing',
        description: 'Remove old shingles, underlayment, inspect decking',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Replace Damaged Decking',
        description: 'Replace any rotted or damaged roof sheathing',
        estimated_hours: 8,
        priority: 'critical',
        dependencies: [2]
      },
      {
        title: 'Install Underlayment & Drip Edge',
        description: 'Install ice & water shield, felt paper, drip edge',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [3]
      },
      {
        title: 'Install Shingles',
        description: 'Install architectural shingles per manufacturer specs',
        estimated_hours: 24,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Ridge Vent & Flashing',
        description: 'Install ridge vent, chimney & pipe flashings',
        estimated_hours: 6,
        priority: 'high',
        dependencies: [5]
      },
      {
        title: 'Cleanup & Inspection',
        description: 'Magnet sweep, remove debris, final inspection',
        estimated_hours: 4,
        priority: 'high',
        dependencies: [6]
      }
    ]
  },

  // BASEMENT FINISHING
  {
    id: 'residential-basement-finish',
    name: 'Basement Finishing',
    description: 'Convert unfinished basement to living space',
    category: 'residential',
    icon: '🔨',
    tasks: [
      {
        title: 'Design & Permits',
        description: 'Create layout plan, obtain building permit',
        estimated_hours: 16,
        priority: 'critical'
      },
      {
        title: 'Waterproofing & Drainage',
        description: 'Address moisture issues, install sump pump if needed',
        estimated_hours: 24,
        priority: 'critical',
        dependencies: [0]
      },
      {
        title: 'Rough Framing',
        description: 'Frame walls, install furring strips on concrete',
        estimated_hours: 48,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Rough Electrical',
        description: 'Install wiring, outlets, switches, lighting circuits',
        estimated_hours: 32,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Rough Plumbing (if applicable)',
        description: 'Install bathroom or wet bar plumbing',
        estimated_hours: 24,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Insulation',
        description: 'Install insulation in walls and rim joists',
        estimated_hours: 16,
        priority: 'medium',
        dependencies: [3, 4]
      },
      {
        title: 'Drywall Installation',
        description: 'Hang and finish drywall on walls and ceilings',
        estimated_hours: 48,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Flooring Installation',
        description: 'Install subflooring and finish flooring',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Doors & Trim',
        description: 'Install doors, baseboards, and trim work',
        estimated_hours: 24,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Painting',
        description: 'Prime and paint all surfaces',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [8]
      },
      {
        title: 'Final Electrical & Plumbing',
        description: 'Install fixtures, outlets, switches',
        estimated_hours: 16,
        priority: 'medium',
        dependencies: [9]
      },
      {
        title: 'Final Inspection',
        description: 'Building inspection and certificate',
        estimated_hours: 4,
        priority: 'critical',
        dependencies: [10]
      }
    ]
  },

  // CONCRETE FLATWORK
  {
    id: 'infrastructure-concrete-flatwork',
    name: 'Concrete Driveway/Patio',
    description: 'Pour concrete driveway, patio, or walkway',
    category: 'infrastructure',
    icon: '🚧',
    tasks: [
      {
        title: 'Site Layout & Excavation',
        description: 'Mark area, excavate to proper depth, check grade',
        estimated_hours: 12,
        priority: 'high'
      },
      {
        title: 'Install Forms',
        description: 'Build forms to proper elevation and grade',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Gravel Base & Compaction',
        description: 'Install and compact gravel base material',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Install Rebar & Wire Mesh',
        description: 'Install reinforcement per specifications',
        estimated_hours: 6,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Pour Concrete',
        description: 'Order and pour concrete, screed to proper grade',
        estimated_hours: 12,
        priority: 'critical',
        dependencies: [3]
      },
      {
        title: 'Finishing',
        description: 'Float, trowel, broom finish concrete surface',
        estimated_hours: 8,
        priority: 'critical',
        dependencies: [4]
      },
      {
        title: 'Control Joints & Edging',
        description: 'Cut control joints, edge perimeter',
        estimated_hours: 4,
        priority: 'high',
        dependencies: [5]
      },
      {
        title: 'Curing & Protection',
        description: 'Apply curing compound, protect from traffic',
        estimated_hours: 2,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Form Removal & Backfill',
        description: 'Remove forms after curing, backfill edges',
        estimated_hours: 6,
        priority: 'low',
        dependencies: [7]
      }
    ]
  },

  // HVAC SYSTEM REPLACEMENT
  {
    id: 'residential-hvac-replacement',
    name: 'HVAC System Replacement',
    description: 'Replace heating and cooling system',
    category: 'residential',
    icon: '❄️',
    tasks: [
      {
        title: 'System Assessment & Sizing',
        description: 'Calculate load requirements, select equipment',
        estimated_hours: 4,
        priority: 'critical'
      },
      {
        title: 'Obtain Permits',
        description: 'Get mechanical permit from building department',
        estimated_hours: 2,
        priority: 'critical',
        dependencies: [0]
      },
      {
        title: 'Remove Old Equipment',
        description: 'Disconnect and remove old furnace/AC unit',
        estimated_hours: 6,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Install New Furnace',
        description: 'Position and install new furnace, connect gas/electric',
        estimated_hours: 12,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Install New Condenser Unit',
        description: 'Set outdoor AC unit, connect refrigerant lines',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Ductwork Modifications',
        description: 'Modify or repair ductwork as needed',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [3, 4]
      },
      {
        title: 'Install Thermostat',
        description: 'Install and program new thermostat',
        estimated_hours: 2,
        priority: 'medium',
        dependencies: [3]
      },
      {
        title: 'System Testing & Balancing',
        description: 'Test system operation, balance airflow',
        estimated_hours: 4,
        priority: 'critical',
        dependencies: [5, 6]
      },
      {
        title: 'Final Inspection',
        description: 'Mechanical inspection and approval',
        estimated_hours: 2,
        priority: 'critical',
        dependencies: [7]
      }
    ]
  },

  // FENCE INSTALLATION
  {
    id: 'residential-fence',
    name: 'Fence Installation',
    description: 'Install privacy or decorative fence',
    category: 'residential',
    icon: '🪵',
    tasks: [
      {
        title: 'Property Survey & Layout',
        description: 'Verify property lines, mark fence line, call 811',
        estimated_hours: 4,
        priority: 'critical'
      },
      {
        title: 'Permits & HOA Approval',
        description: 'Obtain necessary permits and approvals',
        estimated_hours: 2,
        priority: 'critical',
        dependencies: [0]
      },
      {
        title: 'Dig Post Holes',
        description: 'Dig holes for posts at proper spacing',
        estimated_hours: 12,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Set Posts in Concrete',
        description: 'Set posts, plumb and brace, pour concrete',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Install Rails',
        description: 'Install top and bottom rails between posts',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [3]
      },
      {
        title: 'Install Pickets/Panels',
        description: 'Attach fence pickets or panels to rails',
        estimated_hours: 20,
        priority: 'medium',
        dependencies: [4]
      },
      {
        title: 'Install Gate',
        description: 'Hang gate, install hardware and latch',
        estimated_hours: 4,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Staining/Sealing',
        description: 'Apply stain or sealant to wood fence',
        estimated_hours: 12,
        priority: 'low',
        dependencies: [6]
      }
    ]
  },

  // WINDOW REPLACEMENT
  {
    id: 'residential-window-replacement',
    name: 'Window Replacement',
    description: 'Replace old windows with new energy-efficient units',
    category: 'renovation',
    icon: '🪟',
    tasks: [
      {
        title: 'Measure & Order Windows',
        description: 'Measure all openings, order custom windows',
        estimated_hours: 8,
        priority: 'critical'
      },
      {
        title: 'Interior Preparation',
        description: 'Remove window treatments, protect floors',
        estimated_hours: 4,
        priority: 'medium',
        dependencies: [0]
      },
      {
        title: 'Remove Old Windows',
        description: 'Carefully remove old windows and trim',
        estimated_hours: 12,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Inspect & Prep Openings',
        description: 'Check for rot, repair framing, ensure square',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Install New Windows',
        description: 'Set windows, shim, level, and secure',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [3]
      },
      {
        title: 'Air Sealing & Insulation',
        description: 'Spray foam gaps, install insulation',
        estimated_hours: 6,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Install Interior Trim',
        description: 'Install window casings and sills',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Install Exterior Trim',
        description: 'Install brick mold or exterior casing',
        estimated_hours: 10,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Caulking & Painting',
        description: 'Caulk all joints, prime and paint trim',
        estimated_hours: 12,
        priority: 'medium',
        dependencies: [6, 7]
      }
    ]
  },

  // ELECTRICAL PANEL UPGRADE
  {
    id: 'residential-electrical-panel',
    name: 'Electrical Panel Upgrade',
    description: 'Upgrade electrical service and panel',
    category: 'residential',
    icon: '⚡',
    tasks: [
      {
        title: 'Electrical Assessment',
        description: 'Assess current service, plan new panel location',
        estimated_hours: 4,
        priority: 'critical'
      },
      {
        title: 'Obtain Permits',
        description: 'Get electrical permit and utility approval',
        estimated_hours: 4,
        priority: 'critical',
        dependencies: [0]
      },
      {
        title: 'Coordinate Utility Disconnect',
        description: 'Schedule power company service disconnect',
        estimated_hours: 2,
        priority: 'critical',
        dependencies: [1]
      },
      {
        title: 'Install New Service Entry',
        description: 'Install new weather head and service entry cable',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Install New Panel',
        description: 'Mount and install new electrical panel',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [3]
      },
      {
        title: 'Transfer Circuits',
        description: 'Transfer all circuits to new panel',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Install GFCI/AFCI Protection',
        description: 'Install required code-compliant breakers',
        estimated_hours: 4,
        priority: 'critical',
        dependencies: [5]
      },
      {
        title: 'Testing & Labeling',
        description: 'Test all circuits, label panel accurately',
        estimated_hours: 4,
        priority: 'high',
        dependencies: [6]
      },
      {
        title: 'Final Inspection',
        description: 'Electrical inspector final approval',
        estimated_hours: 2,
        priority: 'critical',
        dependencies: [7]
      },
      {
        title: 'Utility Reconnection',
        description: 'Power company connects new service',
        estimated_hours: 2,
        priority: 'critical',
        dependencies: [8]
      }
    ]
  },

  // SIDING REPLACEMENT
  {
    id: 'residential-siding',
    name: 'Siding Replacement',
    description: 'Replace exterior siding',
    category: 'residential',
    icon: '🏘️',
    tasks: [
      {
        title: 'Material Selection & Ordering',
        description: 'Select siding type, order materials',
        estimated_hours: 8,
        priority: 'critical'
      },
      {
        title: 'Protection & Setup',
        description: 'Protect landscaping, set up scaffolding',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Remove Old Siding',
        description: 'Remove existing siding, inspect sheathing',
        estimated_hours: 24,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Sheathing Repairs',
        description: 'Replace damaged sheathing, add if needed',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Install House Wrap',
        description: 'Install weather-resistant barrier',
        estimated_hours: 12,
        priority: 'high',
        dependencies: [3]
      },
      {
        title: 'Install Trim & Flashing',
        description: 'Install corners, J-channel, window flashing',
        estimated_hours: 20,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Install Siding',
        description: 'Install siding per manufacturer instructions',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [5]
      },
      {
        title: 'Caulking & Touch-ups',
        description: 'Caulk joints, paint trim if needed',
        estimated_hours: 8,
        priority: 'medium',
        dependencies: [6]
      },
      {
        title: 'Cleanup & Final Inspection',
        description: 'Clean site, final walkthrough',
        estimated_hours: 4,
        priority: 'medium',
        dependencies: [7]
      }
    ]
  },

  // COMMERCIAL STOREFRONT
  {
    id: 'commercial-storefront',
    name: 'Retail Storefront Build-Out',
    description: 'Build-out for retail store',
    category: 'commercial',
    icon: '🏪',
    tasks: [
      {
        title: 'Design & Permitting',
        description: 'Create layout, get permits and landlord approval',
        estimated_hours: 40,
        priority: 'critical'
      },
      {
        title: 'Demolition',
        description: 'Remove existing fixtures, walls, flooring',
        estimated_hours: 32,
        priority: 'high',
        dependencies: [0]
      },
      {
        title: 'Electrical Rough-In',
        description: 'Install new circuits for retail requirements',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'HVAC Modifications',
        description: 'Install or modify HVAC for retail space',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Plumbing (if needed)',
        description: 'Install restroom or break room plumbing',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [1]
      },
      {
        title: 'Framing & Drywall',
        description: 'Build walls, install drywall',
        estimated_hours: 60,
        priority: 'medium',
        dependencies: [2, 3, 4]
      },
      {
        title: 'Flooring Installation',
        description: 'Install retail flooring (LVT, tile, or polished concrete)',
        estimated_hours: 48,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Storefront Installation',
        description: 'Install front entrance doors and windows',
        estimated_hours: 24,
        priority: 'high',
        dependencies: [5]
      },
      {
        title: 'Ceiling Work',
        description: 'Install ceiling tiles or exposed ceiling treatment',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [5]
      },
      {
        title: 'Painting & Finishes',
        description: 'Paint walls, install accent features',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [8]
      },
      {
        title: 'Lighting Installation',
        description: 'Install track lighting, display lighting, signage',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [8, 9]
      },
      {
        title: 'Fixtures & Millwork',
        description: 'Install display fixtures, checkout counter, shelving',
        estimated_hours: 40,
        priority: 'medium',
        dependencies: [6, 9]
      },
      {
        title: 'Signage Installation',
        description: 'Install exterior and interior signage',
        estimated_hours: 16,
        priority: 'medium',
        dependencies: [11]
      },
      {
        title: 'Final Inspection & Occupancy',
        description: 'Complete inspections, obtain certificate of occupancy',
        estimated_hours: 8,
        priority: 'critical',
        dependencies: [12]
      }
    ]
  },

  // PARKING LOT CONSTRUCTION
  {
    id: 'infrastructure-parking-lot',
    name: 'Parking Lot Construction',
    description: 'Build new asphalt parking lot',
    category: 'infrastructure',
    icon: '🅿️',
    tasks: [
      {
        title: 'Site Survey & Design',
        description: 'Survey site, design layout, calculate drainage',
        estimated_hours: 24,
        priority: 'critical'
      },
      {
        title: 'Permits & Approvals',
        description: 'Obtain permits, stormwater approval, ADA compliance',
        estimated_hours: 16,
        priority: 'critical',
        dependencies: [0]
      },
      {
        title: 'Demolition & Clearing',
        description: 'Remove existing pavement, clear vegetation',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [1]
      },
      {
        title: 'Excavation & Grading',
        description: 'Excavate to proper depth, establish grades',
        estimated_hours: 60,
        priority: 'high',
        dependencies: [2]
      },
      {
        title: 'Utility Installation',
        description: 'Install stormwater drains, light pole conduits',
        estimated_hours: 48,
        priority: 'high',
        dependencies: [3]
      },
      {
        title: 'Base Course Installation',
        description: 'Install and compact aggregate base',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [4]
      },
      {
        title: 'Asphalt Paving - Base Layer',
        description: 'Pave base asphalt layer',
        estimated_hours: 32,
        priority: 'critical',
        dependencies: [5]
      },
      {
        title: 'Asphalt Paving - Top Layer',
        description: 'Pave wearing course asphalt',
        estimated_hours: 32,
        priority: 'critical',
        dependencies: [6]
      },
      {
        title: 'Curb & Sidewalk Installation',
        description: 'Pour concrete curbs and sidewalks',
        estimated_hours: 40,
        priority: 'high',
        dependencies: [7]
      },
      {
        title: 'Striping & Signage',
        description: 'Paint parking lines, install ADA signage',
        estimated_hours: 16,
        priority: 'high',
        dependencies: [8]
      },
      {
        title: 'Lighting Installation',
        description: 'Install parking lot light poles and fixtures',
        estimated_hours: 32,
        priority: 'medium',
        dependencies: [8]
      },
      {
        title: 'Landscaping & Cleanup',
        description: 'Install landscape islands, final cleanup',
        estimated_hours: 24,
        priority: 'low',
        dependencies: [9, 10]
      }
    ]
  },

  // GENERAL PUNCH LIST
  {
    id: 'general-punch-list',
    name: 'Final Punch List',
    description: 'Standard punch list items for project completion',
    category: 'general',
    icon: '✅',
    tasks: [
      {
        title: 'Touch-Up Paint',
        description: 'Touch up any scratches, marks, or missed spots in paint',
        estimated_hours: 4,
        priority: 'medium'
      },
      {
        title: 'Caulking & Sealing',
        description: 'Caulk all joints, seams, and penetrations',
        estimated_hours: 6,
        priority: 'medium'
      },
      {
        title: 'Hardware Adjustment',
        description: 'Adjust all doors, windows, drawers for proper operation',
        estimated_hours: 4,
        priority: 'medium'
      },
      {
        title: 'Fixture Cleaning',
        description: 'Clean all plumbing fixtures, light fixtures, appliances',
        estimated_hours: 4,
        priority: 'low'
      },
      {
        title: 'Floor Protection Removal',
        description: 'Remove floor protection, clean and polish floors',
        estimated_hours: 6,
        priority: 'medium'
      },
      {
        title: 'Window Cleaning',
        description: 'Clean all interior and exterior windows',
        estimated_hours: 4,
        priority: 'low'
      },
      {
        title: 'Final Walkthrough',
        description: 'Complete client walkthrough, create final punch list',
        estimated_hours: 2,
        priority: 'high',
        dependencies: [0, 1, 2, 3, 4, 5]
      },
      {
        title: 'Address Punch List Items',
        description: 'Complete all items identified during walkthrough',
        estimated_hours: 8,
        priority: 'high',
        dependencies: [6]
      },
      {
        title: 'Final Documentation',
        description: 'Provide warranties, manuals, and as-built documentation',
        estimated_hours: 2,
        priority: 'medium',
        dependencies: [7]
      }
    ]
  }
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  if (category === 'all') return workflowTemplates
  return workflowTemplates.filter(t => t.category === category)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id)
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): Array<{ value: string; label: string }> {
  return [
    { value: 'all', label: 'All Templates' },
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'renovation', label: 'Renovation' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'general', label: 'General' }
  ]
}
