const rewire = require("rewire");
const { gotoFunction } = require('../commonCrawlerFunc');

describe('test filter axe results', () => {
  test('it works', () => {
    const privateFuncs = rewire('../commonCrawlerFunc');
    const filterAxeResults = privateFuncs.__get__('filterAxeResults');

    const host = "http://test.com/";
    const results = {
      violations: [{
        id: "1",
        nodes: [{ html: "1-html1" }, { html: "1-html2" }],
        help: "help1",
        impact: "impact1",
        helpUrl: "helpurl1"
      },
      {
        id: "2",
        nodes: [{ html: "2-html1" }, { html: "2-html2" }],
        help: "help2",
        impact: "impact2",
        helpUrl: "helpurl2"
      }],
      url: `${host}api/path`
    }

    const { url, page, errors } = filterAxeResults(results, host);

    expect(url).toEqual(results.url)
    expect(page).toEqual('api/path');
    expect(errors).toEqual([
      {
        id: "1",
        description: "help1",
        impact: "impact1",
        helpUrl: "helpurl1",
        fixes: [{ htmlElement: "1-html1" }, { htmlElement: "1-html2" }]
      },
      {
        id: "2",
        description: "help2",
        impact: "impact2",
        helpUrl: "helpurl2",
        fixes: [{ htmlElement: "2-html1" }, { htmlElement: "2-html2" }]
      }
    ]);
  });
});

describe('test goto function', () => {
  test('it works', async () => {
    const goToResponse = "response";
    const request = { url: "url" };
    const page = { goto: jest.fn(() => goToResponse) };

    const result = await gotoFunction({ request, page });

    expect(result).toEqual(goToResponse);
    expect(page.goto.mock.calls.length).toEqual(1);
    expect(page.goto.mock.calls[0]).toEqual([request.url, { waitUntil: 'networkidle2' }, { timeout: 30000 }]);
  });
});