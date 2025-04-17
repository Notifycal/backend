import {
  templateMap,
  type BusinessAddress,
  type BusinessName,
  type DateTime,
  type TemplateId,
  type TimeZone
} from '@notifycal/shared/types';
import { DateTime as DT } from 'luxon';

export function interpolate(
  templateId: TemplateId,
  businessName: BusinessName,
  businessAddress: BusinessAddress,
  startTime: DateTime,
  timeZone: TimeZone
): string {
  const localDateTime = DT.fromISO(startTime, { zone: timeZone });
  return templateMap[templateId].interpolate(businessName, businessAddress, localDateTime);
}
