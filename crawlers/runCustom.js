/* eslint-env browser */

import { chromium } from 'playwright';
import path from 'path';
import { createCrawleeSubFolders, runAxeScript } from './commonCrawlerFunc.js';
import { cleanUp } from '../utils.js';
import constants, {
  getIntermediateScreenshotsPath,
  guiInfoStatusTypes,
} from '../constants/constants.js';
import { isSkippedUrl } from '../constants/common.js';
import { consoleLogger, silentLogger, guiInfoLog } from '../logs.js';

const DEBUG = false;
const log = str => {
  if (DEBUG) {
    console.log(str);
  }
};
const screenshotFullPage = async (page, screenshotsDir, screenshotIdx) => {
  const imgName = `PHScan-screenshot${screenshotIdx}.png`;
  const imgPath = path.join(screenshotsDir, imgName);

  const fullPageSize = await page.evaluate(() => ({
    width: Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.body.clientWidth,
      document.documentElement.clientWidth,
    ),
    height: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight,
    ),
  }));

  const originalSize = page.viewportSize();

  const usesInfiniteScroll = async () => {
    const prevHeight = await page.evaluate(() => document.body.scrollHeight);

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    const isLoadMoreContent = async () =>
      new Promise(resolve => {
        setTimeout(async () => {
          await page.waitForLoadState('domcontentloaded');

          const newHeight = await page.evaluate(
            // eslint-disable-next-line no-shadow
            () => document.body.scrollHeight,
          );
          const result = newHeight > prevHeight;

          resolve(result);
        }, 2500);
      });

    const result = await isLoadMoreContent();
    return result;
  };

  await usesInfiniteScroll();

  // scroll back to top of page for screenshot
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });

  consoleLogger.info(`Screenshot page at: ${page.url()}`);
  silentLogger.info(`Screenshot page at: ${page.url()}`);

  await page.screenshot({
    path: imgPath,
    clip: {
      x: 0,
      y: 0,
      width: fullPageSize.width,
      height: 5400,
    },
    fullPage: true,
    scale: 'css',
  });

  if (originalSize) await page.setViewportSize(originalSize);

  return `screenshots/${imgName}`; // relative path from reports folder
};

const runAxeScan = async (
  page,
  needsReviewItems,
  includeScreenshots,
  randomToken,
  customFlowDetails,
  dataset,
  urlsCrawled,
) => {
  const result = await runAxeScript(
    needsReviewItems,
    includeScreenshots,
    page,
    randomToken,
    customFlowDetails,
  );

  await dataset.pushData(result);

  urlsCrawled.scanned.push({
    url: page.url(),
    pageTitle: result.pageTitle,
    pageImagePath: customFlowDetails.pageImagePath,
  });
};

const MENU_POSITION = {
  top: 'TOP',
  bottom: 'BOTTOM',
};
const addOverlayMenu = async (page, urlsCrawled, menuPos) => {
  await page.waitForLoadState('domcontentloaded');
  log(`Overlay menu: adding to ${menuPos}...`);

  // Add the overlay menu with initial styling
  return page
    .evaluate(
      async vars => {
        const menu = document.createElement('div');
        menu.className = 'purple-hats-menu';
        if (vars.menuPos === vars.MENU_POSITION.top) {
          menu.style.top = '0';
        } else {
          menu.style.bottom = '0';
        }
        let isDragging = false;
        let initialY;
        let offsetY;

        menu.addEventListener('mousedown', e => {
          if (e.target.tagName.toLowerCase() !== 'button') {
            e.preventDefault();
            isDragging = true;
            initialY = e.clientY - menu.getBoundingClientRect().top;
          }
        });

        document.addEventListener('mousemove', e => {
          if (isDragging) {
            menu.style.removeProperty('bottom');
            offsetY = e.clientY - initialY;
            menu.style.top = `${offsetY}px`;
          }
        });

        document.addEventListener('mouseup', () => {
          if (isDragging) {
            // Snap the menu when it is below half the screen
            const halfScreenHeight = window.innerHeight / 2;
            if (offsetY >= halfScreenHeight) {
              menu.style.removeProperty('top');
              menu.style.bottom = '0';
              window.updateMenuPos(vars.MENU_POSITION.bottom);
            } else {
              menu.style.removeProperty('bottom');
              menu.style.top = '0';
              window.updateMenuPos(vars.MENU_POSITION.top);
            }

            isDragging = false;
          }
        });

        const para = document.createElement('p');
        para.innerText = `Pages Scanned: ${vars.urlsCrawled.scanned.length || 0}`;

        const button = document.createElement('button');
        button.innerText = 'Scan this page';
        button.addEventListener('click', async () => {
          await window.handleOnScanClick();
        });

        menu.appendChild(para);
        menu.appendChild(button);

        const styleTag = document.createElement('style');
        // TODO: separate out into css file if this gets too big
        styleTag.textContent = `
        .purple-hats-menu {
          position: fixed;
          left: 0;
          width: 100%;
          box-sizing: border-box;
          background-color: rgba(0, 0, 0, 0.8);
          display: flex;
          justify-content: space-between;
          padding: 10px;
          z-index: 2147483647;
          cursor: grab;
          color: #fff;
        }
        
        .purple-hats-menu button {
          background-color: #785ef0;
          color: #fff;
          border: none;
          border-radius: 50rem!important;
          padding: 10px 20px;
          cursor: pointer;
        }
        `;

        // shadow dom used to avoid styling from page
        const shadowHost = document.createElement('div');
        shadowHost.id = 'purple-hats-shadow-host';
        const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
        shadowRoot.appendChild(menu);
        shadowRoot.appendChild(styleTag);

        document.body.appendChild(shadowHost);
      },
      { menuPos, MENU_POSITION, urlsCrawled },
    )
    .then(() => {
      log('Overlay menu: successfully added');
    })
    .catch(error => {
      error('Overlay menu: failed to add', error);
    });
};

