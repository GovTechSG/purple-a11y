// File used to hold sample data for unit testing

export const sampleXmlSitemap = `
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <!--  created with Free Online Sitemap Generator www.xml-sitemaps.com  -->
  <url>
    <loc>http://www.google.com/</loc>
    <lastmod>2023-01-17T02:49:19+00:00</lastmod>
    <priority>1.00</priority>
  </url>
  <url>
    <loc>http://www.google.com/intl/en/policies/privacy/</loc>
    <lastmod>2020-05-26T07:00:00+00:00</lastmod>
    <priority>0.80</priority>
  </url>
  <!-- <url>
<loc>http://www.google.com/intl/en/policies/terms/</loc>
<lastmod>2020-05-26T07:00:00+00:00</lastmod>
<priority>0.80</priority>
</url> -->
</urlset>`;

export const sampleXmlSitemapLinks = ['http://www.google.com/', 
'http://www.google.com/intl/en/policies/privacy/'];

// Source: https://www.feedforall.com/sample-feed.xml
export const sampleRssFeed = `<?xml version="1.0" encoding="windows-1252"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed - Favorite RSS Related Software &amp; Resources</title>
    <description>Take a look at some of FeedForAll&apos;s favorite software and resources for learning more about RSS.</description>
    <link>http://www.feedforall.com</link>
    <category domain="www.dmoz.com">Computers/Software/Internet/Site Management/Content Management</category>
    <copyright>Copyright 2004 NotePage, Inc.</copyright>
    <docs>http://blogs.law.harvard.edu/tech/rss</docs>
    <language>en-us</language>
    <lastBuildDate>Mon, 1 Nov 2004 13:17:17 -0500</lastBuildDate>
    <managingEditor>marketing@feedforall.com</managingEditor>
    <pubDate>Tue, 26 Oct 2004 14:06:44 -0500</pubDate>
    <webMaster>webmaster@feedforall.com</webMaster>
    <generator>FeedForAll Beta1 (0.0.1.8)</generator>
    <image>
      <url>http://www.feedforall.com/feedforall-temp.gif</url>
      <title>FeedForAll Sample Feed</title>
      <link>http://www.feedforall.com/industry-solutions.htm</link>
      <description>FeedForAll Sample Feed</description>
      <width>144</width>
      <height>117</height>
    </image>
    <item>
      <title>RSS Resources</title>
      <description>Be sure to take a look at some of our favorite RSS Resources&lt;br&gt;
&lt;a href=&quot;http://www.rss-specifications.com&quot;&gt;RSS Specifications&lt;/a&gt;&lt;br&gt;
&lt;a href=&quot;http://www.blog-connection.com&quot;&gt;Blog Connection&lt;/a&gt;&lt;br&gt;
&lt;br&gt;</description>
      <link>http://www.feedforall.com</link>
      <pubDate>Tue, 26 Oct 2004 14:01:01 -0500</pubDate>
    </item>
    <item>
      <title>Recommended Desktop Feed Reader Software</title>
      <description>&lt;b&gt;FeedDemon&lt;/b&gt; enables you to quickly read and gather information from hundreds of web sites - without having to visit them. Don&apos;t waste any more time checking your favorite web sites for updates. Instead, use FeedDemon and make them come to you. &lt;br&gt;
More &lt;a href=&quot;http://store.esellerate.net/a.asp?c=1_SKU5139890208_AFL403073819&quot;&gt;FeedDemon Information&lt;/a&gt;</description>
      <link>http://www.feedforall.com/feedforall-partners.htm</link>
      <pubDate>Tue, 26 Oct 2004 14:03:25 -0500</pubDate>
    </item>
    <item>
      <title>Recommended Web Based Feed Reader Software</title>
      <description>&lt;b&gt;FeedScout&lt;/b&gt; enables you to view RSS/ATOM/RDF feeds from different sites directly in Internet Explorer. You can even set your Home Page to show favorite feeds. Feed Scout is a plug-in for Internet Explorer, so you won&apos;t have to learn anything except for how to press 2 new buttons on Internet Explorer toolbar. &lt;br&gt;
More &lt;a href=&quot;http://www.bytescout.com/feedscout.html&quot;&gt;Information on FeedScout&lt;/a&gt;&lt;br&gt;
&lt;br&gt;
&lt;br&gt;
&lt;b&gt;SurfPack&lt;/b&gt; can feature search tools, horoscopes, current weather conditions, LiveJournal diaries, humor, web modules and other dynamically updated content. &lt;br&gt;
More &lt;a href=&quot;http://www.surfpack.com/&quot;&gt;Information on SurfPack&lt;/a&gt;&lt;br&gt;</description>
      <link>http://www.feedforall.com/feedforall-partners.htm</link>
      <pubDate>Tue, 26 Oct 2004 14:06:44 -0500</pubDate>
    </item>
  </channel>
</rss>`

export const sampleRssFeedLinks = ['http://www.feedforall.com', 
'http://www.feedforall.com/industry-solutions.htm', 
'http://www.feedforall.com/feedforall-partners.htm'];

// Source: http://dev.fyicenter.com/1000790_Real_Atom_XML_Examples.html
export const sampleAtomFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>FYI Center for Software Developers</title>
  <subtitle>FYI (For Your Information) Center for Software Developers with 
