import type {
  BusinessAddress,
  BusinessName,
  DateTime,
  TemplateId,
  TimeZone
} from '@notifycal/shared/types';
import { describe, expect, it } from 'vitest';
import { interpolate } from './template';

describe('Template Service', () => {
  it('should interpolate variables in a template', () => {
    const templateId = 'informal-es-01' as TemplateId;
    const businessName = 'My Business' as BusinessName;
    const businessAddress = 'Calle de la Piruleta, 54, via lactea' as BusinessAddress;
    const startTime = '2025-04-08T12:15:00Z' as DateTime;
    const timeZone = 'Europe/Madrid' as TimeZone;

    const result = testit(templateId, businessName, businessAddress, startTime, timeZone);

    expect(result).toContain(businessName);
    expect(result).toContain(businessAddress);
    expect(result).toContain('08/04/2025');
    expect(result).toContain('14:15');
  });

  function testit(
    templateId: TemplateId,
    businessName: BusinessName,
    businessAddress: BusinessAddress,
    startTime: DateTime,
    timeZone: TimeZone
  ): string {
    return interpolate(templateId, businessName, businessAddress, startTime, timeZone);
  }
});
