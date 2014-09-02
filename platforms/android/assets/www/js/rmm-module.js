/**
 * Ionic Angula module: rmm
 * - $undoPopup: Undo Popup (google way)
 *   promise return: 'ok', 'timeout', 'discarded'
 * - $toast: simple toast
 * - $datex: date munipulation utilities
 * - $file: cordova file utilities
 */

var IonicModule = angular.module('rmm', ['ngAnimate', 'ngSanitize', 'ui.router']),
  extend = angular.extend,
  forEach = angular.forEach,
  isDefined = angular.isDefined,
  isString = angular.isString,
  jqLite = angular.element;

var UNDO_TPL = 
  '<div class="undo-container">' +
    '<span ng-bind-html="title"></span>' +
    '<a href="" ng-click="$undo($event)" ng-bind-html="text" autofocus></a>'
  '</div>';

var TOAST_TPL = 
  '<div class="toast-container" ng-class="position">' +
    '<span ng-bind-html="text"></span>'
  '</div>';

/*
$undoPopup
TODO: 
- se già aperto chiuderlo con resolve false -> OK
- posizionare al centro orizzontalmente (calcolare width?) -> per ora risolvo con margin-left: -125px;
- chiudere su perdita focus
- gestire back
*/

IonicModule
.factory('$undoPopup', [
  '$ionicTemplateLoader',
  '$q',
  '$timeout',
  '$document',
  '$ionicGesture',
function($ionicTemplateLoader, $q, $timeout, $document, $ionicGesture) {
	
  var previousUndo = null;
	var $undoPopup = {
		show: showPopup,
		_createPopup: createPopup
	}; //end $undoPopup

	return $undoPopup;

	function createPopup(options) {
		options = extend({
			scope: null,
			title: 'Operation done',
			text: '<i class="icon ion-reply"></i> CANCEL',
      timeout: 0 //nessun timeout
		}, options || {});

    if (options.timeout == 'short') options.timeout = 2000;
    else if (options.timeout == 'long') options.timeout = 10000;

		var popupPromise = $ionicTemplateLoader.compile({
			template: UNDO_TPL,
			scope: options.scope && options.scope.$new(),
			appendTo: $document[0].body
		});
		//per ora non supporto il template da URL
		var contentPromise =  $q.when(options.template || options.content || '');

		return $q.all([popupPromise, contentPromise])
    .then(function(results) {
      var self = results[0];
      var content = results[1];
      var responseDeferred = $q.defer();

      self.responseDeferred = responseDeferred;

      extend(self.scope, {
      	title: options.title,
      	text: options.text,
      	$undo: function(event) {
      		event = event.originalEvent || event; //jquery events
      		if (!event.defaultPrevented) {
      			responseDeferred.resolve('ok');
      		}
      	}
      });

      self.show = function() {
        if (self.isShown) return;

        self.isShown = true;
        ionic.requestAnimationFrame(function() {
          //if hidden while waiting for raf, don't show
          if (!self.isShown) return;

          self.element.removeClass('undo-hidden');
          self.element.addClass('undo-showing active');
          focusInput(self.element);

          self.fnTouch = function(e) { if (e.target.parentNode != self.element[0]) responseDeferred.resolve('lostfocus'); };
          self.gesture = $ionicGesture.on('touch', self.fnTouch, $document);

          if (options.timeout > 0) {
            self.timeoutPromise = $timeout(function() {
              responseDeferred.resolve('timeout');
            }, options.timeout);
          }
        });
      };
      self.hide = function(callback) {
        callback = callback || angular.noop;
        if (!self.isShown) return callback();

        self.isShown = false;
        self.element.removeClass('active');
        self.element.addClass('undo-hidden');
        $timeout(callback, 250);
      };
      self.remove = function() {
        if (self.removed) return;

        self.hide(function() {
          self.element.remove();
          self.scope.$destroy();
          if (self.timeoutPromise) $timeout.cancel(self.timeoutPromise);
          $ionicGesture.off(self.gesture, 'touch', self.fnTouch);
        });

        self.removed = true;
      };

      return self;
    });
	} //end createPopup

	function onHardwareBackButton(e) {
		//TODO risolvere se back premuto
	} //end onHardwareBackButton

	function showPopup(options) {
		var popupPromise = $undoPopup._createPopup(options);

    if (previousUndo) {
      previousUndo.responseDeferred.resolve('discarded');
    }

    var resultPromise = $timeout(angular.noop, 0)
    .then(function() { return popupPromise; })
    .then(function(popup) {
      previousUndo = popup;
      popup.show();
      return popup.responseDeferred.promise.then(function(result) {
        popup.remove();
        return result;
      });
    });

    return resultPromise;
	} //end showPopup

  function focusInput(element) {
    var focusOn = element[0].querySelector('[autofocus]');
    if (focusOn) {
      focusOn.focus();
    } //end focusInput
  }

}]); //end $undoPopup

