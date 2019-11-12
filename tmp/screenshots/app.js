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
        "description": "To verify that user is able to view dashboard when logged in|After login tests|Topcoder Dashboard Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573398366908,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://fast.trychameleon.com/messo/SAcpvabiB6Vsb9yZm32REVpDemzhOjyY6iznnOufjNlqyk-1DPhtq-A61ZuE9U5MrO1WGx/messo.min.js 0:3112 \"Chameleon Error: No \\\"Unique ID\\\" passed to Identify. The \\\"Unique ID\\\" informs Chameleon who this user is across sessions.\\n  Call chmln.identify(Unique ID, { user traits });\\n  See https://support.trychameleon.com/docs/getting-started for more information.\"",
                "timestamp": 1573398375211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.topcoder.com/community-app-assets/api/xml2json - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573398380546,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.topcoder.com/my-dashboard 0:0 Uncaught SyntaxError: Unexpected token T in JSON at position 0",
                "timestamp": 1573398380553,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398382013,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398382014,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398382014,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398382014,
                "type": ""
            }
        ],
        "screenShotFile": "0010009f-00fb-004f-0018-00b600e20014.png",
        "timestamp": 1573398376682,
        "duration": 3330
    },
    {
        "description": "should verify whether the user is redirected to the topcoder social sites on clicking the social sites icon.|Topcoder Dashboard Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Fwww.topcoder.com%2Fmy-dashboard&utm_source=community-app-main 0:0 Uncaught (in promise)",
                "timestamp": 1573398396169,
                "type": ""
            }
        ],
        "screenShotFile": "005300ce-0002-009c-0034-00f400bd000b.png",
        "timestamp": 1573398393773,
        "duration": 2887
    },
    {
        "description": "should verify whether the user is redirected to the topcoder homepage on clicking the Topcoder logo|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398398357,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398398357,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398398358,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398398358,
                "type": ""
            }
        ],
        "screenShotFile": "00d900a6-00be-003e-00ee-00e500a0000e.png",
        "timestamp": 1573398396777,
        "duration": 9103
    },
    {
        "description": "should verify whether the user is redirected to the Challenge listing page on clicking the All Challenges sub menu under the Compete menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398407452,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398407453,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398407453,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398407453,
                "type": ""
            }
        ],
        "screenShotFile": "00500007-0071-00ec-003b-000c007f00d3.png",
        "timestamp": 1573398406069,
        "duration": 7597
    },
    {
        "description": "should verify whether the user is redirected to the Login page on clicking the Competitive programming sub menu under the Compete menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398415521,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398415521,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398415521,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398415521,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Farena.topcoder.com%2Findex.html 0:0 Uncaught (in promise)",
                "timestamp": 1573398424041,
                "type": ""
            }
        ],
        "screenShotFile": "00ff003e-0003-002c-003d-008b00a900ad.png",
        "timestamp": 1573398413799,
        "duration": 10486
    },
    {
        "description": "should verify whether the user is redirected to the respective page while clicking the sub menu under the Tracks menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398426117,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398426118,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398426118,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398426118,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398433561,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398433562,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398433563,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398433563,
                "type": ""
            }
        ],
        "screenShotFile": "00100063-003a-00a6-000b-001700fc00b7.png",
        "timestamp": 1573398424674,
        "duration": 39334
    },
    {
        "description": "should verify whether the user is redirected to the respective page while clicking the sub menu under the Community menu.|Topcoder Header Tests: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:498:11)\n    at tryOnTimeout (timers.js:323:5)\n    at Timer.listOnTimeout (timers.js:290:5)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:498:11)\n    at tryOnTimeout (timers.js:323:5)\n    at Timer.listOnTimeout (timers.js:290:5)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398468653,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398468653,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398468653,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398468653,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398476083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398476083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398476083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398476083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398511652,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398511652,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398511652,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398511652,
                "type": ""
            }
        ],
        "screenShotFile": "004b00d4-005b-0081-00d8-005c00ef00c1.png",
        "timestamp": 1573398467032,
        "duration": 180120
    },
    {
        "description": "should verify whether the user is redirected to the Login page on clicking the Forums sub menu under the Community menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398652516,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398652517,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398652517,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398652517,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398660795,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398660795,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398660796,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398660796,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573398667501,
                "type": ""
            }
        ],
        "screenShotFile": "005a00fd-008f-0099-009a-00b4002f0020.png",
        "timestamp": 1573398650152,
        "duration": 17684
    },
    {
        "description": "should verify whether the user is redirected to the Topcoder Arena page on clicking the Competitive programming sub menu under the Compete menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573398668268,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398675379,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398675382,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398675382,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398675382,
                "type": ""
            }
        ],
        "screenShotFile": "000b00c8-00db-0061-00c7-00f200cd000a.png",
        "timestamp": 1573398668018,
        "duration": 17413
    },
    {
        "description": "should verify whether the user is redirected to the Forum page on clicking the Forums sub menu under the Community menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": [
            "Failed: Wait timed out after 5028ms",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5028ms\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at Driver.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:67:16)\n    at Function.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/page-objects/pages/topcoder/login/login.helper.ts:16:23)\n    at step (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:32:23)\n    at Object.next (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:13:53)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:7:71\n    at new Promise (<anonymous>)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:64:9)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:63:5)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:14:1)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:498:11)\n    at tryOnTimeout (timers.js:323:5)\n    at Timer.listOnTimeout (timers.js:290:5)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4281:23)\n    at ontimeout (timers.js:498:11)\n    at tryOnTimeout (timers.js:323:5)\n    at Timer.listOnTimeout (timers.js:290:5)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398694962,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398694962,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398694963,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398694963,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398702206,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398702206,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398702208,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398702208,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/ 482 Mixed Content: The page at 'https://apps.topcoder.com/forums/' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573398753373,
                "type": ""
            }
        ],
        "screenShotFile": "00b8007e-00ea-0021-0062-0087006000ad.png",
        "timestamp": 1573398685824,
        "duration": 187794
    },
    {
        "description": "should verify whether the current page is redirected to my profile page on clicking the my profile under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": [
            "Failed: Wait timed out after 5045ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5045ms\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at Driver.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:67:16)\n    at Function.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/page-objects/pages/topcoder/login/login.helper.ts:16:23)\n    at step (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:32:23)\n    at Object.next (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:13:53)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:7:71\n    at new Promise (<anonymous>)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:64:9)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:63:5)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:14:1)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398884088,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398884088,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398884089,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398884089,
                "type": ""
            }
        ],
        "screenShotFile": "00a3000f-006f-008a-00e3-000100b3008a.png",
        "timestamp": 1573398875440,
        "duration": 18048
    },
    {
        "description": "should verify whether the current page is redirected to the payments page on clicking the payments under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": [
            "Failed: Wait timed out after 5065ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5065ms\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at Driver.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:67:16)\n    at Function.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/page-objects/pages/topcoder/login/login.helper.ts:16:23)\n    at step (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:32:23)\n    at Object.next (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:13:53)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:7:71\n    at new Promise (<anonymous>)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:64:9)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:63:5)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:14:1)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398902167,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398902167,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398902167,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398902168,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 537 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573398910402,
                "type": ""
            }
        ],
        "screenShotFile": "00a20057-00f5-00fc-0003-00d60048006c.png",
        "timestamp": 1573398893622,
        "duration": 18369
    },
    {
        "description": "should verify whether the current page is redirected to the settings page on clicking the settings under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": [
            "Failed: Wait timed out after 5024ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5024ms\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at Driver.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:67:16)\n    at Function.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/page-objects/pages/topcoder/login/login.helper.ts:16:23)\n    at step (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:32:23)\n    at Object.next (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:13:53)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:7:71\n    at new Promise (<anonymous>)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:64:9)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:63:5)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:14:1)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398920371,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398920375,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398920375,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398920375,
                "type": ""
            }
        ],
        "screenShotFile": "001300aa-0032-0063-00dd-00e700e0002e.png",
        "timestamp": 1573398912133,
        "duration": 16874
    },
    {
        "description": "should verify whether the logout happens on clicking the logout under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": false,
        "pending": false,
        "os": "Linux",
        "instanceId": 13350,
        "browser": {
            "name": "chrome",
            "version": "75.0.3770.80"
        },
        "message": [
            "Failed: Wait timed out after 5041ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5041ms\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:1376:14)\n    at TaskQueue.execute_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3084:14)\n    at TaskQueue.executeNext_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:3067:27)\n    at asyncRun (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2927:27)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2188:20)\n    at ControlFlow.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2517:12)\n    at Driver.wait (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/webdriver.js:934:29)\n    at run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:59:33)\n    at ProtractorBrowser.to.(anonymous function) [as wait] (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/built/browser.js:67:16)\n    at Function.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/page-objects/pages/topcoder/login/login.helper.ts:16:23)\n    at step (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:32:23)\n    at Object.next (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:13:53)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/temp/page-objects/pages/topcoder/login/login.helper.js:7:71\n    at new Promise (<anonymous>)\nFrom: Task: Run beforeEach in control flow\n    at UserContext.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:94:19)\n    at attempt (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4297:26)\n    at QueueRunner.run (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4217:20)\n    at runNext (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4257:20)\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4264:13\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4172:9\n    at /home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/jasminewd2/index.js:64:48\n    at ControlFlow.emit (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/events.js:62:21)\n    at ControlFlow.shutdown_ (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2674:10)\n    at shutdownTask_.MicroTask (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/selenium-webdriver/lib/promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:64:9)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Suite.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:63:5)\n    at addSpecsToSuite (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1107:25)\n    at Env.describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1074:7)\n    at describe (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/node_modules/protractor/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:4399:18)\n    at Object.<anonymous> (/home/abhinav/Documents/Projects/others/merged-code/topcoder-e2e/test-suites/tc-header.spec.ts:14:1)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573398937711,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573398937711,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573398937711,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573398937712,
                "type": ""
            }
        ],
        "screenShotFile": "00790045-000b-0049-00cd-000c00fc0094.png",
        "timestamp": 1573398929183,
        "duration": 19143
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

