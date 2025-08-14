import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import user from "./routes/user.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import zomatoRouter from "./routes/zomato.routes.js";
import gemini from "./routes/gemini.routes.js";
import scrape from "./routes/scrape.route.js";
import project from "./routes/project.routes.js";
import products from "./routes/product.routes.js";
import swiggy from "./routes/swiggy.routes.js";
import zomatoVerifyRouter from "./routes/zomato-verify.routes.js";
dotenv.config();

const app = express();
app.use(cookieParser());
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedDomains = [
        /^https:\/\/.*\.magicscale\.in$/,
        "http://localhost:5173",
        "https://auth-ivory-omega.vercel.app",
        "https://zomato.magicscale.in",
        "https://auth.magicscale.in",
      ];
      if (
        allowedDomains.some((pattern) =>
          typeof pattern === "string"
            ? pattern === origin
            : pattern.test(origin)
        ) ||
        !origin
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.set("view engine", "ejs");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/api/zomato", zomatoRouter);
app.use("/api/zomato-verify", zomatoVerifyRouter);
app.use("/api/gemini", gemini);

app.use("/api/project", project);
app.use("/api/products", products);

app.use("/api/user", user);
app.use("/api/scrape", scrape);
app.use("/api/swiggy", swiggy);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
