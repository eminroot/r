import type { ErrorRequestHandler } from "express";
import { HttpError } from "./betadrop";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) { res.status(err.status).json({ error: err.message }); return; }
  if (err?.type === "entity.parse.failed") { res.status(400).json({ error: "Некорректный JSON" }); return; }
  if (err?.name === "ZodError") { res.status(400).json({ error: "Проверьте обязательные поля и допустимые значения", details: err.issues?.map((i: { path: unknown[]; message: string }) => ({ path: i.path, message: i.message })) }); return; }
  if (err?.code === "23505") { res.status(409).json({ error: "Такое уже есть: имя пользователя занято или заявка уже подана." }); return; }
  req.log?.error({ err }, "Request failed");
  res.status(500).json({ error: "Сервер не справился с запросом. Попробуйте ещё раз через минуту." });
};
