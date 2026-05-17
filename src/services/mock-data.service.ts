import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import type {
  FlightOption,
  HotelOption,
  VisaPackage,
  Itinerary,
  TravelDataProvider,
} from '../types/index.js';

// ===========================================
// Zod Schemas for Mock Data Validation
// ===========================================

const AirlineSchema = z.object({
  code: z.string(),
  name: z.string(),
  country: z.string(),
  cabinClasses: z.array(z.string()),
});

const RouteSchema = z.object({
  id: z.string(),
  origin: z.string(),
  originCode: z.string(),
  destination: z.string(),
  destinationCode: z.string(),
  airlines: z.array(z.string()),
});

const FlightsDataSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  description: z.string(),
  routes: z.array(RouteSchema),
  airlines: z.array(AirlineSchema),
  flights: z.array(z.object({
    id: z.string(),
    flightNumber: z.string(),
    airline: z.string(),
    airlineCode: z.string(),
    origin: z.string(),
    originCode: z.string(),
    destination: z.string(),
    destinationCode: z.string(),
    departureTime: z.string(),
    arrivalTime: z.string(),
    duration: z.string(),
    stops: z.number(),
    cabinClass: z.string(),
    price: z.number(),
    currency: z.string(),
  })),
});

const HotelAmenitiesSchema = z.array(z.string());

const HotelsDataSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  description: z.string(),
  cities: z.array(z.object({
    name: z.string(),
    country: z.string(),
    code: z.string(),
    airport: z.string(),
    currency: z.string(),
    language: z.string(),
  })),
  hotels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    starRating: z.number().min(1).max(5),
    location: z.string(),
    city: z.string(),
    country: z.string(),
    nightlyRate: z.number(),
    currency: z.string(),
    description: z.string(),
    amenities: HotelAmenitiesSchema,
    roomTypes: z.array(z.string()),
    checkInTime: z.string(),
    checkOutTime: z.string(),
    cancellationPolicy: z.string().optional(),
    images: z.array(z.string()).optional(),
  })),
});

const DocumentChecklistSchema = z.object({
  required: z.array(z.string()),
  recommended: z.array(z.string()),
});

const VisasDataSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  description: z.string(),
  visaTypes: z.array(z.object({
    code: z.string(),
    name: z.string(),
    description: z.string(),
  })),
  packages: z.array(z.object({
    id: z.string(),
    visaType: z.string(),
    visaTypeName: z.string(),
    destinationCountry: z.string(),
    destinationName: z.string(),
    nationality: z.string(),
    processingDays: z.number(),
    validityDays: z.number(),
    maxStayDays: z.number(),
    fee: z.number(),
    currency: z.string(),
    requirements: z.array(z.string()),
    description: z.string(),
    entryType: z.string(),
    processingType: z.string(),
  })),
  documentChecklists: z.record(z.string(), z.record(z.string(), DocumentChecklistSchema)).optional(),
});

const ItineraryDaySchema = z.object({
  day: z.number(),
  title: z.string(),
  description: z.string().optional(),
  activities: z.array(z.object({
    time: z.string(),
    name: z.string(),
    location: z.string(),
    notes: z.string().optional(),
  })).optional(),
});

const ItinerariesDataSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  description: z.string(),
  templates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    destination: z.string(),
    duration: z.number(),
    description: z.string(),
    basePrice: z.number(),
    currency: z.string(),
    bestFor: z.array(z.string()),
    highlights: z.array(z.string()),
    includes: z.array(z.string()),
    days: z.array(ItineraryDaySchema),
  })),
});

// ===========================================
// Helper Functions
// ===========================================

/**
 * Load and validate JSON data file
 */
