import puppeteer from "puppeteer";
import XLSX from "xlsx";

const workbook = XLSX.readFile("/Users/nihat/Downloads/inventory (1).csv");
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
const asinList = jsonData.slice(1).map((item) => item[0]);

console.log(asinList);

async function checkImagesInProductDescription(asinList) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const asinsWithImages = [];

  for (let i = 0; i < asinList.length; i++) {
    const asin = asinList[i];
    const url = `https://www.amazon.com/dp/${asin}`;

    await page.goto(url);

    // Sayfanın tamamen yüklenmesi için aşağıya doğru yavaşça kaydırma
    await autoScroll(page);

    await page.waitForSelector("#aplus_feature_div");

    const hasImage = await page.evaluate(() => {
      const aplusFeatureDiv = document.querySelector("#aplus_feature_div");
      if (aplusFeatureDiv) {
        const imgElements = aplusFeatureDiv.getElementsByTagName("img");
        return imgElements.length > 0;
      }
      return false;
    });

    if (hasImage) {
      console.log(asin);
      asinsWithImages.push(asin);
    }
  }

  // await browser.close();

  return asinsWithImages;
}

// Aşağıya doğru yavaşça kaydırmak için yardımcı işlev
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      let totalHeight = 0;
      const distance = 100;
      const scrollInterval = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(scrollInterval);
          resolve();
        }
      }, 100);
    });
  });
}

checkImagesInProductDescription(asinList)
  .then((asinsWithImages) => {
    console.log("ASINs with images:", asinsWithImages);

    // ASIN listesini XLSX dosyası olarak kaydetme
    const data = [["ASIN"]];
    asinsWithImages.forEach((asin) => {
      data.push([asin]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ASINs");
    XLSX.writeFile(workbook, "asins_with_images.xlsx");
  })
  .catch((error) => {
    console.error("Error:", error);
  });
