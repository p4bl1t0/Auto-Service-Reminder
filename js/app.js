(function () {
    var app = angular.module('autoServiceReminder', [ 'ngRoute'/*, 'store-directives'*/ ]);
    app.data = {
        actualMileage: 0,
        metrics: []
    };
    // Configure the $httpProvider by adding our date transformer
    app.config(['$httpProvider', '$routeProvider', function ($httpProvider, $routeProvider) {
        $httpProvider.defaults.transformResponse.push(function(responseData){
            convertDateStringsToDates(responseData);
            return responseData;
        });
        $routeProvider
            .when('/', {
                controller: 'AutoServiceReminderController',
                templateUrl: 'main.html'
            })
            .when('/metric/:metricName/edit', {
                controller: 'EditController',
                templateUrl: 'metric.html'
            })
            .when('/metric/new', {
                controller: 'CreateController',
                templateUrl: 'metric.html'
            })
            .otherwise({
                redirectTo: '/'
            });
    }]);
    //Controladores
    app.controller('AutoServiceReminderController', ['$http','$scope', function($http, $scope) {
        var asr = this;
        asr.metrics = [];
        asr.actualKm = 0;
        asr.now = new Date();
        asr.kmChanged = false;
        if(app.data.metrics.length == 0) {
            var strData = localStorage["appData"];
            if(strData !== undefined) {
                //Lo tengo almacenado localmente
                //console.log("Loaded from DB");
                var storageData = JSON.parse(strData);
                convertDateStringsToDates(storageData);
                bindData(storageData, asr);
                app.data = storageData;
            } else {
                //Busco los defaults
                $http.get("/data/metrics.json").success(function (data) {
                    bindData(data, asr);
                    app.data = data;
                });
            }
        }
        /*angular.element(document).ready(function () {
            console.log("DOM Ready");
        });*/
        $scope.$watch(function() {
            //console.log($(".gauge"));
            $(".gauge").each(function () {
                $(this).empty();
                new JustGage({
                    id: $(this).attr("id"),
                    value: parseInt($(this).attr("data-value"), 10),
                    min: parseInt($(this).attr("data-min"), 10),
                    max: parseInt($(this).attr("data-max"), 10),
                    title: $(this).attr("data-title")
                });
            });
        });
        asr.saveMileage = function () {
            asr.kmChanged = false;
            //console.log(asr.actualKm);
            saveData(asr);
        };
        asr.doService = function (metric, kms, date) {
            //console.log(metric);
            //console.log(kms);
            //console.log(date);
            if(metric.type === "mileage") {
                metric.last = kms;
            } else {
                metric.last = date;
            }
            saveData(asr);
        };
    }]);

    app.controller('CreateController', function ($scope, $location, $timeout) {
        $scope.save = function () {
            app.data.metrics.push($scope.metric);
            saveData();
            metricInit($scope.metric, app.data.actualMileage);
            //console.log($scope.metric);
            $location.path('/');
        };
    });

    app.controller('EditController', function ($scope, $location, $routeParams) {
        var metricName = $routeParams.metricName;
        for(var i = 0; i < app.data.metrics.length; i++) {
            if(app.data.metrics[i].name === metricName) {
                 $scope.metric = app.data.metrics[i];
                break;
            }
        }
        $scope.destroy = function () {
            var index = -1;
            for(var i = 0; i < app.data.metrics.length; i++) {
                if(app.data.metrics[i].name === $scope.metric.name) {
                    index = i;
                    break;
                }
            }
            if(index >= 0) {
                app.data.metrics.splice(index, 1);
                saveData();
            }
            $location.path('/');
        };

        $scope.save = function () {
            for(var i = 0; i < app.data.metrics.length; i++) {
                if(app.data.metrics[i].name === $scope.metric.name) {
                    app.data.metrics[i] = $scope.metric;
                    break;
                }
            }
            saveData();
            metricInit($scope.metric, app.data.actualMileage);
            $location.path('/');
        };
    });

    //Funciones
    function saveData (ctrl) {
        if(ctrl !== undefined) {
            var data = {
                actualMileage: ctrl.actualKm,
                metrics: ctrl.metrics
            };
        } else {
            var data = app.data;
        }
        localStorage["appData"] = JSON.stringify(data);
    }

    function bindData(data, ctrl) {
        //console.log(data);
        //console.log(ctrl);
        ctrl.actualKm = data.actualMileage;
        ctrl.metrics = data.metrics;
        for (var i = 0; i < data.metrics.length; i++) {
            metricInit(data.metrics[i], ctrl.actualKm);
        }
    }

    function metricInit (metric, mileage) {
        if(metric !== undefined) {
            if(metric.type === "time") {
                if(metric.last === undefined || metric.last === 0) {
                    metric.last = new Date();
                }
                var timeDiff = Math.abs((new Date()).getTime() - metric.last.getTime());
                metric.diff = metric.each * 365.25 - (Math.ceil(timeDiff / (1000 * 3600 * 24)));
                metric.next = new Date(Math.abs(metric.last.getTime() + metric.each * 1000 * 3600 * 24 * 365.25));
            } else {
                if(metric.last === undefined) {
                    metric.last = 0;
                }
                metric.diff = mileage - metric.last;
                metric.next = metric.last + metric.each;
            }
        }
    }

    var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;

    function convertDateStringsToDates(input) {
        // Ignore things that aren't objects.
        if (typeof input !== "object") return input;

        for (var key in input) {
            if (!input.hasOwnProperty(key)) continue;

            var value = input[key];
            var match;
            // Check for string properties which look like dates.
            if (typeof value === "string" && (match = value.match(regexIso8601))) {
                var milliseconds = Date.parse(match[0]);
                //console.log(match[0]);
                if (!isNaN(milliseconds)) {
                    //console.log(milliseconds);
                    milliseconds = milliseconds + (1000 * 60 * 60 * 24);
                    //console.log(milliseconds);
                    input[key] = new Date(milliseconds);
                }
            } else if (typeof value === "object") {
                // Recurse into object
                convertDateStringsToDates(value);
            }
        }
    }
})();
