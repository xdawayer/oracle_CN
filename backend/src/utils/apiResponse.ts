// INPUT: API 响应统一包装中间件。
// OUTPUT: 为 JSON 响应补齐 success 字段，保持错误与成功格式一致。
// POS: API 响应工具；若更新此文件，务必更新本头注释与所属文件夹的 FOLDER.md。

import type { NextFunction, Request, Response } from 'express';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

export const apiResponseMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    if (body && typeof body === 'object' && 'success' in (body as Record<string, unknown>)) {
      return originalJson(body);
    }

    const success = res.statusCode < 400;

    if (isPlainObject(body)) {
      return originalJson({ success, ...(body as Record<string, unknown>) });
    }

    return originalJson({ success, data: body });
  }) as Response['json'];

  next();
};
