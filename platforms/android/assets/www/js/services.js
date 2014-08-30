// String.prototype.hashCode = function(){
//     var hash = 0;
//     if (this.length == 0) return hash;
//     for (var i = 0; i < this.length; i++) {
//         var character = this.charCodeAt(i);
//         hash = ((hash<<5)-hash)+character;
//         hash = hash & hash; // Convert to 32bit integer
//     }
//     return hash;
// }

// Array.prototype.indexByKey = function(value, property) {
// 	for (var ii=0; ii<this.length; ii++) {
// 		if (this[ii][property] == value)
// 			return ii;
// 	}
// 	return -1;
// }

function indexByKey(arr, value, property) {
	for (var ii=0; ii<arr.length; ii++) {
		if (arr[ii][property] == value)
			return ii;
	}
	return -1;
}

// function ComicsEntry(opts) {
// 	this.id = null;
// 	this.name = null;
// 	this.series = null;
// 	this.publisher = null;
// 	this.authors = null;
// 	this.price = 0.0;
// 	this.periodicity = null;
// 	this.reserved = "F";
// 	this.notes = null;
// 	this.releases = [];
// 	this.lastUpdate = new Date().getTime();

// 	if (opts && !opts.id && opts.name) {
// 		opts.id = opts.name.hashCode().toString();
// 	}

// 	angular.extend(this, opts);
// }

// ComicsEntry.new = function() {
// 	return new ComicsEntry( { id: "new" } );
// }

// function ComicsRelease(opts) {
// 	this.comicsId = null;
// 	this.number = null;
// 	this.date = null;
// 	this.price = null;
// 	this.reminder = null;
// 	this.purchased = "F";

// 	angular.extend(this, opts);
// }

// ComicsRelease.new = function(comicsId) {
// 	return new ComicsRelease( { comicsId: comicsId } );
// }

//TODO rivedere l'inglese
var PERIODICITIES = {
	"W1": "weekly",
	"M1": "monthly",
	"M2": "bimonthly",
	"M3": "3-monthly",
	"M4": "4-monthly",
	"M6": "6-monthly",
	"Y1": "Annual" 
};

angular.module('starter.services', [])

