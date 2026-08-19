import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

function expandBracketKeys(obj: any): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Matches nested keys like 'stationLocation[latitude]' -> ['stationLocation', 'latitude']
    // and array keys like 'amenityIds[]' -> ['amenityIds']
    const parts = key.match(/[^\[\]]+/g) || [key];
    const isArrayField = key.endsWith('[]');

    let current = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        if (isArrayField) {
          current[part] = Array.isArray(value) ? value : [value];
        } else {
          current[part] = value;
        }
      } else {
        if (!current[part]) {
          const nextPart = parts[i + 1];
          current[part] = /^\d+$/.test(nextPart) ? [] : {};
        }
        current = current[part];
      }
    }
  }
  return result;
}

function tryParseJsonValue(val: any): any {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return val;
    }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return val;
}

@Injectable()
export class MultipartInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.body && typeof request.body === 'object') {
      const parsedBody: any = {};
      const files: any = {};
      let hasMultipart = false;

      const processEntry = (key: string, val: any) => {
        if (Array.isArray(val)) {
          const parsedArr: any[] = [];
          const filesArr: any[] = [];
          for (const item of val) {
            if (item && typeof item === 'object') {
              if (item.type === 'file') {
                filesArr.push(item);
                hasMultipart = true;
              } else if (item.type === 'field') {
                parsedArr.push(tryParseJsonValue(item.value));
                hasMultipart = true;
              } else {
                parsedArr.push(tryParseJsonValue(item));
              }
            } else {
              parsedArr.push(tryParseJsonValue(item));
            }
          }
          if (filesArr.length > 0) {
            files[key] = filesArr;
          }
          if (parsedArr.length > 0) {
            parsedBody[key] = parsedArr;
          }
        } else if (val && typeof val === 'object') {
          if (val.type === 'file') {
            files[key] = val;
            hasMultipart = true;
          } else if (val.type === 'field') {
            parsedBody[key] = tryParseJsonValue(val.value);
            hasMultipart = true;
          } else {
            parsedBody[key] = val;
          }
        } else {
          parsedBody[key] = tryParseJsonValue(val);
        }
      };

      for (const [key, val] of Object.entries(request.body)) {
        processEntry(key, val);
      }

      if (hasMultipart) {
        const expanded = expandBracketKeys(parsedBody);
        for (const [k, v] of Object.entries(expanded)) {
          expanded[k] = tryParseJsonValue(v);
        }
        request.body = expanded;
        request.files = files;
        
        // Support single file extractor properties
        const fileKeys = Object.keys(files);
        if (fileKeys.length > 0) {
          const firstKey = fileKeys[0];
          const firstVal = files[firstKey];
          request.file = Array.isArray(firstVal) ? firstVal[0] : firstVal;
        }
      }
    }
    return next.handle();
  }
}
