// zomatoVerifyRouter.js
import express from "express";
import puppeteer from "puppeteer";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const zomatoVerifyRouter = express.Router();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_DATA_DIR =
  process.env.PUPPETEER_USER_DATA_DIR || path.resolve("./puppeteer_profile");
const HEADLESS = false;

let browser = null;

// Launch browser once at startup
// async function initBrowser() {
//   if (!fs.existsSync(USER_DATA_DIR)) {
//     fs.mkdirSync(USER_DATA_DIR, { recursive: true });
//   }

//   console.log("Launching browser. HEADLESS =", HEADLESS);
//   browser = await puppeteer.launch({
//     headless: HEADLESS,
//     userDataDir: USER_DATA_DIR,
//     args: [
//       "--no-sandbox",
//       "--disable-setuid-sandbox",
//       "--disable-dev-shm-usage",
//       "--disable-extensions",
//     ],
//     defaultViewport: null,
//   });

//   console.log("Browser launched and ready.");
// }

// async function ensureBrowserReady() {
//   if (!browser) {
//     console.log("Browser not initialized, starting now...");
//     await initBrowser();
//   }
// }

zomatoVerifyRouter.post("/data", async (req, res) => {


  const browser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:9222",
    defaultViewport: null,
    headless: false, // Run in visible mode for debugging
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });

  const { data, category, sub_category } = req.body;
  console.log("Received data:", { category, sub_category, items: data.length });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
    });

    await page.goto(
      "https://www.zomato.com/partners/onlineordering/menu/?resId=21047451",
      { waitUntil: "networkidle2" }
    );

    await delay(200);
    await page.waitForSelector('[data-tut="GO_TO_MENU_EDITOR"]', {
      visible: true,
    });
    await page.click('[data-tut="GO_TO_MENU_EDITOR"]');
    await delay(200);

    let uploadCount = 0;

    for (const item of data) {
      console.log("Processing item:", item);

      const {
        name,
        img: imageUrl,
        description,
        category,
        food_type,
        sub_category,
      } = item;

      try {
        await page.waitForSelector('[data-tut="ADD_CATALOGUE"]', {
          visible: true,
        });
        await page.click('[data-tut="ADD_CATALOGUE"]');
        await delay(200);

        if (imageUrl) {
          await delay(3000);

          // Click Upload
          await page.evaluate(() => {
            const uploadBtn = document.evaluate(
              '//div[contains(text(), "Upload")]',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            if (uploadBtn) uploadBtn.click();
          });

          await delay(200);

          // Click Continue
          await page.evaluate(() => {
            const continueBtn = document.evaluate(
              '//button[contains(text(), "Continue")]',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            if (continueBtn) continueBtn.click();
          });

          const imagesDir = path.join(__dirname, "images");
          const localImagePath = path.join(imagesDir, "downloaded-image.jpg");
          if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);

          const response = await axios.get(imageUrl, {
            responseType: "stream",
          });
          const writer = fs.createWriteStream(localImagePath);
          response.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          const fileInput = await page.$("#image-input");
          if (fileInput) await fileInput.uploadFile(localImagePath);

          await delay(4000);

          // Try Map image button
          let clicked = await page.evaluate(() => {
            const btn = document.evaluate(
              '//button[contains(text(), "Map image")]',
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            if (btn && !btn.disabled) {
              btn.click();
              return true;
            }
            return false;
          });

          if (clicked) {
            try {
              uploadCount++;
              await axios.post("http://localhost:3000/api/library/upload", {
                img: imageUrl,
                title: name,
                description,
                category,
                food_type,
                sub_category,
                resId: "21875340",
              });
            } catch (apiErr) {
              console.error("API call failed:", apiErr.message);
            }
          }
        }

        await delay(200);

        // Discard
        await page.evaluate(() => {
          const discardBtn = document.evaluate(
            '//button[contains(text(), "Discard")]',
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
          if (discardBtn) discardBtn.click();
        });

        console.log(`Processed "${name}"`);
      } catch (err) {
        console.error(`Error processing item "${item.name}": ${err.message}`);
      }
    }

    await page.waitForSelector('[data-tut="SUBMIT_CHANGES"]', {
      visible: true,
    });
    await page.click('[data-tut="SUBMIT_CHANGES"]');

    await delay(300);
    await page.close();

    res.status(200).send("Menu items uploaded successfully.");
  } catch (err) {
    console.error("Automation failed:", err);
    res.status(500).send(`Automation failed: ${err.message}`);
  }
});

export default zomatoVerifyRouter;
