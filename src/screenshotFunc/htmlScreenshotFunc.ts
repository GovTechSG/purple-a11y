// import { JSDOM } from "jsdom";
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { consoleLogger } from '../logs.js';

const screenshotMap = {}; // Map of screenshot hashkey to its buffer value and screenshot path

export const takeScreenshotForHTMLElements = async (
  violations,
  page,
  randomToken,
  locatorTimeout = 2000,
  maxScreenshots = 50,
) => {
  const newViolations = [];
  let screenshotCount = 0;
  for (const violation of violations) {
    if (screenshotCount >= maxScreenshots) break;
    const { id: rule } = violation;
    const newViolationNodes = [];
    for (const node of violation.nodes) {
      const { html, target, impact } = node;
      const hasValidSelector = target.length === 1 && typeof target[0] === 'string';
      const selector = hasValidSelector ? target[0] : null;
      if (selector) {
        try {
          const locator = page.locator(selector);
          const locators = await locator.all();
          for (const currLocator of locators) {
            await currLocator.scrollIntoViewIfNeeded({ timeout: locatorTimeout });
            const isVisible = await currLocator.isVisible();

            if (isVisible) {
              const buffer = await currLocator.screenshot({ timeout: locatorTimeout });
              const screenshotPath = getScreenshotPath(buffer, randomToken);
              node.screenshotPath = screenshotPath;
              screenshotCount++;
            } else {
              consoleLogger.info(`Element at ${currLocator} is not visible`);
            }

            break; // Stop looping after finding the first visible locator
          }
        } catch (e) {
          consoleLogger.info(`Unable to take element screenshot at ${selector}`);
        }
      }
      newViolationNodes.push(node);
    }
    violation.nodes = newViolationNodes;
    newViolations.push(violation);
  }
  return newViolations;
};

const generateBufferHash = buffer => {
  const hash = createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
};

const isSameBufferHash = (buffer, hash) => {
  const bufferHash = generateBufferHash(buffer);
  return hash === bufferHash;
};

const getIdenticalScreenshotKey = buffer => {
  for (const hashKey in screenshotMap) {
    const isIdentical = isSameBufferHash(buffer, hashKey);
    if (isIdentical) return hashKey;
  }
  return undefined;
};

const getScreenshotPath = (buffer, randomToken) => {
  let hashKey = getIdenticalScreenshotKey(buffer);
  // If exists identical entry in screenshot map, get its filepath
  if (hashKey) {
    return screenshotMap[hashKey];
  }
  // Create new entry in screenshot map
  hashKey = generateBufferHash(buffer);
  const path = generateScreenshotPath(hashKey);
  screenshotMap[hashKey] = path;

  // Save image file to local storage
  saveImageBufferToFile(buffer, `${randomToken}/${path}`);

  return path;
};

const generateScreenshotPath = hashKey => {
  return `elemScreenshots/html/${hashKey}.jpeg`;
};

const saveImageBufferToFile = (buffer, fileName) => {
  if (!fileName) return;
  // Find and create parent directories recursively if not exist
  const absPath = path.resolve(fileName);
  const dir = path.dirname(absPath);
  fs.mkdir(dir, { recursive: true }, err => {
    if (err) console.log('Error trying to create parent directory(s):', err);
    // Write the image buffer to file
    fs.writeFile(absPath, buffer, err => {
      if (err) console.log('Error trying to write file:', err);
    });
  });
};

// const hasMultipleLocators = async (locator) => await locator.count() > 1;

// const resolveMultipleLocators = async (page, locator, html) => {
//     const { tag, classAttrib, hrefAttrib, textContent } = generateAttribs(html);

//     const allLocators = await locator.all();
//     // console.log('locator before: ', locator);
//     allLocators.forEach(async currLocator => {
//         console.log('curr locator: ', currLocator);
//         let hrefIsExactMatch, containsTextContent;
//         // if (hrefAttrib) hrefIsExactMatch = (await currLocator.getAttribute('href')) === hrefAttrib;
//         if (textContent) containsTextContent = (await currLocator.innerText()).includes(textContent);

//         // if (hrefAttrib && textContent) {
//         //     if (hrefIsExactMatch && containsTextContent) {
//         //         locator = currLocator;
//         //         console.log('1: ', locator);
//         //     }
//         // } else if (hrefAttrib) {
//         //     if (hrefIsExactMatch) {
//         //         locator = currLocator;
//         //         console.log('2: ', locator);
//         //     }
//         // } else

//         if (textContent) {
//             if (containsTextContent) {
//                 locator = currLocator;
//                 console.log('3: ', locator);
//             }
//         } else {
//             locator = null;
//         }
//     })
//     console.log('final locator: ', locator);
//     return locator;
//  }

