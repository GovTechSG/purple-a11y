import {createCrawleeSubFolders,} from './commonCrawlerFunc.js';
import constants, { guiInfoStatusTypes, sitemapPaths} from '../constants/constants.js';
import fs from 'fs';
import {silentLogger, guiInfoLog } from '../logs.js';
import crawlDomain from './crawlDomain.js'
import crawlSitemap from './crawlSitemap.js'
import {chromium} from 'playwright';


  const crawlIntelligentSitemap = async (
    url,
    randomToken,
    host,
    viewportSettings,
    maxRequestsPerCrawl,
    browser,
    userDataDirectory,
    strategy,
    specifiedMaxConcurrency,
    fileTypes,
    blacklistedPatterns,
    includeScreenshots,
    followRobots,
    extraHTTPHeaders,
  ) => {
    let urlsCrawledFinal;
    let urlsCrawled;
    let dataset;
    let sitemapExist =false;
    const fromCrawlIntelligentSitemap = true;
    let sitemapUrl;
    
    urlsCrawled = { ...constants.urlsCrawledObj };
    ({ dataset } = await createCrawleeSubFolders(randomToken));

    if (!fs.existsSync(randomToken)) {
      fs.mkdirSync(randomToken);
    }
    
    async function findSitemap(link) {
      const homeUrl = getHomeUrl(link);
      let sitemapLinkFound = false;
      let sitemapLink = '';
      const browser = await chromium.launch({headless: true, channel: 'chrome'});
      const page = await browser.newPage();
      for (let path of sitemapPaths) {
        sitemapLink = homeUrl + path;
        sitemapLinkFound = await checkUrlExists(page,sitemapLink);
        if (sitemapLinkFound) {
          sitemapExist = true;
          break;
        }
      }
      await browser.close();
      return sitemapExist ? sitemapLink : '';
    }
    
  
    function getHomeUrl(url) {
      const urlObject = new URL(url);
      return `${urlObject.protocol}//${urlObject.hostname}${urlObject.port ? ':' + urlObject.port : ''}`;
  }
    
    const checkUrlExists = async (page, url) => {
      try {
          let response = await page.goto(url);
          if (response.ok()) {
              return true
          } else {
              return false
          }
      } catch (e) {
        silentLogger.error(e);
        return false;
      };
    }

    
    try {
      sitemapUrl = await findSitemap(url)
    } catch (error) {
      silentLogger.error(error);
    }

    if (!sitemapExist){
      console.log('Unable to find sitemap. Commencing website crawl instead.');
      //run crawlDomain as per normal
      urlsCrawledFinal = await crawlDomain(
        url,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl,
        browser,
        userDataDirectory,
        strategy,
        specifiedMaxConcurrency,
        fileTypes,
        blacklistedPatterns,
        includeScreenshots,
        followRobots,
        extraHTTPHeaders,
      )
    return urlsCrawledFinal
    
    } else {
      console.log(`Sitemap found at ${sitemapUrl}`);
      //run crawlSitemap then crawDomain subsequently if urlsCrawled.scanned.length < maxRequestsPerCrawl  
      urlsCrawledFinal = await crawlSitemap(
        sitemapUrl,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl, 
        browser,
        userDataDirectory,
        specifiedMaxConcurrency,
        fileTypes,
        blacklistedPatterns,
        includeScreenshots,
        extraHTTPHeaders,
        fromCrawlIntelligentSitemap,
        url, 
        dataset,  //for crawlSitemap to add on to
        urlsCrawled,  //for crawlSitemap to add on to
      )

    if (urlsCrawled.scanned.length < maxRequestsPerCrawl){ 
      // run crawl domain starting from root website, only on pages not scanned before
      urlsCrawledFinal = await crawlDomain(
        url,
        randomToken,
        host,
        viewportSettings,
        maxRequestsPerCrawl,
        browser,
        userDataDirectory,
        strategy,
        specifiedMaxConcurrency,
        fileTypes,
        blacklistedPatterns,
        includeScreenshots,
        followRobots,
        extraHTTPHeaders,
        fromCrawlIntelligentSitemap,
        dataset, //for crawlDomain to add on to
        urlsCrawled, //urls for crawlDomain to exclude
      )
    }

    guiInfoLog(guiInfoStatusTypes.COMPLETED);
    return urlsCrawledFinal;

  };
}
export default crawlIntelligentSitemap;
