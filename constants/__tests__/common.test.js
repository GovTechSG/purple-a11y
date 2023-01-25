import { jest } from '@jest/globals';
import axios from 'axios';
import * as sampleData from '../sampleData';
import { getLinksFromSitemap } from '../common';
import constants from '../constants';

jest.mock('axios');

describe('test getLinksFromSitemap', () => {
  const maxRequestsPerCrawl = constants.maxRequestsPerCrawl;

  test('should only get links from loc tags in an XML sitemap and not include namespace links or links in comments', async () => {
    axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleXmlSitemap });
    axios.head = jest.fn().mockResolvedValue({ headers: { 'content-type': 'text/html' } });
    // URL passed to getLinksFromSitemap here doesn't matter because the response from any get requests is mocked
    const { numberOfLinks } = await getLinksFromSitemap('mockUrl/sitemap.xml', maxRequestsPerCrawl);
    expect(numberOfLinks).toEqual(
      Math.min(sampleData.sampleXmlSitemapLinks.length, maxRequestsPerCrawl),
    );
  });

  test('should only get links from link tags in a RSS feed sitemap, and duplicate links should only be added once', async () => {
    axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleRssFeed });
    const { numberOfLinks } = await getLinksFromSitemap('mockUrl/rssfeed.xml', maxRequestsPerCrawl);
    expect(numberOfLinks).toEqual(
      Math.min(sampleData.sampleRssFeedLinks.length, maxRequestsPerCrawl),
    );
  });

  test('should only get links from the href property in link tags in an Atom feed sitemap', async () => {
    axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleAtomFeed });
    const { numberOfLinks } = await getLinksFromSitemap(
      'mockUrl/atomfeed.xml',
      maxRequestsPerCrawl,
    );
    expect(numberOfLinks).toEqual(
      Math.min(sampleData.sampleAtomFeedLinks.length, maxRequestsPerCrawl),
    );
  });

  test('should get all links from a txt sitemap', async () => {
    axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleTxtSitemap });
    const { numberOfLinks } = await getLinksFromSitemap('mockUrl/sitemap.txt', maxRequestsPerCrawl);
    expect(numberOfLinks).toEqual(
      Math.min(sampleData.sampleTxtSitemapLinks.length, maxRequestsPerCrawl),
    );
  });

  test('should get all links from a non standard XML sitemap', async () => {
    axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleNonStandardXmlSitemap });
    const { numberOfLinks } = await getLinksFromSitemap(
      'mockUrl/weirdSitemap.xml',
      maxRequestsPerCrawl,
    );
    expect(numberOfLinks).toEqual(
      Math.min(sampleData.sampleNonStandardXmlSitemapLinks.length, maxRequestsPerCrawl),
    );
  });
});