// const generateAttribs = (html) => {
//     const processedHTMLString = html.replaceAll('\n', '');
//     const tagNamesRegex =  /(?<=[<])\s*([a-zA-Z][^\s>/]*)\b/g;
//     const tag = processedHTMLString.match(tagNamesRegex)[0];

//     const dom = new JSDOM(processedHTMLString);
//     const elem = dom.window.document.querySelector(tag);

//     const textContent = elem.textContent.trim();
//     const classAttrib = elem.getAttribute('class')?.trim();
//     const hrefAttrib = (tag === 'a') ? elem.getAttribute('href') : null;
//     console.log('text content: ', textContent);

//     return {
//         tag,
//         ...(classAttrib && {classAttrib}),
//         ...(hrefAttrib && {hrefAttrib}),
//         ...(textContent && {textContent})
//     }
// }

// export const takeScreenshotForHTMLElements = async (screenshotData, storagePath, browserToRun) => {
//     const screenshotDir = `${storagePath}/screenshots`;
//     let screenshotItems = [];
//     let randomToken = `cloned-${Date.now()}`;
//     const clonedDir = getClonedProfilesWithRandomToken(browserToRun, randomToken);
//     const browser = await constants.launcher.launchPersistentContext(
//         clonedDir,
//         {
//             headless: false,
//             ...getPlaywrightLaunchOptions(browserToRun)
//         }
//     );

//     for (const item of screenshotData) {
//           const domain = item.url.replaceAll("https://", '').replaceAll('/', '_');
//           item.htmlItems = generateSelectors(item.htmlItems);
//           const page = await browser.newPage();
//           await page.goto(item.url);
//           let htmlItemsWithScreenshotPath = [];
//           for (const htmlItem of item.htmlItems) {
//               const { rule, category, selector } = htmlItem;
//               const locator = await getLocators(page, selector);
//               const screenshotFilePath = `${domain}/${category}/${rule}/${selector.tag}-${htmlItemsWithScreenshotPath.length}.png`;
//               if (locator) {
//                   await locator.screenshot({ path: `${screenshotDir}/${screenshotFilePath}` });
//                   htmlItem.screenshotPath = `screenshots/${screenshotFilePath}`;
//               }
//               delete htmlItem.selector;
//               htmlItemsWithScreenshotPath.push(htmlItem);
//           }
//           screenshotItems.push({url: item.url, htmlItems: htmlItemsWithScreenshotPath});
//           await page.close();
//       }
//       await browser.close();
//       deleteClonedProfiles(browserToRun)
//       return screenshotItems;
//   }

//   export const processScreenshotData = (allIssues) => {
//     const scannedUrls = allIssues.pagesScanned.map(page => page.url);
//     const screenshotData = scannedUrls.map(scannedUrl => {
//         let htmlItems = [];
//         ['mustFix', 'goodToFix'].map((category) => {
//             const ruleItems = allIssues.items[category].rules;
//             ruleItems.map(ruleItem => {
//                 const { rule, pagesAffected } = ruleItem;
//                 pagesAffected.map(affectedPage => {
//                     const { url, items } = affectedPage;
//                     if (scannedUrl === url) {
//                         items.forEach(item => {if (item.html) htmlItems.push({html: item.html, rule, category})});
//                     }
//                 })
//             })
//         })
//         return {url: scannedUrl, htmlItems};
//     })
//     return screenshotData;
// }

// export const getScreenshotPaths = (screenshotItems, allIssues) => {
//     screenshotItems.forEach(screenshotItem => {
//         const { url: ssUrl, htmlItems: ssHtmlItems } = screenshotItem;
//         ssHtmlItems.map(ssHtmlItem => {
//           const {
//             category: ssCategory,
//             rule: ssRule,
//             html: ssHtml,
//             screenshotPath: ssPath
//           } = ssHtmlItem;
//           allIssues.items[ssCategory].rules = allIssues.items[ssCategory].rules
//             .map(ruleItem => {
//               const { rule, pagesAffected } = ruleItem;
//                 if (rule === ssRule) {
//                   ruleItem.pagesAffected = pagesAffected.map(affectedPage => {
//                     const { url, items } = affectedPage;
//                     if (ssUrl === url) {
//                       affectedPage.items = items.map(htmlItem => {
//                         const { html } = htmlItem;
//                         if (ssHtml === html) htmlItem.screenshotPath = ssPath;
//                         return htmlItem;
//                       })
//                     }
//                     return affectedPage;
//                   })
//                 }
//                 return ruleItem;
//             })
//         })
//     });
// }

// const generateSelectors = (htmlItems) => {
//     const htmlItemsWithSelectors = htmlItems.map((htmlItem) => {
//         const { html } = htmlItem;
//         const processedHTMLString = html.replaceAll('\n', '');
//         const tagnameRegex =  /(?<=[<])\s*([a-zA-Z][^\s>/]*)\b/g;
//         const tagNames = processedHTMLString.match(tagnameRegex);

