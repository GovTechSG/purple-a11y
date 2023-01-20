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
        // URL passed to getLinksFromSitemap here doesn't matter because the response from any get requests is mocked
        const links = await getLinksFromSitemap('mockUrl/sitemap.xml', maxRequestsPerCrawl);
        expect(links).toEqual(sampleData.sampleXmlSitemapLinks.slice(0, maxRequestsPerCrawl));
    });

    test('should only get links from link tags in a RSS feed sitemap, and duplicate links should only be added once', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleRssFeed });
        const links = await getLinksFromSitemap('mockUrl/rssfeed.xml', maxRequestsPerCrawl);
        expect(links).toEqual(sampleData.sampleRssFeedLinks.slice(0, maxRequestsPerCrawl));
    })

    test('should only get links from the href property in link tags in an Atom feed sitemap', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleAtomFeed });
        const links = await getLinksFromSitemap('mockUrl/atomfeed.xml', maxRequestsPerCrawl);
        expect(links).toEqual(sampleData.sampleAtomFeedLinks.slice(0, maxRequestsPerCrawl));
    })

    test('should get all links from a txt sitemap', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleTxtSitemap });
        const links = await getLinksFromSitemap('mockUrl/sitemap.txt', maxRequestsPerCrawl);
        expect(links).toEqual(sampleData.sampleTxtSitemapLinks.slice(0, maxRequestsPerCrawl));
    })

    test('should get all links from a non standard XML sitemap', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: sampleData.sampleNonStandardXmlSitemap });
        const links = await getLinksFromSitemap('mockUrl/weirdSitemap.xml', maxRequestsPerCrawl);
        expect(links).toEqual(sampleData.sampleNonStandardXmlSitemapLinks.slice(0, maxRequestsPerCrawl));
    })
});
