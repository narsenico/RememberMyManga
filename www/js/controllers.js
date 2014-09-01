angular.module('starter.controllers', ['starter.services'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout, $datex, Settings, ComicsReader) {
  //
  Settings.load();
  $datex.weekStartMonday = Settings.userOptions.weekStartMonday == 'T';
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
  $scope.debugMode = Settings.userOptions.debugMode == 'T';
  $scope.orderByField = Settings.userOptions.comicsOrderBy;
  $scope.orderByDesc = Settings.userOptions.comicsOrderByDesc == 'T';
  //rendo disponibile l'elenco allo scope
  $scope.comics = ComicsReader.comics;
  //filtro i fumetti in base a $scope.search
  $scope.getComics = function() {
    var arr = $scope.comics.filter(function(item) {
      //tolgo spazi superflui con _.str.clean
      var bOk = false;
      if (Settings.userOptions.comicsSearchPublisher == 'T') {
        bOk = !$scope.search ||  _.str.include(_.str.clean(item.publisher).toLowerCase(), _.str.clean($scope.search).toLowerCase());   
      }
      return bOk || (!$scope.search ||  _.str.include(_.str.clean(item.name).toLowerCase(), _.str.clean($scope.search).toLowerCase()));
    });
    //aggiorno bestRelease per i comics filtrati
    ComicsReader.refreshBestRelease(arr);
    return arr;
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
  // //ritorna l'uscita più significativa da mostrare nell'item del fumetto
  // $scope.getBestRelease = function(item) {
  //   return ComicsReader.getBestRelease(item);
  // };
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
      $scope.best = $scope.comics.bestRelease; //ComicsReader.getBestRelease($scope.comics);
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
    return ComicsReader.normalizeComicsName($scope.master.name) == ComicsReader.normalizeComicsName(entry.name) || 
      ComicsReader.isComicsUnique(entry);
  };
  $scope.reset();
})

.controller('ReleasesEntryCtrl', function($scope, $stateParams, $location, $filter, $datex, $toast, $undoPopup, $timeout, ComicsReader, Settings) {
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
    //console.log("remove ", rel.index, $scope.releases)
    $scope.releases.splice(rel.index, 1);

    $timeout(function() {
      $undoPopup.show({title: "Release removed", timeout: "long"}).then(function(res) {
        if (res == 'ok') {
          ComicsReader.undoRemoveRelease();
          ComicsReader.save();
          $scope.changeFilter($scope.purchasedVisible, $scope.period);
        }
      });
    }, 250);
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
    $scope.filterInfo = "";

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

    var tot = 0;
    $scope.releases = [];
    for (var ii=0; ii<arr.length; ii++) {
      tot += arr[ii].releases.length;
      angular.forEach(arr[ii].releases, function(v, k) {
        //console.log(arr[ii].name, v.date, dtFrom, dtTo)

        if ($scope.purchasedVisible || v.purchased != 'T') {
          if (!dtFrom || v.date >= dtFrom) {
            if (!dtTo || v.date <= dtTo) {
              $scope.releases.push( { entry: arr[ii], release: v, index: k } );
            }
          }
        }
      });
    }

    $scope.filterInfo = _.str.sprintf("%s results out of %s", $scope.releases.length, tot);

    // if ($scope.releases.length > 0)
    //   $toast.show(toastMsg);
    // else
    //   $toast.show(toastMsgEmpty);
  };
  //
  var today = $filter('date')(new Date(), 'yyyy-MM-dd');
  $scope.isExpired = function(release) {
    return release.date && release.date < today;
  }

  $scope.changeFilter($scope.purchasedVisible, $scope.period);
})
.controller('ReleaseEditorCtrl', function($scope, $stateParams, $ionicNavBarDelegate, ComicsReader, Settings) {
  $scope.entry = ComicsReader.getComicsById($stateParams.comicsId);
  //originale
  $scope.master = ComicsReader.getReleaseById($scope.entry, $stateParams.releaseId);

  if (Settings.userOptions.autoFillReleaseNumber == 'T' && $scope.master.number == null) {
    var maxrel = _.max($scope.entry.releases, function(rel) { return rel.number; });
    //console.log(maxrel);
    if (_.isEmpty(maxrel)) {
      $scope.master.number = 1;
    } else if (maxrel.number > 0) {
      $scope.master.number = maxrel.number + 1;
    }
  }

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
    return $stateParams.releaseId == release.number || ComicsReader.isReleaseUnique($scope.entry, release);
  };
  $scope.reset();
})

