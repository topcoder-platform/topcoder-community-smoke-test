"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
var protractor_1 = require("protractor");
var header_po_1 = require("./header.po");
var challenge_listing_helper_1 = require("../challenge-listing/challenge-listing.helper");
var common_po_1 = require("../../../common/common.po");
var common_helper_1 = require("../../../common/common.helper");
var HeaderHelper = /** @class */ (function () {
    function HeaderHelper() {
    }
    HeaderHelper.clickOnBanner = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, header_po_1.HeaderPageObject.banner.click()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnAllChallengesLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            var until, allChallengesLink;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        until = protractor_1.protractor.ExpectedConditions;
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(header_po_1.HeaderPageObject.competeLink).perform()];
                    case 1:
                        _a.sent();
                        allChallengesLink = header_po_1.HeaderPageObject.allChallengesLink;
                        return [4 /*yield*/, protractor_1.browser.wait(until.elementToBeClickable(allChallengesLink), 5000)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, allChallengesLink.click()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnCompetitiveProgrammingLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            var until, competitiveProgrammingLink;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        until = protractor_1.protractor.ExpectedConditions;
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(header_po_1.HeaderPageObject.competeLink).perform()];
                    case 1:
                        _a.sent();
                        competitiveProgrammingLink = header_po_1.HeaderPageObject.competitiveProgrammingLink;
                        return [4 /*yield*/, protractor_1.browser.wait(until.elementToBeClickable(competitiveProgrammingLink), 5000)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, competitiveProgrammingLink.click()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.verifyAllTrackLinks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var links, i, until, trackLink;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        links = ['Competitive Programming', 'Data Science', 'Design', 'Development', 'QA'];
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < links.length)) return [3 /*break*/, 8];
                        until = protractor_1.protractor.ExpectedConditions;
                        return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(header_po_1.HeaderPageObject.tracksLink).perform()];
                    case 3:
                        _a.sent();
                        trackLink = common_po_1.commonPageObjects.getLinkByAriaLabel(links[i]);
                        return [4 /*yield*/, protractor_1.browser.wait(until.elementToBeClickable(trackLink), 5000)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, trackLink.click()];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, protractor_1.browser.wait(until.visibilityOf(protractor_1.element(protractor_1.by.id('react-view'))))];
                    case 6:
                        _a.sent();
                        console.log('User navigated to ' + links[i] + ' page');
                        _a.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.verifyAllCommunityLinks = function () {
        return __awaiter(this, void 0, void 0, function () {
            var links, i, until, communityLink;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        links = ['TCO', 'Programs', 'Statistics', 'Events', 'Blog', 'Thrive'];
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < links.length)) return [3 /*break*/, 11];
                        until = protractor_1.protractor.ExpectedConditions;
                        return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(header_po_1.HeaderPageObject.communityLink).perform()];
                    case 3:
                        _a.sent();
                        communityLink = common_po_1.commonPageObjects.getLinkByAriaLabel(links[i]);
                        return [4 /*yield*/, protractor_1.browser.wait(until.elementToBeClickable(communityLink), 10000)];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, communityLink.click()];
                    case 5:
                        _a.sent();
                        if (!(links[i] == 'Blog')) return [3 /*break*/, 7];
                        return [4 /*yield*/, protractor_1.browser.wait(until.visibilityOf(protractor_1.element(protractor_1.by.className('blog'))))];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, protractor_1.browser.wait(until.visibilityOf(protractor_1.element(protractor_1.by.id('react-view'))))];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9:
                        console.log('User navigated to ' + links[i] + ' page');
                        _a.label = 10;
                    case 10:
                        i++;
                        return [3 /*break*/, 1];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickForumCommunityLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            var until, communityLink;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        until = protractor_1.protractor.ExpectedConditions;
                        return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(header_po_1.HeaderPageObject.communityLink).perform()];
                    case 2:
                        _a.sent();
                        communityLink = common_po_1.commonPageObjects.getLinkByAriaLabel('Forums');
                        return [4 /*yield*/, protractor_1.browser.wait(until.elementToBeClickable(communityLink), 5000)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, communityLink.click()];
                    case 4:
                        _a.sent();
                        console.log('Forum community link clicked');
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnDashboardLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.clickOnUserSpecificLink('Dashboard')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnMyProfileLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.clickOnUserSpecificLink('My Profile')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnPaymentsLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.clickOnUserSpecificLink('Payments')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnSettingsLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.clickOnUserSpecificLink('Settings')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnLogoutLink = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.clickOnUserSpecificLink('Log Out')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.search = function (inputString) {
        return __awaiter(this, void 0, void 0, function () {
            var searchIcon;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        searchIcon = header_po_1.HeaderPageObject.searchIcon;
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(searchIcon).perform()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_po_1.HeaderPageObject.searchInput.sendKeys(inputString)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, header_po_1.HeaderPageObject.searchInput.sendKeys(protractor_1.protractor.Key.ENTER)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    HeaderHelper.clickOnUserSpecificLink = function (label) {
        return __awaiter(this, void 0, void 0, function () {
            var until, myUsernameLink, link;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        until = protractor_1.protractor.ExpectedConditions;
                        myUsernameLink = common_po_1.commonPageObjects.findElementByText('div', common_helper_1.commonPageHelper.getConfigUserName());
                        return [4 /*yield*/, protractor_1.browser.actions().mouseMove(myUsernameLink).perform()];
                    case 1:
                        _a.sent();
                        link = common_po_1.commonPageObjects.getLinkByAriaLabel(label);
                        return [4 /*yield*/, protractor_1.browser.wait(until.elementToBeClickable(link), 5000)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, link.click()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return HeaderHelper;
}());
exports.HeaderHelper = HeaderHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhZGVyLmhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhZ2Utb2JqZWN0cy9wYWdlcy90b3Bjb2Rlci9oZWFkZXIvaGVhZGVyLmhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQThEO0FBQzlELHlDQUErQztBQUMvQywwRkFBMkY7QUFFM0YsdURBQThEO0FBQzlELCtEQUFpRTtBQUVqRTtJQUFBO0lBNkdBLENBQUM7SUEzR2dCLDBCQUFhLEdBQTFCOzs7OzRCQUNJLHFCQUFNLDRCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFBQTs7d0JBQXJDLFNBQXFDLENBQUM7Ozs7O0tBQ3pDO0lBRVkscUNBQXdCLEdBQXJDOzs7Ozs7d0JBQ1UsS0FBSyxHQUFHLHVCQUFVLENBQUMsa0JBQWtCLENBQUM7d0JBQzVDLHFCQUFNLG9CQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLDRCQUFnQixDQUFDLFdBQVcsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFBOzt3QkFBekUsU0FBeUUsQ0FBQzt3QkFFcEUsaUJBQWlCLEdBQUcsNEJBQWdCLENBQUMsaUJBQWlCLENBQUM7d0JBQzdELHFCQUFNLG9CQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFBOzt3QkFBdkUsU0FBdUUsQ0FBQzt3QkFFeEUscUJBQU0saUJBQWlCLENBQUMsS0FBSyxFQUFFLEVBQUE7O3dCQUEvQixTQUErQixDQUFDOzs7OztLQUNuQztJQUVZLDhDQUFpQyxHQUE5Qzs7Ozs7O3dCQUNVLEtBQUssR0FBRyx1QkFBVSxDQUFDLGtCQUFrQixDQUFDO3dCQUM1QyxxQkFBTSxvQkFBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyw0QkFBZ0IsQ0FBQyxXQUFX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