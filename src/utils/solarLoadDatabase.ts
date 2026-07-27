export interface LoadItem {
  name: string;
  defaultWatts: number;
  defaultHours: number;
}

export interface SubCategory {
  name: string;
  items: LoadItem[];
}

export interface MainCategory {
  name: string;
  subCategories: SubCategory[];
}

export const SOLAR_LOAD_DATABASE: MainCategory[] = [
  {
    name: 'Residential (Home) Loads',
    subCategories: [
      {
        name: 'Lighting',
        items: [
          { name: 'LED Bulbs', defaultWatts: 12, defaultHours: 6 },
          { name: 'Downlights', defaultWatts: 15, defaultHours: 5 },
          { name: 'Spotlights', defaultWatts: 20, defaultHours: 4 },
          { name: 'Strip Lights', defaultWatts: 24, defaultHours: 5 },
          { name: 'Chandeliers', defaultWatts: 150, defaultHours: 3 },
          { name: 'Pendant Lights', defaultWatts: 40, defaultHours: 5 },
          { name: 'Wall Lights', defaultWatts: 25, defaultHours: 6 },
          { name: 'Ceiling Lights', defaultWatts: 35, defaultHours: 5 },
          { name: 'Track Lights', defaultWatts: 60, defaultHours: 4 },
          { name: 'Garden Lights', defaultWatts: 18, defaultHours: 10 },
          { name: 'Floodlights', defaultWatts: 150, defaultHours: 10 },
          { name: 'Security Lights', defaultWatts: 50, defaultHours: 12 },
          { name: 'Emergency Lights', defaultWatts: 8, defaultHours: 4 },
          { name: 'Decorative Lights', defaultWatts: 30, defaultHours: 5 },
          { name: 'Stair Lights', defaultWatts: 6, defaultHours: 12 },
        ]
      },
      {
        name: 'Kitchen Appliances',
        items: [
          { name: 'Refrigerator', defaultWatts: 200, defaultHours: 24 },
          { name: 'Freezer', defaultWatts: 250, defaultHours: 24 },
          { name: 'Microwave Oven', defaultWatts: 1200, defaultHours: 0.5 },
          { name: 'Electric Oven', defaultWatts: 2400, defaultHours: 1 },
          { name: 'Electric Cooker', defaultWatts: 3000, defaultHours: 1 },
          { name: 'Induction Cooker', defaultWatts: 2000, defaultHours: 1 },
          { name: 'Gas Cooker Ignition', defaultWatts: 20, defaultHours: 0.1 },
          { name: 'Electric Kettle', defaultWatts: 1800, defaultHours: 0.3 },
          { name: 'Toaster', defaultWatts: 850, defaultHours: 0.1 },
          { name: 'Blender', defaultWatts: 400, defaultHours: 0.1 },
          { name: 'Mixer', defaultWatts: 300, defaultHours: 0.2 },
          { name: 'Food Processor', defaultWatts: 600, defaultHours: 0.2 },
          { name: 'Coffee Machine', defaultWatts: 1200, defaultHours: 0.3 },
          { name: 'Espresso Machine', defaultWatts: 1450, defaultHours: 0.3 },
          { name: 'Rice Cooker', defaultWatts: 650, defaultHours: 0.8 },
          { name: 'Air Fryer', defaultWatts: 1500, defaultHours: 0.5 },
          { name: 'Dishwasher', defaultWatts: 1500, defaultHours: 1.5 },
          { name: 'Range Hood', defaultWatts: 180, defaultHours: 2 },
          { name: 'Water Dispenser', defaultWatts: 550, defaultHours: 8 },
        ]
      },
      {
        name: 'Laundry',
        items: [
          { name: 'Washing Machine', defaultWatts: 800, defaultHours: 1 },
          { name: 'Clothes Dryer', defaultWatts: 2500, defaultHours: 1.5 },
          { name: 'Steam Iron', defaultWatts: 1800, defaultHours: 0.5 },
          { name: 'Garment Steamer', defaultWatts: 1500, defaultHours: 0.5 },
        ]
      },
      {
        name: 'Heating & Cooling',
        items: [
          { name: 'Air Conditioner', defaultWatts: 1500, defaultHours: 6 },
          { name: 'Ceiling Fan', defaultWatts: 75, defaultHours: 8 },
          { name: 'Standing Fan', defaultWatts: 60, defaultHours: 8 },
          { name: 'Wall Fan', defaultWatts: 55, defaultHours: 8 },
          { name: 'Exhaust Fan', defaultWatts: 40, defaultHours: 4 },
          { name: 'Water Heater', defaultWatts: 2000, defaultHours: 2 },
          { name: 'Heat Pump', defaultWatts: 4000, defaultHours: 5 },
          { name: 'Electric Heater', defaultWatts: 1500, defaultHours: 4 },
        ]
      },
      {
        name: 'Entertainment',
        items: [
          { name: 'Television', defaultWatts: 120, defaultHours: 5 },
          { name: 'Home Theatre', defaultWatts: 250, defaultHours: 3 },
          { name: 'Sound System', defaultWatts: 150, defaultHours: 4 },
          { name: 'Gaming Console', defaultWatts: 200, defaultHours: 2 },
          { name: 'Projector', defaultWatts: 280, defaultHours: 3 },
          { name: 'Streaming Device', defaultWatts: 15, defaultHours: 6 },
        ]
      },
      {
        name: 'Office & IT',
        items: [
          { name: 'Laptop', defaultWatts: 65, defaultHours: 8 },
          { name: 'Desktop Computer', defaultWatts: 250, defaultHours: 8 },
          { name: 'Monitor', defaultWatts: 40, defaultHours: 8 },
          { name: 'Printer', defaultWatts: 450, defaultHours: 0.5 },
          { name: 'Scanner', defaultWatts: 50, defaultHours: 0.5 },
          { name: 'Wi-Fi Router', defaultWatts: 15, defaultHours: 24 },
          { name: 'Network Switch', defaultWatts: 25, defaultHours: 24 },
          { name: 'NAS Storage', defaultWatts: 60, defaultHours: 24 },
          { name: 'UPS', defaultWatts: 50, defaultHours: 24 },
        ]
      },
      {
        name: 'Bathroom',
        items: [
          { name: 'Hair Dryer', defaultWatts: 1800, defaultHours: 0.2 },
          { name: 'Hair Clipper', defaultWatts: 15, defaultHours: 0.2 },
          { name: 'Electric Toothbrush Charger', defaultWatts: 5, defaultHours: 2 },
          { name: 'Shaver', defaultWatts: 10, defaultHours: 0.1 },
          { name: 'Jacuzzi Pump', defaultWatts: 1200, defaultHours: 1 },
        ]
      },
      {
        name: 'Cleaning',
        items: [
          { name: 'Vacuum Cleaner', defaultWatts: 1200, defaultHours: 0.5 },
          { name: 'Robot Vacuum', defaultWatts: 50, defaultHours: 2 },
          { name: 'Pressure Washer', defaultWatts: 1800, defaultHours: 0.5 },
        ]
      },
      {
        name: 'Water Systems',
        items: [
          { name: 'Borehole Pump', defaultWatts: 1500, defaultHours: 2 },
          { name: 'Surface Pump', defaultWatts: 750, defaultHours: 2 },
          { name: 'Submersible Pump', defaultWatts: 1100, defaultHours: 2 },
          { name: 'Water Purifier', defaultWatts: 60, defaultHours: 4 },
          { name: 'Pressure Pump', defaultWatts: 370, defaultHours: 3 },
        ]
      },
      {
        name: 'Security & Smart Home',
        items: [
          { name: 'CCTV System', defaultWatts: 80, defaultHours: 24 },
          { name: 'DVR/NVR', defaultWatts: 40, defaultHours: 24 },
          { name: 'Alarm System', defaultWatts: 15, defaultHours: 24 },
          { name: 'Video Doorbell', defaultWatts: 10, defaultHours: 24 },
          { name: 'Smart Hub', defaultWatts: 8, defaultHours: 24 },
          { name: 'Smart Lock', defaultWatts: 5, defaultHours: 24 },
          { name: 'Access Control', defaultWatts: 30, defaultHours: 24 },
          { name: 'Gate Motor', defaultWatts: 350, defaultHours: 0.2 },
          { name: 'Intercom', defaultWatts: 15, defaultHours: 24 },
        ]
      },
      {
        name: 'Miscellaneous',
        items: [
          { name: 'Phone Charger', defaultWatts: 15, defaultHours: 3 },
          { name: 'Tablet Charger', defaultWatts: 25, defaultHours: 3 },
          { name: 'Power Bank Charger', defaultWatts: 40, defaultHours: 4 },
          { name: 'Aquarium Pump', defaultWatts: 15, defaultHours: 24 },
          { name: 'Aquarium Heater', defaultWatts: 100, defaultHours: 12 },
          { name: 'Sewing Machine', defaultWatts: 100, defaultHours: 2 },
          { name: 'Treadmill', defaultWatts: 1500, defaultHours: 1 },
          { name: 'Exercise Bike', defaultWatts: 50, defaultHours: 1 },
        ]
      },
    ]
  },
  {
    name: 'Commercial Loads',
    subCategories: [
      {
        name: 'Office Equipment',
        items: [
          { name: 'Computers', defaultWatts: 250, defaultHours: 8 },
          { name: 'Servers', defaultWatts: 500, defaultHours: 24 },
          { name: 'Printers', defaultWatts: 600, defaultHours: 1 },
          { name: 'Photocopiers', defaultWatts: 1200, defaultHours: 1 },
          { name: 'Network Equipment', defaultWatts: 150, defaultHours: 24 },
          { name: 'Projectors', defaultWatts: 300, defaultHours: 4 },
          { name: 'Video Conferencing Systems', defaultWatts: 200, defaultHours: 4 },
        ]
      },
      {
        name: 'Retail',
        items: [
          { name: 'POS Systems', defaultWatts: 150, defaultHours: 10 },
          { name: 'Barcode Scanners', defaultWatts: 15, defaultHours: 10 },
          { name: 'Receipt Printers', defaultWatts: 60, defaultHours: 2 },
          { name: 'Display Lighting', defaultWatts: 500, defaultHours: 12 },
          { name: 'Refrigerated Display Cases', defaultWatts: 1200, defaultHours: 24 },
          { name: 'Electronic Shelving', defaultWatts: 50, defaultHours: 24 },
        ]
      },
      {
        name: 'Hospitality',
        items: [
          { name: 'Ice Makers', defaultWatts: 1200, defaultHours: 12 },
          { name: 'Beverage Coolers', defaultWatts: 450, defaultHours: 24 },
          { name: 'Commercial Refrigerators', defaultWatts: 800, defaultHours: 24 },
          { name: 'Commercial Freezers', defaultWatts: 1200, defaultHours: 24 },
          { name: 'Coffee Machines', defaultWatts: 2400, defaultHours: 6 },
          { name: 'Dishwashers', defaultWatts: 3000, defaultHours: 5 },
          { name: 'Exhaust Systems', defaultWatts: 1500, defaultHours: 12 },
        ]
      }
    ]
  },
  {
    name: 'Industrial Loads',
    subCategories: [
      {
        name: 'Electric Motors',
        items: [
          { name: 'Induction Motors', defaultWatts: 5500, defaultHours: 8 },
          { name: 'Synchronous Motors', defaultWatts: 7500, defaultHours: 8 },
          { name: 'Servo Motors', defaultWatts: 1500, defaultHours: 6 },
          { name: 'DC Motors', defaultWatts: 2200, defaultHours: 8 },
          { name: 'Gear Motors', defaultWatts: 750, defaultHours: 8 },
          { name: 'Stepper Motors', defaultWatts: 150, defaultHours: 10 },
        ]
      },
      {
        name: 'Pumps',
        items: [
          { name: 'Centrifugal Pumps', defaultWatts: 3700, defaultHours: 6 },
          { name: 'Booster Pumps', defaultWatts: 2200, defaultHours: 6 },
          { name: 'Chemical Pumps', defaultWatts: 1500, defaultHours: 4 },
          { name: 'Slurry Pumps', defaultWatts: 7500, defaultHours: 6 },
          { name: 'Fire Pumps', defaultWatts: 11000, defaultHours: 0.5 },
          { name: 'Vacuum Pumps', defaultWatts: 2200, defaultHours: 8 },
          { name: 'Dosing Pumps', defaultWatts: 370, defaultHours: 12 },
        ]
      },
      {
        name: 'Compressors',
        items: [
          { name: 'Air Compressors', defaultWatts: 4000, defaultHours: 6 },
          { name: 'Refrigeration Compressors', defaultWatts: 5500, defaultHours: 12 },
          { name: 'Gas Compressors', defaultWatts: 15000, defaultHours: 8 },
          { name: 'Screw Compressors', defaultWatts: 11000, defaultHours: 8 },
          { name: 'Rotary Compressors', defaultWatts: 3000, defaultHours: 8 },
        ]
      },
      {
        name: 'Fans & Ventilation',
        items: [
          { name: 'Industrial Fans', defaultWatts: 1500, defaultHours: 12 },
          { name: 'Exhaust Fans', defaultWatts: 750, defaultHours: 12 },
          { name: 'Cooling Tower Fans', defaultWatts: 3700, defaultHours: 12 },
          { name: 'Blowers', defaultWatts: 2200, defaultHours: 8 },
          { name: 'Dust Extractors', defaultWatts: 4000, defaultHours: 8 },
        ]
      },
      {
        name: 'Conveying Equipment',
        items: [
          { name: 'Conveyor Belts', defaultWatts: 3000, defaultHours: 10 },
          { name: 'Roller Conveyors', defaultWatts: 1500, defaultHours: 8 },
          { name: 'Chain Conveyors', defaultWatts: 4000, defaultHours: 8 },
          { name: 'Screw Conveyors', defaultWatts: 2200, defaultHours: 6 },
          { name: 'Bucket Elevators', defaultWatts: 5500, defaultHours: 8 },
        ]
      },
      {
        name: 'Manufacturing Equipment',
        items: [
          { name: 'CNC Machines', defaultWatts: 15000, defaultHours: 8 },
          { name: 'Lathes', defaultWatts: 5500, defaultHours: 8 },
          { name: 'Milling Machines', defaultWatts: 7500, defaultHours: 8 },
          { name: 'Drilling Machines', defaultWatts: 1500, defaultHours: 4 },
          { name: 'Grinding Machines', defaultWatts: 3000, defaultHours: 6 },
          { name: 'Press Machines', defaultWatts: 11000, defaultHours: 8 },
          { name: 'Injection Molding Machines', defaultWatts: 22000, defaultHours: 12 },
          { name: 'Extruders', defaultWatts: 30000, defaultHours: 12 },
          { name: 'Packaging Machines', defaultWatts: 4000, defaultHours: 10 },
          { name: 'Printing Machines', defaultWatts: 7500, defaultHours: 8 },
        ]
      },
      {
        name: 'Welding & Cutting',
        items: [
          { name: 'Arc Welders', defaultWatts: 8000, defaultHours: 3 },
          { name: 'MIG Welders', defaultWatts: 10000, defaultHours: 3 },
          { name: 'TIG Welders', defaultWatts: 9000, defaultHours: 3 },
          { name: 'Spot Welders', defaultWatts: 15000, defaultHours: 1 },
          { name: 'Plasma Cutters', defaultWatts: 12000, defaultHours: 2 },
          { name: 'Laser Cutters', defaultWatts: 20000, defaultHours: 4 },
        ]
      },
      {
        name: 'HVAC',
        items: [
          { name: 'Chillers', defaultWatts: 45000, defaultHours: 12 },
          { name: 'Cooling Towers', defaultWatts: 7500, defaultHours: 12 },
          { name: 'AHUs', defaultWatts: 5500, defaultHours: 12 },
          { name: 'FCUs', defaultWatts: 180, defaultHours: 12 },
          { name: 'Industrial Air Conditioners', defaultWatts: 15000, defaultHours: 10 },
          { name: 'Industrial Heaters', defaultWatts: 24000, defaultHours: 8 },
        ]
      },
      {
        name: 'Material Handling',
        items: [
          { name: 'Cranes', defaultWatts: 18000, defaultHours: 4 },
          { name: 'Hoists', defaultWatts: 3700, defaultHours: 3 },
          { name: 'Forklift Chargers', defaultWatts: 5000, defaultHours: 8 },
          { name: 'Elevators', defaultWatts: 15000, defaultHours: 6 },
          { name: 'Escalators', defaultWatts: 7500, defaultHours: 14 },
        ]
      },
      {
        name: 'Processing Equipment',
        items: [
          { name: 'Mixers', defaultWatts: 5500, defaultHours: 6 },
          { name: 'Crushers', defaultWatts: 22000, defaultHours: 4 },
          { name: 'Grinders', defaultWatts: 11000, defaultHours: 6 },
          { name: 'Pulverizes', defaultWatts: 15000, defaultHours: 4 },
          { name: 'Dryers', defaultWatts: 18000, defaultHours: 8 },
          { name: 'Ovens', defaultWatts: 24000, defaultHours: 6 },
          { name: 'Furnaces', defaultWatts: 45000, defaultHours: 8 },
          { name: 'Kilns', defaultWatts: 55000, defaultHours: 12 },
        ]
      },
      {
        name: 'Water & Wastewater',
        items: [
          { name: 'Treatment Plants', defaultWatts: 30000, defaultHours: 24 },
          { name: 'Clarifiers', defaultWatts: 3700, defaultHours: 24 },
          { name: 'Aerators', defaultWatts: 11000, defaultHours: 24 },
          { name: 'Sludge Pumps', defaultWatts: 7500, defaultHours: 12 },
          { name: 'UV Sterilizers', defaultWatts: 1200, defaultHours: 24 },
        ]
      },
      {
        name: 'Electrical Infrastructure',
        items: [
          { name: 'Transformers', defaultWatts: 1500, defaultHours: 24 },
          { name: 'Battery Chargers', defaultWatts: 3000, defaultHours: 8 },
          { name: 'UPS Systems', defaultWatts: 1000, defaultHours: 24 },
          { name: 'Rectifiers', defaultWatts: 5000, defaultHours: 12 },
          { name: 'Inverters', defaultWatts: 500, defaultHours: 24 },
          { name: 'Capacitor Banks', defaultWatts: 200, defaultHours: 24 },
          { name: 'Voltage Stabilizers', defaultWatts: 400, defaultHours: 24 },
        ]
      },
      {
        name: 'Safety & Utility',
        items: [
          { name: 'Fire Alarm System', defaultWatts: 100, defaultHours: 24 },
          { name: 'Emergency Lighting', defaultWatts: 500, defaultHours: 24 },
          { name: 'Smoke Extraction Fans', defaultWatts: 15000, defaultHours: 0.5 },
          { name: 'Access Control System', defaultWatts: 250, defaultHours: 24 },
          { name: 'CCTV System', defaultWatts: 600, defaultHours: 24 },
          { name: 'PA System', defaultWatts: 300, defaultHours: 24 },
          { name: 'Lightning Protection Monitoring', defaultWatts: 50, defaultHours: 24 },
        ]
      },
      {
        name: 'Renewable Energy',
        items: [
          { name: 'Solar Inverters', defaultWatts: 150, defaultHours: 24 },
          { name: 'Battery Energy Storage Systems (BESS)', defaultWatts: 500, defaultHours: 24 },
          { name: 'EV Chargers', defaultWatts: 7400, defaultHours: 4 },
          { name: 'Wind Turbine Controllers', defaultWatts: 300, defaultHours: 24 },
          { name: 'Solar Tracking Systems', defaultWatts: 100, defaultHours: 10 },
        ]
      }
    ]
  }
];