function loadJsonFile<T>(filename: string, schema: z.ZodSchema<T>, dataPath: string): T {
  const filePath = join(dataPath, filename);
  
  if (!existsSync(filePath)) {
    throw new Error(`Mock data file not found: ${filePath}`);
  }

  try {
    const rawData = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(rawData);
    const result = schema.safeParse(parsed);

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Invalid mock data in ${filename}: ${errors}`);
    }

    return result.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filename}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse date string to consistent format (YYYY-MM-DD)
 */
function normalizeDate(date: string | undefined): string | undefined {
  if (!date) return undefined;
  
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Parse common date formats
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return undefined;
  }
  
  return parsed.toISOString().split('T')[0];
}

// ===========================================
// Mock Travel Data Provider
// ===========================================

export class MockTravelDataProvider implements TravelDataProvider {
  private flightsData: z.infer<typeof FlightsDataSchema>;
  private hotelsData: z.infer<typeof HotelsDataSchema>;
  private visasData: z.infer<typeof VisasDataSchema>;
  private itinerariesData: z.infer<typeof ItinerariesDataSchema>;

  constructor(dataPath: string = './data') {
    console.log(JSON.stringify({
      level: 'info',
      message: 'Initializing MockTravelDataProvider',
      timestamp: new Date().toISOString(),
      context: { dataPath },
    }));

    // Load all mock data files
    this.flightsData = loadJsonFile('flights.json', FlightsDataSchema, dataPath);
    this.hotelsData = loadJsonFile('hotels.json', HotelsDataSchema, dataPath);
    this.visasData = loadJsonFile('visas.json', VisasDataSchema, dataPath);
    this.itinerariesData = loadJsonFile('itineraries.json', ItinerariesDataSchema, dataPath);

    console.log(JSON.stringify({
      level: 'info',
      message: 'Mock data loaded successfully',
      timestamp: new Date().toISOString(),
      context: {
        flights: this.flightsData.flights.length,
        hotels: this.hotelsData.hotels.length,
        visas: this.visasData.packages.length,
        itineraries: this.itinerariesData.templates.length,
      },
    }));
  }

  /**
   * Get available flights between origin and destination
   */
  async getFlights(
    origin: string,
    destination: string,
    date?: string,
    cabinClass?: string
  ): Promise<FlightOption[]> {
    // Normalize inputs for matching
    const originUpper = origin.toUpperCase();
    const destUpper = destination.toUpperCase();
    const cabinLower = cabinClass?.toLowerCase() || 'economy';

    // Filter flights by origin, destination, and optionally cabin class
    let flights = this.flightsData.flights.filter(flight => {
      const originMatch = 
        flight.originCode.toUpperCase() === originUpper ||
        flight.origin.toUpperCase().includes(originUpper);
      
      const destMatch = 
        flight.destinationCode.toUpperCase() === destUpper ||
        flight.destination.toUpperCase().includes(destUpper);

      const cabinMatch = cabinLower === 'any' || 
        flight.cabinClass.toLowerCase() === cabinLower ||
        (cabinLower === 'economy' && flight.cabinClass !== 'business' && flight.cabinClass !== 'first');

      return originMatch && destMatch && cabinMatch;
    });

    // Sort by price (lowest first)
    flights.sort((a, b) => a.price - b.price);

    // Return top 3 options for UI display
    return flights.slice(0, 3).map(flight => ({
      id: flight.id,
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      origin: flight.origin,
      originCode: flight.originCode,
      destination: flight.destination,
      destinationCode: flight.destinationCode,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      stops: flight.stops,
      cabinClass: flight.cabinClass as 'economy' | 'business' | 'first',
      price: flight.price,
      currency: flight.currency,
    }));
  }

  /**
   * Get available hotels in a city
   */
  async getHotels(
    city: string,
    checkIn?: string,
    checkOut?: string,
    starRating?: number
  ): Promise<HotelOption[]> {
    // Normalize city name for matching
    const cityUpper = city.toUpperCase();

    // Filter hotels by city and optionally star rating
    let hotels = this.hotelsData.hotels.filter(hotel => {
      const cityMatch = 
        hotel.city.toUpperCase().includes(cityUpper) ||
        hotel.location.toUpperCase().includes(cityUpper);

      const ratingMatch = !starRating || hotel.starRating >= starRating;

      return cityMatch && ratingMatch;
    });

    // Sort by star rating (highest first), then by price
    hotels.sort((a, b) => {
      if (b.starRating !== a.starRating) {
        return b.starRating - a.starRating;
      }
      return a.nightlyRate - b.nightlyRate;
    });

    // Return top 3 options
    return hotels.slice(0, 3).map(hotel => ({
      id: hotel.id,
      name: hotel.name,
      starRating: hotel.starRating,
      location: hotel.location,
      city: hotel.city,
      nightlyRate: hotel.nightlyRate,
      currency: hotel.currency,
      amenities: hotel.amenities.slice(0, 5), // Top 5 amenities for display
      roomTypes: hotel.roomTypes,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
    }));
  }

  /**
   * Get available visa packages for a destination country and nationality
   */
  async getVisaPackages(
    country: string,
    nationality: string = 'India'
  ): Promise<VisaPackage[]> {
    const countryUpper = country.toUpperCase();
    const nationalityUpper = nationality.toUpperCase();

    // Filter visa packages by destination and nationality
    let packages = this.visasData.packages.filter(pkg => {
      const countryMatch = 
        pkg.destinationCountry.toUpperCase() === countryUpper ||
        pkg.destinationName.toUpperCase().includes(countryUpper);

      const nationalityMatch = 
        pkg.nationality.toUpperCase() === nationalityUpper;

      return countryMatch && nationalityMatch;
    });

    // Sort by processing time (fastest first)
    packages.sort((a, b) => a.processingDays - b.processingDays);

    // Return top 3 options
    return packages.slice(0, 3).map(pkg => ({
      id: pkg.id,
      visaType: pkg.visaType,
      destinationCountry: pkg.destinationCountry,
      nationality: pkg.nationality,
      processingDays: pkg.processingDays,
      fee: pkg.fee,
      currency: pkg.currency,
      requirements: pkg.requirements.slice(0, 5), // Top 5 requirements for display
      validity: `${pkg.validityDays} days`,
      maxStay: `${pkg.maxStayDays} days`,
    }));
  }

  /**
   * Get an itinerary by booking reference
   */
  async getItinerary(bookingReference: string): Promise<Itinerary | null> {
    // Try to find by template ID or generate a mock itinerary
    const template = this.itinerariesData.templates.find(
      t => t.id.toLowerCase() === bookingReference.toLowerCase() ||
           t.name.toLowerCase().includes(bookingReference.toLowerCase())
    );

    if (!template) {
      return null;
    }

    // Transform template to Itinerary format
    return {
      id: template.id,
      bookingReference,
      destination: template.destination,
      startDate: normalizeDate(template.days[0]?.activities?.[0]?.time) || new Date().toISOString().split('T')[0],
      endDate: normalizeDate(template.days[template.days.length - 1]?.activities?.[0]?.time) || new Date().toISOString().split('T')[0],
      travellers: 2, // Default for mock data
      services: template.includes,
      days: template.days.map(day => ({
        day: day.day,
        date: new Date(Date.now() + day.day * 86400000).toISOString().split('T')[0],
        activity: day.title,
        location: template.destination,
        notes: day.description,
      })),
      totalCost: template.basePrice,
      currency: template.currency,
    };
  }

  /**
   * Get document checklist for visa applications
   */
  getDocumentChecklist(country: string, visaType: string): string[] {
    const visaTypeLower = visaType.toLowerCase();

    // Find matching checklist - case-insensitive country match
    const checklistData = this.visasData.documentChecklists;
    
    if (!checklistData) {
      return [];
    }

    // Find country key (case-insensitive)
    const countryKey = Object.keys(checklistData).find(
      key => key.toUpperCase() === country.toUpperCase()
    );
    
    if (!countryKey) {
      return [];
    }

    const countryChecklists = checklistData[countryKey];
    
    // Try exact visa type match first, then fall back to 'tourist', then case-insensitive match
    let checklist: { required: string[]; recommended: string[] } | undefined = 
      countryChecklists[visaTypeLower] || countryChecklists['tourist'];
    
    if (!checklist) {
      const visaTypeKey = Object.keys(countryChecklists).find(
        key => key.toLowerCase() === visaTypeLower
      );
      checklist = visaTypeKey ? countryChecklists[visaTypeKey] : undefined;
    }

    return checklist ? [...checklist.required, ...checklist.recommended] : [];
  }

  /**
   * Get all available destinations
   */
  getAvailableDestinations(): string[] {
    const destinations = new Set<string>();
    
    this.flightsData.flights.forEach(flight => {
      destinations.add(flight.destination);
      destinations.add(flight.destinationCode);
    });

    this.hotelsData.hotels.forEach(hotel => {
      destinations.add(hotel.city);
    });

    return Array.from(destinations).sort();
  }

  /**
   * Get all available origins
   */
  getAvailableOrigins(): string[] {
    const origins = new Set<string>();
    
    this.flightsData.flights.forEach(flight => {
      origins.add(flight.origin);
      origins.add(flight.originCode);
    });

    return Array.from(origins).sort();
  }

  /**
   * Search for anything matching a query
   */
  async search(query: string): Promise<{
    flights?: FlightOption[];
    hotels?: HotelOption[];
    visas?: VisaPackage[];
    itineraries?: Itinerary[];
  }> {
    const results: {
      flights?: FlightOption[];
      hotels?: HotelOption[];
      visas?: VisaPackage[];
    } = {};

    const queryLower = query.toLowerCase();

    // Search flights
    const matchedFlights = this.flightsData.flights.filter(
      f => f.origin.toLowerCase().includes(queryLower) ||
           f.destination.toLowerCase().includes(queryLower) ||
           f.airline.toLowerCase().includes(queryLower)
    );
    if (matchedFlights.length > 0) {
      results.flights = matchedFlights.slice(0, 5).map(f => ({
        id: f.id,
        flightNumber: f.flightNumber,
        airline: f.airline,
        airlineCode: f.airlineCode,
        origin: f.origin,
        originCode: f.originCode,
        destination: f.destination,
        destinationCode: f.destinationCode,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        duration: f.duration,
        stops: f.stops,
        cabinClass: f.cabinClass as 'economy' | 'business' | 'first',
        price: f.price,
        currency: f.currency,
      }));
    }

    // Search hotels
    const matchedHotels = this.hotelsData.hotels.filter(
      h => h.name.toLowerCase().includes(queryLower) ||
           h.city.toLowerCase().includes(queryLower) ||
           h.location.toLowerCase().includes(queryLower)
    );
    if (matchedHotels.length > 0) {
      results.hotels = matchedHotels.slice(0, 3).map(h => ({
        id: h.id,
        name: h.name,
        starRating: h.starRating,
        location: h.location,
        city: h.city,
        nightlyRate: h.nightlyRate,
        currency: h.currency,
        amenities: h.amenities.slice(0, 5),
        roomTypes: h.roomTypes,
        checkInTime: h.checkInTime,
        checkOutTime: h.checkOutTime,
      }));
    }

    // Search visas
    const matchedVisas = this.visasData.packages.filter(
      v => v.destinationName.toLowerCase().includes(queryLower) ||
           v.destinationCountry.toLowerCase().includes(queryLower)
    );
    if (matchedVisas.length > 0) {
      results.visas = matchedVisas.slice(0, 3).map(v => ({
        id: v.id,
        visaType: v.visaType,
        destinationCountry: v.destinationCountry,
        nationality: v.nationality,
        processingDays: v.processingDays,
        fee: v.fee,
        currency: v.currency,
        requirements: v.requirements.slice(0, 5),
        validity: `${v.validityDays} days`,
        maxStay: `${v.maxStayDays} days`,
      }));
    }

    return results;
  }
}

// ===========================================
// Factory Function
// ===========================================

/**
 * Create a travel data provider instance
 * In the future, this can be swapped to use live APIs by changing the implementation
 */
export function createTravelDataProvider(
  providerType: 'mock' | 'live' = 'mock',
  dataPath: string = './data'
): TravelDataProvider {
  if (providerType === 'mock') {
    return new MockTravelDataProvider(dataPath);
  }

  // Future: Return LiveTravelDataProvider
  throw new Error(`Provider type '${providerType}' not implemented yet`);
}

export default MockTravelDataProvider;