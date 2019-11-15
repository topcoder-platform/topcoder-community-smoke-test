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
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573800734376,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800735522,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800745080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://fast.trychameleon.com/messo/SAcpvabiB6Vsb9yZm32REVpDemzhOjyY6iznnOufjNlqyk-1DPhtq-A61ZuE9U5MrO1WGx/messo.min.js 0:3112 \"Chameleon Error: No \\\"Unique ID\\\" passed to Identify. The \\\"Unique ID\\\" informs Chameleon who this user is across sessions.\\n  Call chmln.identify(Unique ID, { user traits });\\n  See https://support.trychameleon.com/docs/getting-started for more information.\"",
                "timestamp": 1573800747242,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800763017,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800764268,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800773648,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/000200d4-00bb-006e-006c-0029005d00c8.png",
        "timestamp": 1573800759184,
        "duration": 17045
    },
    {
        "description": "should verify User can Add/Update/Delete language|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800777910,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0043008a-0018-00dc-0037-000100b500fd.png",
        "timestamp": 1573800776604,
        "duration": 33653
    },
    {
        "description": "should verify User can Add/Update/Delete Education|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800811866,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001b0088-0056-0097-00fb-006500c10099.png",
        "timestamp": 1573800810566,
        "duration": 48090
    },
    {
        "description": "should verify User can Add/Update/Delete work |Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800860226,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00a00010-0042-00da-0014-006b000f00d7.png",
        "timestamp": 1573800858952,
        "duration": 43176
    },
    {
        "description": "should verify User can Add/Delete skill.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800903706,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004c00e5-00d6-00ea-00a3-00d8002d00df.png",
        "timestamp": 1573800902446,
        "duration": 21273
    },
    {
        "description": "should verify User can Add/Update/Delete the hobby.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800925929,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004c0001-00bd-0046-0028-00a30084007e.png",
        "timestamp": 1573800924002,
        "duration": 41487
    },
    {
        "description": "should verify User can update the community.|Topcoder Profile Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800967076,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800971260,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573800971956,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573800971957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573800971957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573800971958,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ac00b4-008e-009a-00e5-00eb001c00cd.png",
        "timestamp": 1573800965775,
        "duration": 4140
    },
    {
        "description": "should verify User can Add/Update/Delete Device|Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800979496,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573800984767,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800986170,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800989762,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573800992057,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00280043-00b3-000e-00c3-001c007d00f5.png",
        "timestamp": 1573800990798,
        "duration": 33432
    },
    {
        "description": "should Verify User can Add/Update/Delete Software|Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801025687,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00c600b2-004b-0026-0063-0061007d009b.png",
        "timestamp": 1573801024526,
        "duration": 37613
    },
    {
        "description": "should Verify User can Add/Update/Delete Service Provider|Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801063483,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/009c00be-002b-00c9-001b-003f002f00b5.png",
        "timestamp": 1573801062420,
        "duration": 32570
    },
    {
        "description": "should Verify User can Add/Update/Delete Subscriptions |Topcoder Tools Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801096479,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801128966,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801128967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801128968,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801128968,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801129129,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d500c4-004a-00b9-00e6-00c8006c0061.png",
        "timestamp": 1573801095272,
        "duration": 32465
    },
    {
        "description": "should Verify User can update his/her User Consent. |Topcoder Account Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801136278,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801140631,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573801141827,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801142128,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801146793,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801149515,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801162945,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00eb0047-00a3-0023-0089-00000007004a.png",
        "timestamp": 1573801148122,
        "duration": 20529
    },
    {
        "description": "should Verify User can Add/Delete External Link.|Topcoder Account Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801171181,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801196213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801196213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801196213,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801196214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801196409,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/005b0032-00d6-00e8-0029-00b100ac00e0.png",
        "timestamp": 1573801168971,
        "duration": 25644
    },
    {
        "description": "should Verify User can update Email Preferences|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801203372,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801207369,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573801208636,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801209268,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801213630,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801215828,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801235558,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00e100b2-00cb-00c6-00c7-009700060099.png",
        "timestamp": 1573801214472,
        "duration": 26818
    },
    {
        "description": "should Verify User can redirect to forums's setting page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801243378,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings 514 Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573801251178,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/midOnOff.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573801251636,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/midOffOff.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573801251637,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/rightOff.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573801251649,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/midOffOn.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573801251685,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://apps.topcoder.com/forums/?module=Settings - Mixed Content: The page at 'https://apps.topcoder.com/forums/?module=Settings' was loaded over HTTPS, but requested an insecure image 'http://www.topcoder.com/i/stats/tabs/rightOn.gif'. This content should also be served over HTTPS.",
                "timestamp": 1573801251687,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801252528,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0068002a-00c9-00ae-0088-00650043004c.png",
        "timestamp": 1573801241604,
        "duration": 10912
    },
    {
        "description": "should Verify User can redirect to Payment details page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801254545,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 535 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573801264714,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801264901,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f10011-00cf-0019-007a-00be00670028.png",
        "timestamp": 1573801253201,
        "duration": 12437
    },
    {
        "description": "should Verify User can redirect to Request visa letter page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801267192,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/tc?module=VisaSelection 481 Mixed Content: The page at 'https://community.topcoder.com/tc?module=VisaSelection' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573801273661,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801273877,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ba007d-00e7-00a7-0041-009a00420053.png",
        "timestamp": 1573801265989,
        "duration": 7895
    },
    {
        "description": "should Verify User can redirect to Referrals page|Topcoder Preferences Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801275725,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/tc?module=ViewReferrals 475 Mixed Content: The page at 'https://community.topcoder.com/tc?module=ViewReferrals' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573801295945,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801296140,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801297953,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801297953,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801297953,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801297954,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801298774,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/008e006f-005a-000d-00f5-00ab003a000c.png",
        "timestamp": 1573801274494,
        "duration": 22364
    },
    {
        "description": "should verify whether the current page is redirected to Registration page on clicking the Join button|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801305494,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801310110,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801310110,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801310111,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801310111,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801310690,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801318187,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001700ff-0082-0062-00be-00d90071001f.png",
        "timestamp": 1573801308937,
        "duration": 9277
    },
    {
        "description": "should verify whether the current page is redirected to Login page on clicking the Log in button.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801319721,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801319721,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801319722,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801319722,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801319945,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Fwww.topcoder.com%2Fchallenges&utm_source=community-app-main 0:0 Uncaught (in promise)",
                "timestamp": 1573801326028,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801326181,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003d00dd-0056-0065-008a-009600c4001f.png",
        "timestamp": 1573801318514,
        "duration": 8232
    },
    {
        "description": "should verify whether the user is able to search the member by their username/skill using the search icon.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801328091,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801328091,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801328092,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801328092,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801328402,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801334658,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=e20190928114001&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573801336973,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573801336980,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801338782,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801338784,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801338787,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801338787,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801339597,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801345317,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=Java&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573801347056,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573801347065,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/leaderboards/?filter=id%3D247%26type%3DMEMBER_SKILL - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573801347083,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ab00a1-00ee-000b-00e6-00df008100f5.png",
        "timestamp": 1573801327014,
        "duration": 20820
    },
    {
        "description": "should verify whether all the open for registration and Ongoing challenges are listed on clicking the Challenge tab.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801349063,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801349064,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801349064,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801349065,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801350816,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/006500b3-0084-00f5-009f-00d1003c0072.png",
        "timestamp": 1573801348094,
        "duration": 8022
    },
    {
        "description": "should verify whether login page is opened on clicking the SRM tab.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801357591,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801357591,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801357592,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801357592,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801357781,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801364479,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Farena.topcoder.com%2Findex.html 0:0 Uncaught (in promise)",
                "timestamp": 1573801366252,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801366455,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00040018-00a5-00e0-00ce-00cc00e50064.png",
        "timestamp": 1573801356422,
        "duration": 10352
    },
    {
        "description": "should verify whether the user is able to search for a challenge by using the Search challenges textbox.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801368337,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801368338,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801368338,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801368339,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801368551,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d6002a-00b2-0020-00d0-00ff009d0024.png",
        "timestamp": 1573801367093,
        "duration": 10105
    },
    {
        "description": "should verify that the \"Filter\" button is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801378906,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801378906,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801378906,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801378906,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801379225,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d20097-00d8-00df-00f1-00fc00e10034.png",
        "timestamp": 1573801377492,
        "duration": 7468
    },
    {
        "description": "should verify that the \"Filter\" option \"keywords\" is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801386659,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801386694,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801386694,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801386694,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801386695,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/007100a9-00bd-00b1-0021-00a90022007b.png",
        "timestamp": 1573801385283,
        "duration": 23654
    },
    {
        "description": "should verify that the \"Filter\" option \"Subtrack\" is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801410384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801410384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801410385,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801410385,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801410571,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00040019-0068-00aa-0011-0086005e00c7.png",
        "timestamp": 1573801409243,
        "duration": 22446
    },
    {
        "description": "should verify that the \"Filter\" option \"Sub Community\" is working correctly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801433134,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801433158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801433158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801433158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801433158,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00b6002a-00fa-008a-004a-004600ac0074.png",
        "timestamp": 1573801431996,
        "duration": 22500
    },
    {
        "description": "should verify that the \"Filter\" option for \"Date range\" is workingcorrectly|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801455625,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801455627,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801455628,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801455628,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801457160,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00a700b1-003d-009d-0023-0007004f006e.png",
        "timestamp": 1573801454814,
        "duration": 10791
    },
    {
        "description": "should verify whether the challenges are filtered according to the keyword/Subtrack/Sub community/Date range fields selected under the Filter function.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801467095,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801467096,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801467096,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801467096,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801467284,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003900ed-0007-0098-0064-009d00f4007d.png",
        "timestamp": 1573801465918,
        "duration": 38222
    },
    {
        "description": "should verify whether the user is able to select more than one keyword/Subtrack under the filter function.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801505214,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801505215,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801505215,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801505216,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801506098,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/005600ae-002a-0090-00ee-008200e50005.png",
        "timestamp": 1573801504445,
        "duration": 44473
    },
    {
        "description": "should verify whether the cross symbol inside the textbox keyword/Subtrack filters removes the selected keyword/Subtrack.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801550227,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801550228,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801550228,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801550228,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801551265,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004500fb-00e2-0052-00b7-00bd00050081.png",
        "timestamp": 1573801549230,
        "duration": 85948
    },
    {
        "description": "should verify whether the number of filters applied are shown into Filter button according to the keyword/Subtrack/Sub community/Date range fields selected.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801636555,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801636556,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801636556,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801636557,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801637604,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d1008a-0056-0049-00ab-004e00ca0085.png",
        "timestamp": 1573801635481,
        "duration": 13754
    },
    {
        "description": "should verify whether the clear filter button clears all the filters selected and all the challenges are displayed.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801650644,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801650644,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801650644,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801650645,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801650855,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00c700f3-002a-007c-0051-00fa004300fd.png",
        "timestamp": 1573801649538,
        "duration": 13272
    },
    {
        "description": "should verify whether the Save filter button is deactivated into filter function.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801663955,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801663956,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801663956,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801663957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801665011,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00c800e2-0061-0046-006a-00de003b0012.png",
        "timestamp": 1573801663120,
        "duration": 8060
    },
    {
        "description": "should verify whether the Sort by select option under the Open for registration/Ongoing Challenges list sorts the challenges according to the selected option.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801672384,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801672385,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801672387,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801672387,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801673415,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00860021-00fd-007b-003d-00b800700017.png",
        "timestamp": 1573801671505,
        "duration": 9563
    },
    {
        "description": "should verify whether the View more challenges link under the Open for registration/Ongoing Challenges list displays all the Open for registration/Ongoing challenges.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801682220,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801682220,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801682221,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801682221,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801682982,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00140049-007d-00b8-0057-002200b600b1.png",
        "timestamp": 1573801681388,
        "duration": 8379
    },
    {
        "description": "should verify that when user selects a challenge \"tag\", only challenges under the selected tag are shown.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801691261,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801691261,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801691262,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801691262,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801691478,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00e90080-004d-0008-004b-00b2004f00fc.png",
        "timestamp": 1573801690085,
        "duration": 9542
    },
    {
        "description": "should verify that the challenge count matches the number of challenges displayed|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801701101,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801701129,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801701129,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801701129,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801701129,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/002d00d3-0030-006b-0063-001e00ee0014.png",
        "timestamp": 1573801699932,
        "duration": 38129
    },
    {
        "description": "should verify that the challenge count remains the same when switching to the challenge details and then back to the challenge listings page |Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801740361,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801740363,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801740364,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801740367,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801741789,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00260028-00b7-0039-00eb-00eb00470004.png",
        "timestamp": 1573801738399,
        "duration": 21254
    },
    {
        "description": "should verify All Challenges link functionality with the design, development, and data sceince toggle switches on|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801760857,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801760858,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801760859,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801760861,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801761862,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.\\nArguments: \\n[0] _isAMomentObject: true, _isUTC: false, _useUTC: false, _l: undefined, _i: Sat Nov 16 2019 09:04:00 UTC, _f: undefined, _strict: undefined, _locale: [object Object]\\nError\\n    at Function.createFromInputFallback (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:9180)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29041\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29092\\n    at It (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29386)\\n    at Dt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29763)\\n    at xt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29845)\\n    at a (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:6018)\\n    at func (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:48:75191)\\n    at Array.sort (\\u003Canonymous>)\\n    at m (https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js:14:20349)\\n    at ao (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:58611)\\n    at Po (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:65932)\\n    at el (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:104471)\\n    at yl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88947)\\n    at bl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88872)\\n    at sl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:85814)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45124\\n    at t.unstable_runWithPriority (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:85:3465)\\n    at Ya (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:44833)\\n    at Ha (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45069)\\n    at Ga (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45004)\\n    at nl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:82534)\\n    at Object.enqueueSetState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:49701)\\n    at s.E.setState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:56:1468)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14541)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at p (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:53783)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4368\\n    at dispatch (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:56979)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4263\"",
                "timestamp": 1573801774283,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/007200a3-00fa-008f-0019-00c200b100b6.png",
        "timestamp": 1573801759966,
        "duration": 15797
    },
    {
        "description": "should verify All Challenges link functionality with the design, development, and data sceince toggle switches Off|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801777211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801777212,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801777212,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801777212,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801777432,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"Deprecation warning: value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are discouraged and will be removed in an upcoming major release. Please refer to http://momentjs.com/guides/#/warnings/js-date/ for more info.\\nArguments: \\n[0] _isAMomentObject: true, _isUTC: false, _useUTC: false, _l: undefined, _i: Sat Nov 16 2019 09:04:00 UTC, _f: undefined, _strict: undefined, _locale: [object Object]\\nError\\n    at Function.createFromInputFallback (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:9180)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29041\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29092\\n    at It (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29386)\\n    at Dt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29763)\\n    at xt (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:29845)\\n    at a (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:1:6018)\\n    at func (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:48:75191)\\n    at Array.sort (\\u003Canonymous>)\\n    at m (https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js:14:20349)\\n    at ao (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:58611)\\n    at Po (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:65932)\\n    at el (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:104471)\\n    at yl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88947)\\n    at bl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:88872)\\n    at sl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:85814)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45124\\n    at t.unstable_runWithPriority (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:85:3465)\\n    at Ya (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:44833)\\n    at Ha (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45069)\\n    at Ga (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:45004)\\n    at nl (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:82534)\\n    at Object.enqueueSetState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:77:49701)\\n    at s.E.setState (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:56:1468)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14541)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at Object.notify (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:11223)\\n    at e.t.notifyNestedSubs (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:10871)\\n    at s.l.onStateChange (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:14559)\\n    at p (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:53783)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4368\\n    at dispatch (https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:14:56979)\\n    at https://d2nl5eqipnb33q.cloudfront.net/static-assets/main-1573217490138.js:26:4263\"",
                "timestamp": 1573801793588,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0025002f-00b3-00f2-00d0-007e00ff00bb.png",
        "timestamp": 1573801776084,
        "duration": 21607
    },
    {
        "description": "should verify whether the page is redirected to the RSS Feed page on clicking the RSS feed link.|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801799611,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801799643,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801799643,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801799644,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801799644,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00520042-0031-00bf-001a-0082008600a5.png",
        "timestamp": 1573801797990,
        "duration": 9888
    },
    {
        "description": "should verify whether the page is redirected to the respective page on clicking the link(About, Contact, Help, Privacy, Terms).|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801810069,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801810069,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801810069,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801810070,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801810967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801818816,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801834106,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801835956,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801839385,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573801841695,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004b0062-0041-007c-007d-00ad00fc0089.png",
        "timestamp": 1573801808203,
        "duration": 32238
    },
    {
        "description": "should verify whether the current page is redirected to my Dashboard page on clicking the Dashboard under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801842664,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801848429,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801850195,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801850196,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801850196,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801850197,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801852897,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801860985,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.topcoder.com/community-app-assets/api/xml2json - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573801861548,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.topcoder.com/my-dashboard 0:0 Uncaught SyntaxError: Unexpected token T in JSON at position 0",
                "timestamp": 1573801861573,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00be0087-00d7-00fd-0097-0076008e0053.png",
        "timestamp": 1573801849207,
        "duration": 12414
    },
    {
        "description": "should verify whether the current page is redirected to my profile page on clicking the my profile under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801863624,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801863624,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801863625,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801863626,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801863801,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801871351,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003900d3-00b1-001f-00fd-00ae0050005b.png",
        "timestamp": 1573801862145,
        "duration": 10503
    },
    {
        "description": "should verify whether the current page is redirected to the payments page on clicking the payments under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801874388,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801874419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801874419,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801874420,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801874420,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 537 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573801881473,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801882774,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00b300f8-0049-007e-007b-004000ab002f.png",
        "timestamp": 1573801872964,
        "duration": 9832
    },
    {
        "description": "should verify whether the current page is redirected to the settings page on clicking the settings under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801884415,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801884416,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801884418,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801884420,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801885191,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801892551,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00de0002-0088-00d5-0062-0094003800a8.png",
        "timestamp": 1573801883298,
        "duration": 10365
    },
    {
        "description": "should verify whether the user is able to search the member by their username/skill using the search icon.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801895201,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801895222,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801895223,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801895223,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801895223,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801901858,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=e20190928114001&offset=0&limit=10 - Failed to load resource: the server responded with a status of 401 ()",
                "timestamp": 1573801903849,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573801903864,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801905690,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801905691,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801905692,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801905693,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801906567,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801912491,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/members/_search/?query=MEMBER_SEARCH&handle=Java&offset=0&limit=10 - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573801914216,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://s3.amazonaws.com/app.topcoder.com/app.9d13743831d3e754b3de.js 422:2103 Uncaught Error: Could not resolve all promises. Reason: Error: Could not fetch username matches. Reason: Error",
                "timestamp": 1573801914230,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v3/leaderboards/?filter=id%3D247%26type%3DMEMBER_SKILL - Failed to load resource: the server responded with a status of 500 ()",
                "timestamp": 1573801914262,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/005b0062-00c3-0099-00a3-00e1006a003f.png",
        "timestamp": 1573801893980,
        "duration": 21217
    },
    {
        "description": "should verify whether all the my challenges, open for registration and Ongoing challenges are listed on clicking the Challenge tab.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801916552,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801916553,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801916553,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801916553,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801917015,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00a60013-00c7-00c3-00ca-002c00fe007d.png",
        "timestamp": 1573801915482,
        "duration": 7196
    },
    {
        "description": "should verify whether the Topcoder arena page is opened on clicking the SRM tab. |After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801923862,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801923863,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801923863,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801923863,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801924749,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/sdk.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801941313,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://platform.twitter.com/widgets.js?_=1573801940980 - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801941333,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/009d009e-009d-008c-0031-00ca0046000c.png",
        "timestamp": 1573801922995,
        "duration": 19194
    },
    {
        "description": "should verify whether the logout happens on clicking the logout under the Username menu.|After login test cases|Topcoder Challenge Listing Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801943968,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801943969,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801943969,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801943970,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801944209,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801950965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801953922,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001d0082-002d-00f6-0005-003a00440050.png",
        "timestamp": 1573801942506,
        "duration": 12493
    },
    {
        "description": "should verify whether the  error message is displayed on clicking the Challenge Terms link.|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801957320,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801960253,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://api.topcoder.com/v2/terms/detail/21303?nocache=1573801960965 - Failed to load resource: the server responded with a status of 401 ()",
                "timestamp": 1573801961502,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.topcoder.com/challenges/terms/detail/21303 0:0 ",
                "timestamp": 1573801961502,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573801962127,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801962324,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/007800c8-009b-0072-00a9-009c003f000b.png",
        "timestamp": 1573801955439,
        "duration": 6109
    },
    {
        "description": "should verify that back button redirects user to challenge|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801967121,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801968977,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801968978,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801968978,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801968978,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801969181,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801976361,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801978999,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573801979874,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573801979874,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573801979874,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573801979874,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001d0087-00b0-00ad-00c7-00f3007200a7.png",
        "timestamp": 1573801967766,
        "duration": 12310
    },
    {
        "description": "should verify that a user is able to successfully enter a submission to a code challenge|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801982134,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/006b009b-00b4-0005-00cb-0089002b00d3.png",
        "timestamp": 1573801980449,
        "duration": 10070
    },
    {
        "description": "should verify whether the user is registered to the particular challenge on clicking the Register button.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801992255,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573801994994,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004d0084-0090-000c-00d0-001000850054.png",
        "timestamp": 1573801990844,
        "duration": 22377
    },
    {
        "description": "should verify whether the user is unregistered into particular challenge on clicking the UnRegister button.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802015473,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802017992,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f100e6-0023-0001-0023-00e100e20054.png",
        "timestamp": 1573802013586,
        "duration": 29345
    },
    {
        "description": "should verify whether the user is redirected to the Submission page on clicking the Submit button.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802044990,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802047592,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f600d6-00b8-005e-0067-00160008002b.png",
        "timestamp": 1573802043252,
        "duration": 11765
    },
    {
        "description": "should verify whether the deadlines(time zone) for the particular challenge on clicking the show Deadlines.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802056718,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802059525,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00b400d3-003f-00eb-00dd-00c8000a0049.png",
        "timestamp": 1573802055326,
        "duration": 5411
    },
    {
        "description": "should verify whether the details of the challenges are displayed on clicking the Details tab.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802062380,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802064960,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00ba00d9-0099-00d6-0043-008b00580069.png",
        "timestamp": 1573802061053,
        "duration": 4648
    },
    {
        "description": "should verify whether the registered members of the challenges are displayed on clicking the Registrants tab.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802067509,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802070244,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00bd0018-0099-0006-004f-000900c2009f.png",
        "timestamp": 1573802066036,
        "duration": 4939
    },
    {
        "description": "should verify whether the  Solution submitted members  are displayed on clicking the Submissions tab.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802073406,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802077536,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/007800bb-0062-00e0-0006-00c00027001f.png",
        "timestamp": 1573802071306,
        "duration": 8218
    },
    {
        "description": "should verify whether the  user is redirected to the Review Scorecard page on clicking the Review Scorecard link.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802081554,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802086010,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802090446,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/003d00bc-0020-00f6-004b-00b6006200f3.png",
        "timestamp": 1573802079843,
        "duration": 10645
    },
    {
        "description": "should verify whether the  user is redirected to the Challenge Terms page on clicking the Challenge Terms link.|Pre-condition of login|Topcoder Challenge Detail Page Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802092500,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802096162,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802099474,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802099517,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802099517,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802099517,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802099517,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f4002c-00e8-0029-00af-00e7001200c6.png",
        "timestamp": 1573802090976,
        "duration": 7077
    },
    {
        "description": "To verify that user is able to view dashboard when logged in|After login tests|Topcoder Dashboard Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802106828,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802110897,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573802112911,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802113433,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802117871,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802120166,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802122646,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802122646,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802122647,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802122647,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802123184,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00c100fa-00e8-007f-00db-00aa00e900dd.png",
        "timestamp": 1573802118868,
        "duration": 2307
    },
    {
        "description": "should verify whether the user is redirected to the topcoder social sites on clicking the social sites icon.|Topcoder Dashboard Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802130021,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802133371,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802134993,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Fwww.topcoder.com%2Fmy-dashboard&utm_source=community-app-main 0:0 Uncaught (in promise)",
                "timestamp": 1573802136607,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802136723,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/001600cf-0036-009a-0017-00330045004b.png",
        "timestamp": 1573802134021,
        "duration": 3248
    },
    {
        "description": "should verify whether the user is redirected to respective page on clicking the footer menu link into Footer of page.|Topcoder Footer Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802138803,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802138804,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802138804,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802138804,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802138957,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802146560,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802149166,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802149168,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802149168,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802149169,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802149550,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802159635,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802161158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802161158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802161159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802161159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802162472,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802173785,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802173785,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802173786,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802173786,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802174443,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802183381,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802184895,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802184896,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802184896,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802184896,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802186076,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802194111,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802196063,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802196064,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802196065,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802196065,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802196777,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/004a00e9-003b-0016-0015-003800ec00d6.png",
        "timestamp": 1573802137554,
        "duration": 64455
    },
    {
        "description": "should verify whether the user is redirected to the topcoder social sites on clicking the social sites icon.|Topcoder Footer Tests: ",
        "passed": false,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": [
            "Expected 'https://www.twitter.com/topcoder' to equal 'https://twitter.com/topcoder'.",
            "Expected 'https://www.instagram.com/topcoder' to equal 'https://www.instagram.com/topcoder/'."
        ],
        "trace": [
            "Error: Failed expectation\n    at Function.<anonymous> (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/page-objects/common/common.helper.ts:58:21)\n    at step (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/temp/page-objects/common/common.helper.js:32:23)\n    at Object.next (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/temp/page-objects/common/common.helper.js:13:53)\n    at fulfilled (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/temp/page-objects/common/common.helper.js:4:58)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)",
            "Error: Failed expectation\n    at Function.<anonymous> (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/page-objects/common/common.helper.ts:58:21)\n    at step (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/temp/page-objects/common/common.helper.js:32:23)\n    at Object.next (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/temp/page-objects/common/common.helper.js:13:53)\n    at fulfilled (/Users/deepakthapa/Documents/GitHub/topcoder-community-smoke-test/temp/page-objects/common/common.helper.js:4:58)\n    at processTicksAndRejections (internal/process/task_queues.js:86:5)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802203492,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802203492,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802203492,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802203492,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802203671,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.facebook.com/topcoder - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802210313,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.twitter.com/topcoder - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802210730,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://www.instagram.com/topcoder - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802210988,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00b100b3-00f9-007a-00d5-00e500c400ef.png",
        "timestamp": 1573802202345,
        "duration": 8679
    },
    {
        "description": "should verify whether the user is redirected to the topcoder homepage on clicking the Topcoder logo|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802212457,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802212543,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802212545,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802212546,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802212547,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802219889,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00040023-00d2-0073-00e4-00ef00470069.png",
        "timestamp": 1573802211330,
        "duration": 9540
    },
    {
        "description": "should verify whether the user is redirected to the Challenge listing page on clicking the All Challenges sub menu under the Compete menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802222063,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802222063,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802222064,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802222064,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802223214,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00e40038-000f-007f-0041-00ec00ae00bf.png",
        "timestamp": 1573802221215,
        "duration": 7796
    },
    {
        "description": "should verify whether the user is redirected to the Login page on clicking the Competitive programming sub menu under the Compete menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802230881,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802230882,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802230882,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802230883,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802231079,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802237572,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member?retUrl=https:%2F%2Farena.topcoder.com%2Findex.html 0:0 Uncaught (in promise)",
                "timestamp": 1573802239583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802240817,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00f0000b-006f-00af-00b6-00f800310091.png",
        "timestamp": 1573802229346,
        "duration": 11501
    },
    {
        "description": "should verify whether the user is redirected to the respective page while clicking the sub menu under the Tracks menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802242434,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802242437,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802242439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802242439,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802242651,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802249481,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802249481,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802249481,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802249482,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802249662,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802258397,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802258414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802258414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802258414,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802258963,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802265389,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802265390,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802265390,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802265390,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802266323,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802273099,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802273099,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802273100,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802273100,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802275811,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00140009-00e6-005a-0097-000b000e00e7.png",
        "timestamp": 1573802241133,
        "duration": 40639
    },
    {
        "description": "should verify whether the user is redirected to the respective page while clicking the sub menu under the Community menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802284246,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802286910,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802286910,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802286911,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802286911,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802287096,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802294083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802294083,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802294084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802294084,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802294388,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802301119,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802301158,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802301159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802301159,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802301160,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802308210,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802308211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802308211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802308211,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802308387,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802315031,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802315032,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802315032,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802315032,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802315224,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324877 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802321523,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:324896 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802321523,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325787 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802321524,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://d2nl5eqipnb33q.cloudfront.net/static-assets/challenge-listing/chunk-1573217490138.js 0:325867 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802321524,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802322414,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/000c003b-00a8-001c-00e7-0020007900ad.png",
        "timestamp": 1573802285482,
        "duration": 42399
    },
    {
        "description": "should verify whether the user is redirected to the Login page on clicking the Forums sub menu under the Community menu.|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802329063,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802329071,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802329079,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802329079,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802329992,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802336518,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802336583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802336583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802336583,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802336584,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573802343860,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802344072,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://accounts.topcoder.com/member 0:0 Uncaught (in promise)",
                "timestamp": 1573802344707,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802344815,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d8005c-003f-00c7-00ae-003100d90012.png",
        "timestamp": 1573802328223,
        "duration": 16115
    },
    {
        "description": "should verify whether the user is redirected to the Topcoder Arena page on clicking the Competitive programming sub menu under the Compete menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802349837,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802351967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802351967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802351967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802351968,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802352968,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00c900c3-00d5-00bd-003e-00c600bf0025.png",
        "timestamp": 1573802350874,
        "duration": 7472
    },
    {
        "description": "should verify whether the user is redirected to the Forum page on clicking the Forums sub menu under the Community menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802359974,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802359998,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802359999,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802359999,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802359999,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802367305,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802367306,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802367308,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802367310,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802367916,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00790048-0078-00f1-0092-008000b6006c.png",
        "timestamp": 1573802358675,
        "duration": 15057
    },
    {
        "description": "should verify whether the current page is redirected to my profile page on clicking the my profile under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802374907,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802374907,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802374907,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802374908,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802375898,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802382793,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00d90075-0016-0043-00de-004d00b50067.png",
        "timestamp": 1573802374056,
        "duration": 10005
    },
    {
        "description": "should verify whether the current page is redirected to the payments page on clicking the payments under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802385756,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802385757,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802385757,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802385758,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802386015,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false 537 Mixed Content: The page at 'https://community.topcoder.com/PactsMemberServlet?module=PaymentHistory&full_list=false' was loaded over a secure connection, but contains a form that targets an insecure endpoint 'http://community.topcoder.com/tc'. This endpoint should be made available over a secure connection.",
                "timestamp": 1573802393558,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802394962,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/009d0087-00de-0067-00c2-00e1009200a8.png",
        "timestamp": 1573802384395,
        "duration": 10718
    },
    {
        "description": "should verify whether the current page is redirected to the settings page on clicking the settings under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802396962,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802396965,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802396966,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802396967,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802397227,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802404790,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/00db00da-00c4-006d-007b-00e700810092.png",
        "timestamp": 1573802395675,
        "duration": 9975
    },
    {
        "description": "should verify whether the logout happens on clicking the logout under the Username menu.|Tests with login as pre-requisite|Topcoder Header Tests: ",
        "passed": true,
        "pending": false,
        "os": "Mac OS X",
        "instanceId": 10304,
        "browser": {
            "name": "chrome",
            "version": "78.0.3904.97"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: NODE_ENV value of 'production' did not match any deployment config file names.\"",
                "timestamp": 1573802407243,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: See https://github.com/lorenwest/node-config/wiki/Strict-Mode\"",
                "timestamp": 1573802407245,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: No configurations found in configuration directory:/config\"",
                "timestamp": 1573802407246,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://cdn.ravenjs.com/3.17.0/raven.min.js 1:1148 \"WARNING: To disable this warning set SUPPRESS_NO_CONFIG_WARNING in the environment.\"",
                "timestamp": 1573802407247,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802407603,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802414303,
                "type": ""
            },
            {
                "level": "SEVERE",
                "message": "https://connect.facebook.net/en_US/fbevents.js - Failed to load resource: the server responded with a status of 403 (Forbidden)",
                "timestamp": 1573802418216,
                "type": ""
            }
        ],
        "screenShotFile": "screenshots/0076005d-00ac-00a1-000a-00b800a600e3.png",
        "timestamp": 1573802405971,
        "duration": 12339
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

