import express from "express";
import puppeteer from "puppeteer";
import { verifyToken } from "../controllers/user.controllers.js";
import Product from "../models/Product.js";

const scrape = express.Router();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

scrape.get("/", verifyToken, async (req, res) => {
  try {
    const { resId, projectId } = req.query;

    const userId = req.id;
    console.log();
    if (!resId) {
      return res
        .status(400)
        .json({ success: false, message: "Restaurant ID is required." });
    }

    if (!projectId) {
      return res
        .status(400)
        .json({ success: false, message: "Project ID is required." });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Token has been expired login again ...!",
      });
    }

    const browser = await puppeteer.connect({
      browserURL: "http://localhost:9222",
      defaultViewport: null,
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    });

    console.log("Connected to browser successfully");

    // const browser = await puppeteer.connect({
    //   browserURL: "http://127.0.0.1:9222",
    //   defaultViewport: null,
    //   headless: false, // Run in visible mode for debugging
    //   args: [
    //     "--no-sandbox",
    //     "--disable-setuid-sandbox",
    //     "--disable-gpu",
    //     "--disable-dev-shm-usage",
    //   ],
    // });

    const pages = await browser.pages();
    const page = pages[0];
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "navigate",
      "sec-fetch-user": "?1",
      "sec-fetch-dest": "document",
    });

    console.log("Navigating to Zomato menu page...");

    await page.goto(
      `https://www.zomato.com/php/online_ordering/menu_edit?action=get_content_menu&res_id=${resId}`,
      { waitUntil: "networkidle2" }
    );

    console.log("Page loaded, waiting for content...");

    await delay(2000);

    // await page.waitForSelector(".Section__Button-menu-mfe__sc-ubf19j-2.cibxUI");

    // // Click the button
    // await page.click(".Section__Button-menu-mfe__sc-ubf19j-2.cibxUI");

    const menu = await page.evaluate(() => {
      const menuElement = document.querySelector("pre");
      if (menuElement) {
        try {
          return JSON.parse(menuElement.textContent);
        } catch (error) {
          console.error("Error parsing menu JSON:", error);
          return null;
        }
      }
      return null;
    });

    console.log("Zomato Menu Data:", menu);

    if (!menu || !menu.data) {
      return res.status(400).json({ error: "No valid menu data found." });
    }

    const { menuResponse } = menu.data || {};
    if (!menuResponse) {
      return res
        .status(400)
        .json({ error: "Invalid menu response structure." });
    }

    const { catalogueWrappers = [], categoryWrappers = [] } = menuResponse;

    const zomatoProduct = catalogueWrappers.map((product, index) => {
      const {
        catalogue = {},
        variantWrappers = [],
        catalogueTags = [],
        cataloguePropertyWrappers = [],
      } = product || {};

      const {
        name = "Unnamed Dish",
        description = "",
        imageUrl = "",
      } = catalogue;

      let base_price = Infinity;
      let variants = [];

      cataloguePropertyWrappers.forEach((property) => {
        const { catalogueProperty = {} } = property;
        let property_name = catalogueProperty?.name || "Unknown";
        const { propertyValues = [] } = catalogueProperty;

        let values = [];

        propertyValues.forEach((propertyValue) => {
          let variant_name = propertyValue?.value || "Unknown";
          const { propertyValueId } = propertyValue;

          variantWrappers.forEach((variant) => {
            const { variantPrices = [], variantPropertyValues = [] } = variant;

            const matchingVariant = variantPropertyValues.find(
              (v) => v.propertyValueId === propertyValueId
            );

            if (matchingVariant) {
              const { variantId } = matchingVariant;

              variantPrices.forEach((priceObj) => {
                if (priceObj.variantId === variantId) {
                  values.push({
                    title: variant_name,
                    price: priceObj.price,
                  });

                  base_price = Math.min(base_price, priceObj.price);
                }
              });
            }
          });
        });

        if (values.length > 0) {
          variants.push({ property_name, values });
        }
      });

      variantWrappers.forEach((variant) => {
        const { variantPrices = [] } = variant;
        variantPrices.forEach((priceObj) => {
          base_price = Math.min(base_price, priceObj.price);
        });
      });

      if (base_price === Infinity) {
        base_price = catalogue?.price || 0;
      }

      let sub_category = "Uncategorized";
      let category_name = "Uncategorized";

      categoryWrappers.forEach((categories) => {
        const { category = {}, subCategoryWrappers = [] } = categories;

        subCategoryWrappers.forEach((subCategories) => {
          const { subCategory = {}, subCategoryEntities = [] } = subCategories;

          subCategoryEntities.forEach((subCat) => {
            if (subCat?.entityId === catalogue?.catalogueId) {
              sub_category = subCategory?.name || "Uncategorized";
              category_name = category?.name || "Uncategorized";
            }
          });
        });
      });

      let food_type = catalogueTags?.[0] || "temp";
      if (food_type === "non-veg") {
        food_type = "non_veg";
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        name,
        description,
        img: imageUrl,
        base_price: base_price || 0,
        category: category_name,
        food_type,
        item_type: "Goods",
        sub_category,
        variants,
        userId,
        projectId,
      };
    });

    console.log("Processed Zomato Products:", zomatoProduct);

    if (zomatoProduct.length > 0) {
      await Product.insertMany(zomatoProduct, { ordered: false }).catch((err) =>
        console.log("Error inserting data:", err.message)
      );
    }

    return res.status(200).json({
      data: zomatoProduct,
      message: "Menu data processed successfully.",
    });
  } catch (err) {
    console.error("Error during processing:", err.message);
    return res.status(500).json({
      error: `Error during processing: ${err.message}`,
    });
  }
});

