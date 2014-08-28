/**
 * Ionic Angula module: rmm
 * - $undoPopup: Undo Popup (google way)
 *   promise return: 'ok', 'timeout', 'discarded'
 * - $toast: simple toast
 * - $datex: date munipulation utilities
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
function($ionicTemplateLoader, $q, $timeout, $document) {
	
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
    firstDayOfWeek: function(date) {
      if (!date) date = new Date();
      return new Date(date).setDate(date.getDate() - date.getDay());
    },
    lastDayOfWeek: function(date) {
      if (!date) date = new Date();
      return new Date(date).setDate(date.getDate() - date.getDay() + 6);
    },
    firstDayOfMonth: function(date) {
      if (!date) date = new Date();
      return new Date(date).setDate(1);
    },
    lastDayOfMonth: function(date) {
      if (!date) date = new Date();
      return new Date(date.getFullYear(), date.getMonth()+1, 0);
    }
  };
  return $datex;
}); //end $datex