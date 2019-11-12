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
var payments_constants_1 = require("./payments.constants");
var payments_po_1 = require("./payments.po");
var PaymentsPageHelper = /** @class */ (function () {
    function PaymentsPageHelper() {
    }
    PaymentsPageHelper.verifyPaymentsPage = function () {
        return __awaiter(this, void 0, void 0, function () {
            var until, browserUrl;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        until = protractor_1.protractor.ExpectedConditions;
                        return [4 /*yield*/, protractor_1.browser.wait(until.visibilityOf(payments_po_1.PaymentsPageObject.container))];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, protractor_1.browser.getCurrentUrl()];
                    case 2:
                        browserUrl = _a.sent();
                        expect(browserUrl).toEqual(payments_constants_1.PaymentsPageConstants.url);
                        console.log('User redirected to payments page');
                        return [2 /*return*/];
                }
            });
        });
    };
    return PaymentsPageHelper;
}());
exports.PaymentsPageHelper = PaymentsPageHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF5bWVudHMuaGVscGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFnZS1vYmplY3RzL3BhZ2VzL3RvcGNvZGVyL3BheW1lbnRzL3BheW1lbnRzLmhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEseUNBQWlEO0FBQ2pELDJEQUE2RDtBQUM3RCw2Q0FBbUQ7QUFHbkQ7SUFBQTtJQVFBLENBQUM7SUFQZ0IscUNBQWtCLEdBQS9COzs7Ozs7d0JBQ1UsS0FBSyxHQUFHLHVCQUFVLENBQUMsa0JBQWtCLENBQUM7d0JBQzVDLHFCQUFNLG9CQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsZ0NBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQTs7d0JBQXBFLFNBQW9FLENBQUM7d0JBQ2xELHFCQUFNLG9CQUFPLENBQUMsYUFBYSxFQUFFLEVBQUE7O3dCQUExQyxVQUFVLEdBQUcsU0FBNkI7d0JBQ2hELE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsMENBQXFCLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQzs7Ozs7S0FDbkQ7SUFDTCx5QkFBQztBQUFELENBQUMsQUFSRCxJQVFDO0FBUlksZ0RBQWtCIn0=