// scrape.get("/", verifyToken, async (req, res) => {
//   try {
//     const { resId, projectId } = req.query;

//     const userId = req.id;
//     console.log();
//     if (!resId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Restaurant ID is required." });
//     }

//     if (!projectId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Project ID is required." });
//     }

//     if (!userId) {
//       return res.status(400).json({
//         success: false,
//         message: "Token has been expired login again ...!",
//       });
//     }

//     const response = await axios.get(
//       "https://www.zomato.com/php/online_ordering/menu_edit?action=get_content_menu&res_id=${resId}"
//     );

//     // await page.goto(
//     //   `https://www.zomato.com/php/online_ordering/menu_edit?action=get_content_menu&res_id=${resId}`,
//     //   { waitUntil: "networkidle2" }
//     // );

//     const menu = await page.evaluate(() => {
//       const menuElement = document.querySelector("pre");
//       if (menuElement) {
//         try {
//           return JSON.parse(menuElement.textContent);
//         } catch (error) {
//           console.error("Error parsing menu JSON:", error);
//           return null;
//         }
//       }
//       return null;
//     });

//     console.log("Zomato Menu Data:", menu);

//     if (!menu || !menu.data) {
//       return res.status(400).json({ error: "No valid menu data found." });
//     }

//     const { menuResponse } = menu.data || {};
//     if (!menuResponse) {
//       return res
//         .status(400)
//         .json({ error: "Invalid menu response structure." });
//     }

//     const { catalogueWrappers = [], categoryWrappers = [] } = menuResponse;

//     const zomatoProduct = catalogueWrappers.map((product, index) => {
//       const {
//         catalogue = {},
//         variantWrappers = [],
//         catalogueTags = [],
//         cataloguePropertyWrappers = [],
//       } = product || {};

//       const {
//         name = "Unnamed Dish",
//         description = "",
//         imageUrl = "",
//       } = catalogue;

//       let base_price = Infinity;
//       let variants = [];

//       cataloguePropertyWrappers.forEach((property) => {
//         const { catalogueProperty = {} } = property;
//         let property_name = catalogueProperty?.name || "Unknown";
//         const { propertyValues = [] } = catalogueProperty;

//         let values = [];

//         propertyValues.forEach((propertyValue) => {
//           let variant_name = propertyValue?.value || "Unknown";
//           const { propertyValueId } = propertyValue;

//           variantWrappers.forEach((variant) => {
//             const { variantPrices = [], variantPropertyValues = [] } = variant;

//             const matchingVariant = variantPropertyValues.find(
//               (v) => v.propertyValueId === propertyValueId
//             );

//             if (matchingVariant) {
//               const { variantId } = matchingVariant;

//               variantPrices.forEach((priceObj) => {
//                 if (priceObj.variantId === variantId) {
//                   values.push({
//                     title: variant_name,
//                     price: priceObj.price,
//                   });

//                   base_price = Math.min(base_price, priceObj.price);
//                 }
//               });
//             }
//           });
//         });

//         if (values.length > 0) {
//           variants.push({ property_name, values });
//         }
//       });

//       variantWrappers.forEach((variant) => {
//         const { variantPrices = [] } = variant;
//         variantPrices.forEach((priceObj) => {
//           base_price = Math.min(base_price, priceObj.price);
//         });
//       });

//       if (base_price === Infinity) {
//         base_price = catalogue?.price || 0;
//       }

//       let sub_category = "Uncategorized";
//       let category_name = "Uncategorized";

//       categoryWrappers.forEach((categories) => {
//         const { category = {}, subCategoryWrappers = [] } = categories;

//         subCategoryWrappers.forEach((subCategories) => {
//           const { subCategory = {}, subCategoryEntities = [] } = subCategories;

//           subCategoryEntities.forEach((subCat) => {
//             if (subCat?.entityId === catalogue?.catalogueId) {
//               sub_category = subCategory?.name || "Uncategorized";
//               category_name = category?.name || "Uncategorized";
//             }
//           });
//         });
//       });

//       let food_type = catalogueTags?.[0] || "temp";
//       if (food_type === "non-veg") {
//         food_type = "non_veg";
//       }

//       return {
//         id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
//         name,
//         description,
//         img: imageUrl,
//         base_price: base_price || 0,
//         category: category_name,
//         food_type,
//         item_type: "Goods",
//         sub_category,
//         variants,
//         userId,
//         projectId,
//       };
//     });

//     console.log("Processed Zomato Products:", zomatoProduct);

//     if (zomatoProduct.length > 0) {
//       await Product.insertMany(zomatoProduct, { ordered: false }).catch((err) =>
//         console.log("Error inserting data:", err.message)
//       );
//     }

//     return res.status(200).json({
//       data: zomatoProduct,
//       message: "Menu data processed successfully.",
//     });
//   } catch (err) {
//     console.error("Error during processing:", err.message);
//     return res.status(500).json({
//       error: `Error during processing: ${err.message}`,
//     });
//   }
// });

export default scrape;
