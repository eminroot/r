import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { HttpError } from "./lib/betadrop";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors({ credentials: true, origin: false }));
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware((req) => ({
  publishableKey: publishableKeyFromHost(getClerkProxyHost(req) ?? "", process.env.CLERK_PUBLISHABLE_KEY),
})));
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("sec-fetch-site") === "cross-site") {
    res.status(403).json({error:"Межсайтовые запросы запрещены"}); return;
  }
  next();
});

app.use("/api", router);
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) { res.status(err.status).json({error:err.message}); return; }
  if (err?.name === "ZodError") { res.status(400).json({error:"Проверьте обязательные поля и допустимые значения", details:err.issues?.map((i: {path: unknown[];message:string}) => ({path:i.path,message:i.message}))}); return; }
  if (err?.code === "23505") { res.status(409).json({error:"Такая запись уже существует. Проверьте имя профиля или заявку."}); return; }
  req.log.error({err}, "Request failed");
  res.status(500).json({error:"Ошибка сервера. Повторите позже."});
};
app.use(errorHandler);

export default app;