IonicModule
.factory('$toast', [
  '$ionicTemplateLoader',
  '$q',
  '$timeout',
  '$document',
function($ionicTemplateLoader, $q, $timeout, $document) {
  
  var previousToast = null;
  var $toast = {
    show: showToast,
    _createToast: createToast
  }; //end $undoPopup

  return $toast;

  function createToast(options) {
    if (typeof(options) == "string") options = { text: options };

    options = extend({
      scope: null,
      text: 'message',
      timeout: 'short',
      position: 'bottom'
    }, options || {});

    if (options.timeout == 'short' || options.timeout < 0) options.timeout = 2000;
    else if (options.timeout == 'long') options.timeout = 10000;

    var popupPromise = $ionicTemplateLoader.compile({
      template: TOAST_TPL,
      scope: options.scope && options.scope.$new(),
      appendTo: $document[0].body
    });
    //per ora non supporto il template da URL
    var contentPromise =  $q.when(options.template || options.content || '');

    return $q.all([popupPromise, contentPromise])
    .then(function(results) {
      var self = results[0];
      var content = results[1];
      var responseDeferred = $q.defer();

      self.responseDeferred = responseDeferred;

      extend(self.scope, {
        text: options.text,
        position: options.position
      });

      self.show = function() {
        if (self.isShown) return;

        self.isShown = true;
        ionic.requestAnimationFrame(function() {
          //if hidden while waiting for raf, don't show
          if (!self.isShown) return;

          self.element.removeClass('toast-hidden');
          self.element.addClass('toast-showing active');

          if (options.timeout > 0) {
            self.timeoutPromise = $timeout(function() {
              responseDeferred.resolve('timeout');
            }, options.timeout);
          }
        });
      };
      self.hide = function(callback) {
        callback = callback || angular.noop;
        if (!self.isShown) return callback();

        self.isShown = false;
        self.element.removeClass('active');
        self.element.addClass('toast-hidden');
        $timeout(callback, 250);
      };
      self.remove = function() {
        if (self.removed) return;

        self.hide(function() {
          self.element.remove();
          self.scope.$destroy();
          if (self.timeoutPromise) $timeout.cancel(self.timeoutPromise);
        });

        self.removed = true;
      };

      return self;
    });
  } //end createPopup

  function onHardwareBackButton(e) {
    //TODO risolvere se back premuto
  } //end onHardwareBackButton

  function showToast(options) {
    var popupPromise = $toast._createToast(options);

    if (previousToast) {
      previousToast.responseDeferred.resolve('discarded');
    }

    var resultPromise = $timeout(angular.noop, 0)
    .then(function() { return popupPromise; })
    .then(function(popup) {
      previousToast = popup;
      popup.show();
      return popup.responseDeferred.promise.then(function(result) {
        popup.remove();
        return result;
      });
    });

    return resultPromise;
  } //end showToast

}]); //end $toast

IonicModule
.factory('$datex', function() {
  var $datex = {
    weekStartMonday: false,
    getDay: function(date) {
      var day = date.getDay();
      if (this.weekStartMonday) {
        if (day == 0) return 6;
        else return day-1;
      } else {
        return day;
      }
    },
    firstDayOfWeek: function(date) {
      if (!date) date = new Date();
      return new Date(date).setDate(date.getDate() - this.getDay(date));
    },
    lastDayOfWeek: function(date) {
      if (!date) date = new Date();
      return new Date(date).setDate(date.getDate() - this.getDay(date) + 6);
    },
    firstDayOfMonth: function(date) {
      if (!date) date = new Date();
      return new Date(date).setDate(1);
    },
    lastDayOfMonth: function(date) {
      if (!date) date = new Date();
      return new Date(date.getFullYear(), date.getMonth()+1, 0);
    },
    fromNow: function(milliseconds) {
      return new Date(Date.now() + milliseconds);
    },
    getMax: function() {
      return new Date(9999, 11, 31);
    }
  };
  return $datex;
}); //end $datex

