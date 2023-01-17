import { jest } from '@jest/globals';
import axios from 'axios';
import * as testData from '../testData';
import { getLinksFromSitemap } from '../common';

jest.mock('axios');

describe('test getLinksFromSitemap', () => {
    test('should only get links from loc tags in an XML sitemap and not include namespace links or links in comments', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: testData.sampleXmlSitemap });
        // URL passed to getLinksFromSitemap here doesn't matter because the response from any get requests is mocked
        const links = await getLinksFromSitemap('mockUrl/sitemap.xml');
        expect(links).toEqual(testData.sampleXmlSitemapLinks);
    });

    test('should only get links from link tags in a RSS feed sitemap, and duplicate links should only be added once', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: testData.sampleRssFeed });
        const links = await getLinksFromSitemap('mockUrl/rssfeed.xml');
        expect(links).toEqual(testData.sampleRssFeedLinks);
    })

    test('should only get links from the href property in link tags in an Atom feed sitemap', async () => {
        axios.get = jest.fn().mockResolvedValue({ data: testData.sampleAtomFeed });
        const links = await getLinksFromSitemap('mockUrl/atomfeed.xml');
        expect(links).toEqual(testData.sampleAtomFeedLinks);
    })
});