const removeOverlayMenu = async page => {
  await page
    .evaluate(() => {
      const existingOverlay = document.querySelector('#purple-hats-shadow-host');
      if (existingOverlay) {
        existingOverlay.remove();
        return true;
      }
      return false;
    })
    .then(removed => {
      if (removed) {
        log('Overlay Menu: successfully removed');
      }
    });
};

const runCustom = async (
  url,
  randomToken,
  viewportSettings,
  needsReviewItems,
  blacklistedPatterns,
  includeScreenshots,
) => {
  // checks and delete datasets path if it already exists
  await cleanUp(randomToken);

  process.env.CRAWLEE_STORAGE_DIR = randomToken;

  let menuPos = MENU_POSITION.top;

  let scannedIdx = 0;
  const urlsCrawled = { ...constants.urlsCrawledObj };
  const { dataset } = await createCrawleeSubFolders(randomToken);
  const intermediateScreenshotsPath = getIntermediateScreenshotsPath(randomToken);
  const processPage = async page => {
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    } catch (e) {
      consoleLogger.info('Unable to detect networkidle');
      silentLogger.info('Unable to detect networkidle');
    }

    log(`Scan - processPage: ${page.url()}`);

    const pageUrl = page.url();

    if (blacklistedPatterns && isSkippedUrl(pageUrl, blacklistedPatterns)) {
      const continueScan = await page.evaluate(() =>
        window.confirm('Page has been excluded, would you still like to proceed with the scan?'),
      );
      if (!continueScan) {
        urlsCrawled.userExcluded.push(pageUrl);
        return;
      }
    }

    // TODO: Check if necessary
    // To skip already scanned pages
    // if (urlsCrawled.scanned.some(scan => scan.url === pageUrl)) {
    //   page.evaluate(() => {
    //     window.alert('Page has already been scanned, skipping scan.');
    //   });
    //   return;
    // }

    const initialScrollPos = await page.evaluate(() => ({
      x: window.scrollX,
      y: window.scrollY,
    }));

    scannedIdx += 1;
    const pageImagePath = await screenshotFullPage(page, intermediateScreenshotsPath, scannedIdx);

    guiInfoLog(guiInfoStatusTypes.SCANNED, {
      numScanned: urlsCrawled.scanned.length,
      urlScanned: pageUrl,
    });

    await runAxeScan(
      page,
      needsReviewItems,
      includeScreenshots,
      randomToken,
      {
        pageIndex: scannedIdx,
        pageImagePath,
      },
      dataset,
      urlsCrawled,
    );

    await page.evaluate(pos => {
      window.scrollTo(pos.x, pos.y);
    }, initialScrollPos);
  };

  try {
    const browser = await chromium.launch({
      args: ['--window-size=1920,1040'],
      headless: false,
      channel: 'chrome',
      // bypassCSP: true,
      devtools: DEBUG,
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      serviceWorkers: 'block',
      viewport: null,
      ...viewportSettings.playwrightDeviceDetailsObject,
    });

    const page = await context.newPage();
    page.on('dialog', () => {});
    // Detection of new page
    page.on('domcontentloaded', async () => {
      log(`Content loaded: ${page.url()}`);
      await removeOverlayMenu(page);
      await addOverlayMenu(page, urlsCrawled, menuPos);
    });

    // Window functions exposed in browser
    const handleOnScanClick = async () => {
      log('Scan: click detected');
      try {
        await removeOverlayMenu(page);
        await processPage(page);
        log('Scan: success');
        await addOverlayMenu(page, urlsCrawled, menuPos);
      } catch (error) {
        log('Scan: failed', error);
      }
    };
    await page.exposeFunction('handleOnScanClick', handleOnScanClick);

    const updateMenuPos = newPos => {
      log(`Overlay menu: position updated from ${menuPos} to ${newPos}`);
      menuPos = newPos;
    };
    await page.exposeFunction('updateMenuPos', updateMenuPos);

    await page.goto(url);

    const pageClosedPromise = new Promise(resolve => {
      page.on('close', () => {
        log('Page: close detected');
        resolve(true);
      });
    });
    await pageClosedPromise;
  } catch (error) {
    log('PLAYWRIGHT EXECUTION ERROR', error);
    process.exit(1);
  }

  guiInfoLog(guiInfoStatusTypes.COMPLETED);
  return urlsCrawled;
};

export default runCustom;