IonicModule
.factory('$file', ['$q' ,function($q) {

  if (!window.cordova) return {};

  return {
    //
    readFileAsText: function(file) {
      console.log("readFileAsText " + file);

      var q = $q.defer();
      getFileEntry(file).then(function(fileEntry) {
        console.log("readFileAsText " + fileEntry);

        fileEntry.file(function(file) {
          var reader = new FileReader();
          reader.onloadend = function(evt) {
            q.resolve(this.result);
          };
          reader.readAsText(file);
        },
        function(error) {
          q.reject(error);
        });
      })
      return q.promise;
    },
    //
    readFileMetadata: function(file) {
      console.log("readFileMetadata " + file);

      var q = $q.defer();
      getFileEntry(file).then(
        function(fileEntry) {
          console.log("fileEntry " + fileEntry);

          fileEntry.file(function(file) {
            q.resolve({ modificationTime: new Date(file.lastModified), size: file.size });
          },
          function(error) {
            q.reject(error);
          });
        },
        function(error) {
          q.reject(error);
        }
      );
      return q.promise;
    },
    //
    writeFile: function(file, content) {
      console.log("writeFile " + file);

      var q = $q.defer();
      getFileEntry(file, true).then(function(fileEntry) {
        console.log("writeFile " + fileEntry);

        fileEntry.createWriter(function(writer) {
          writer.truncate(0);
          writer.onwriteend = function(evt) {
            writer.write(content);
            writer.onwriteend = function(evt) {
              q.resolve(writer.length);
            };
          };
        }, 
        function(error) {
          q.reject(error);
        });
      })
      return q.promise;
    },
    //
    FileError: { NOT_FOUND_ERR: 1, SECURITY_ERR: 2, ABORT_ERR: 3, NOT_READABLE_ERR: 4, ENCODING_ERR: 5, NO_MODIFICATION_ALLOWED_ERR: 6, INVALID_STATE_ERR: 7, SYNTAX_ERR: 8, INVALID_MODIFICATION_ERR: 9, QUOTA_EXCEEDED_ERR: 10, TYPE_MISMATCH_ERR: 11, PATH_EXISTS_ERR: 12 }
  };

  function getFileEntry(file, create) {
    //console.log("getFileEntry " + directory + file);

    var directory = cordova.file.externalDataDirectory;
    if (false) { //if device.platform.toLowerCase() == "android"
      directory += "Android/data/it.amonshore.rmm/files";
    }

    var q = $q.defer();
    window.resolveLocalFileSystemURL(directory, 
      function(entry) {
        entry.getFile(file, {create: create || false}, 
          function(fileEntry) {
            q.resolve(fileEntry);
          },
          function(error) {
            q.reject(error);
          }
        );
      },
      function(error) {
        q.reject(error);
      }
    );
    return q.promise;
  }

}]); //end $file

IonicModule
.factory('$debounce', ['$rootScope', '$browser', '$q', '$exceptionHandler',
    function($rootScope,   $browser,   $q,   $exceptionHandler) {
        var deferreds = {},
            methods = {},
            uuid = 0;

        function debounce(fn, delay, invokeApply) {
            var deferred = $q.defer(),
                promise = deferred.promise,
                skipApply = (angular.isDefined(invokeApply) && !invokeApply),
                timeoutId, cleanup,
                methodId, bouncing = false;

            // check we dont have this method already registered
            angular.forEach(methods, function(value, key) {
                if(angular.equals(methods[key].fn, fn)) {
                    bouncing = true;
                    methodId = key;
                }
            });

            // not bouncing, then register new instance
            if(!bouncing) {
                methodId = uuid++;
                methods[methodId] = {fn: fn};
            } else {
                // clear the old timeout
                deferreds[methods[methodId].timeoutId].reject('bounced');
                $browser.defer.cancel(methods[methodId].timeoutId);
            }

            var debounced = function() {
                // actually executing? clean method bank
                delete methods[methodId];

                try {
                    deferred.resolve(fn());
                } catch(e) {
                    deferred.reject(e);
                    $exceptionHandler(e);
                }

                if (!skipApply) $rootScope.$apply();
            };

            timeoutId = $browser.defer(debounced, delay);

            // track id with method
            methods[methodId].timeoutId = timeoutId;

            cleanup = function(reason) {
                delete deferreds[promise.$$timeoutId];
            };

            promise.$$timeoutId = timeoutId;
            deferreds[timeoutId] = deferred;
            promise.then(cleanup, cleanup);

            return promise;
        }


        // similar to angular's $timeout cancel
        debounce.cancel = function(promise) {
            if (promise && promise.$$timeoutId in deferreds) {
                deferreds[promise.$$timeoutId].reject('canceled');
                return $browser.defer.cancel(promise.$$timeoutId);
            }
            return false;
        };

        return debounce;
}]);