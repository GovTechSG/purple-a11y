/* eslint-disable no-shadow */
/* eslint-disable no-alert */
/* eslint-disable no-param-reassign */
/* eslint-env browser */
import path from 'path';
import { runAxeScript } from '../commonCrawlerFunc.js';
import { consoleLogger, guiInfoLog, silentLogger } from '../../logs.js';
import { guiInfoStatusTypes } from '../../constants/constants.js';
import { isSkippedUrl } from '../../constants/common.js';

export const DEBUG = false;
export const log = str => {
  if (DEBUG) {
    console.log(str);
  }
};

export const screenshotFullPage = async (page, screenshotsDir, screenshotIdx) => {
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

export const runAxeScan = async (
  page,
  includeScreenshots,
  randomToken,
  customFlowDetails,
  dataset,
  urlsCrawled,
) => {
  const result = await runAxeScript(
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

export const processPage = async (page, processPageParams) => {
  // make sure to update processPageParams' scannedIdx
  processPageParams.scannedIdx += 1;
  const {
    scannedIdx,
    blacklistedPatterns,
    includeScreenshots,
    dataset,
    intermediateScreenshotsPath,
    urlsCrawled,
    randomToken,
  } = processPageParams;
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

  const pageImagePath = await screenshotFullPage(page, intermediateScreenshotsPath, scannedIdx);

  guiInfoLog(guiInfoStatusTypes.SCANNED, {
    numScanned: urlsCrawled.scanned.length,
    urlScanned: pageUrl,
  });

  await runAxeScan(
    page,
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

export const MENU_POSITION = {
  top: 'TOP',
  bottom: 'BOTTOM',
};

export const updateMenu = async (page, urlsCrawled) => {
  await page.waitForLoadState('domcontentloaded');
  log(`Overlay menu: updating: ${page.url()}`);
  await page.evaluate(
    vars => {
      const shadowHost = document.querySelector('#purple-a11y-shadow-host');
      if (shadowHost) {
        const p = shadowHost.shadowRoot.querySelector('#purple-a11y-p-pages-scanned');
        if (p) {
          p.innerText = `Pages Scanned: ${vars.urlsCrawled.scanned.length || 0}`;
        }
      }
    },
    { urlsCrawled },
  );
  log(`Overlay menu: updating: success`);
};

export const addOverlayMenu = async (page, urlsCrawled, menuPos) => {
  await page.waitForLoadState('domcontentloaded');
  log(`Overlay menu: adding to ${menuPos}...`);

  // Add the overlay menu with initial styling
  return page
    .evaluate(
      async vars => {
        const menu = document.createElement('div');
        menu.className = 'purple-a11y-menu';
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
            const isTopHalf = offsetY < halfScreenHeight;
            if (isTopHalf) {
              menu.style.removeProperty('bottom');
              menu.style.top = '0';
              window.updateMenuPos(vars.MENU_POSITION.top);
            } else {
              menu.style.removeProperty('top');
              menu.style.bottom = '0';
              window.updateMenuPos(vars.MENU_POSITION.bottom);
            }

            isDragging = false;
          }
        });

        const p = document.createElement('p');
        p.id = 'purple-a11y-p-pages-scanned';
        p.innerText = `Pages Scanned: ${vars.urlsCrawled.scanned.length || 0}`;

        const button = document.createElement('button');
        button.innerText = 'Scan this page';
        button.addEventListener('click', async () => {
          await window.handleOnScanClick();
        });

        menu.appendChild(p);
        menu.appendChild(button);

        const sheet = new CSSStyleSheet();
        // TODO: separate out into css file if this gets too big
        sheet.replaceSync(`
        .purple-a11y-menu {
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
        
        .purple-a11y-menu button {
          background-color: #785ef0;
          color: #fff;
          border: none;
          border-radius: 50rem;
          padding: 10px 20px;
          cursor: pointer;
        }
        `);

        // shadow dom used to avoid styling from page
        const shadowHost = document.createElement('div');
        shadowHost.id = 'purple-a11y-shadow-host';
        const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

        shadowRoot.adoptedStyleSheets = [sheet];

        shadowRoot.appendChild(menu);

        let currentNode = document.body
        if (document.body) {
          // The <body> element exists
          if ( document.body.nodeName.toLowerCase() === 'frameset') {
              // if currentNode is a <frameset>
              // Move the variable outside the frameset then appendChild the component
              while (currentNode.nodeName.toLowerCase()=== 'frameset' ) {
                currentNode = currentNode.parentElement
              }
              currentNode.appendChild(shadowHost);
            } else {
              // currentNode is a <body>
              currentNode.appendChild(shadowHost);
            }
        } else if (document.head) {
          // The <head> element exists
          // Append the variable below the head
          head.insertAdjacentElement('afterend', shadowHost);
        } else {
          // Neither <body> nor <head> nor <html> exists
          // Append the variable to the document
          document.documentElement.appendChild(shadowHost);
        }

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

export const removeOverlayMenu = async page => {
  await page
    .evaluate(() => {
      const existingOverlay = document.querySelector('#purple-a11y-shadow-host');
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

export const initNewPage = async (page, pageClosePromises, processPageParams, pagesDict) => {
  let menuPos = MENU_POSITION.top;

  // eslint-disable-next-line no-underscore-dangle
  const pageId = page._guid;

  page.on('dialog', () => {});

  const pageClosePromise = new Promise(resolve => {
    page.on('close', () => {
      log(`Page: close detected: ${page.url()}`);
      delete pagesDict[pageId];
      resolve(true);
    });
  });
  pageClosePromises.push(pageClosePromise);

  if (!pagesDict[pageId]) {
    pagesDict[pageId] = { page };
  }

  // Detection of new url within page
  page.on('domcontentloaded', async () => {
    log(`Content loaded: ${page.url()}`);
    try {
      await removeOverlayMenu(page);
      await addOverlayMenu(page, processPageParams.urlsCrawled, menuPos);
      await page.waitForLoadState();
      const existingOverlay = await page.evaluate(() => {
        return document.querySelector('#purple-a11y-shadow-host');
      });
      if (!existingOverlay) { await addOverlayMenu(page, processPageParams.urlsCrawled, menuPos);}
    } catch (e) {
      consoleLogger.info("Error in adding overlay menu to page");
      silentLogger.info("Error in adding overlay menu to page");
    }
  });

  // Window functions exposed in browser
  const handleOnScanClick = async () => {
    log('Scan: click detected');
    try {
      await removeOverlayMenu(page);
      await processPage(page, processPageParams);
      log('Scan: success');
      await addOverlayMenu(page, processPageParams.urlsCrawled, menuPos);

      Object.keys(pagesDict)
        .filter(k => k !== pageId)
        .forEach(k => {
          updateMenu(pagesDict[k].page, processPageParams.urlsCrawled);
        });
    } catch (error) {
      log('Scan: failed', error);
    }
  };
  await page.exposeFunction('handleOnScanClick', handleOnScanClick);

  const updateMenuPos = newPos => {
    const prevPos = menuPos;
    if (prevPos !== newPos) {
      log(`Overlay menu: position updated from ${prevPos} to ${newPos}`);
      menuPos = newPos;
    }
  };
  await page.exposeFunction('updateMenuPos', updateMenuPos);

  return page;
};
