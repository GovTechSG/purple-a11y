import {createCrawleeSubFolders,} from './commonCrawlerFunc.js';
import constants, { guiInfoStatusTypes } from '../constants/constants.js';
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
      const sitemapPaths = [
        '/sitemap.xml',
        '/sitemap.xml.gz',
        '/sitemap/sitemap.xml',
        '/sitemap-index.xml',
        '/sitemap_index.xml',
        '/sitemapindex.xml',
        '/sitemap/index.xml',
        '/sitemap1.xml',
        '/sitemap/',
        '/post-sitemap',
        '/page-sitemap',
        '/sitemap.txt',
        '/sitemap.php',
        '/sitemap_index.xml.gz',
        '/sitemap-index.xml.gz',
        '/sitemapindex.xml.gz',
        '/sitemap-index.xml.gz',
        '/sitemap.xml.tar',
        '/sitemap.xml.zip',
        '/sitemap.xml.bz2',
        '/sitemap.xml.xz',
        '/sitemap_index.xml.tar',
        '/sitemap_index.xml.zip',
        '/sitemap_index.xml.bz2',
        '/sitemap_index.xml.xz',
      ];
      let sitemapLinkFound = false;
      let sitemapLink = '';
      const browser = await chromium.launch({headless: true});
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
      silentLogger.error(e);
    }

    if (!sitemapExist){
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
