import { deleteClonedProfiles, getClonedProfilesWithRandomToken, getPlaywrightLaunchOptions } from '../constants/common.js';
import constants, { proxy } from '../constants/constants.js';
import { JSDOM } from 'jsdom';

export const getScreenshotHTML = async (
    html, 
    url, 
    screenshotPath,
    browserToRun
) => {
    const selector = getSelector(html);

    const dirName = `clone-${Date.now()}`; 
    let clonedDir = getClonedProfilesWithRandomToken(browserToRun ,dirName);
    const browserContext = await constants.launcher.launchPersistentContext(
        clonedDir, 
        {headless: false, ...getPlaywrightLaunchOptions(browserToRun)}
    )
    const page = await browserContext.newPage();
    await page.goto(url);
    const locator = getLocator(page, selector);
    if (locator) await await locator.screenshot({ path: screenshotPath });
    await page.close();
    await browserContext.close();
    deleteClonedProfiles(browserToRun);
    
    // try {
    //     await page.goto(url, {
    //         timeout: 3000,
    //         ...(proxy && {...(proxy && { waitUntil: 'commit' }),})
    //     })
        
    //     try {
    //         await page.waitForLoadState('networkidle', { timeout: 3000 });
    //     } catch (e) {
    //         silentLogger.info('Unable to detect networkidle');
    //     }
        
    //     const locator = getLocator(page, selector);
    //     if (locator) await await locator.screenshot({ path: screenshotPath });
    // } catch (error) {
    //     silentLogger.error(error);
    // } finally {
    //     await page.close();
    //     await browserContext.close();
    //     deleteClonedProfiles(browserToRun);
    // }
}

const getSelector = (html) => {
    const processedHTMLString = html.replaceAll('\n', '');
    const tagnameRegex =  /(?<=[<])\s*([a-zA-Z][^\s>/]*)\b/g;
    const tagNames = processedHTMLString.match(tagnameRegex);
    
    const dom = new JSDOM(processedHTMLString);
    const tag = tagNames[0]; 
    const elem = dom.window.document.querySelector(tag);

    const classAttrib = elem.getAttribute('class')?.trim(); 
    const idAttrib = elem.getAttribute('id'); 
    const titleAttrib = elem.getAttribute('title'); 
    const placeholderAttrib = elem.getAttribute('placeholder'); 
    const altAttrib = (tag === 'img') ? elem.getAttribute('alt') : null;
    const hrefAttrib = (tag === 'a') ? elem.getAttribute('href') : null; 

    let children; 
    if (tagNames.length > 1) {
        children = Array.from(elem.children).map(child => getSelector(child.outerHTML))
        // const childrenHTMLItems = Array.from(elem.children).map(child => child.outerHTML); 
        // children = getSelector(childrenHTMLItems);
    }

    let textContent = elem.textContent.trim(); 
    let allTextContents = [];
    children?.map((child) => { 
        if (child?.allTextContents) allTextContents = [...allTextContents, ...child.allTextContents]
    })

    if (allTextContents.includes(textContent)) {
        textContent = null; 
    } else {
        if (textContent) allTextContents = [textContent, ...allTextContents];
    }
    
    const selector = {
        tag,
        processedHTMLString,
        ...(textContent && {textContent}),
        ...(allTextContents.length > 0 && {allTextContents}),
        ...(classAttrib && {classAttrib}),
        ...(idAttrib && {idAttrib}),
        ...(titleAttrib && {titleAttrib}), 
        ...(placeholderAttrib && {placeholderAttrib}),
        ...(altAttrib && {altAttrib}),
        ...(hrefAttrib && {hrefAttrib}),
        ...(children && {children}),
    }
    return selector;
}

const getLocator = (page, selector) => {
    const initialLocator = generateInitialLocator(page, selector); 
    const finalLocator = resolveLocator(initialLocator, selector.classAttrib, selector.hrefAttrib);
    return finalLocator;
}

const generateInitialLocator = (page, selector) => {
    const {
        tag, 
        textContent, 
        classAttrib, 
        idAttrib, 
        titleAttrib, 
        placeholderAttrib, 
        altAttrib,
        children    
    } = selector; 

    let locator = page.locator(tag);
    if (classAttrib) {
        const classSelector = classAttrib.replaceAll(/\s+/g, '.').replace(/^/, '.');
        locator = locator.and(page.locator(classSelector))
    }
    if (idAttrib) locator = locator.and(page.locator(`#${idAttrib}`));
    if (textContent) locator = locator.and(page.getByText(textContent));
    if (titleAttrib) locator = locator.and(page.getByTitle(titleAttrib)); 
    if (placeholderAttrib) locator = locator.and(page.getByPlaceHolder(placeholderAttrib));
    if (altAttrib) locator = locator.and(page.getByAltText(altAttrib)); 

    if (children) {
        let currLocator = locator; 
        for (const childSelector of children) {
            const childLocator = generateInitialLocator(page, childSelector);
            locator = locator.and(currLocator.filter({ has: childLocator }));
        }
    }
    return locator;
}

const resolveLocator = async (locator, classAttrib, hrefAttrib) => {
    const locatorCount = await locator.count(); 
    if (locatorCount > 1) {
        let locators = []; 
        const allLocators = await locator.all(); 
        for (let nth = 0; nth < locatorCount; nth++) {
            const currLocator = allLocators[nth];
            const isVisible = await currLocator.isVisible();
            if (isVisible) {
                let classIsExactMatch, hrefIsExactMatch; 
                if (classAttrib) classIsExactMatch = (await currLocator.getAttribute('class')) === classAttrib;
                if (hrefAttrib) hrefIsExactMatch = (await currLocator.getAttribute('href')) === hrefAttrib;  

                if (classAttrib && hrefAttrib) {
                    if (classIsExactMatch && hrefIsExactMatch) locators.push(currLocator); 
                } else if (classAttrib) {
                    if (classIsExactMatch) locators.push(currLocator);
                } else if (hrefAttrib) {
                    if (hrefIsExactMatch) locators.push(currLocator);
                } else {
                    locators.push(currLocator);
                }     
            }
        }
        return locators.length === 1 ? locators[0] : null; 
    } else {
        return locator;
    }
}