.controller('OptionsCtrl', function($scope, $q, $datex, $ionicPopup, $undoPopup, $toast, $ionicPopover, $cordovaDevice, 
  $cordovaFile, $cordovaToast, $file, $cordovaLocalNotification, $timeout, $filter, ComicsReader, Settings) {
  //
  $scope.version = null;
  $scope.lastBackup = null;
  //
  if (window.cordova) {
    window.cordova.getAppVersion(function (version) {
      $scope.version = version;
    });
  }
  //
  $scope.userOptions = Settings.userOptions;
  //console.log($scope.userOptions)
  $scope.optionsChanged = function() {
    $datex.weekStartMonday = $scope.userOptions.weekStartMonday == 'T';
    Settings.save();    
  };
  //
  $scope.resetOptions = function() {
    $ionicPopup.confirm({
      title: 'Confirm',
      template: 'Reset to default settings?'
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
    $ionicPopup.confirm({
      title: 'Confirm',
      template: 'Repair data?'
    }).then(function(res) {
      if (res) {
        ComicsReader.repairData();
        ComicsReader.save();
        ComicsReader.read(ComicsReader.uid, true);
      }
    });
  };
  //
  $scope.readLastBackup = function() {
    if (window.cordova) {
      ComicsReader.getLastBackup().then(function(result) {
        $scope.lastBackup = $filter('date')(result.modificationTime, 'medium');
      });
    }
  };
  //
  $scope.backup = function() {
    $ionicPopup.confirm({
      title: 'Confirm',
      template: 'Backup data? Previous backup will be overridden.'
    }).then(function(res) {
      if (res) {
        ComicsReader.backupDataToFile().then(function(res) {
          $scope.readLastBackup();
          $toast.show("Backup complete");
        }, function(error) {
          $toast.show("Write error " + error.code);
        });
      }
    });
  };
  //
  $scope.restore = function() {
    $ionicPopup.confirm({
      title: 'Confirm',
      template: 'Restore data from backup? Current data will be overridden.'
    }).then(function(res) {
      if (res) {
        ComicsReader.restoreDataFromFile().then(function(res) {
          $toast.show("Restore complete");
        }, function(error) {
          $toast.show("Read error " + error.code);
        });
      }
    });
  };
  //
  $scope.readLastBackup();


  //DEBUG
  //
  $scope.fakeEntries = function() {
    ComicsReader.update( ComicsReader.newComics( { id: "new", name: "One Piece", publisher: "Star Comics" } ) );
    ComicsReader.update( ComicsReader.newComics( { id: "new", name: "Naruto", publisher: "Planet Manga" } ) );
    ComicsReader.update( ComicsReader.newComics( { id: "new", name: "Dragonero", publisher: "Bonelli" } ) );
    ComicsReader.update( ComicsReader.newComics( { id: "new", name: "Gli incredibili X-Men", publisher: "Marvel Italia" } ) );
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

    //$toast.show("This week");

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

      // $file.readFileMetadata("backup.json").then(
      //   function(metadata) {
      //     console.log("rmd ok " + JSON.stringify(metadata));
      //     $file.readFileAsText("backup.json").then(
      //       function(result) {
      //         console.log("text " + result);
      //       },
      //       function(error) {
      //         console.log("read err " + error.code);
      //       }
      //     );
      //   },
      //   function(error) {
      //     console.log("rmd err" + error.code);
      //   }
      // );

      // $file.writeFile("test.json", "prova prova\nciao\n.").then(
      //   function(result) {
      //     console.log("wrt " + result);
      //   },
      //   function(error) {
      //     console.log("wrt err" + error.code);
      //   }
      // );

      //ComicsReader.addNotification("2014-08-30");

      // var q = $q.defer();
      // $timeout(function() { q.resolve(true) }, 2000);
      // $q.allSettled(q).then(function(res) {console.log(res);});
      // console.log("sett");

    } catch (e) {
      console.log("TEST ERR" + e);
    }
  };
})
;
