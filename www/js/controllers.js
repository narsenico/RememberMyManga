angular.module('starter.controllers', ['starter.services'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, Settings, ComicsReader) {
  //
  Settings.load();
  //leggo l'elenco dei fumetti (per utente USER)
  ComicsReader.read("USER");
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

.controller('ComicsCtrl', function($scope, $ionicModal, $timeout, $location, $undoPopup, ComicsReader, Settings) {
  $scope.debugMode = Settings.userOptions.debugMode;
  //rendo disponibile l'elenco allo scope
  $scope.comics = ComicsReader.comics;
  //filtro i fumetti in base a $scope.search
  $scope.getComics = function() {
    return $scope.comics.filter(function(item) {
      //tolgo spazi superflui con _.str.clean
      if (Settings.userOptions.comicsSearchPublisher) {
        return !$scope.search ||  _.str.include(_.str.clean(item.publisher).toLowerCase(), _.str.clean($scope.search).toLowerCase());   
      }
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
    controller: function($scope, $filter, ComicsReader) {
      $scope.best = ComicsReader.getBestRelease($scope.comics);
      var today = $filter('date')(new Date(), 'yyyy-MM-dd');
      $scope.expired = $scope.best.date && $scope.best.date < today;
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
  $scope.cancel = function() {
    $ionicNavBarDelegate.back();
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

.controller('ReleasesEntryCtrl', function($scope, $stateParams, $location, $filter, $datex, $toast, ComicsReader, Settings) {
  $scope.entry = null;
  $scope.releases = [];
  $scope.purchasedVisible = Settings.filters.releases.purchasedVisible;
  $scope.period = Settings.filters.releases.period; //week, month, everytime

  //apre te template per l'editing dell'uscita
  $scope.showAddRelease = function(item) {
    $location.path("/app/release/" + item.id + "/new").replace();
  };
  //
  $scope.removeRelease = function(rel) {
    ComicsReader.removeRelease(rel.entry, rel.release);
    ComicsReader.save();
  };
  //
  $scope.setPurchased = function(rel, value) {
    rel.release.purchased = value;
    ComicsReader.save();

    $toast.show(value == 'T' ? "Release purchased" : "Purchase canceled");
  };
  //
  $scope.changeFilter = function(purchasedVisible, period) {
    $scope.purchasedVisible = Settings.filters.releases.purchasedVisible = purchasedVisible;
    $scope.period = Settings.filters.releases.period = period;

    var arr;
    if ($stateParams.comicsId == null) {
      arr = ComicsReader.comics;
    } else {
      //uscite di un fumetto
      $scope.entry = ComicsReader.getComicsById($stateParams.comicsId);
      arr = [ $scope.entry ];
    }

    //calcolo il range delle date in base a period
    var dtFrom, dtTo;
    var today = new Date();
    var toastMsg, toastMsgEmpty;
    if (period == 'week') {
      dtFrom = $filter('date')($datex.firstDayOfWeek(today), 'yyyy-MM-dd');
      dtTo = $filter('date')($datex.lastDayOfWeek(today), 'yyyy-MM-dd');
      toastMsg = "This Week's Releases";
      toastMsgEmpty = "No releases this week";
    } else if (period == 'month') {
      dtFrom = $filter('date')($datex.firstDayOfMonth(today), 'yyyy-MM-dd');
      dtTo = $filter('date')($datex.lastDayOfMonth(today), 'yyyy-MM-dd');
      toastMsg = "This Month's Releases";
      toastMsgEmpty = "No releases this month";
    } else {
      toastMsg = "All releases";
      toastMsgEmpty = "No releases";
    }

    $scope.releases = [];
    for (var ii=0; ii<arr.length; ii++) {
      angular.forEach(arr[ii].releases, function(v, k) {
        //console.log(arr[ii].name, v.date, dtFrom, dtTo)

        if ($scope.purchasedVisible || v.purchased != 'T') {
          if (!dtFrom || !v.date || v.date >= dtFrom) {
            if (!dtTo || !v.date || v.date <= dtTo) {
              $scope.releases.push( { entry: arr[ii], release: v } );
            }
          }
        }
      });
    }

    if ($scope.releases.length > 0)
      $toast.show(toastMsg);
    else
      $toast.show(toastMsgEmpty);
  };
  //
  var today = $filter('date')(new Date(), 'yyyy-MM-dd');
  $scope.isExpired = function(release) {
    return release.date && release.date < today;
  }

  $scope.changeFilter($scope.purchasedVisible, $scope.period);
})
.controller('ReleaseEditorCtrl', function($scope, $stateParams, $ionicNavBarDelegate, ComicsReader) {
  $scope.entry = ComicsReader.getComicsById($stateParams.comicsId);
  //originale
  $scope.master = ComicsReader.getReleaseById($scope.entry, $stateParams.releaseId);
  //aggiorno l'originale e torno indietro
  $scope.update = function(release) {

    //TODO eliminare eventuali notifiche create in precedenza
    //  con comicsId + number (master)

    //TODO se !purchased e !expired creare notifica locale
    // con comicsId + number (release)

    angular.copy(release, $scope.master);
    ComicsReader.updateRelease($scope.entry, $scope.master);
    ComicsReader.save();
    $ionicNavBarDelegate.back();
  };
  $scope.reset = function() {
    $scope.release = angular.copy($scope.master);
  };
  $scope.cancel = function() {
    $ionicNavBarDelegate.back();
  };
  $scope.isUnique = function(release) {
    //TODO verifica che il numero sia unico per il fumetto
    // console.log("isUnique", release);
    // return release.number == "new" || !_.findWhere($scope.entry.releases, { number: release.number });
    return true;
  };
  $scope.reset();
})

.controller('OptionsCtrl', function($scope, $ionicPopup, $undoPopup, $toast, $ionicPopover, $cordovaDevice, $cordovaFile, $cordovaToast, ComicsReader, Settings) {
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
  };
  //
  $scope.resetOptions = function() {
    $ionicPopup.confirm({
      title: 'Confirm',
      template: 'Reset to default options?'
    }).then(function(res) {
      if (res) {
        Settings.loadDefault();
        Settings.save();
        $scope.userOptions = Settings.userOptions;
      }
    });
  };
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
  //
  $scope.repairData = function() {
    ComicsReader.repairData();
    ComicsReader.save();
    ComicsReader.read(ComicsReader.uid, true);
    $ionicPopup.alert({
      template: 'Data repaired'
    })
  };
  //
  $scope.backup = function() {
    ComicsReader.backupDataToFile();
  };
  //
  $scope.restore = function() {
    ComicsReader.restoreDataFromFile();
    ComicsReader.save();
  };
  //
  $scope.fakeEntries = function() {
    ComicsReader.update( new ComicsEntry( { id: "new", name: "One Piece", publisher: "Star Comics" } ) );
    ComicsReader.update( new ComicsEntry( { id: "new", name: "Naruto", publisher: "Planet Manga" } ) );
    ComicsReader.update( new ComicsEntry( { id: "new", name: "Dragonero", publisher: "Bonelli" } ) );
    ComicsReader.update( new ComicsEntry( { id: "new", name: "Gli incredibili X-Men", publisher: "Marvel Italia" } ) );
    ComicsReader.save();
  };

  //
  $scope.test = function($event) {

    // window.plugin.notification.local.add(
    //   { id: 't001', message: 'test message', title: 'test title' }
    // , function() { console.log("add ", arguments) } );

    // $ionicPopup.alert({
    //   title: 'Test',
    //   template: window.localStorage.getItem('USER_comics')
    // });

    // $undoPopup.show({title: "Comics delted", timeout: "long"}).then(function(res) {
    //   console.log(res)
    // });

    $toast.show("This week");

    //$ionicPopover.fromTemplate('<ion-popover-view><ion-header-bar><h1 class="title">My Popover Title</h1></ion-header-bar><ion-content>content</ion-content></ion-popover-view>', { scope: $scope }).show($event);
    try {
      // ComicsReader.backupDataToFile().then(function(result) {
      //     console.log("bck res " + result);
      //     $scope.testresult = result;
      // }, function(err) {
      //     console.log("bck err " + err);
      //     $scope.testresult = err;
      // });

      // ComicsReader.getLastBackup().then(function(result) {
      //     console.log("bck res " + result);
      //     $scope.testresult = result;
      // }, function(err) {
      //     console.log("bck err " + err);
      //     $scope.testresult = err;
      // });

      //$cordovaToast.showShortBottom("test me");

    } catch (e) {
      console.log("TEST ERR" + e);
    }
  };
})
;
