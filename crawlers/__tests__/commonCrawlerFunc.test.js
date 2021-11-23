/* eslint-disable no-underscore-dangle */
/* eslint-disable no-undef */
describe('test filter axe results', () => {
  test('it works', () => {
    // eslint-disable-next-line global-require
    const privateFuncs = require('../commonCrawlerFunc');
    const filterAxeResults = privateFuncs.__get__('filterAxeResults');
    // eslint-disable-next-line no-unused-expressions
    const host = 'http://test.com/';
    const results = {
      violations: [
        {
          id: '1',
          nodes: [{ html: '1-html1' }, { html: '1-html2' }],
          help: 'help1',
          impact: 'impact1',
          helpUrl: 'helpurl1',
        },
        {
          id: '2',
          nodes: [{ html: '2-html1' }, { html: '2-html2' }],
          help: 'help2',
          impact: 'impact2',
          helpUrl: 'helpurl2',
        },
      ],
      url: `${host}api/path`,
    };

    const { url, page, errors } = filterAxeResults(results, host);

    expect(url).toEqual(results.url);
    expect(page).toEqual('api/path');
    expect(errors).toEqual([
      {
        id: '1',
        description: 'help1',
        impact: 'impact1',
        helpUrl: 'helpurl1',
        fixes: [{ htmlElement: '1-html1' }, { htmlElement: '1-html2' }],
      },
      {
        id: '2',
        description: 'help2',
        impact: 'impact2',
        helpUrl: 'helpurl2',
        fixes: [{ htmlElement: '2-html1' }, { htmlElement: '2-html2' }],
      },
    ]);
  });
});
