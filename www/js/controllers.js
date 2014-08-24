angular.module('starter.controllers', ['starter.services'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, Settings) {
  //
  Settings.load();
})

.directive('buttonHref', function($location) {
  return {
    restrict: 'A',
    link: function(scope, elem, attr) {
      elem.bind('click', function() {
        $location.path(attr.buttonHref).replace();
        scope.$apply();
      });
    }
  };
})

.controller('ComicsCtrl', function($scope, $ionicModal, $timeout, $location, ComicsReader) {
  //leggo l'elenco dei fumetti (per utente USER)
  ComicsReader.read("USER");
  //rendo disponibile l'elenco allo scope
  $scope.comics = ComicsReader.comics;
  //filtro i fumetti in base a $scope.search
  $scope.getComics = function() {
    return $scope.comics.filter(function(item) {
      //tolgo spazi superflui con _.str.clean
      return !$scope.search ||  _.str.include(_.str.clean(item.name).toLowerCase(), _.str.clean($scope.search).toLowerCase()); 
    });
  };
  //pulisco filtro
  $scope.clearSearch = function() {
    $scope.search = "";
  };
  //
  $scope.getComicsInfo = function(item) {
    if (_.str.isBlank(item.series))
      return item.notes;
    else if (_.str.isBlank(item.notes))
      return item.series
    else
      return item.series + " - " + item.notes;
  };
  //funzione di rimozione elemento
  $scope.removeComicsEntry = function(item) {
    ComicsReader.remove(item);
    ComicsReader.save();
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
  //ritorna l'uscita più significativa da mostrare nell'item del fumetto
  $scope.getBestRelease = function(item) {
    return ComicsReader.getBestRelease(item);
  };
  //
  $scope.isMultiSelectionMode = false;
  //
  $scope.toggleMultiSelectionMode = function() {
    $scope.isMultiSelectionMode = !$scope.isMultiSelectionMode;
    //TODO attiva la multi selezione, tap su item seleziona, pulsanti nel footer (cancella tutti, etc)
  };
})
.directive('bestRelease', function() {
  return {
    restrict: 'E',
    scope: {
      comics: '='
    },
    controller: function($scope, ComicsReader) {
      $scope.best = ComicsReader.getBestRelease($scope.comics);
    },
    templateUrl: 'templates/bestRelease.html'
  };
})

.controller('ComicsEditorCtrl', function($scope, $stateParams, $ionicNavBarDelegate, ComicsReader) {
  //console.log($stateParams, ComicsReader)
  $scope.periodicities = PERIODICITIES;
  //originale
  $scope.master = ComicsReader.getComicsById($stateParams.comicsId);
  //aggiorno l'originale e torno indietro
  $scope.update = function(entry) {
    angular.copy(entry, $scope.master);
    ComicsReader.update($scope.master);
    ComicsReader.save();
    $ionicNavBarDelegate.back();
  };
  $scope.reset = function() {
    $scope.entry = angular.copy($scope.master);
  };
  $scope.isUnique = function(entry) {
    //verifica se il nome sia unico?
    //return !_.findWhere(ComicsReader.comics, { name: entry.name });
    return true;
  };
  $scope.reset();
})
//TODO uso una direttiva per la validazione
.directive('comicsUnique', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, elem, attr, ngModel) {

      function isUnique(value) {
        //angular.forEach

        //posso accedere al master e controllare l'id, se !new e == id master è ok 
        // console.log(scope.master)

        return true;        
      }

      ngModel.$parsers.unshift(function(value) {
        ngModel.$setValidity('unique', isUnique(value));
        return value;
      });

      ngModel.$formatters.unshift(function(value) {
          ngModel.$setValidity('unique', isUnique(value));
          return value;
      });

    }
  };
})

.controller('ReleasesEntryCtrl', function($scope, $stateParams, $location, ComicsReader) {
  $scope.entry = null;
  $scope.releases = [];

  //apre te template per l'editing dell'uscita
  $scope.showAddRelease = function(item) {
    $location.path("/app/release/" + item.id + "/new").replace();
  };
  //
  $scope.removeRelease = function(item, release) {
    ComicsReader.removeRelease(item, release);
    ComicsReader.save();
  };

  if ($stateParams.comicsId == null) {
    //TODO uscite di tutti i fumetti
    for (var ii=0; ii<ComicsReader.comics.length; ii++) {
      angular.forEach(ComicsReader.comics[ii].releases, function(v, k) {
        $scope.releases.push(v);
      });
    }
  } else {
    //uscite di un fumetto
    $scope.entry = ComicsReader.getComicsById($stateParams.comicsId);
    $scope.releases = $scope.entry.releases;
  }
})
.controller('ReleaseEditorCtrl', function($scope, $stateParams, $ionicNavBarDelegate, ComicsReader) {
  $scope.entry = ComicsReader.getComicsById($stateParams.comicsId);
  //originale
  $scope.master = ComicsReader.getReleaseById($scope.entry, $stateParams.releaseId);
  //aggiorno l'originale e torno indietro
  $scope.update = function(release) {
    angular.copy(release, $scope.master);
    ComicsReader.updateRelease($scope.entry, $scope.master);
    ComicsReader.save();
    $ionicNavBarDelegate.back();
  };
  $scope.reset = function() {
    $scope.release = angular.copy($scope.master);
  };
  $scope.isUnique = function(release) {
    //TODO verifica che il numero sia unico per il fumetto
    // console.log("isUnique", release);
    // return release.number == "new" || !_.findWhere($scope.entry.releases, { number: release.number });
    return true;
  };
  $scope.reset();
})

.controller('OptionsCtrl', function($scope, $ionicPopup, ComicsReader, Settings) {
  //
  $scope.version = "?";
  //
  if (window.cordova) {
    window.cordova.getAppVersion(function (version) {
      $scope.version = version;
    });
  } else {
    $scope.version = "unknown";
  }
  //
  $scope.userOptions = Settings.userOptions;
  $scope.optionsChanged = function() {
    Settings.save();    
  }
  //
  $scope.deleteAllData = function() {
    $ionicPopup.confirm({
      title: 'Confirm',
      template: 'Delete all data?'
    }).then(function(res) {
      if (res) {
        ComicsReader.clear();
        ComicsReader.save();
      }
    });
  };
})
;
