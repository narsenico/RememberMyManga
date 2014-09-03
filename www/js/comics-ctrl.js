angular.module('starter.controllers')
.controller('ComicsCtrl', [
	'$scope', '$ionicModal', '$timeout', '$location', '$undoPopup', '$debounce', 'ComicsReader', 'Settings', 
function($scope, $ionicModal, $timeout, $location, $undoPopup, $debounce, ComicsReader, Settings) {
	//recupero i dati già ordinati
	var orderedComics = ComicsReader.getComics(Settings.comicsOrderBy, Settings.comicsOrderByDesc);
	//conterrà i dati filtrati (tramite campo di ricerca)
	var filteredComics = orderedComics;
	//indcia quanti dati caricare alla volta tramite infinite scroll
	var loadChunk = 7;
	//funzione di filtraggio dei dati (su orderedComics)
	var applyFilter = function() {
		console.log("applyFilter");

		if (_.isEmpty($scope.search)) {
			filteredComics = orderedComics;	
		} else {
			filteredComics = $scope.comics.filter(function(item) {
	      var bOk = false;
	      if (Settings.userOptions.comicsSearchPublisher == 'T') {
	        bOk = !$scope.search || _.str.include(_.str.clean(item.publisher).toLowerCase(), _.str.clean($scope.search).toLowerCase());   
	      }
	      return bOk || (!$scope.search || _.str.include(_.str.clean(item.name).toLowerCase(), _.str.clean($scope.search).toLowerCase()));				
			});
		}
		$scope.comics = [];
		$scope.totComics = filteredComics.length;
		$scope.loadMore();
	};
	//
	$scope.debugMode = Settings.userOptions.debugMode == 'T';
	//conterrà i comics caricati poco alla volta tramite infirnite scroll
	$scope.comics = [];
	//
	$scope.totComics = filteredComics.length;
	//
	$scope.isMultiSelectionMode = false;
	//campo di ricerca
	$scope.search = "";
	//
	$scope.$watch('search', function(newValue, oldValue) {
		if (newValue === oldValue) { return; }
		$debounce(applyFilter, 300); //chiamo applyFilter solo se non viene modificato search per 300ms
	});
	//pulisco filtro
	$scope.clearSearch = function() {
		$scope.search = "";
		applyFilter();
	};
	//
	$scope.$on('stateChangeSuccess', function() {
		$scope.loadMore();
	});
	//carico altri dati (da filteredComics)
	$scope.loadMore = function() {
		console.log("loadMore");
		
		var from = $scope.comics.length;
		var max = Math.min(from + loadChunk, filteredComics.length);
		if (from < max) {
			$scope.comics = _.union($scope.comics, filteredComics.slice(from, max));
		}
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
	//
	$scope.moreDataCanBeLoaded = function() {
		return $scope.comics.length < filteredComics.length;
	};
	//
	$scope.getComicsInfo = function(item) {
		//TODO
		return "";
	};
	//funzione di rimozione elemento
	$scope.removeComicsEntry = function(item) {
	ComicsReader.remove(item);
	ComicsReader.save();

	$timeout(function() {
	  $undoPopup.show({title: "Comics removed", timeout: "long"}).then(function(res) {
	    if (res == 'ok') {
	      ComicsReader.undoRemove();
	      ComicsReader.save();
	    }
	  });
	}, 250);
	};
	//apre il template per l'editing
	$scope.addComicsEntry = function() {
		$location.path("/app/comics/new").replace();
	};
	//apre il template per l'editing del fumetto
	$scope.editComicsEntry = function(item) {
		$location.path("/app/comics/" + item.id).replace();
	};
	//apre te template per l'editing dell'uscita
	$scope.showAddRelease = function(item) {
		$location.path("/app/release/" + item.id + "/new").replace();
	};
  //
  $scope.toggleMultiSelectionMode = function() {
    $scope.isMultiSelectionMode = !$scope.isMultiSelectionMode;
    //TODO attiva la multi selezione, tap su item seleziona, pulsanti nel footer (cancella tutti, etc)
  };

}]);