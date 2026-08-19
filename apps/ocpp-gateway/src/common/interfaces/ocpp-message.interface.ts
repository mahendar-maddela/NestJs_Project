export enum OcppMessageType {
  CALL = 2,
  CALLRESULT = 3,
  CALLERROR = 4,
}

export interface OcppCallMessage {
  messageType: OcppMessageType.CALL;
  messageId: string;
  action: string;
  payload: any;
}

export interface OcppCallResultMessage {
  messageType: OcppMessageType.CALLRESULT;
  messageId: string;
  payload: any;
}

export interface OcppCallErrorMessage {
  messageType: OcppMessageType.CALLERROR;
  messageId: string;
  errorCode: string;
  errorDescription: string;
  errorDetails?: any;
}

export type OcppRawMessage = [number, string, string | any, any?];
