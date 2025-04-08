import type { Logger } from '@aws-lambda-powertools/logger';
import { logger } from '@common/powertools';
import type { BaseEvent, BaseSystemEvent } from '@model/app-events/BaseEvent';
import type { AccessToken } from '@model/Jwt';
import type { AuditTrailStoreRecord } from '@model/store/AuditTrailStoreRecord';
import type { APIGatewayProxyEvent, EventBridgeEvent } from 'aws-lambda';

export function setupLoggerForEventProcessing(
  event: BaseEvent | BaseSystemEvent,
  _logger: Logger = logger
): void {
  _logger.setCorrelationId(event.correlationId);
  _logger.appendKeys({
    correlationId: event.correlationId,
    userId: event.userId,
    idp: event.idp,
    idpId: event.idpId
  });
}

export function setupLoggerForAuditStoreRecordProcessing(
  record: AuditTrailStoreRecord,
  _logger: Logger = logger
): void {
  _logger.setCorrelationId(record.CorrelationId);
  _logger.appendKeys({
    correlationId: record.CorrelationId,
    userId: record.UserId,
    idp: record.Idp,
    idpId: record.IdpId
  });
}

export function setupLoggerForAuthedApiRequest(jwt: AccessToken, _logger: Logger = logger): void {
  _logger.appendKeys({
    userId: jwt.payload.userId,
    idp: jwt.payload.idp,
    idpId: jwt.payload.idpId,
    role: jwt.payload.role
  });
}

export function setupLoggerCorrelationIdApi(
  event: APIGatewayProxyEvent,
  _logger: Logger = logger
): void {
  const requestId = event.requestContext.requestId;
  if (requestId) {
    _logger.setCorrelationId(requestId);
  }
}

export function setupLoggerCorrelationIdEventBridge(
  event: EventBridgeEvent<string, unknown>,
  _logger: Logger = logger
): void {
  const requestId = event.id;
  if (requestId) {
    _logger.setCorrelationId(requestId);
  }
}
