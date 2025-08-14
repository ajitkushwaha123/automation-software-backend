import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import routes
import user from "./routes/user.routes.js";
import zomatoRouter from "./routes/zomato.routes.js";
import gemini from "./routes/gemini.routes.js";
import scrape from "./routes/scrape.route.js";
import project from "./routes/project.routes.js";
import products from "./routes/product.routes.js";
import swiggy from "./routes/swiggy.routes.js";
import zomatoVerifyRouter from "./routes/zomato-verify.routes.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cookieParser());
app.use(express.json());

// CORS setup
const allowedOrigins = [
  "http://localhost:5173",
  "https://auth-ivory-omega.vercel.app",
  "https://zomato.magicscale.in",
  "https://auth.magicscale.in",
  "https://*.magicscale.in", // optional wildcard for subdomains
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.some(
          (o) =>
            o === origin ||
            (o.includes("*") && new RegExp(o.replace("*", ".*")).test(origin))
        )
      ) {
        return callback(null, true);
      }
      return callback(new Error("CORS not allowed"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  })
);

// Handle preflight requests
app.options("*", cors());

// View engine
app.set("view engine", "ejs");

// Routes
app.use("/api/user", user);
app.use("/api/zomato", zomatoRouter);
app.use("/api/zomato-verify", zomatoVerifyRouter);
app.use("/api/gemini", gemini);
app.use("/api/project", project);
app.use("/api/products", products);
app.use("/api/scrape", scrape);
app.use("/api/swiggy", swiggy);

// Root route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
