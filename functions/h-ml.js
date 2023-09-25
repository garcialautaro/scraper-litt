//!--------------------------- SCRAPER HOMBRES MELI ---------------------------

const { google } = require('googleapis');
const { Builder, By } = require('selenium-webdriver');
const { Options } = require('selenium-webdriver/chrome');
async function scrapeAndWriteToGoogleSheet(numeroPaginaMaximo = 5) {
  const options = new Options().headless();

  const browser = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  let marcas;
  let categorias;

  try {
    marcas = require('../marcas.js');
    categorias = require('../categorias.js');



  } catch (error) {
    console.error('Error al leer los archivos JSON:', error);
    return;
  }

  try {
    const page = await browser;

    // Configurar credenciales de autenticación de Google Sheets
    const creds = require('../scraper-394114-3a481838b02c.js');
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });


    // ID del archivo de Google Sheets que deseas modificar
    const spreadsheetId = '1tIq4E6irAipZ-7dI2N7J8F6laJeKyPZAevkThrroui4';

    // Navega a una página web
    await page.get('https://listado.mercadolibre.com.ar/ropa-accesorios/hombre/_Tienda_all');

    let numeroPagina = 1;
    const dataByCategory = {};

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    for (let i = numeroPagina; i <= numeroPaginaMaximo; i++) {
      console.log("-----------------Cargo página " + numeroPagina + "-----------------");

      try {
        let currentScrollPosition = 0;
        let scrollHeight = await page.executeScript(`return document.body.scrollHeight;`);
        while (currentScrollPosition < scrollHeight) {
          await page.executeScript(`window.scrollTo(0, ${currentScrollPosition});`);
          console.log("-------------------SCROLLING--------------------");
          await sleep(250);
          currentScrollPosition += 400;
        }

        const superElements = await page.findElements(By.className('ui-search-result__wrapper'));

        console.log("-------------Comienzo a categorizar-------------");

        for (const element of superElements) {
          try {
            const nameElement = await element.findElement(By.className('ui-search-link'));
            let name = await nameElement.getAttribute('title');
            name = name ? name.toUpperCase() : '';

            const marcaClass = 'ui-search-item__brand-discoverability ui-search-item__group__element shops__items-group-details';
            const marcaElement = await element.findElement(By.className(marcaClass));
            const marcaName = await marcaElement.getText();

            let categoryBase = 'SIN';
            let marcaSheet = '';

            for (const marca of marcas) {
              if (marcaName.toUpperCase().includes(marca.toUpperCase())) {
                categoryBase = 'CON';
                marcaSheet = marca.toUpperCase();
                break;
              }
            }

            let category = 'SIN-CATEGORIA';
            for (const [key, value] of Object.entries(categorias)) {
              if (name.includes(key.toUpperCase())) {
                category = `${value}-${categoryBase}`;
                break;
              }
            }

            let priceText = '';
            let priceNumber = 0;
            const priceContainerElement = await element.findElement(By.className('andes-money-amount__fraction'));
            priceText = await priceContainerElement.getText();
            priceText = priceText.replace(/\./g, '');
            priceNumber = parseFloat(priceText);

            const link = await nameElement.getAttribute('href');

            if (!dataByCategory[category]) {
              dataByCategory[category] = [];
            }
            dataByCategory[category].push([name, priceNumber, link, marcaSheet]);
          } catch (error) {
            console.error("Error al procesar un elemento:", error);
            continue;
          }
        }

        const nextPageLink = await page.findElement(By.className('andes-pagination__button andes-pagination__button--next shops__pagination-button'));
        await nextPageLink.click();
        await sleep(3000);
        numeroPagina += 1;

      } catch (error) {
        console.error('Error al procesar la página:', error);
      }
    }

    await browser.quit();
    console.log("-------Comienzo a cargar datos en Google Sheets--------");

    const sheets = google.sheets({ version: 'v4', auth });

    for (const category in dataByCategory) {
      try {
        await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${category}!A:A`,
        });
      } catch (error) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: category,
                  },
                },
              },
            ],
          },
        });
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${category}!A:D`,
      });

      const dataToWrite = dataByCategory[category];
      if (dataToWrite.length > 0) {
        const range = `${category}!A:C`;
        const resource = { values: dataToWrite };
        const writeResponse = await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource,
        });
        console.log('Datos actualizados:', writeResponse.data);
      }
    }
    return true;
  } catch (error) {
    console.error('Ocurrió un error en la función principal:', error);
    return false;
  }
}

// scrapeAndWriteToGoogleSheet();

module.exports = scrapeAndWriteToGoogleSheet;