//         const dom = new JSDOM(processedHTMLString);
//         const tag = tagNames[0]
//         const elem = dom.window.document.querySelector(tag);

//         const classAttrib = elem.getAttribute('class')?.trim();
//         const idAttrib = elem.getAttribute('id');
//         const titleAttrib = elem.getAttribute('title');
//         const placeholderAttrib = elem.getAttribute('placeholder');
//         const altAttrib = (tag === 'img') ? elem.getAttribute('alt') : null;
//         const hrefAttrib = (tag === 'a') ? elem.getAttribute('href') : null;

//         let children;
//         if (tagNames.length > 1) {
//             const childrenHTMLItems = Array.from(elem.children).map(child => {
//                 return {
//                     html: child.outerHTML,
//                     rule: htmlItem.rule,
//                     category: htmlItem.category
//                 }
//             });
//             children = generateSelectors(childrenHTMLItems);
//         }

//         let textContent = elem.textContent.trim();
//         let allTextContents = [];
//         children?.map((child) => {
//             if (child?.selector.allTextContents) allTextContents = [...allTextContents, ...child.selector.allTextContents]
//         })

//         if (allTextContents.includes(textContent)) {
//             textContent = null;
//         } else {
//             if (textContent) allTextContents = [textContent, ...allTextContents];
//         }

//         const selector = {
//             tag,
//             processedHTMLString,
//             ...(textContent && {textContent}),
//             ...(allTextContents.length > 0 && {allTextContents}),
//             ...(classAttrib && {classAttrib}),
//             ...(idAttrib && {idAttrib}),
//             ...(titleAttrib && {titleAttrib}),
//             ...(placeholderAttrib && {placeholderAttrib}),
//             ...(altAttrib && {altAttrib}),
//             ...(hrefAttrib && {hrefAttrib}),
//             ...(children && {children}),
//         }

//         htmlItem.selector = selector;
//         return htmlItem;
//     })
//     return htmlItemsWithSelectors;
// }

// const generateInitialLocator = (page, selector) => {
//     const {
//         tag,
//         textContent,
//         classAttrib,
//         idAttrib,
//         titleAttrib,
//         placeholderAttrib,
//         altAttrib,
//         children
//     } = selector;

//     let locator = page.locator(tag);
//     if (classAttrib) {
//         const classSelector = classAttrib.replaceAll(/\s+/g, '.').replace(/^/, '.').replaceAll(':', '\\:').replaceAll('(', '\\(').replaceAll(')', '\\)');
//         locator = locator.and(page.locator(classSelector))
//     }
//     if (idAttrib) locator = locator.and(page.locator(`#${idAttrib}`));
//     if (textContent) locator = locator.and(page.getByText(textContent));
//     if (titleAttrib) locator = locator.and(page.getByTitle(titleAttrib));
//     if (placeholderAttrib) locator = locator.and(page.getByPlaceHolder(placeholderAttrib));
//     if (altAttrib) locator = locator.and(page.getByAltText(altAttrib));

//     if (children) {
//         let currLocator = locator;
//         for (const child of children) {
//             const childLocator = generateInitialLocator(page, child.selector);
//             locator = locator.and(currLocator.filter({ has: childLocator })); // figure this out tmr!
//         }
//     }
//     return locator;
// }

// const resolveLocators = async (locator, classAttrib, hrefAttrib) => {
//     const locatorCount = await locator.count();
//     if (locatorCount > 1) {
//         let locators = [];
//         const allLocators = await locator.all();
//         for (let nth = 0; nth < locatorCount; nth++) {
//             const currLocator = allLocators[nth];
//             const isVisible = await currLocator.isVisible();
//             if (isVisible) {
//                 let classIsExactMatch, hrefIsExactMatch;
//                 if (classAttrib) classIsExactMatch = (await currLocator.getAttribute('class')) === classAttrib;
//                 if (hrefAttrib) hrefIsExactMatch = (await currLocator.getAttribute('href')) === hrefAttrib;

//                 if (classAttrib && hrefAttrib) {
//                     if (classIsExactMatch && hrefIsExactMatch) locators.push(currLocator);
//                 } else if (classAttrib) {
//                     if (classIsExactMatch) locators.push(currLocator);
//                 } else if (hrefAttrib) {
//                     if (hrefIsExactMatch) locators.push(currLocator);
//                 } else {
//                     locators.push(currLocator);
//                 }
//             }
//         }
//         return locators.length === 1 ? locators[0] : null;
//     } else {
//         return locator;
//     }
// }

// const getLocators = async (page, selector) => {
//     const locator = generateInitialLocator(page, selector);
//     const locators = await resolveLocators(locator, selector.classAttrib, selector.hrefAttrib);
//     return locators;
// }
