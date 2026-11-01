import { Test, TestingModule } from '@nestjs/testing';
import { ImportService } from './import.service';
import { SupabaseService } from '../../db/supabase.service';

describe('ImportService', () => {
  let service: ImportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        {
          provide: SupabaseService,
          useValue: {
            client: {},
            pool: {},
          },
        },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
  });

  describe('sanitizeCellValue (Formula Injection Protection)', () => {
    it('should prefix dangerous formula triggers with a single quote', () => {
      expect(service.sanitizeCellValue('=cmd|/c calc!A0')).toBe("'=cmd|/c calc!A0");
      expect(service.sanitizeCellValue('+12345')).toBe("'+12345");
      expect(service.sanitizeCellValue('-2500')).toBe("'-2500");
      expect(service.sanitizeCellValue('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    });

    it('should not alter standard alphanumeric text', () => {
      expect(service.sanitizeCellValue('Ramesh Sharma')).toBe('Ramesh Sharma');
      expect(service.sanitizeCellValue('9822001122')).toBe('9822001122');
      expect(service.sanitizeCellValue('solar@kyros.in')).toBe('solar@kyros.in');
    });

    it('should handle null and undefined safely', () => {
      expect(service.sanitizeCellValue(null)).toBe('');
      expect(service.sanitizeCellValue(undefined)).toBe('');
    });
  });

  describe('generateSampleCsv', () => {
    it('should generate valid CSV header and sample rows', () => {
      const csv = service.generateSampleCsv();
      expect(csv).toContain('Name,Phone,Email,City,Monthly_Bill,System_KW,Category,Source');
      expect(csv).toContain('Ramesh Kulkarni');
      expect(csv).toContain('Pune');
    });
  });
});