large collection of FAQs, tutorials and tips codes for application and 
wWeb developers on Java, .NET, C, PHP, JavaScript, XML, HTML, CSS, RSS, 
MySQL and Oracle - dev.fyicenter.com.</subtitle>
  <link rel="self" href="http://dev.fyicenter.com/atom_xml.php"/>
  <id>http://dev.fyicenter.com/atom_xml.php</id>
  <updated>2017-09-22T03:58:52+02:00</updated>
  <author>
    <name>FYIcenter.com</name>
  </author>
  <rights>Copyright (c) 2017 FYIcenter.com</rights>
  <category term="Programming"/>
  <category term="Computer"/>
  <category term="Developer"/>
  <entry>
    <title>Use Developer Portal Internally</title>
    <link rel="alternate" href="http://dev.fyicenter.com/1000702_Use_Developer_Portal_Internally.html"/>
    <id>http://dev.fyicenter.com/1000702_Use_Developer_Portal_Internally.html
</id>
    <updated>2017-09-20T13:29:08+02:00</updated>
    <summary type="html">&lt;img align='left' width='64' height='64' 
src='http://dev.fyicenter.com/Azure-API/_icon_Azure-API.png' /&gt;How to 
use the Developer Portal internally by you as the publisher? Normally, 
the Developer Portal of an Azure API Management Service is used by 
client developers. But as a publisher, you can also use the Developer 
Portal to test API operations internally. You can follow this tutorial 
to access the ...  - Rank: 120; Updated: 2017-09-20 13:29:06 -&gt; &lt;a 
href='http://dev.fyicenter.com/1000702_Use_Developer_Portal_Internally.ht
ml'&gt;Source&lt;/a&gt;</summary>
    <author>
      <name>FYIcenter.com</name>
    </author>
    <category term="Microsoft"/>
  </entry>
  <entry>
    <title>Using Azure API Management Developer Portal</title>
    <link rel="alternate" href="http://dev.fyicenter.com/1000701_Using_Azure_API_Management_Developer_Portal.html"/>
    <id>http://dev.fyicenter.com/1000701_Using_Azure_API_Management_Developer
_Portal.html</id>
    <updated>2017-09-20T13:29:07+02:00</updated>
    <summary type="html">&lt;img align='left' width='64' height='64' 
src='http://dev.fyicenter.com/Azure-API/_icon_Azure-API.png' /&gt;Where to 
find tutorials on Using Azure API Management Developer Portal? Here is 
a list of tutorials to answer many frequently asked questions compiled 
by FYIcenter.com team on Using Azure API Management Developer Portal: 
Use Developer Portal Internally What Can I See on Developer Portal What 
I You T...  - Rank: 120; Updated: 2017-09-20 13:29:06 -&gt; &lt;a 
href='http://dev.fyicenter.com/1000701_Using_Azure_API_Management_Develop
er_Portal.html'&gt;Source&lt;/a&gt;</summary>
    <author>
      <name>FYIcenter.com</name>
    </author>
    <category term="Microsoft"/>
  </entry>
  <entry>
    <title>Add API to API Products</title>
    <link rel="alternate" href="http://dev.fyicenter.com/1000700_Add_API_to_API_Products.html"/>
    <id>http://dev.fyicenter.com/1000700_Add_API_to_API_Products.html</id>
    <updated>2017-09-20T13:29:06+02:00</updated>
    <summary type="html">&lt;img align='left' width='64' height='64' 
src='http://dev.fyicenter.com/Azure-API/_icon_Azure-API.png' /&gt;How to 
add an API to an API product for internal testing on the Publisher 
Portal of an Azure API Management Service? You can follow this tutorial 
to add an API to an API product on the Publisher Portal of an Azure API 
Management Service. 1. Click API from the left menu on the Publisher 
Portal. You s...  - Rank: 119; Updated: 2017-09-20 13:29:06 -&gt; &lt;a 
href='http://dev.fyicenter.com/1000700_Add_API_to_API_Products.html'&gt;Sour
ce&lt;/a&gt;</summary>
    <author>
      <name>FYIcenter.com</name>
    </author>
    <category term="Microsoft"/>
  </entry>
</feed>`

export const sampleAtomFeedLinks = ['http://dev.fyicenter.com/atom_xml.php', 
'http://dev.fyicenter.com/1000702_Use_Developer_Portal_Internally.html',
'http://dev.fyicenter.com/1000701_Using_Azure_API_Management_Developer_Portal.html',
'http://dev.fyicenter.com/1000700_Add_API_to_API_Products.html'
]

// Following format stated in https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#text
export const sampleTxtSitemap = `https://www.example.com/file1.html
https://www.example.com/file2.html
https://www.example.com/file3.html`

export const sampleTxtSitemapLinks = ['https://www.example.com/file1.html',
'https://www.example.com/file2.html',
'https://www.example.com/file3.html']

export const sampleNonStandardXmlSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<contents>
  <url>https://www.example.com/file1.html</url>
  <link href='https://www.example.com/file2.html' />
  <link>https://www.example.com/file3.html</link>
</contents>`

export const sampleNonStandardXmlSitemapLinks = ['https://www.example.com/file1.html',
'https://www.example.com/file2.html',
'https://www.example.com/file3.html']
