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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("protractor");
var challenge_listing_helper_1 = require("../page-objects/pages/topcoder/challenge-listing/challenge-listing.helper");
var header_helper_1 = require("../page-objects/pages/topcoder/header/header.helper");
var home_helper_1 = require("../page-objects/pages/topcoder/home/home.helper");
var challenge_listing_constants_1 = require("../page-objects/pages/topcoder/challenge-listing/challenge-listing.constants");
var login_helper_1 = require("../page-objects/pages/topcoder/login/login.helper");
var login_constants_1 = require("../page-objects/pages/topcoder/login/login.constants");
var arena_helper_1 = require("../page-objects/pages/topcoder/arena/arena.helper");
var forum_helper_1 = require("../page-objects/pages/topcoder/forum/forum.helper");
var profile_helper_1 = require("../page-objects/pages/topcoder/profile/profile.helper");
var payments_helper_1 = require("../page-objects/pages/topcoder/payments/payments.helper");
var settings_helper_1 = require("../page-objects/pages/topcoder/settings/settings.helper");
describe('Topcoder Header Tests: ', function () {
    beforeEach(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, protractor_1.browser.driver.manage().window().maximize()];
                case 1:
                    _a.sent();
                    protractor_1.browser.ignoreSynchronization = true;
                    return [2 /*return*/];
            }
        });
    }); });
    it('should verify whether the user is redirected to the topcoder homepage on clicking the Topcoder logo', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnBanner()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, home_helper_1.HomePageHelper.verifyHomePage()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should verify whether the user is redirected to the Challenge listing page on clicking the All Challenges sub menu under the Compete menu.', function () { return __awaiter(_this, void 0, void 0, function () {
        var url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnAllChallengesLink()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, protractor_1.browser.getCurrentUrl()];
                case 3:
                    url = _a.sent();
                    expect(url).toEqual(challenge_listing_constants_1.ChallengeListingPageConstants.url);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should verify whether the user is redirected to the Login page on clicking the Competitive programming sub menu under the Compete menu.', function () { return __awaiter(_this, void 0, void 0, function () {
        var url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnCompetitiveProgrammingLink()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, login_helper_1.LoginPageHelper.waitForLoginForm()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, protractor_1.browser.getCurrentUrl()];
                case 4:
                    url = _a.sent();
                    expect(url).toEqual(login_constants_1.LoginPageConstants.content.loginRedirectionUrlFromCompetitiveProgrammingLink);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should verify whether the user is redirected to the respective page while clicking the sub menu under the Tracks menu.', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, header_helper_1.HeaderHelper.verifyAllTrackLinks()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should verify whether the user is redirected to the respective page while clicking the sub menu under the Community menu.', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, header_helper_1.HeaderHelper.verifyAllCommunityLinks()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should verify whether the user is redirected to the Login page on clicking the Forums sub menu under the Community menu.', function () { return __awaiter(_this, void 0, void 0, function () {
        var url;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, header_helper_1.HeaderHelper.clickForumCommunityLink()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, login_helper_1.LoginPageHelper.waitForLoginForm()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, protractor_1.browser.getCurrentUrl()];
                case 4:
                    url = _a.sent();
                    expect(url).toEqual(login_constants_1.LoginPageConstants.url);
                    return [2 /*return*/];
            }
        });
    }); });
    describe('Tests with login as pre-requisite', function () {
        beforeAll(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, login_helper_1.LoginPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, login_helper_1.LoginPageHelper.waitForLoginForm()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, login_helper_1.LoginPageHelper.fillLoginForm(false)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, login_helper_1.LoginPageHelper.waitForLoginSuccessWithoutLoggingOut()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the user is redirected to the Topcoder Arena page on clicking the Competitive programming sub menu under the Compete menu.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnCompetitiveProgrammingLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, arena_helper_1.ArenaPageHelper.verifyArenaPage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the user is redirected to the Forum page on clicking the Forums sub menu under the Community menu.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickForumCommunityLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, forum_helper_1.ForumPageHelper.verifyForumPage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the current page is redirected to my profile page on clicking the my profile under the Username menu.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnMyProfileLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, profile_helper_1.ProfilePageHelper.verifyProfilePage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the current page is redirected to the payments page on clicking the payments under the Username menu.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnPaymentsLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, payments_helper_1.PaymentsPageHelper.verifyPaymentsPage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the current page is redirected to the settings page on clicking the settings under the Username menu.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnSettingsLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, settings_helper_1.SettingsPageHelper.verifySettingsPage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the logout happens on clicking the logout under the Username menu.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnLogoutLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, home_helper_1.HomePageHelper.verifyHomePage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGMtaGVhZGVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90ZXN0LXN1aXRlcy90Yy1oZWFkZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpQkFvR0c7O0FBcEdILHlDQUFxQztBQUNyQyxzSEFBdUg7QUFDdkgscUZBQW1GO0FBQ25GLCtFQUFpRjtBQUNqRiw0SEFBNkg7QUFDN0gsa0ZBQW9GO0FBQ3BGLHdGQUEwRjtBQUMxRixrRkFBb0Y7QUFDcEYsa0ZBQW9GO0FBQ3BGLHdGQUEwRjtBQUMxRiwyRkFBNkY7QUFDN0YsMkZBQTZGO0FBRTdGLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRTtJQUNoQyxVQUFVLENBQUM7Ozt3QkFDUCxxQkFBTSxvQkFBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBQTs7b0JBQWpELFNBQWlELENBQUM7b0JBQ2xELG9CQUFPLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDOzs7O1NBQ3hDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxxR0FBcUcsRUFBRTs7O3dCQUN0RyxxQkFBTSxxREFBMEIsQ0FBQyxHQUFHLEVBQUUsRUFBQTs7b0JBQXRDLFNBQXNDLENBQUM7b0JBQ3ZDLHFCQUFNLDRCQUFZLENBQUMsYUFBYSxFQUFFLEVBQUE7O29CQUFsQyxTQUFrQyxDQUFDO29CQUNuQyxxQkFBTSw0QkFBYyxDQUFDLGNBQWMsRUFBRSxFQUFBOztvQkFBckMsU0FBcUMsQ0FBQzs7OztTQUN6QyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsNElBQTRJLEVBQUU7Ozs7d0JBQzdJLHFCQUFNLHFEQUEwQixDQUFDLEdBQUcsRUFBRSxFQUFBOztvQkFBdEMsU0FBc0MsQ0FBQztvQkFDdkMscUJBQU0sNEJBQVksQ0FBQyx3QkFBd0IsRUFBRSxFQUFBOztvQkFBN0MsU0FB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