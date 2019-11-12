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
var login_helper_1 = require("../page-objects/pages/topcoder/login/login.helper");
var challenge_listing_constants_1 = require("../page-objects/pages/topcoder/challenge-listing/challenge-listing.constants");
var challenge_detail_helper_1 = require("../page-objects/pages/topcoder/challenge-detail/challenge-detail.helper");
var forum_helper_1 = require("../page-objects/pages/topcoder/forum/forum.helper");
var submission_helper_1 = require("../page-objects/pages/topcoder/submission/submission.helper");
var scorecard_helper_1 = require("../page-objects/pages/topcoder/scorecard/scorecard.helper");
var terms_helper_1 = require("../page-objects/pages/topcoder/terms/terms.helper");
var config = require("../config.json");
var header_helper_1 = require("../page-objects/pages/topcoder/header/header.helper");
var home_helper_1 = require("../page-objects/pages/topcoder/home/home.helper");
describe('Topcoder Challenge Detail Page Tests: ', function () {
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
    it('should verify whether the  error message is displayed on clicking the Challenge Terms link.', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.clickOnTermsLink()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, terms_helper_1.TermsPageHelper.verifyTermsAuthenticationError()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    describe('Pre-condition of login', function () {
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
        afterAll(function () { return __awaiter(_this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 6]);
                        return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, header_helper_1.HeaderHelper.clickOnLogoutLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, home_helper_1.HomePageHelper.verifyHomePage()];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        e_1 = _a.sent();
                        return [4 /*yield*/, protractor_1.browser.restart()];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        }); });
        it('should verify that back button redirects user to challenge', function () { return __awaiter(_this, void 0, void 0, function () {
            var url;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_listing_helper_1.ChallengeListingPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.clickOnBackButton()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, protractor_1.browser.getCurrentUrl()];
                    case 4:
                        url = _a.sent();
                        expect(url).toEqual(challenge_listing_constants_1.ChallengeListingPageConstants.url);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify that a user is able to successfully enter a submission to a code challenge', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.getUsingCustomUrl(config.challengeDetail.customUrl)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.registerIfNotAlreadyRegistered()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.uploadSubmission()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the user is registered to the particular challenge on clicking the Register button.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.register()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.navigateToChallengeForum()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, forum_helper_1.ForumPageHelper.verifyChallengeForumPage()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the user is unregistered into particular challenge on clicking the UnRegister button.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.register()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.unregister()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the user is redirected to the Submission page on clicking the Submit button.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.register()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.clickOnSubmitButton()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, submission_helper_1.SubmissionPageHelper.verifySubmissionPage()];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the deadlines(time zone) for the particular challenge on clicking the show Deadlines.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.verifyDeadlines()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the details of the challenges are displayed on clicking the Details tab.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.switchToDetailsTab()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.verifyDetailsTab()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the registered members of the challenges are displayed on clicking the Registrants tab.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.switchToRegistrantsTab()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.verifyRegistrantsTab()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the  Solution submitted members  are displayed on clicking the Submissions tab.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.switchToSubmissionsTab()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.verifySubmissionsTab()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the  user is redirected to the Review Scorecard page on clicking the Review Scorecard link.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.clickOnReviewScorecardLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, scorecard_helper_1.ScorecardPageHelper.verifyScorecardPage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should verify whether the  user is redirected to the Challenge Terms page on clicking the Challenge Terms link.', function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.get()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, challenge_detail_helper_1.ChallengeDetailPageHelper.clickOnTermsLink()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, terms_helper_1.TermsPageHelper.verifyTermsPage()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGMtY2hhbGxlbmdlLWRldGFpbC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdGVzdC1zdWl0ZXMvdGMtY2hhbGxlbmdlLWRldGFpbC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlCQWlIRzs7QUFqSEgseUNBQXFDO0FBQ3JDLHNIQUF1SDtBQUN2SCxrRkFBb0Y7QUFDcEYsNEhBQTZIO0FBQzdILG1IQUFvSDtBQUNwSCxrRkFBb0Y7QUFDcEYsaUdBQW1HO0FBQ25HLDhGQUFnRztBQUNoRyxrRkFBb0Y7QUFDcEYsdUNBQXlDO0FBQ3pDLHFGQUFtRjtBQUNuRiwrRUFBaUY7QUFFakYsUUFBUSxDQUFDLHdDQUF3QyxFQUFFO0lBQy9DLFVBQVUsQ0FBQzs7O3dCQUNQLHFCQUFNLG9CQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFBOztvQkFBakQsU0FBaUQsQ0FBQztvQkFDbEQsb0JBQU8sQ0FBQyxxQkFBcUIsR0FBRyxJQUFJLENBQUM7Ozs7U0FDeEMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDZGQUE2RixFQUFFOzs7d0JBQzlGLHFCQUFNLG1EQUF5QixDQUFDLEdBQUcsRUFBRSxFQUFBOztvQkFBckMsU0FBcUMsQ0FBQztvQkFDdEMscUJBQU0sbURBQXlCLENBQUMsZ0JBQWdCLEVBQUUsRUFBQTs7b0JBQWxELFNBQWtELENBQUM7b0JBQ25ELHFCQUFNLDhCQUFlLENBQUMsOEJBQThCLEVBQUUsRUFBQTs7b0JBQXRELFNBQXNELENBQUM7Ozs7U0FDMUQsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLHdCQUF3QixFQUFFO1FBQy9CLFNBQVMsQ0FBQzs7OzRCQUNOLHFCQUFNLDhCQUFlLENBQUMsR0FBRyxFQUFFLEVBQUE7O3dCQUEzQixTQUEyQixDQUFDO3dCQUM1QixxQkFBTSw4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