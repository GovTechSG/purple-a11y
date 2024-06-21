"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var playwright_1 = require("playwright");
var purple_hats_1 = require("@govtechsg/purple-hats");
// viewport used in tests to optimise screenshots
var viewportSettings = { width: 1920, height: 1040 };
// specifies the number of occurrences before error is thrown for test failure
var thresholds = { mustFix: 20, goodToFix: 25 };
// additional information to include in the "Scan About" section of the report
var scanAboutMetadata = { browser: 'Chrome (Desktop)' };
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var purpleA11y, browser, context, page, runPurpleA11yScan;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, purple_hats_1.default)("https://govtechsg.github.io", // initial url to start scan
                "Demo Playwright Scan", // label for test
                "Your Name", "email@domain.com", true, // include screenshots of affected elements in the report
                viewportSettings, thresholds, scanAboutMetadata)];
            case 1:
                purpleA11y = _a.sent();
                return [4 /*yield*/, playwright_1.chromium.launch({
                        headless: false,
                    })];
            case 2:
                browser = _a.sent();
                return [4 /*yield*/, browser.newContext()];
            case 3:
                context = _a.sent();
                return [4 /*yield*/, context.newPage()];
            case 4:
                page = _a.sent();
                runPurpleA11yScan = function (elementsToScan) { return __awaiter(void 0, void 0, void 0, function () {
                    var scanRes;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, page.evaluate(function (elementsToScan) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, runA11yScan(elementsToScan)];
                                        case 1: return [2 /*return*/, _a.sent()];
                                    }
                                }); }); }, elementsToScan)];
                            case 1:
                                scanRes = _a.sent();
                                return [4 /*yield*/, purpleA11y.pushScanResults(scanRes)];
                            case 2:
                                _a.sent();
                                purpleA11y.testThresholds(); // test the accumulated number of issue occurrences against specified thresholds. If exceed, terminate purpleA11y instance.
                                return [2 /*return*/];
                        }
                    });
                }); };
                return [4 /*yield*/, page.goto('https://govtechsg.github.io/purple-banner-embeds/purple-integrated-scan-example.htm')];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.evaluate(purpleA11y.getScripts())];
            case 6:
                _a.sent();
                return [4 /*yield*/, runPurpleA11yScan()];
            case 7:
                _a.sent();
                return [4 /*yield*/, page.getByRole('button', { name: 'Click Me' }).click()];
            case 8:
                _a.sent();
                // Run a scan on <input> and <button> elements
                return [4 /*yield*/, runPurpleA11yScan(['input', 'button'])];
            case 9:
                // Run a scan on <input> and <button> elements
                _a.sent();
                // ---------------------
                return [4 /*yield*/, context.close()];
            case 10:
                // ---------------------
                _a.sent();
                return [4 /*yield*/, browser.close()];
            case 11:
                _a.sent();
                return [4 /*yield*/, purpleA11y.terminate()];
            case 12:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })();
