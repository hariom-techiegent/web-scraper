// scraper.js
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { writeToJSON, writeToCSV } = require("./utils/storage");
const logger = require("./utils/logger");

const argv = yargs(hideBin(process.argv))
  .option("keyword", {
    alias: "k",
    type: "string",
    description: "Genre or keyword to search",
    demandOption: true,
  })
  .option("pages", {
    alias: "p",
    type: "number",
    default: 1,
    description: "Number of pages to scrape",
  })
  .help().argv;

(async () => {
  const { keyword, pages } = argv;
  const possiblePaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];

  const getChromiumPath = () =>
    possiblePaths.find((path) => fs.existsSync(path)) || null;

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
    executablePath: getChromiumPath(),
  });

  const page = await browser.newPage();
  const baseUrl = `https://www.imdb.com/search/title/?genres=${keyword}`;
  const allMovies = [];

  for (let i = 0; i < pages; i++) {
    const start = i * 50 + 1;
    const url = `${baseUrl}&start=${start}&explore=title_type,genres`;
    logger.info(`Navigating to ${url}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector(".ipc-metadata-list-summary-item");

      const movies = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll(".ipc-metadata-list-summary-item")
        ).map((el) => {
          const title = el.querySelector(".ipc-title__text")?.innerText || "";

          const metadataContainer = el.querySelector(".dli-title-metadata");
          const year =
            metadataContainer.querySelectorAll(".dli-title-metadata-item")[0]
              ?.innerText || "";
          const rating =
            document
              .querySelector(
                '[data-testid="ratingGroup--imdb-rating"] .ipc-rating-star--rating'
              )
              ?.innerText.trim() || "";
          const summary =
            document
              .querySelector(
                ".title-description-plot-container .ipc-html-content-inner-div"
              )
              ?.innerText.trim() || "";
          return {
            title,
            year,
            rating,
            summary,
            //Not able to retrieve at this time 
            // directors: directors || "",
            // stars: stars || "",
          };
        });
      });

      allMovies.push(...movies);
      logger.info(`✔ Scraped ${movies.length} movies from page ${i + 1}`);
    } catch (error) {
      logger.error(`❌ Error on page ${i + 1}: ${error.message}`);
    }
  }

  await browser.close();
  console.log("allMovies>>>", allMovies);

    fs.mkdirSync("data", { recursive: true });
    await writeToJSON(allMovies, "data/movies.json");
    await writeToCSV(allMovies, "data/movies.csv");

  logger.info(`🎉 Finished scraping. Total movies: ${allMovies.length}`);
})();
