var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime){
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "should verify whether the current user can update basic information.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573522906027,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://fast.trychameleon.com/messo/SAcpvabiB6Vsb9yZm32REVpDemzhOjyY6iznnOufjNlqyk-1DPhtq-A61ZuE9U5MrO1WGx/messo.min.js 0:3112 \"Chameleon Error: No \\\"Unique ID\\\" passed to Identify. The \\\"Unique ID\\\" informs Chameleon who this user is across sessions.\\n  Call chmln.identify(Unique ID, { user traits });\\n  See https://support.trychameleon.com/docs/getting-started for more information.\"",
                "timestamp": 1573522912907,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004a00a2-0048-0089-00a4-00c9001700de.png",
        "timestamp": 1573522915080,
        "duration": 14684
    },
    {
        "description": "should verify User can Add/Update/Delete language|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/005e006f-00d4-0042-00ce-008400f10066.png",
        "timestamp": 1573522930133,
        "duration": 33973
    },
    {
        "description": "should verify User can Add/Update/Delete Education|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00b000c3-00a0-00f4-00a8-00cc008e0038.png",
        "timestamp": 1573522964231,
        "duration": 42381
    },
    {
        "description": "should verify User can Add/Update/Delete work |Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/0085002b-0061-0028-0095-007a008e0058.png",
        "timestamp": 1573523006743,
        "duration": 47419
    },
    {
        "description": "should verify User can Add/Delete skill.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/009500ce-00be-00c5-000e-002600630039.png",
        "timestamp": 1573523054292,
        "duration": 30754
    },
    {
        "description": "should verify User can Add/Update/Delete the hobby.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00df0086-00fc-00e8-0016-00f400700085.png",
        "timestamp": 1573523085182,
        "duration": 40459
    },
    {
        "description": "should verify User can update the community.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523130365,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523130365,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523130365,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523130365,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0048007c-0055-00e9-002d-00480032005c.png",
        "timestamp": 1573523125760,
        "duration": 3512
    },
    {
        "description": "should verify User can Add/Update/Delete Device|Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573523143376,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/007f000e-00e8-0062-00e2-0015000d0077.png",
        "timestamp": 1573523148820,
        "duration": 38138
    },
    {
        "description": "should Verify User can Add/Update/Delete Software|Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/0013007f-008a-001a-000e-0053000f00b5.png",
        "timestamp": 1573523187071,
        "duration": 42632
    },
    {
        "description": "should Verify User can Add/Update/Delete Service Provider|Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/001400f0-009b-00e2-000a-0001003000ca.png",
        "timestamp": 1573523229862,
        "duration": 32929
    },
    {
        "description": "should Verify User can Add/Update/Delete Subscriptions |Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523290504,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523290505,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523290505,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523290505,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/009900c9-00bd-002f-00d4-004400f600c3.png",
        "timestamp": 1573523262910,
        "duration": 27016
    },
    {
        "description": "should Verify User can update his/her User Consent. |Topcoder Account Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573523302178,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00a90097-00a3-00ff-0022-009900c70032.png",
        "timestamp": 1573523306960,
        "duration": 24715
    },
    {
        "description": "should Verify User can Add/Delete External Link.|Topcoder Account Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523366854,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523366854,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523366854,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523366854,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00c20084-0026-00b9-008f-007e001c0066.png",
        "timestamp": 1573523331797,
        "duration": 34482
    },
    {
        "description": "should Verify User can update Email Preferences|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573523379072,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f6003e-00bf-00d4-00ce-008f00090049.png",
        "timestamp": 1573523383533,
        "duration": 23381
    },
    {
        "description": "should Verify User can redirect to forums's setting page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings 514 Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573523415463,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/rightOff.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573523415713,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/midOffOn.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573523415914,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/rightOn.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573523416228,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/000400b1-008e-0039-00db-007100ea001a.png",
        "timestamp": 1573523407044,
        "duration": 9459
    },
    {
        "description": "should Verify User can redirect to Payment details page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 535 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573523426544,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0016001f-00ed-006b-004a-00d000570057.png",
        "timestamp": 1573523416633,
        "duration": 10616
    },
    {
        "description": "should Verify User can redirect to Request visa letter page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/tc?module=VisaSelection 479 Mixed Content: The page at 'https://community.topcoder.com/tc?module=VisaSelection' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573523434722,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00150059-00f7-00c7-0037-00b400b100d7.png",
        "timestamp": 1573523427388,
        "duration": 7470
    },
    {
        "description": "should Verify User can redirect to Referrals page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/tc?module=ViewReferrals 475 Mixed Content: The page at 'https://community.topcoder.com/tc?module=ViewReferrals' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573523462860,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523464131,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523464132,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523464132,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523464132,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00b20000-000f-00f7-004a-00c500ba0051.png",
        "timestamp": 1573523435209,
        "duration": 28327
    },
    {
        "description": "should verify whether the current page is redirected to Registration page on clicking the Join button|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523476736,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523476736,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523476736,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523476736,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00cb00ac-0034-00ae-00eb-00c4001e0080.png",
        "timestamp": 1573523476170,
        "duration": 8041
    },
    {
        "description": "should verify whether the current page is redirected to Login page on clicking the Log in button.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523485033,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523485034,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523485034,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523485034,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Fwww.topcoder.com%2Fchallenges&utm_source=community-app-main 0:0 Uncaught (in promise)",
                "timestamp": 1573523491594,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ad0086-00ae-00cc-0028-00ca00110045.png",
        "timestamp": 1573523484351,
        "duration": 7395
    },
    {
        "description": "should verify whether the user is able to search the member by their username/skill using the search icon.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523492443,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523492444,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523492444,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523492444,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=e20190928114001&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573523500998,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573523501008,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523502405,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523502405,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523502405,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523502405,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=Java&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573523510832,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573523510840,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/leaderboards/?filter=id%3D247%26type%3DMEMBER_SKILL - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573523510840,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f80028-0021-0002-0084-0024004e00c2.png",
        "timestamp": 1573523491873,
        "duration": 19670
    },
    {
        "description": "should verify whether all the open for registration and Ongoing challenges are listed on clicking the Challenge tab.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523512256,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523512256,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523512257,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523512257,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/006f0023-002b-00bf-004c-003d00f00053.png",
        "timestamp": 1573523511664,
        "duration": 6598
    },
    {
        "description": "should verify whether login page is opened on clicking the SRM tab.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523519381,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523519381,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523519381,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523519381,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Farena.topcoder.com%2Findex.html 0:0 Uncaught (in promise)",
                "timestamp": 1573523527664,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0011007d-00a4-0014-00c0-000f000c00a9.png",
        "timestamp": 1573523518389,
        "duration": 9804
    },
    {
        "description": "should verify whether the user is able to search for a challenge by using the Search challenges textbox.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523528875,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523528875,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523528876,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523528876,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003b000f-00a8-00ac-00aa-0062004900d6.png",
        "timestamp": 1573523528310,
        "duration": 9132
    },
    {
        "description": "should verify that the \"Filter\" button is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523538125,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523538125,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523538125,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523538125,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003900ac-0072-0028-0076-00ce009900b9.png",
        "timestamp": 1573523537590,
        "duration": 7233
    },
    {
        "description": "should verify that the \"Filter\" option \"keywords\" is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523546142,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523546142,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523546142,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523546143,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0078005d-008e-0084-00de-00e800cd0084.png",
        "timestamp": 1573523544948,
        "duration": 22787
    },
    {
        "description": "should verify that the \"Filter\" option \"Subtrack\" is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523568431,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523568431,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523568431,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523568431,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00dd0057-0052-002d-0055-001800c400df.png",
        "timestamp": 1573523567859,
        "duration": 22150
    },
    {
        "description": "should verify that the \"Filter\" option \"Sub Community\" is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523590824,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523590825,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523590825,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523590825,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001700b3-00fb-00db-00fa-008800ee008d.png",
        "timestamp": 1573523590160,
        "duration": 22620
    },
    {
        "description": "should verify that the \"Filter\" option for \"Date range\" is workingcorrectly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523615936,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523615937,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523615938,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523615938,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0092005d-0084-002c-00e3-00e200e800bd.png",
        "timestamp": 1573523613065,
        "duration": 14889
    },
    {
        "description": "should verify whether the challenges are filtered according to the keyword/Subtrack/Sub community/Date range fields selected under the Filter function.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523628667,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523628671,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523628671,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523628671,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003a008b-004c-003d-00fa-001a00e10035.png",
        "timestamp": 1573523628081,
        "duration": 38320
    },
    {
        "description": "should verify whether the user is able to select more than one keyword/Subtrack under the filter function.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523667400,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523667401,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523667401,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523667401,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003f006e-0030-0082-00ce-00a1006e00c6.png",
        "timestamp": 1573523666518,
        "duration": 44170
    },
    {
        "description": "should verify whether the cross symbol inside the textbox keyword/Subtrack filters removes the selected keyword/Subtrack.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523711727,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523711727,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523711727,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523711727,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00cf0085-008c-00c2-00b9-003600820042.png",
        "timestamp": 1573523710825,
        "duration": 84940
    },
    {
        "description": "should verify whether the number of filters applied are shown into Filter button according to the keyword/Subtrack/Sub community/Date range fields selected.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523796823,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523796824,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523796824,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523796824,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00fd0007-00c6-0075-00e5-00c2009000b7.png",
        "timestamp": 1573523795887,
        "duration": 13284
    },
    {
        "description": "should verify whether the clear filter button clears all the filters selected and all the challenges are displayed.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523810331,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523810332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523810332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523810332,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003c00a1-00b8-0054-0064-00b10066008b.png",
        "timestamp": 1573523809318,
        "duration": 13216
    },
    {
        "description": "should verify whether the Save filter button is deactivated into filter function.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523823282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523823282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523823282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523823282,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00dd000c-0024-0059-0061-00c400ec008c.png",
        "timestamp": 1573523822677,
        "duration": 7629
    },
    {
        "description": "should verify whether the Sort by select option under the Open for registration/Ongoing Challenges list sorts the challenges according to the selected option.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523831084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523831084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523831084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523831084,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/000b006e-00d3-006e-00ec-00a400c900cc.png",
        "timestamp": 1573523830497,
        "duration": 9151
    },
    {
        "description": "should verify whether the View more challenges link under the Open for registration/Ongoing Challenges list displays all the Open for registration/Ongoing challenges.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523840295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523840295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523840295,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523840295,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00e400f2-00b3-00c8-0066-006a00fa003a.png",
        "timestamp": 1573523839774,
        "duration": 7952
    },
    {
        "description": "should verify that when user selects a challenge \"tag\", only challenges under the selected tag are shown.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523848882,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523848882,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523848883,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523848883,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00a50063-0014-0008-0030-005d00a7000d.png",
        "timestamp": 1573523847870,
        "duration": 9240
    },
    {
        "description": "should verify that the challenge count matches the number of challenges displayed|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523858197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523858197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523858197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523858198,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00bf00c5-00c8-00e9-0036-006300a8007d.png",
        "timestamp": 1573523857256,
        "duration": 37611
    },
    {
        "description": "should verify that the challenge count remains the same when switching to the challenge details and then back to the challenge listings page |Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523896203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523896203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523896203,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523896203,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00900056-00bc-0062-002f-00e000a500fc.png",
        "timestamp": 1573523894999,
        "duration": 19470
    },
    {
        "description": "should verify All Challenges link functionality with the design, development, and data sceince toggle switches on|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523915716,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523915717,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523915717,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523915717,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.\\nArguments: \\n[0] _isAMomentObject: true, _isUTC: false, _useUTC: false, _l: undefined, _i: Thu Nov 07 2019 09:02:41 UTC, _f: undefined, _strict: undefined, _locale: [object Object]\\nError\\n    at Function.createFromInputFallback (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:9180)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29041\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29092\\n    at It (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29386)\\n    at Dt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29763)\\n    at xt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29845)\\n    at a (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:6018)\\n    at func (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:48:75191)\\n    at Array.sort (\\u003Canonymous>)\\n    at m (https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js:14:20349)\\n    at ao (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:58611)\\n    at Po (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:65932)\\n    at el (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:104471)\\n    at yl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88947)\\n    at bl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88872)\\n    at sl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:85814)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45124\\n    at t.unstable_runWithPriority (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:85:3465)\\n    at Ya (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:44833)\\n    at Ha (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45069)\\n    at Ga (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45004)\\n    at nl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:82534)\\n    at Object.enqueueSetState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:49701)\\n    at s.E.setState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:56:1468)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14541)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at p (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:53783)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4368\\n    at dispatch (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:56979)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4263\"",
                "timestamp": 1573523927150,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d900fb-0094-00bd-0021-001b0091002e.png",
        "timestamp": 1573523914609,
        "duration": 14112
    },
    {
        "description": "should verify All Challenges link functionality with the design, development, and data sceince toggle switches Off|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523929856,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523929856,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523929856,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523929856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.\\nArguments: \\n[0] _isAMomentObject: true, _isUTC: false, _useUTC: false, _l: undefined, _i: Thu Nov 07 2019 09:02:41 UTC, _f: undefined, _strict: undefined, _locale: [object Object]\\nError\\n    at Function.createFromInputFallback (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:9180)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29041\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29092\\n    at It (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29386)\\n    at Dt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29763)\\n    at xt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29845)\\n    at a (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:6018)\\n    at func (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:48:75191)\\n    at Array.sort (\\u003Canonymous>)\\n    at m (https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js:14:20349)\\n    at ao (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:58611)\\n    at Po (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:65932)\\n    at el (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:104471)\\n    at yl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88947)\\n    at bl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88872)\\n    at sl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:85814)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45124\\n    at t.unstable_runWithPriority (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:85:3465)\\n    at Ya (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:44833)\\n    at Ha (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45069)\\n    at Ga (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45004)\\n    at nl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:82534)\\n    at Object.enqueueSetState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:49701)\\n    at s.E.setState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:56:1468)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14541)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at p (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:53783)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4368\\n    at dispatch (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:56979)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4263\"",
                "timestamp": 1573523944472,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00fe00cf-00d1-00ca-0025-004b0020009f.png",
        "timestamp": 1573523928866,
        "duration": 19033
    },
    {
        "description": "should verify whether the page is redirected to the RSS Feed page on clicking the RSS feed link.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523948984,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523948984,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523948984,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523948984,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ba0063-0007-0014-004f-00e9008f001f.png",
        "timestamp": 1573523948075,
        "duration": 8136
    },
    {
        "description": "should verify whether the page is redirected to the respective page on clicking the link(About, Contact, Help, Privacy, Terms).|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523957237,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523957237,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523957237,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523957237,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573523977599,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00150051-0056-00f2-001e-006200fa00b3.png",
        "timestamp": 1573523956344,
        "duration": 20785
    },
    {
        "description": "should verify whether the current page is redirected to my Dashboard page on clicking the Dashboard under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523984424,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523984424,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523984425,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523984425,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/007a00e6-006c-00d1-00e3-00e3004e0022.png",
        "timestamp": 1573523983826,
        "duration": 8880
    },
    {
        "description": "should verify whether the current page is redirected to my profile page on clicking the my profile under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573523993920,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573523993920,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573523993921,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573523993921,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00080031-00f2-00d4-004a-00c600c300c0.png",
        "timestamp": 1573523992872,
        "duration": 9194
    },
    {
        "description": "should verify whether the current page is redirected to the payments page on clicking the payments under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524003391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524003391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524003391,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524003391,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 537 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573524010332,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/006c00b3-0005-0081-0082-00af008200dd.png",
        "timestamp": 1573524002204,
        "duration": 9547
    },
    {
        "description": "should verify whether the current page is redirected to the settings page on clicking the settings under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524012566,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524012566,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524012566,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524012566,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/009e0097-0011-005d-00d3-006700e700ba.png",
        "timestamp": 1573524011928,
        "duration": 9061
    },
    {
        "description": "should verify whether the user is able to search the member by their username/skill using the search icon.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524022372,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524022373,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524022373,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524022373,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=e20190928114001&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573524030525,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573524030536,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524032121,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524032121,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524032121,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524032122,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=Java&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573524040644,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573524040654,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/leaderboards/?filter=id%3D247%26type%3DMEMBER_SKILL - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573524040668,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00220048-0009-0090-00f3-00bd007d007a.png",
        "timestamp": 1573524021143,
        "duration": 20518
    },
    {
        "description": "should verify whether all the my challenges, open for registration and Ongoing challenges are listed on clicking the Challenge tab.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524042362,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524042362,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524042363,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524042363,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/002d00e9-001b-001a-0096-00b800630098.png",
        "timestamp": 1573524041776,
        "duration": 6765
    },
    {
        "description": "should verify whether the Topcoder arena page is opened on clicking the SRM tab. |After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524049332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524049332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524049333,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524049333,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00be00a8-00c2-00b3-0063-00b9002d00bc.png",
        "timestamp": 1573524048685,
        "duration": 15400
    },
    {
        "description": "should verify whether the logout happens on clicking the logout under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524065148,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524065149,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524065149,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524065149,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/000d00be-004a-001b-0002-00b5006d00ba.png",
        "timestamp": 1573524064229,
        "duration": 12609
    },
    {
        "description": "should verify whether the  error message is displayed on clicking the Challenge Terms link.|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v2/terms/detail/21303?nocache=1573524081972 - Failed to load resource: the server responded with a status of 401 ()",
                "timestamp": 1573524082580,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.topcoder.com/challenges/terms/detail/21303 0:0 ",
                "timestamp": 1573524082580,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573524083128,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00660008-0015-00ca-0090-00f300a500ee.png",
        "timestamp": 1573524077025,
        "duration": 5669
    },
    {
        "description": "should verify that back button redirects user to challenge|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524089592,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524089592,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524089593,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524089593,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524099453,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524099453,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524099454,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524099454,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001d00b7-0049-0040-0019-007b001c0084.png",
        "timestamp": 1573524088704,
        "duration": 10901
    },
    {
        "description": "should verify that a user is able to successfully enter a submission to a code challenge|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00ea001c-00d8-0035-00c3-003400a000ad.png",
        "timestamp": 1573524099777,
        "duration": 7251
    },
    {
        "description": "should verify whether the user is registered to the particular challenge on clicking the Register button.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Category&categoryID=82117 489 Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Category&categoryID=82117' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573524130453,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Category&categoryID=82117 572 Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Category&categoryID=82117' was loaded over HTTPS, but requested an insecure image 'http://software.topcoder.com/i/iconStatusSpecSm.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573524130453,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Category&categoryID=82117 575 Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Category&categoryID=82117' was loaded over HTTPS, but requested an insecure image 'http://software.topcoder.com/i/appSm.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573524130454,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001400f9-00f8-0017-007c-005b003d009f.png",
        "timestamp": 1573524107203,
        "duration": 24137
    },
    {
        "description": "should verify whether the user is unregistered into particular challenge on clicking the UnRegister button.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00150035-0016-0028-0042-00d700b30021.png",
        "timestamp": 1573524131461,
        "duration": 28719
    },
    {
        "description": "should verify whether the user is redirected to the Submission page on clicking the Submit button.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00f9009f-0074-0057-008b-001b00dd002d.png",
        "timestamp": 1573524160330,
        "duration": 12170
    },
    {
        "description": "should verify whether the deadlines(time zone) for the particular challenge on clicking the show Deadlines.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/007f0077-00f1-00e0-00b2-00ef00330074.png",
        "timestamp": 1573524172648,
        "duration": 5330
    },
    {
        "description": "should verify whether the details of the challenges are displayed on clicking the Details tab.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00480080-003b-00f6-00a5-0008001500f4.png",
        "timestamp": 1573524178131,
        "duration": 5298
    },
    {
        "description": "should verify whether the registered members of the challenges are displayed on clicking the Registrants tab.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/008c00ef-00b9-0083-0052-004b00090072.png",
        "timestamp": 1573524183571,
        "duration": 4782
    },
    {
        "description": "should verify whether the  Solution submitted members  are displayed on clicking the Submissions tab.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/006400b7-00d0-00a3-00e2-00e100080066.png",
        "timestamp": 1573524188510,
        "duration": 5164
    },
    {
        "description": "should verify whether the  user is redirected to the Review Scorecard page on clicking the Review Scorecard link.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "screenshots/00bd0039-0063-00fa-00a3-005400b00024.png",
        "timestamp": 1573524193831,
        "duration": 8161
    },
    {
        "description": "should verify whether the  user is redirected to the Challenge Terms page on clicking the Challenge Terms link.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524208506,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524208507,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524208507,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524208507,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00dd0094-0005-0087-0099-00c9006e00e4.png",
        "timestamp": 1573524202162,
        "duration": 5636
    },
    {
        "description": "To verify that user is able to view dashboard when logged in|After login tests|Topcoder Dashboard Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573524221339,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524231020,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524231020,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524231020,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524231020,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f2008b-0086-00e9-00f4-003100620073.png",
        "timestamp": 1573524227244,
        "duration": 2474
    },
    {
        "description": "should verify whether the user is redirected to the topcoder social sites on clicking the social sites icon.|Topcoder Dashboard Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Fwww.topcoder.com%2Fmy-dashboard&utm_source=community-app-main 0:0 Uncaught (in promise)",
                "timestamp": 1573524244132,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00a80091-0079-00da-00d0-003d00060030.png",
        "timestamp": 1573524242196,
        "duration": 2403
    },
    {
        "description": "should verify whether the user is redirected to respective page on clicking the footer menu link into Footer of page.|Topcoder Footer Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524245869,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524245870,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524245870,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524245870,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524255357,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524255357,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524255358,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524255358,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524264648,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524264648,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524264649,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524264649,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524274639,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524274639,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524274640,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524274640,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524283192,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524283192,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524283192,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524283192,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524293447,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524293447,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524293448,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524293448,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/006b00f2-004c-00d3-0040-00ab003900cc.png",
        "timestamp": 1573524244745,
        "duration": 54061
    },
    {
        "description": "should verify whether the user is redirected to the topcoder social sites on clicking the social sites icon.|Topcoder Footer Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524299645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524299645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524299645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524299646,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://abs.twimg.com/k/en/init.en.07b80b8d5c328ef2e22f.js 13 Refused to load the script 'https://cm.g.doubleclick.net/pixel?google_nid=twitter_dbm&google_cm&tpm_cb=partnerIdSyncComplete&_=1573524315584' because it violates the following Content Security Policy directive: \"script-src https://ssl.google-analytics.com https://twitter.com 'unsafe-eval' https://*.twimg.com https://api.twitter.com https://analytics.twitter.com https://publish.twitter.com https://ton.twitter.com https://syndication.twitter.com https://www.google.com https://platform.twitter.com 'nonce-MGjMP/7fers/GcIo4GJyPw==' https://www.google-analytics.com blob: 'self'\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback.\n",
                "timestamp": 1573524316410,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://twitter.com/topcoder - Refused to load the image 'https://stats.g.doubleclick.net/r/collect?v=1&aip=1&t=dc&_r=3&tid=UA-30775-6&cid=1538408508.1573524316&jid=66032468&_gid=507396689.1573524316&gjid=96648308&_v=j79&z=1082592910' because it violates the following Content Security Policy directive: \"img-src https://*.giphy.com https://*.pscp.tv https://twitter.com https://*.twimg.com data: https://clips-media-assets.twitch.tv https://lumiere-a.akamaihd.net https://ton.twitter.com https://syndication.twitter.com https://media.riffsy.com https://www.google.com https://platform.twitter.com https://api.mapbox.com https://www.google-analytics.com blob: https://*.periscope.tv 'self'\".\n",
                "timestamp": 1573524316432,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/009e0066-006f-0009-00c8-00ea009f00e9.png",
        "timestamp": 1573524298939,
        "duration": 19362
    },
    {
        "description": "should verify whether the user is redirected to the topcoder homepage on clicking the Topcoder logo|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524319487,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524319488,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524319488,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524319488,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00790060-00b1-0092-00f0-00e000970079.png",
        "timestamp": 1573524318454,
        "duration": 10951
    },
    {
        "description": "should verify whether the user is redirected to the Challenge listing page on clicking the All Challenges sub menu under the Compete menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524330262,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524330262,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524330262,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524330263,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00fe00e7-00fa-007c-00f3-00bb0067006d.png",
        "timestamp": 1573524329546,
        "duration": 7518
    },
    {
        "description": "should verify whether the user is redirected to the Login page on clicking the Competitive programming sub menu under the Compete menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524338587,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524338588,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524338588,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524338588,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Farena.topcoder.com%2Findex.html 0:0 Uncaught (in promise)",
                "timestamp": 1573524346965,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00cb00f2-008b-00e8-002e-00de00920037.png",
        "timestamp": 1573524337217,
        "duration": 10800
    },
    {
        "description": "should verify whether the user is redirected to the respective page while clicking the sub menu under the Tracks menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524349139,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524349140,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524349140,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524349140,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524356045,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524356046,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524356046,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524356046,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524362452,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524362452,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524362452,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524362452,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524369816,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524369816,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524369816,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524369816,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524376443,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524376443,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524376443,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524376443,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/005a0036-0074-00e0-0008-004100c4002a.png",
        "timestamp": 1573524348136,
        "duration": 34813
    },
    {
        "description": "should verify whether the user is redirected to the respective page while clicking the sub menu under the Community menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524394103,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524394104,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524394104,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524394104,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524401095,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524401095,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524401096,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524401096,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524416267,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524416267,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524416267,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524416268,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524425750,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524425750,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524425750,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524425750,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/005e00ee-009e-00f7-00fa-004800ed003f.png",
        "timestamp": 1573524383102,
        "duration": 48968
    },
    {
        "description": "should verify whether the user is redirected to the Login page on clicking the Forums sub menu under the Community menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524441331,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524441332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524441332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524441332,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573524449306,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573524450054,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0001004f-004d-00a8-0031-007600a6009c.png",
        "timestamp": 1573524432211,
        "duration": 17591
    },
    {
        "description": "should verify whether the user is redirected to the Topcoder Arena page on clicking the Competitive programming sub menu under the Compete menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524456157,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524456157,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524456157,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524456158,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00260085-0028-003c-0035-00e800260016.png",
        "timestamp": 1573524455276,
        "duration": 7999
    },
    {
        "description": "should verify whether the user is redirected to the Forum page on clicking the Forums sub menu under the Community menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524464490,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524464490,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524464491,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524464491,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524471231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524471231,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524471232,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524471232,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/ 482 Mixed Content: The page at 'https://apps.topcoder.com/forums/' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573524489448,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004b0034-00b3-009e-0084-00aa004100ab.png",
        "timestamp": 1573524463728,
        "duration": 26073
    },
    {
        "description": "should verify whether the current page is redirected to my profile page on clicking the my profile under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524491282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524491282,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524491283,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524491283,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ef00fe-0027-0048-0056-001f00770066.png",
        "timestamp": 1573524490325,
        "duration": 9634
    },
    {
        "description": "should verify whether the current page is redirected to the payments page on clicking the payments under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524500791,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524500791,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524500791,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524500792,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 537 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573524508137,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00e00052-00bc-0062-0007-00e4002700f7.png",
        "timestamp": 1573524500101,
        "duration": 8231
    },
    {
        "description": "should verify whether the current page is redirected to the settings page on clicking the settings under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524509596,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524509597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524509597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524509597,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ff008f-0065-003d-00e9-002a00b90080.png",
        "timestamp": 1573524508730,
        "duration": 9686
    },
    {
        "description": "should verify whether the logout happens on clicking the logout under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 21581,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.70"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573524520008,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573524520008,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573524520008,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573524520008,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ff00d0-00d8-0080-0049-000000060052.png",
        "timestamp": 1573524518549,
        "duration": 11815
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

