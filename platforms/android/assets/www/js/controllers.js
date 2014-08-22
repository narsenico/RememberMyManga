angular.module('starter.controllers', ['starter.services'])

.controller('AppCtrl', function($scope, $ionicModal, $timeout) {

  // // Form data for the login modal
  // $scope.loginData = {};

  // // Create the login modal that we will use later
  // $ionicModal.fromTemplateUrl('templates/login.html', {
  //   scope: $scope
  // }).then(function(modal) {
  //   $scope.modal = modal;
  // });

  // // Triggered in the login modal to close it
  // $scope.closeLogin = function() {
  //   $scope.modal.hide();
  // };

  // // Open the login modal
  // $scope.login = function() {
  //   $scope.modal.show();
  // };

  // // Perform the login action when the user submits the login form
  // $scope.doLogin = function() {
  //   console.log('Doing login', $scope.loginData);

  //   // Simulate a login delay. Remove this and replace with your login
  //   // code if using a login system
  //   $timeout(function() {
  //     $scope.closeLogin();
  //   }, 1000);
  // };

  // TODO Exit
  $scope.exit = function() {
    //
  };

})

.controller('ComicsCtrl', function($scope, $ionicModal, $timeout, $location, ComicsReader) {
  //leggo l'elenco dei fumetti (per utente USER)
  ComicsReader.read("USER");
  //rendo disponibile l'elenco allo scope
  $scope.comics = ComicsReader.comics;
  //funzione di rimozione elemento
  $scope.removeComicsEntry = function($index, item) {
    //$scope.comics.splice($index, 1);
    //TODO
    ComicsReader.remove(item);
  };
  //apre il template per l'editing
  $scope.addComicsEntry = function() {
    $location.path("/app/comics/new").replace();
  };
  //apre il template per l'editing del fumetto
  $scope.editComicsEntry = function($index, item) {
    $location.path("/app/comics/" + item.id).replace();
  };
  //apre te template per l'editing dell'uscita
  $scope.showAddRelease = function($index, item) {
    $location.path("/app/release/" + item.id + "/new").replace();
  };
  //ritorna l'uscita più significativa da mostrare nell'item del fumetto
  $scope.getBestRelease = function($index, item) {
    return ComicsReader.getBestRelease(item);
  }
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
    $ionicNavBarDelegate.back();
  };
  $scope.reset = function() {
    $scope.entry = angular.copy($scope.master);
  };
  $scope.isUnique = function(entry) {
    //TODO verifica se il nome sia unico?
    return true;
  };
  $scope.reset();
})

.controller('ReleasesEntryCtrl', function($scope, $stateParams, ComicsReader) {
  $scope.entry = null;
  $scope.releases = [];

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
  $scope.master = ComicsReader.getReleaseById($scope.entry, $stateParams.comicsId);
  //aggiorno l'originale e torno indietro
  $scope.update = function(release) {
    angular.copy(release, $scope.master);
    ComicsReader.updateRelease($scope.entry, $scope.master);
    $ionicNavBarDelegate.back();
  };
  $scope.reset = function() {
    $scope.release = angular.copy($scope.master);
  };
  $scope.isUnique = function(release) {
    //TODO verifica che il numero sia unico per il fumetto
    return true;
  };
  $scope.reset();
})

;
