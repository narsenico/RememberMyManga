function indexByKey(arr, value, property) {
	for (var ii=0; ii<arr.length; ii++) {
		if (arr[ii][property] == value)
			return ii;
	}
	return -1;
}

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

.factory('ComicsReader', function ($q, $filter, $datex, $cordovaDevice, $file, $cordovaLocalNotification) {
	console.log("new ComicsReader");

	var updated = function(item) { item.lastUpdate = new Date().getTime(); };
	var lastRemoved = null;
	var lastRemovedRelease = null;

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
		bestRelease: null, // aggiornata da refreshBestRelease
		lastUpdate: new Date().getTime()
	}

	var releaseDefaults = {
		comicsId: null,
		number: null,
		date: null,
		price: null,
		reminder: null, //null, 1
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
			if (this.comics == null || uid != this.uid || refresh) {
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
		getComics: function(orderBy, desc) {
			//console.log("getComics", orderBy, desc);

			//TEST
			orderBy = "name";
			desc = false;

			//TODO
			if (orderBy) {
				var sorted = this.comics.sort(function(a, b) {
					if (desc)
						return eval("a." + orderBy).toLowerCase() > eval("b." + orderBy).toLowerCase() ? -1 : 1;
					else
						return eval("a." + orderBy).toLowerCase() > eval("b." + orderBy).toLowerCase() ? 1 : -1;
				});
				return (this.comics = sorted);
			} else {
				return this.comics;
			}
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
					this.newRelease({ date: $filter('date')( $datex.getMax(), 'yyyy-MM-dd' ) });
			} else
				return this.newRelease({ date: $filter('date')( $datex.getMax(), 'yyyy-MM-dd' ) });
		},
		//
		refreshBestRelease: function(items) {
			items = items || this.comics;
			angular.forEach(items, function(item) {
				item.bestRelease = this.getBestRelease(item);
			}, this);
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
			return $file.readFileMetadata(this.uid + "_backup.json");
		},
		//
		backupDataToFile: function() {
			var dbkey = this.uid + "_comics";
			var str = window.localStorage.getItem(dbkey);			
			return $file.writeFile(this.uid + "_backup.json", str);
		},
		//
		restoreDataFromFile: function() {
			var $this = this;
			var q = $q.defer();
			$file.readFileAsText(this.uid + "_backup.json").then(function(result) {
				try {
					var obj = JSON.parse(result);
					$this.comics = obj;
					$this.save();
					q.resolve(true);
				} catch (e) {
					q.reject({code: 'errparse'});
				}
			}, function(error) {
				q.reject(error);
			});
			return q.promise;
		},
		//
		newComics: function(opts) {
			return angular.extend(angular.copy(comicsDefaults), opts);
		},
		//
		newRelease: function(opts) {
			return angular.extend(angular.copy(releaseDefaults), opts);
		},
		//
		countReleases: function(date) {
			var count = 0;
			angular.forEach(this.comics, function(item) {
				angular.forEach(item.releases, function(rel) {
					if (rel.reminder && rel.date == date) count++;
				});
			});
			return count;
		},
		//
		addNotification: function(date) {
			$cordovaLocalNotification.isScheduled(date, this).then(function(scheduled) {
				var badge = 1;
				if (scheduled) {
					badge = this.countReleases(date);
				}
				//TODO alre proprietà impostare defaults in deviceready
				//TODO ora da settings
				var dd = new Date(Date.parse(date + " 06:00:00"));
				$cordovaLocalNotification.add({ id: date, date: dd, title: "Comikku", message: "Seams to be some releases today", badge: badge })
				.then(function(result) {
					console.log("add notification " + dd + " " + badge);
				});
			});
		},
		//
		removeNotification: function(date) {
			$cordovaLocalNotification.isScheduled(date, this).then(function(scheduled) {
				if (scheduled) {
					var badge = this.countReleases(date);
					if (badge == 0) {
						$cordovaLocalNotification.cancel(date)
						.then(function(result) {
							console.log("cancel notification " + dd);
						});		
					} else {
						//TODO alre proprietà impostare defaults in deviceready
						//TODO ora da settings
						var dd = new Date(Date.parse(date + " 06:00:00"));
						$cordovaLocalNotification.add({ id: date, date: dd, title: "Comikku", message: "Seams to be some releases today", badge: badge })
						.then(function(result) {
							console.log("add notification " + dd + " " + badge);
						});
					}
				}
			});
		}		
	};

  return DB;
})

.factory('Settings', function () {

	var def = {
		debugMode: 'F',
		comicsCompactMode: 'F',
		comicsSearchPublisher: 'F',
		autoFillReleaseNumber: 'T',
		comicsOrderBy: 'bestRelease.date',
		comicsOrderByDesc: 'F',
		weekStartMonday: 'F'
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