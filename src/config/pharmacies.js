// Sample pharmacy directory - in production, this would come from a database
export const pharmacyDirectory = [
  {
    id: "cvs_main_st",
    name: "CVS Pharmacy - Main Street",
    phone: "+1234567890",
    address: "123 Main St, Anytown, USA",
    hours: "8:00 AM - 10:00 PM",
    specialty: "general"
  },
  {
    id: "walgreens_oak_ave",
    name: "Walgreens - Oak Avenue",
    phone: "+1234567891", 
    address: "456 Oak Ave, Anytown, USA",
    hours: "7:00 AM - 11:00 PM",
    specialty: "general"
  },
  {
    id: "specialty_pharmacy",
    name: "Specialty Care Pharmacy",
    phone: "+1234567892",
    address: "789 Medical Dr, Anytown, USA", 
    hours: "9:00 AM - 6:00 PM",
    specialty: "specialty_medications"
  },
  {
    id: "compounding_pharmacy",
    name: "Custom Compounding Pharmacy",
    phone: "+1234567893",
    address: "321 Health Blvd, Anytown, USA",
    hours: "8:00 AM - 8:00 PM", 
    specialty: "compounding"
  }
];

export function findPharmaciesByLocation(zipCode, medicationType = "general") {
  // In a real implementation, this would query a database based on location
  return pharmacyDirectory.filter(pharmacy => 
    pharmacy.specialty === medicationType || pharmacy.specialty === "general"
  );
}

export function getPharmacyById(id) {
  return pharmacyDirectory.find(pharmacy => pharmacy.id === id);
}