.factory('ComicsReader', function ($q, $filter, $cordovaDevice, $cordovaFile) {

	var updated = function(item) { item.lastUpdate = new Date().getTime(); };
	var lastRemoved = null;
	var lastRemovedRelease = null;
	var backupFileName = "backup.json";
	//var dataStorageFolder;
	// switch ($cordovaDevice.getPlatform()) {
	// 	case "Android": dataStorageFolder = cordova.file.externalDataDirectory; break;
	// 	case "iOS": dataStorageFolder = cordova.file.syncedDataDirectory; break;
	// }

	var comicsDefaults = {
		id: null,
		name: null,
		series: null,
		publisher: null,
		authors: null,
		price: 0.0,
		periodicity: null,
		reserved: "F",
		notes: null,
		releases: [],
		lastUpdate: new Date().getTime()
	}

	var releaseDefaults = {
		comicsId: null,
		number: null,
		date: null,
		price: null,
		reminder: null,
		purchased: "F"
	}

	//localstorage DB
	var DB = {
		//
		uid: null,
		comics: null,
		//
		read: function(uid, refresh) {
			//console.log(uid, refresh);
			if (this.comics == null || refresh) {
				var dbkey = uid + "_comics";
				this.uid = uid;
				var str = window.localStorage.getItem(dbkey);
				if (str) {
					return (this.comics = JSON.parse(str));
				} else {
					return (this.comics = []);
				}
			} else {
				return this.comics;
			}
		},
		//
		save: function() {
			var dbkey = this.uid + "_comics";
			window.localStorage.setItem(dbkey, JSON.stringify( this.comics ));
		},
		//
		getComicsById: function(id) {
			//console.log("getComicsById", id)
			if (id == "new") {
				return this.newComics({id: 'new'});
			} else {
				return _.findWhere(this.comics, { id: id }) || this.newComics();
			}
		},
		//
		isComicsUnique: function(item) {
			var name = this.normalizeComicsName(item.name);
			return _.find(this.comics, function(cc) { return this.normalizeComicsName(cc.name) == name; }, this) == undefined;
		},
		//
		normalizeComicsName: function(name) {
			return _.str.clean(name).toLowerCase();
		},
		//
		getReleaseById: function(item, id) {
	  	if (id == "new") {
	  		return this.newRelease({ comicsId: item.id });
	  	} else {
	  		return _.findWhere(item.releases, { number: parseInt(id) }) || this.newRelease({ comicsId: item.id });
		  }
		},
		isReleaseUnique: function(item, release) {
			return _.find(item.releases, function(rel) { return rel.number == release.number; }) == undefined;
		},
		//
		updateRelease: function(item, release) {
			//console.log("updateRelease", item.id, release.number);
			var idx = indexByKey(item.releases, release.number, 'number');
			if (idx == -1) {
				item.releases.push(release);
			}
			//aggiorno ultima modifica
			updated(item);
		},
		//
		removeRelease: function(item, release) {
			var idx = indexByKey(item.releases, release.number, 'number');
			if (idx > -1) {
				lastRemovedRelease = [idx, item, release];
				item.releases.splice(idx, 1);
			}
			//aggiorno ultima modifica
			updated(item);
		},
		//
		undoRemoveRelease: function() {
			if (lastRemovedRelease) {
				lastRemovedRelease[1].releases.splice(lastRemovedRelease[0], 0, lastRemovedRelease[2]);
				lastRemovedRelease = null;
			}
		},
		//
		getBestRelease: function(item) {
			//ritorna la prima scaduta e non acquistata, altrimenti la prossima non scaduta
			if (item.releases.length > 0) {
				var today = $filter('date')(new Date(), 'yyyy-MM-dd');
				var sorted = _.sortBy(item.releases, function(rel) {
					return rel.date || rel.number;
				});

				return _.find(sorted, function(rel) { /*console.log(item.name, rel.date, rel.purchased);*/ return rel.date < today && rel.purchased != 'T'; }) || 
					_.find(sorted, function(rel) { return rel.date >= today && rel.purchased != 'T'; }) ||
					_.find(sorted, function(rel) { return !rel.date && rel.purchased != 'T'; }) ||
					this.newRelease();
			} else
				return this.newRelease();
		},
		//
		update: function(item) {
			if (item.id == "new") {
				item.id = UUID.genV1().toString();
				this.comics.push(item);
			}
			//aggiorno ultima modifica
			updated(item);
		},
		//
		remove: function(item) {
			var id = item.id;
			var idx = indexByKey(this.comics, item.id, 'id');
			if (idx > -1) {
				lastRemoved = [idx, this.comics[idx]];
				this.comics.splice(idx, 1);
			}
		},
		//
		undoRemove: function() {
			//console.log("undo")
			if (lastRemoved) {
				this.comics.splice(lastRemoved[0], 0, lastRemoved[1]);
				lastRemoved = null;
			}
		},
		//
		clear: function() {
			this.comics = [];
		},
		//
		repairData: function() {
			if (this.comics) {
				for (var ii=0; ii<this.comics.length; ii++) {
					updated(this.comics[ii]);

					angular.forEach(
						_.filter(_.keys(this.comics[ii]), function(v) { return _.str.startsWith(v, '$$') }), 
						function(key) { delete this.comics[ii][key]; }, this)
				}
			}
		},
		//
		getLastBackup: function() {
			////TODO solo per android
			//var backupFilePath = cordova.file.externalDataDirectory + backupFileName;

			// console.log("start writing file " + backupFileName);

			// var q = $q.defer();
		 //  $cordovaFile.readFileMetadata(backupFileName).then(function(result) {
		 //  	//console.log("res " + result.lastModifiedDate);
		 //  	q.resolve(result.lastModifiedDate);
		 //  }, function(err) {
			// 	//console.log("err keys " + _.keys(err));
			// 	q.reject(err.code);
		 //  });

		 // return q.promise;
		},
		//
		backupDataToFile: function() {
			////TODO solo per android
			//var backupFilePath = cordova.file.externalDataDirectory + backupFileName;
			//fs root -> file:///storage/sdcard0

			// console.log("start writing file " + backupFileName);

			// var q = $q.defer();
		 //  $cordovaFile.writeFile(backupFileName, JSON.stringify(this.comics)).then(function(result) {
		 //  	console.log("ww res keys " + _.keys(result));
		 //  	console.log("ww res " + result);
		 //  	q.resolve(result);
		 //  }, function(err) {
			// 	console.log("ww err keys " + _.keys(err));
			// 	console.log("ww err code " + err.code);
			// 	q.reject(err.code);
		 //  });

		 // return q.promise;
		},
		//
		restoreDataFromFile: function() {
			//backupFilePath
		},
		//
		newComics: function(opts) {
			return angular.extend(angular.copy(comicsDefaults), opts);
		},
		//
		newRelease: function(opts) {
			return angular.extend(angular.copy(releaseDefaults), opts);
		}
	};

  return DB;
})

.factory('Settings', function () {

	var def = {
		debugMode: 'F',
		comicsCompactMode: 'F',
		comicsSearchPublisher: 'F',
		autoFillReleaseNumber: 'T'
	};

	var filters = {
		releases: {
			purchasedVisible: true,
			period: 'week' 
		}
	}

	//localstorage DB
	var DB = {
		//
		filters: filters,
		userOptions: angular.copy(def),
		//
		load: function() {
			var str = window.localStorage.getItem("OPTIONS");
			if (str) {
				angular.extend(this.userOptions, JSON.parse(str));
			}
		},
		loadDefault: function() {
			this.userOptions = def;
		},
		//
		save: function() {
			window.localStorage.setItem("OPTIONS", JSON.stringify(this.userOptions))
		}
	};

	return DB;
});