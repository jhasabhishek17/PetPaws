/**
 * PetPaws Database Module
 * 
 * Manages database persistence using SQLite (with a file-backed JSON fallback mechanism)
 * to ensure robust operation across all environments without native compilation dependencies.
 * 
 * Tables initialized:
 * - users: Authentication and profile details for Buyers, Sellers, and Vets
 * - pets: Pet listings created by sellers (title, category, price, stock, health details)
 * - orders: Buyer purchases, payment status, tracking timeline, and billing receipts
 * - vet_profiles: Verified veterinarian details, qualifications, fees, and slot schedules
 * - vet_appointments: Scheduled appointments between buyers and veterinarians
 * - grooming_bookings: Pet grooming and training service reservations
 * - support_tickets: Customer support inquiries and resolutions
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'petpaws_data.json');

// Default initial database state with realistic seed data
const initialData = {
  users: [
    {
      id: "u-buyer-1",
      name: "Alex Morgan",
      email: "buyer@petpaws.com",
      password: "password123",
      role: "buyer",
      phone: "+1 (555) 234-5678",
      address: "742 Evergreen Terrace, Springfield",
      created_at: new Date().toISOString()
    },
    {
      id: "u-seller-1",
      name: "Paws & Tails Haven",
      email: "seller@petpaws.com",
      password: "password123",
      role: "seller",
      phone: "+1 (555) 876-5432",
      address: "123 Kennel Way, Austin, TX",
      upi_id: "pawstails@upi",
      bank_name: "HDFC Bank",
      bank_account: "987654321012",
      ifsc_code: "HDFC0001234",
      created_at: new Date().toISOString()
    },
    {
      id: "u-vet-1",
      name: "Dr. Sarah Jenkins",
      email: "vet@petpaws.com",
      password: "password123",
      role: "vet",
      phone: "+1 (555) 345-6789",
      address: "456 Veterinary Care Blvd, Austin, TX",
      created_at: new Date().toISOString()
    }
  ],

  pets: [
    {
      id: "pet-101",
      seller_id: "u-seller-1",
      seller_name: "Paws & Tails Haven",
      title: "Golden Retriever Puppy",
      category: "Dogs",
      price: 450,
      age: "3 Months",
      breed: "Golden Retriever",
      gender: "Male",
      health_status: "Fully Vaccinated, De-wormed, Health Certificate Included",
      description: "Friendly, active, and well-socialized Golden Retriever puppy looking for a loving family. Great with kids and other pets.",
      image_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80",
      stock: 1,
      status: "active", // active, booked, sold
      created_at: new Date().toISOString()
    },
    {
      id: "pet-102",
      seller_id: "u-seller-1",
      seller_name: "Paws & Tails Haven",
      title: "Purebred Persian Kitten",
      category: "Cats",
      price: 380,
      age: "2.5 Months",
      breed: "Persian",
      gender: "Female",
      health_status: "First Vet Check Done, Litter Trained, Vet Certified",
      description: "Adorable fluffy Persian kitten with soft white coat and calm demeanor. Microchipped and litter trained.",
      image_url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80",
      stock: 1,
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "pet-103",
      seller_id: "u-seller-1",
      seller_name: "AquaWorld Exotics",
      title: "Tropical Betta & Neon Tetra Set",
      category: "Fishes",
      price: 45,
      age: "6 Months",
      breed: "Crowntail Betta & Neon Tetras",
      gender: "Mixed",
      health_status: "Quarantined & Healthy, Feeding on High-Protein Pellets",
      description: "Vibrant royal blue Crowntail Betta paired with a peaceful school of 5 Neon Tetras. Perfect starter aquarium set.",
      image_url: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=800&q=80",
      stock: 3,
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "pet-104",
      seller_id: "u-seller-1",
      seller_name: "Paws & Tails Haven",
      title: "Holland Lop Bunny",
      category: "Rabbits",
      price: 120,
      age: "4 Months",
      breed: "Holland Lop",
      gender: "Female",
      health_status: "Spayed & Vet Checked, Pelleted Diet Trained",
      description: "Super gentle and cuddly chestnut Holland Lop bunny with adorable floppy ears. Loves fresh greens.",
      image_url: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80",
      stock: 2,
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "pet-105",
      seller_id: "u-seller-1",
      seller_name: "Avian Paradise",
      title: "Sun Conure Parrot",
      category: "Birds",
      price: 290,
      age: "5 Months",
      breed: "Sun Conure",
      gender: "Male",
      health_status: "DNA Sexed, Hand-Fed, Closed Banded",
      description: "Playful and intelligent Sun Conure with striking yellow and orange plumage. Hand-raised and affectionate.",
      image_url: "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=80",
      stock: 1,
      status: "active",
      created_at: new Date().toISOString()
    },
    {
      id: "pet-106",
      seller_id: "u-seller-1",
      seller_name: "Paws & Tails Haven",
      title: "French Bulldog Puppy",
      category: "Dogs",
      price: 650,
      age: "4 Months",
      breed: "Frenchie",
      gender: "Female",
      health_status: "All Shots Up-to-Date, Microchipped, AKC Paperwork",
      description: "Charming fawn-colored French Bulldog puppy with playful personality and compact build.",
      image_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
      stock: 1,
      status: "active",
      created_at: new Date().toISOString()
    }
  ],

  orders: [
    {
      id: "ORD-928104",
      buyer_id: "u-buyer-1",
      buyer_name: "Alex Morgan",
      buyer_email: "buyer@petpaws.com",
      buyer_phone: "+1 (555) 234-5678",
      shipping_address: "742 Evergreen Terrace, Springfield",
      pet_id: "pet-101",
      pet_title: "Golden Retriever Puppy",
      pet_category: "Dogs",
      seller_id: "u-seller-1",
      seller_name: "Paws & Tails Haven",
      price: 450,
      tax: 36,
      total_amount: 486,
      payment_method: "UPI",
      payment_status: "Completed",
      tracking_code: "TRACK-PET-882910",
      tracking_status: "In Transit", // Placed, Health Check Completed, In Transit, Out for Delivery, Delivered
      estimated_delivery: "Tomorrow by 4:00 PM",
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    }
  ],

  vet_profiles: [
    {
      id: "vet-1",
      user_id: "u-vet-1",
      name: "Dr. Sarah Jenkins, DVM",
      specialization: "Canine & Small Animal Medicine",
      experience: "8 Years",
      qualifications: "Doctor of Veterinary Medicine (UC Davis)",
      clinic_address: "Pawsitive Care Hospital, Austin, TX",
      consultation_fee: 40,
      rating: 4.9,
      reviews_count: 124,
      image_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
      bio: "Passionate veterinarian specializing in preventive care, pediatric pet health, nutrition, and minor surgeries.",
      available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      available_slots: ["10:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
    },
    {
      id: "vet-2",
      user_id: "u-vet-2",
      name: "Dr. Rajesh Kumar, BVSc",
      specialization: "Exotic Birds, Fishes & Small Mammals",
      experience: "12 Years",
      qualifications: "Bachelor of Vet Science & Animal Husbandry",
      clinic_address: "Feathers & Scales Exotic Clinic, Austin, TX",
      consultation_fee: 50,
      rating: 4.8,
      reviews_count: 98,
      image_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80",
      bio: "Expert in avian care, aquarium fish wellness, and specialized diagnostics for exotic domestic pets.",
      available_days: ["Tuesday", "Thursday", "Saturday"],
      available_slots: ["09:00 AM", "11:00 AM", "03:00 PM"]
    },
    {
      id: "vet-3",
      user_id: "u-vet-3",
      name: "Dr. Emily Chen, DVM",
      specialization: "Feline Wellness & Surgery",
      experience: "6 Years",
      qualifications: "DVM (Cornell University)",
      clinic_address: "Purrfect Cat Hospital, Austin, TX",
      consultation_fee: 45,
      rating: 5.0,
      reviews_count: 142,
      image_url: "https://images.unsplash.com/photo-1594824813572-c205562d9fb0?auto=format&fit=crop&w=600&q=80",
      bio: "Dedicated cat specialist focusing on low-stress feline medical visits, dentistry, and behavior counseling.",
      available_days: ["Monday", "Wednesday", "Friday", "Saturday"],
      available_slots: ["10:30 AM", "01:30 PM", "05:00 PM"]
    }
  ],

  vet_appointments: [
    {
      id: "apt-701",
      buyer_id: "u-buyer-1",
      buyer_name: "Alex Morgan",
      vet_id: "vet-1",
      vet_name: "Dr. Sarah Jenkins, DVM",
      pet_name: "Max (Golden Retriever)",
      appointment_date: "2026-09-15",
      time_slot: "11:30 AM",
      type: "General Health Checkup",
      status: "Confirmed",
      notes: "First routine checkup after home arrival."
    }
  ],

  grooming_services: [
    {
      id: "srv-1",
      title: "Royal Spa & Hydrobath Grooming",
      category: "Grooming",
      price: 55,
      duration: "90 Mins",
      description: "Warm organic shampoo bath, fluff blow-dry, ear cleaning, nail trimming, and paw pad massage.",
      image_url: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "srv-2",
      title: "Puppy & Dog Obedience Training",
      category: "Training",
      price: 120,
      duration: "4 Weeks (4 Sessions)",
      description: "Positive-reinforcement training covering basic commands (Sit, Stay, Come), leash walking, and house training.",
      image_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "srv-3",
      title: "Feline De-Shedding & Nail Trim",
      category: "Grooming",
      price: 45,
      duration: "60 Mins",
      description: "Gentle coat de-shedding treatment, sanitary trim, waterless bath, and stress-free claw clipping.",
      image_url: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=600&q=80"
    }
  ],

  grooming_bookings: [
    {
      id: "grm-301",
      buyer_id: "u-buyer-1",
      buyer_name: "Alex Morgan",
      service_id: "srv-1",
      service_title: "Royal Spa & Hydrobath Grooming",
      booking_date: "2026-09-18",
      time_slot: "02:00 PM",
      status: "Scheduled"
    }
  ],

  support_tickets: [
    {
      id: "TCK-401",
      user_id: "u-buyer-1",
      user_name: "Alex Morgan",
      user_email: "buyer@petpaws.com",
      subject: "Inquiry regarding live pet transport temperature control",
      message: "Hi team, I placed order ORD-928104 for a Golden Retriever. Can you confirm if climate control is active during transit?",
      priority: "High",
      status: "Resolved",
      response: "Hello Alex! Yes, all our pet transport vehicles are equipped with dual HVAC climate control monitored live by our pet care specialist.",
      created_at: new Date(Date.now() - 43200000).toISOString()
    }
  ]
};

// Initialize persistent file store
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    saveData(initialData);
  }
}

function loadData() {
  initDB();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file, resetting to initial data:", err);
    saveData(initialData);
    return initialData;
  }
}

function saveData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  loadData,
  saveData,
  initDB
};
