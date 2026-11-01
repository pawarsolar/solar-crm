import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { SupabaseService } from '../../db/supabase.service';

describe('QuotationsService', () => {
  let service: QuotationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
  });

  describe('calculateSubsidy (PM Surya Ghar Rules)', () => {
    it('should calculate ₹30,000 per kW for plants up to 2 kW', () => {
      expect(service.calculateSubsidy(1)).toBe(30000);
      expect(service.calculateSubsidy(2)).toBe(60000);
    });

    it('should calculate ₹78,000 for 3 kW', () => {
      expect(service.calculateSubsidy(3)).toBe(78000);
    });

    it('should cap subsidy at ₹78,000 for systems exceeding 3 kW', () => {
      expect(service.calculateSubsidy(5)).toBe(78000);
      expect(service.calculateSubsidy(10)).toBe(78000);
    });

    it('should return 0 for non-positive kW', () => {
      expect(service.calculateSubsidy(0)).toBe(0);
      expect(service.calculateSubsidy(-1)).toBe(0);
    });
  });

  describe('calculateSizing', () => {
    it('should compute recommended kW and panels required accurately', () => {
      const res = service.calculateSizing(600, 8.0, 120.0, 540, 100);
      expect(res.recommendedKw).toBe(5);
      expect(res.panelsRequired).toBe(10);
      expect(res.actualDcKw).toBe(5.4);
      expect(res.projections).toHaveLength(25);
    });
  });
});
