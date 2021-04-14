const printMessage = require('print-message');
const validator = require('validator');
const axios = require('axios');
const { rootPath, generateRandomToken } = require('../utils');
const { combineRun } = require(`${rootPath}/combine`);
const { JSDOM } = require('jsdom');
const { document } = (new JSDOM('')).window;
const parseString = require('xml2js').parseString;

const _messageOptions = {
    border: false,
    marginTop: 2,
    marginBottom: 2
};

const _urlOptions = {
    protocols: ['http', 'https'],
    require_protocol: true
};

const queryCheck = s => document.createDocumentFragment().querySelector(s);
exports.isSelectorValid = async (selector) => {
  try {
      await queryCheck(selector);
  } catch (e) {
      return false;
  }
  return true;
}

//Refer to NPM validator's special characters under sanitizers for escape()
const blackListCharacters = '\\<>&\'\"';

const isValidSyntaxStructure  = async (content) => {
    parseString(content, (err) => {
        if (err) {
            return false;
        }

        return true;
    });
}

const setSitemapLog = (childTag) => {
    var message;
    switch(childTag) {
        case 'updated':
        case 'pubDate':
            message = `Sitemap Format: RSS, Tag: ${childTag}`;
            break;
        case 'url':
        case 'sitemap':
            message = `Sitemap Format: XML, Tag: ${childTag}`;
            break;
        case 'text':
            message = 'Sitemap URL provided is likely to be a simple text file with URLs.';
            break;
        default:
            message = 'Not a sitemap, is most likely a HTML page/ possibly a malformed sitemap';
            break;
    }

    return message;
};

exports.getUrlMessage = (scanner) => {
    let _urlMessage = '';
    switch(scanner) {
        case 'website':
            _urlMessage = 'Please enter URL of website: ';
            break;
        case 'login':
            _urlMessage = 'Please enter URL of login page: ';
            break;
        case 'sitemap':
            _urlMessage = 'Please enter URL to sitemap: ';
            break;
        default:
            printMessage(['Invalid option'], _messageOptions);
    }
    return _urlMessage;
};

exports.isInputValid = (inputString) => {

    if (!validator.isEmpty(inputString)) {

        var removeBlackListCharacters = validator.escape(inputString);

        if(validator.isAscii(removeBlackListCharacters)){
            return true;
        }
    }

    return false;
};

const sanitizeUrlInput  = (url) => {
    //Sanitize that there is no blacklist characters
    const sanitizeUrl = validator.blacklist(url,blackListCharacters);
    const _data = {};
    if (validator.isURL(sanitizeUrl, _urlOptions)){
        _data.isValid = true;
    } else {
        _data.isValid = false;
    }

    _data.url = sanitizeUrl;
    return _data;
}

const checkUrlConnectivity = async (url) => {

    const res = {};

    const data = sanitizeUrlInput(url);

    if (data.isValid) {

        //Validate the connectivity of URL if the string format is url format
        await axios.get(data.url, {timeout: 15000}).then( async (response) => {
            const _redirectUrl = response.request.res.responseUrl;
            res.status = response.status;

            if (_redirectUrl != null){
                res.url = _redirectUrl;
            } else {
                res.url = url;
            }

            res.content = response.data;

        }).catch((error) => {
            res.status = 400;
        });

    } else {
        res.status = 400;
    }

    return res;
};

const checkSitemapContent = async (content) => {
    //Check if is XML or text format
    const isValidXML = await isValidSyntaxStructure(content);

    let _childTag = '';
    let _logMessage = '';
    let status = false;

    if (isValidXML) {
        const doc = libxmljs.parseXmlString(content);
        const rootName = doc.root().name();

        switch(rootName){
            case 'feed':
            case 'urlset':
            case 'sitemapindex':
                _childTag = doc.root().child(3).name();
                break;
            case 'rss':
                _childTag = doc.root().parent().get('//channel').get('//pubDate').name();
                break;
            default:
                break;
        }

        const re = new RegExp('url|sitemap|pubDate|updated', 'gmi');
        if (_childTag.match(re)){
            _logMessage = setSitemapLog(_childTag);
            status = true;
        }

    } else {
        //Check if it represent a HTML page
        const re = new RegExp('\<(?:\!doctype html|html|head|body)+?\>', 'gmi');
        if (content !== undefined && !content.match(re)){
            _logMessage = setSitemapLog('text');
            status = true;
        } else {
            _logMessage = setSitemapLog();
        }
    }

    return status;

};

exports.checkUrl = async(scanner, url) => {

    const res = await checkUrlConnectivity(url);

    if (res.status === 200) {
        if (scanner === 'sitemap') {
            const checkSitemapStatus = await checkSitemapContent(res.content);

            if(!checkSitemapStatus) {
                res.status = 400;
            }
        }
    }

    return res;

}

const isEmptyObject = (obj) => {
    return !Object.keys(obj).length;
}


exports.prepareData = (scanType, argv) => {

    if (isEmptyObject(argv)) {
        throw Error('No inputs should be provided');
    }

    var data;
    if (scanType === 'sitemap' || scanType === 'website') {
        data = {
            type: argv.scanner,
            url: argv.url
        }

    }

    if (scanType === 'login') {
        data = {
            type: argv.scanner,
            url: argv.url,
            loginID: argv.username,
            loginPW: argv.userPassword,
            idSelector : argv.usernameField,
            pwSelector : argv.passwordField,
            submitSelector: argv.submitBtnField
        };
    }
    return data;

}

exports.runScan = async (data) => {

    if (!data.randomToken) {
        const randomToken = generateRandomToken();
        data.randomToken = randomToken;
    }

    printMessage(['Scanning website...'], _messageOptions);
    await combineRun(data);

}
