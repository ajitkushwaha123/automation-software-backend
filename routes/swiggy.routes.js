import express from "express";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import axios from "axios";

const swiggy = express.Router();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function clickCategory(categoryName) {
  let categories = document.querySelectorAll(
    '[data-testid="list-item"][type="CATEGORY"]'
  );

  for (let category of categories) {
    let nameElement = category.querySelector(
      "span.ListItem__Name-menu-mfe__sc-r7cvpc-2"
    );

    if (nameElement && nameElement.textContent.trim() === categoryName) {
      nameElement.click();
      console.log(`Clicked on category: ${categoryName}`);
      return;
    }
  }
  console.log(`Category '${categoryName}' not found.`);
}

swiggy.post("/data", async (req, res) => {
  const resId = 1068382;

  const { data } = req.body;
  let category = req.body.category;

  try {
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

    await page.goto(
      `https://partner.swiggy.com/menu/details/restaurant/${resId}`,
      { waitUntil: "networkidle2" }
    );

    await delay(5000);

    const iframes = await page.$$("iframe");
    console.log("Number of iframes:", iframes.length);

    let frame = null;

    for (const iframe of iframes) {
      frame = await iframe.contentFrame();
      if (frame) {
        console.log("Switched to iframe.");
        await frame.waitForSelector("button", { timeout: 10000 });

        const buttons = await frame.$$("button");

        for (let button of buttons) {
          const text = await frame.evaluate(
            (el) => el.innerText.trim(),
            button
          );
          console.log("Button text in iframe:", text);

          if (text.includes("+ ADD NEW")) {
            await button.click();
            console.log("Clicked '+ ADD NEW' inside iframe.");
            await delay(3000);
            break;
          }
        }
        break;
      }
    }

    if (frame) {
      await frame.waitForSelector(
        'input[placeholder="Type your Category name*"]',
        { visible: true }
      );

      const inputField = await frame.$(
        'input[placeholder="Type your Category name*"]'
      );
      if (inputField) {
        await inputField.type(category);
        console.log("Typed into the input field.");
      } else {
        console.log("Input field not found inside iframe.");
      }

      await delay(1000);

      // **Wait for 'Save' button and click it**
      await frame.waitForSelector("button.sc-ghWlax.kutSJv", {
        visible: true,
        timeout: 15000,
      });

      const saveButton = await frame.$("button.sc-ghWlax.kutSJv");
      if (saveButton) {
        await saveButton.click();
        console.log("Clicked the 'Save' button.");
        await delay(3000);
      } else {
        console.log("'Save' button not found.");
      }

      for (let item of data) {
        const { name, description, base_price, variants, img } = item;

        console.log(category);

        await delay(3000);

        // const foundCategories = await frame.evaluate(() => {
        //   const elements = [
        //     ...document.querySelectorAll(
        //       'div[data-testid="category-list"] div[data-testid="list-item"] span'
        //     ),
        //   ];

        //   console.log("Total category elements found:", elements.length);
        //   return elements.map((el) => el.innerText.trim());
        // });

        // console.log("Extracted Categories:", foundCategories);

        // const categoryName = category;

        // if (!foundCategories.includes(categoryName)) {
        //   console.log(`❌ Category '${categoryName}' not found.`);
        // } else {
        //   await frame.evaluate((category) => {
        //     const categoryElement = [
        //       ...document.querySelectorAll(
        //         'div[data-testid="category-list"] div[data-testid="list-item"]'
        //       ),
        //     ].find(
        //       (el) => el.querySelector("span")?.innerText.trim() === category
        //     );

        //     if (categoryElement) {
        //       console.log(`✅ Clicking on category: ${category}`);
        //       categoryElement.click();
        //     } else {
        //       console.log(`❌ Category '${category}' not found in DOM.`);
        //     }
        //   }, categoryName);
        // }

        console.log("Switched to iframe.");

        await frame.waitForSelector("button", { timeout: 10000 });

        const buttons = await frame.$$("button");

        let addNewButtons = [];

        for (let button of buttons) {
          const text = await frame.evaluate(
            (el) => el.innerText.trim(),
            button
          );
          console.log("Button text in iframe:", text);

          if (text.includes("+ ADD NEW")) {
            addNewButtons.push(button);
          }
        }

        if (addNewButtons.length >= 2) {
          await addNewButtons[1].click();
          console.log("Clicked the second '+ ADD NEW' button inside iframe.");
          await delay(3000);
        } else {
          console.log("Second '+ ADD NEW' button not found.");
        }

        // Type Item Name

        await frame.waitForSelector('input[placeholder="Item name"]', {
          visible: true,
        });
        const inputTitle = await frame.$('input[placeholder="Item name"]');
        if (inputTitle) {
          await inputTitle.type(name);
          console.log("Typed into the input title field.");
        } else {
          console.log("Input title field not found inside iframe.");
        }

        await frame.waitForSelector(
          'textarea[data-testid="item-description"]',
          {
            visible: true,
          }
        );

        const inputDescription = await frame.$(
          'textarea[data-testid="item-description"]'
        );

        if (inputDescription) {
          await inputDescription.type(description);
          console.log("Typed into the input Description field.");
        } else {
          console.log("Input Description field not found inside iframe.");
        }

        if (!description) {
          await frame.waitForSelector(
            "button.DescriptionRecommendation__UseButton-menu-mfe__sc-1jgbwdq-8",
            {
              visible: true,
            }
          );

          const useThisButton = await frame.$(
            "button.DescriptionRecommendation__UseButton-menu-mfe__sc-1jgbwdq-8"
          );

          if (useThisButton) {
            await useThisButton.click();
            console.log("✅ Clicked the 'Use this' button.");
          } else {
            console.log("❌ 'Use this' button not found.");
          }
        }
        //Price

        await frame.waitForSelector('input[name="itemPrice"]', {
          visible: true,
        });

        const inputPrice = await frame.$('input[name="itemPrice"]');

        if (inputPrice) {
          await frame.evaluate(
            (el) => el.scrollIntoView({ behavior: "smooth", block: "center" }),
            inputPrice
          );

          await inputPrice.type(`${base_price}`);
          console.log("Typed into the input Price field.");
        } else {
          console.log("Input Price field not found inside iframe.");
        }

        await frame.waitForSelector('select[name="itemGST"]', {
          visible: true,
        });

        const gstDropdown = await frame.$('select[name="itemGST"]');

        if (gstDropdown) {
          await frame.evaluate(
            (el) => el.scrollIntoView({ behavior: "smooth", block: "center" }),
            gstDropdown
          );

          await frame.select('select[name="itemGST"]', "5");
          console.log("Selected 5% GST.");
        } else {
          console.log("GST dropdown not found inside iframe.");
        }

        if (variants.length > 0) {
          await frame.waitForSelector('[data-testid="Size"]', {
            visible: true,
          });

          // Click on the submit button
          const addVariantBtn = await frame.$('[data-testid="Size"]');

          console.log("final", addVariantBtn);

          await delay(1000);

          if (addVariantBtn) {
            await addVariantBtn.click();
            console.log("Clicked the 'Add Variants' button.");
          } else {
            console.log("'Add Variants' button not found.");
          }

          const { values } = variants[0];
          console.log("val", values);

          if (values.length > 2) {
            console.log(
              "More than 2 variants detected. Adding required fields first..."
            );

            const addMoreButtonSelector =
              "button.styles__AddMoreOptionsButton-menu-mfe__sc-1bs1sei-36";

            for (let i = 2; i < values.length; i++) {
              await frame.waitForSelector(addMoreButtonSelector, {
                visible: true,
              });

              const addMoreButton = await frame.$(addMoreButtonSelector);
              if (addMoreButton) {
                await addMoreButton.click();
                console.log(
                  `Clicked 'ADD MORE OPTION' button for variant index ${i}.`
                );
                await delay(1000);
              } else {
                console.log("'ADD MORE OPTION' button not found.");
              }
            }
          }

          for (let i = 0; i < values.length; i++) {
            const { title } = values[i];
            let price = values[i].price;

            price -= base_price;

            // Wait for variant name fields
            await frame.waitForSelector(
              "input.styles__VariantNameInput-menu-mfe__sc-1bs1sei-9",
              { visible: true }
            );

            // Re-fetch variant name inputs
            const variantNameInputs = await frame.$$(
              "input.styles__VariantNameInput-menu-mfe__sc-1bs1sei-9"
            );

            if (variantNameInputs.length > i) {
              await variantNameInputs[i].focus();
              await variantNameInputs[i].click({ clickCount: 3 });
              await variantNameInputs[i].type(title, { delay: 100 });
              console.log(
                `Typed '${title}' into Variant Name input field at index ${i}.`
              );
            } else {
              console.log(`Variant Name input field not found for index ${i}.`);
              continue;
            }

            await delay(1000);
            const additionalPriceInputs = await frame.$$(
              "input.styles__AdditionalPriceInput-menu-mfe__sc-1bs1sei-16"
            );

            if (additionalPriceInputs.length > i) {
              await additionalPriceInputs[i].focus();
              console.log(
                `Focused on Additional Price input at index ${i} to trigger auto-correction.`
              );
            }

            await delay(1000);

            const suggestionSelector = `div.SpellCheckInfoBar__SubText-menu-mfe__sc-k4s21k-6`;
            const suggestionElement = await frame.$(suggestionSelector);

            if (suggestionElement) {
              console.log(`Suggestion found! Clicking to apply '${title}'.`);
              await suggestionElement.click();
              await delay(1000);
            } else {
              console.log(`No suggestion found. Keeping '${title}' as typed.`);
            }

            // Now type the price
            await frame.waitForSelector(
              "input.styles__AdditionalPriceInput-menu-mfe__sc-1bs1sei-16",
              { visible: true }
            );

            if (additionalPriceInputs.length > i) {
              await additionalPriceInputs[i].click({ clickCount: 3 });
              await additionalPriceInputs[i].type(`${price}`, { delay: 100 });
              console.log(
                `Typed '${price}' into Additional Price input field at index ${i}.`
              );
            } else {
              console.log(
                `Additional Price input field not found for index ${i}.`
              );
            }

            await delay(1000);
          }

          await frame.waitForSelector(
            "button.styles__UpdateButton-menu-mfe__sc-1bs1sei-35",
            { visible: true }
          );

          const saveVariantGroupButton = await frame.$(
            "button.styles__UpdateButton-menu-mfe__sc-1bs1sei-35"
          );

          if (saveVariantGroupButton) {
            await saveVariantGroupButton.click();
            console.log("Clicked the 'SAVE VARIANT GROUP' button.");
          } else {
            console.log("'SAVE VARIANT GROUP' button not found.");
          }

          await delay(1000);
        }

        const imageUrl = img;
        // ||"https://b.zmtcdn.com/data/dish_photos/cf4/eff3178d437faf3157af9944d491ecf4.jpg"
        if (imageUrl) {
          await delay(2000);

          await frame.waitForSelector('input[type="file"][name="img"]', {
            visible: true,
          });

          const imagesFolderPath = path.resolve(__dirname, "images");
          if (!fs.existsSync(imagesFolderPath)) {
            fs.mkdirSync(imagesFolderPath);
          }

          const localImagePath = path.resolve(
            imagesFolderPath,
            "downloaded-image.jpg"
          );
          const response = await axios({
            url: imageUrl,
            method: "GET",
            responseType: "stream",
          });
          const writer = fs.createWriteStream(localImagePath);
          response.data.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });

          const fileInput = await frame.$('input[type="file"][name="img"]');
          console.log("fileInput", fileInput);
          await fileInput.uploadFile(localImagePath);

          await delay(3000);

          await frame.waitForSelector(
            "button.pyxl-food__nextstep-btn.pyxl-w-full.pyxl-uppercase.pyxl-cursor-pointer",
            { visible: true }
          );

          const submitButton = await frame.$(
            "button.pyxl-food__nextstep-btn.pyxl-w-full.pyxl-uppercase.pyxl-cursor-pointer"
          );

          if (submitButton) {
            // Extract button text
            const buttonText = await frame.evaluate(
              (el) => el.textContent.trim(),
              submitButton
            );

            if (buttonText.includes("reupload photo")) {
              console.log(
                "Reupload Photo button found. Clicking close icon..."
              );

              // Select and click the close button (img element)
              const closeButton = await frame.$(
                "img.pyxl-float-right.pyxl-w-auto.pyxl-cursor-pointer"
              );
              if (closeButton) {
                await closeButton.click();
                console.log("Clicked the close icon.");

                // Wait for "Yes" button to appear
                await frame.waitForSelector(
                  "button.pyxl-food__inprogress-btn",
                  { visible: true }
                );

                // Select and click the "Yes" button
                const yesButton = await frame.$(
                  "button.pyxl-food__inprogress-btn"
                );
                if (yesButton) {
                  await yesButton.click();
                  console.log("Clicked the 'Yes' button.");
                } else {
                  console.log("'Yes' button not found.");
                }
              } else {
                console.log("Close icon not found.");
              }
            } else if (buttonText.includes("submit")) {
              await submitButton.click();
              console.log("Clicked the 'Submit' button.");
            } else {
              console.log(
                "Button found, but text does not match expected values."
              );
            }
          } else {
            console.log("Button not found.");
          }
        }

        await delay(1000);

        await frame
          .waitForSelector('[data-testid="item-submit-button"]', {
            visible: true,
            timeout: 3000,
          })
          .catch(() =>
            console.log(
              "'Final Submit' button not found initially. Looking for 'Submit Anyway' button..."
            )
          );

        await delay(1000);

        // Try to click the main submit button
        const finalSubmit = await frame.$('[data-testid="item-submit-button"]');

        await finalSubmit.click();
        console.log("Clicked the 'Final Submit' button.");

        console.log(
          "'Final Submit' button not found. Checking for 'Submit Anyway'..."
        );

        // Try clicking the 'Ignore & Submit Anyway' button
        const submitAnywayButton = await frame.$(
          "div.SubmitConfirmModal__IgnoreButton-menu-mfe__sc-18oy7lx-1.edjSRW"
        );

        if (submitAnywayButton) {
          await submitAnywayButton.click();
          console.log("Clicked the 'Submit Anyway' button.");
        } else {
          console.log(
            "'Submit Anyway' button not found. Trying text-based search..."
          );

          // Fallback: Find by text content
          const buttons = await frame.$$("div");
          for (let button of buttons) {
            const text = await button.evaluate((node) => node.innerText.trim());
            if (text.includes("IGNORE & SUBMIT ANYWAY")) {
              await button.click();
              console.log(
                "Clicked the 'Submit Anyway' button using text search."
              );
              break;
            }
          }
        }
      }
    } else {
      console.log("No iframe found.");
    }

    res.status(200).send("Data received and processed successfully!");
  } catch (err) {
    console.error("Error during automation:", err);
    res.status(500).send(`Error during automation: ${err.message}`);
  }
});

export default swiggy;
