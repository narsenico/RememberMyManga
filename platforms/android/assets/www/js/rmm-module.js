/**
 * Ionic Angula module: rmm
 * - $undoPopup: Undo Popup (google way)
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
  '$ionicBackdrop',
  '$q',
  '$timeout',
  '$rootScope',
  '$document',
  '$compile',
  '$ionicPlatform',
function($ionicTemplateLoader, $ionicBackdrop, $q, $timeout, $rootScope, $document, $compile, $ionicPlatform) {
	
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
			text: '<i class="icon ion-reply"></i> CANCEL'
		}, options || {});

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
      		var result = (function(e) { return true; })(event);
      		event = event.originalEvent || event; //jquery events
      		if (!event.defaultPrevented) {
      			responseDeferred.resolve(result);
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
      previousUndo.responseDeferred.resolve(false);
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

}]);