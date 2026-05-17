import { describe, it, expect, beforeEach } from 'vitest';
import { MockTravelDataProvider } from '../../src/services/mock-data.service.js';
import type { TravelDataProvider } from '../../src/types/index.js';

// ===========================================
// Test Fixtures
// ===========================================

const mockDataPath = './data';

// ===========================================
// Test Suites
// ===========================================

describe('MockTravelDataProvider', () => {
  let provider: TravelDataProvider;

  beforeEach(() => {
    provider = new MockTravelDataProvider(mockDataPath);
  });

  describe('getFlights', () => {
    it('should return flights for Mumbai to Dubai', async () => {
      const flights = await provider.getFlights('Mumbai', 'Dubai');
      
      expect(flights).toBeDefined();
      expect(Array.isArray(flights)).toBe(true);
      expect(flights.length).toBeGreaterThan(0);
      expect(flights.length).toBeLessThanOrEqual(3);
      
      // Check first flight structure
      const flight = flights[0];
      expect(flight.origin).toBe('Mumbai');
      expect(flight.destination).toBe('Dubai');
      expect(flight.price).toBeGreaterThan(0);
      expect(flight.currency).toBe('USD');
      expect(flight.airline).toBeDefined();
      expect(flight.departureTime).toBeDefined();
    });

    it('should return flights by airport code', async () => {
      const flights = await provider.getFlights('BOM', 'DXB');
      
      expect(flights).toBeDefined();
      expect(flights.length).toBeGreaterThan(0);
      expect(flights[0].originCode).toBe('BOM');
      expect(flights[0].destinationCode).toBe('DXB');
    });

    it('should return flights by route code (BOM-DXB)', async () => {
      const flights = await provider.getFlights('BOM', 'DXB');
      
      expect(flights.length).toBeGreaterThan(0);
    });

    it('should filter by cabin class', async () => {
      const economyFlights = await provider.getFlights('Mumbai', 'Dubai', undefined, 'economy');
      const businessFlights = await provider.getFlights('Mumbai', 'Dubai', undefined, 'business');
      
      expect(economyFlights.length).toBeGreaterThan(0);
      expect(businessFlights.length).toBeGreaterThan(0);
      
      // Economy flights should be cheaper
      if (economyFlights.length > 0 && businessFlights.length > 0) {
        expect(economyFlights[0].price).toBeLessThan(businessFlights[0].price);
      }
    });

    it('should return sorted flights by price (lowest first)', async () => {
      const flights = await provider.getFlights('Mumbai', 'Dubai');
      
      for (let i = 1; i < flights.length; i++) {
        expect(flights[i].price).toBeGreaterThanOrEqual(flights[i - 1].price);
      }
    });

    it('should return empty array for non-existent routes', async () => {
      const flights = await provider.getFlights('NonExistent', 'Nowhere');
      
      expect(flights).toBeDefined();
      expect(Array.isArray(flights)).toBe(true);
      expect(flights.length).toBe(0);
    });

    it('should handle case-insensitive matching', async () => {
      const lowerFlights = await provider.getFlights('mumbai', 'dubai');
      const upperFlights = await provider.getFlights('MUMBAI', 'DUBAI');
      
      expect(lowerFlights.length).toBe(upperFlights.length);
    });

    it('should return correct flight structure', async () => {
      const flights = await provider.getFlights('Mumbai', 'Dubai');
      const flight = flights[0];
      
      expect(flight).toHaveProperty('id');
      expect(flight).toHaveProperty('flightNumber');
      expect(flight).toHaveProperty('airline');
      expect(flight).toHaveProperty('airlineCode');
      expect(flight).toHaveProperty('origin');
      expect(flight).toHaveProperty('originCode');
      expect(flight).toHaveProperty('destination');
      expect(flight).toHaveProperty('destinationCode');
      expect(flight).toHaveProperty('departureTime');
      expect(flight).toHaveProperty('arrivalTime');
      expect(flight).toHaveProperty('duration');
      expect(flight).toHaveProperty('stops');
      expect(flight).toHaveProperty('cabinClass');
      expect(flight).toHaveProperty('price');
      expect(flight).toHaveProperty('currency');
    });
  });

  describe('getHotels', () => {
    it('should return hotels for Dubai', async () => {
      const hotels = await provider.getHotels('Dubai');
      
      expect(hotels).toBeDefined();
      expect(Array.isArray(hotels)).toBe(true);
      expect(hotels.length).toBeGreaterThan(0);
      expect(hotels.length).toBeLessThanOrEqual(3);
      
      // All hotels should be in Dubai
      hotels.forEach(hotel => {
        expect(hotel.city).toBe('Dubai');
      });
    });

    it('should return hotels for Mumbai', async () => {
      const hotels = await provider.getHotels('Mumbai');
      
      expect(hotels).toBeDefined();
      expect(hotels.length).toBeGreaterThan(0);
      
      hotels.forEach(hotel => {
        expect(hotel.city).toBe('Mumbai');
      });
    });

    it('should filter by star rating', async () => {
      const fiveStarHotels = await provider.getHotels('Dubai', undefined, undefined, 5);
      const threeStarHotels = await provider.getHotels('Dubai', undefined, undefined, 3);
      
      expect(fiveStarHotels.length).toBeGreaterThan(0);
      
      // 5-star filter should only return 5-star hotels
      fiveStarHotels.forEach(hotel => {
        expect(hotel.starRating).toBe(5);
      });
      
      // 3-star filter should return 3+ star hotels
      threeStarHotels.forEach(hotel => {
        expect(hotel.starRating).toBeGreaterThanOrEqual(3);
      });
    });

    it('should sort hotels by rating (highest first), then price', async () => {
      const hotels = await provider.getHotels('Dubai');
      
      for (let i = 1; i < hotels.length; i++) {
        if (hotels[i].starRating === hotels[i - 1].starRating) {
          expect(hotels[i].nightlyRate).toBeGreaterThanOrEqual(hotels[i - 1].nightlyRate);
        }
      }
    });

    it('should return empty array for non-existent city', async () => {
      const hotels = await provider.getHotels('NonExistentCity');
      
      expect(hotels).toBeDefined();
      expect(Array.isArray(hotels)).toBe(true);
      expect(hotels.length).toBe(0);
    });

    it('should return correct hotel structure', async () => {
      const hotels = await provider.getHotels('Dubai');
      const hotel = hotels[0];
      
      expect(hotel).toHaveProperty('id');
      expect(hotel).toHaveProperty('name');
      expect(hotel).toHaveProperty('starRating');
      expect(hotel).toHaveProperty('location');
      expect(hotel).toHaveProperty('city');
      expect(hotel).toHaveProperty('nightlyRate');
      expect(hotel).toHaveProperty('currency');
      expect(hotel).toHaveProperty('amenities');
      expect(Array.isArray(hotel.amenities)).toBe(true);
      expect(hotel.amenities.length).toBeLessThanOrEqual(5);
      expect(hotel).toHaveProperty('roomTypes');
      expect(hotel).toHaveProperty('checkInTime');
      expect(hotel).toHaveProperty('checkOutTime');
    });

    it('should limit amenities to top 5 for display', async () => {
      const hotels = await provider.getHotels('Dubai');
      
      hotels.forEach(hotel => {
        expect(hotel.amenities.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('getVisaPackages', () => {
    it('should return visa packages for UAE', async () => {
      const visas = await provider.getVisaPackages('UAE', 'India');
      
      expect(visas).toBeDefined();
      expect(Array.isArray(visas)).toBe(true);
      expect(visas.length).toBeGreaterThan(0);
      expect(visas.length).toBeLessThanOrEqual(3);
      
      // All packages should be for UAE
      visas.forEach(visa => {
        expect(visa.destinationCountry).toBe('UAE');
        expect(visa.nationality).toBe('India');
      });
    });

    it('should return visa packages for Qatar', async () => {
      const visas = await provider.getVisaPackages('Qatar', 'India');
      
      expect(visas).toBeDefined();
      expect(visas.length).toBeGreaterThan(0);
      
      visas.forEach(visa => {
        expect(visa.destinationCountry).toBe('Qatar');
      });
    });

    it('should return sorted visas by processing time (fastest first)', async () => {
      const visas = await provider.getVisaPackages('UAE', 'India');
      
      for (let i = 1; i < visas.length; i++) {
        expect(visas[i].processingDays).toBeGreaterThanOrEqual(visas[i - 1].processingDays);
      }
    });

    it('should return empty array for non-existent destination', async () => {
      const visas = await provider.getVisaPackages('NonExistent');
      
      expect(visas).toBeDefined();
      expect(Array.isArray(visas)).toBe(true);
      expect(visas.length).toBe(0);
    });

    it('should return correct visa package structure', async () => {
      const visas = await provider.getVisaPackages('UAE', 'India');
      const visa = visas[0];
      
      expect(visa).toHaveProperty('id');
      expect(visa).toHaveProperty('visaType');
      expect(visa).toHaveProperty('destinationCountry');
      expect(visa).toHaveProperty('nationality');
      expect(visa).toHaveProperty('processingDays');
      expect(visa).toHaveProperty('fee');
      expect(visa).toHaveProperty('currency');
      expect(visa).toHaveProperty('requirements');
      expect(Array.isArray(visa.requirements)).toBe(true);
      expect(visa.requirements.length).toBeLessThanOrEqual(5);
      expect(visa).toHaveProperty('validity');
      expect(visa).toHaveProperty('maxStay');
    });

    it('should limit requirements to top 5 for display', async () => {
      const visas = await provider.getVisaPackages('UAE', 'India');
      
      visas.forEach(visa => {
        expect(visa.requirements.length).toBeLessThanOrEqual(5);
      });
    });

    it('should handle case-insensitive country matching', async () => {
      const upperVisas = await provider.getVisaPackages('UAE', 'India');
      const lowerVisas = await provider.getVisaPackages('uae', 'india');
      
      expect(upperVisas.length).toBe(lowerVisas.length);
    });
  });

  describe('getItinerary', () => {
    it('should return itinerary by template ID', async () => {
      const itinerary = await provider.getItinerary('it-001');
      
      expect(itinerary).toBeDefined();
      expect(itinerary).not.toBeNull();
      
      if (itinerary) {
        expect(itinerary.id).toBe('it-001');
        expect(itinerary.destination).toBeDefined();
        expect(Array.isArray(itinerary.days)).toBe(true);
        expect(itinerary.days.length).toBeGreaterThan(0);
        expect(itinerary.services).toBeDefined();
      }
    });

    it('should return null for non-existent booking reference', async () => {
      const itinerary = await provider.getItinerary('NON-EXISTENT-REF');
      
      expect(itinerary).toBeNull();
    });

    it('should return correct itinerary structure', async () => {
      const itinerary = await provider.getItinerary('it-001');
      
      if (itinerary) {
        expect(itinerary).toHaveProperty('id');
        expect(itinerary).toHaveProperty('bookingReference');
        expect(itinerary).toHaveProperty('destination');
        expect(itinerary).toHaveProperty('startDate');
        expect(itinerary).toHaveProperty('endDate');
        expect(itinerary).toHaveProperty('travellers');
        expect(itinerary).toHaveProperty('services');
        expect(itinerary).toHaveProperty('days');
        expect(itinerary).toHaveProperty('totalCost');
        expect(itinerary).toHaveProperty('currency');
        
        // Days structure
        itinerary.days.forEach(day => {
          expect(day).toHaveProperty('day');
          expect(day).toHaveProperty('date');
          expect(day).toHaveProperty('activity');
          expect(day).toHaveProperty('location');
        });
      }
    });

    it('should return itinerary with day-by-day breakdown', async () => {
      const itinerary = await provider.getItinerary('it-002');
      
      if (itinerary) {
        expect(itinerary.days.length).toBe(5); // 5-day itinerary
        
        // Verify day numbers are sequential
        itinerary.days.forEach((day, index) => {
          expect(day.day).toBe(index + 1);
        });
      }
    });
  });

  describe('getDocumentChecklist', () => {
    it('should return document checklist for UAE tourist visa', () => {
      const checklist = provider.getDocumentChecklist('UAE', 'tourist');
      
      expect(checklist).toBeDefined();
      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBeGreaterThan(0);
      
      // Should include required and recommended documents
      expect(checklist.some(doc => doc.toLowerCase().includes('passport'))).toBe(true);
      expect(checklist.some(doc => doc.toLowerCase().includes('photo'))).toBe(true);
    });

    it('should return document checklist for Qatar tourist visa', () => {
      const checklist = provider.getDocumentChecklist('Qatar', 'tourist');
      
      expect(checklist).toBeDefined();
      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent country', () => {
      const checklist = provider.getDocumentChecklist('NonExistent', 'tourist');
      
      expect(checklist).toBeDefined();
      expect(Array.isArray(checklist)).toBe(true);
      expect(checklist.length).toBe(0);
    });
  });

  describe('getAvailableDestinations', () => {
    it('should return list of available destinations', () => {
      const destinations = provider.getAvailableDestinations();
      
      expect(destinations).toBeDefined();
      expect(Array.isArray(destinations)).toBe(true);
      expect(destinations.length).toBeGreaterThan(0);
      
      // Should include Dubai, Doha, Mumbai, etc.
      expect(destinations.some(d => d === 'Dubai')).toBe(true);
    });

    it('should not have duplicate destinations', () => {
      const destinations = provider.getAvailableDestinations();
      const uniqueDestinations = [...new Set(destinations)];
      
      expect(destinations.length).toBe(uniqueDestinations.length);
    });

    it('should be sorted alphabetically', () => {
      const destinations = provider.getAvailableDestinations();
      const sorted = [...destinations].sort();
      
      expect(destinations).toEqual(sorted);
    });
  });

  describe('getAvailableOrigins', () => {
    it('should return list of available origins', () => {
      const origins = provider.getAvailableOrigins();
      
      expect(origins).toBeDefined();
      expect(Array.isArray(origins)).toBe(true);
      expect(origins.length).toBeGreaterThan(0);
      
      // Should include Mumbai, Delhi, etc.
      expect(origins.some(o => o === 'Mumbai')).toBe(true);
    });

    it('should not have duplicate origins', () => {
      const origins = provider.getAvailableOrigins();
      const uniqueOrigins = [...new Set(origins)];
      
      expect(origins.length).toBe(uniqueOrigins.length);
    });
  });

  describe('search', () => {
    it('should find flights matching query', async () => {
      const results = await provider.search('Dubai');
      
      expect(results).toBeDefined();
      expect(results.flights).toBeDefined();
      expect(results.flights!.length).toBeGreaterThan(0);
    });

    it('should find hotels matching query', async () => {
      const results = await provider.search('Atlantis');
      
      expect(results).toBeDefined();
      expect(results.hotels).toBeDefined();
      expect(results.hotels!.length).toBeGreaterThan(0);
    });

    it('should find visas matching query', async () => {
      const results = await provider.search('UAE');
      
      expect(results).toBeDefined();
      expect(results.visas).toBeDefined();
      expect(results.visas!.length).toBeGreaterThan(0);
    });

    it('should return empty arrays for no matches', async () => {
      const results = await provider.search('xyz123nonexistent');
      
      expect(results).toBeDefined();
      expect(results.flights?.length || 0).toBe(0);
      expect(results.hotels?.length || 0).toBe(0);
      expect(results.visas?.length || 0).toBe(0);
    });

    it('should handle case-insensitive search', async () => {
      const upperResults = await provider.search('DUBAI');
      const lowerResults = await provider.search('dubai');
      
      expect(upperResults.flights?.length).toBe(lowerResults.flights?.length);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent data file', () => {
      expect(() => {
        new MockTravelDataProvider('./non-existent-path');
      }).toThrow();
    });
  });
});

describe('TravelDataProvider Interface', () => {
  it('should implement TravelDataProvider interface', () => {
    const provider = new MockTravelDataProvider(mockDataPath);
    
    // Verify all required methods exist
    expect(typeof provider.getFlights).toBe('function');
    expect(typeof provider.getHotels).toBe('function');
    expect(typeof provider.getVisaPackages).toBe('function');
    expect(typeof provider.getItinerary).toBe('function');
  });
});