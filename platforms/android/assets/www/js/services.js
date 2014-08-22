String.prototype.hashCode = function(){
    var hash = 0;
    if (this.length == 0) return hash;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

Array.prototype.indexByKey = function(value, property) {
	for (var ii=0; ii<this.length; ii++) {
		if (this[ii][property] == value)
			return ii;
	}
	return -1;
}

function ComicsEntry(opts) {
	this.id = null;
	this.name = null;
	this.series = null;
	this.publisher = null;
	this.authors = null;
	this.price = 0.0;
	this.periodicity = "M1";
	this.reserved = "F";
	this.notes = null;
	this.releases = [];
	this.lastUpdate = new Date();

	if (opts && !opts.id && opts.name) {
		opts.id = opts.name.hashCode().toString();
	}

	angular.extend(this, opts);
}	

ComicsEntry.prototype.indexOfRelease = function(number) {
	for (var ii=0; ii<this.releases.length; ii++) {
		if (this.releases[ii].number == number) {
			return ii;
		}
	}
	return -1;
}

ComicsEntry.prototype.addRelease = function(number, date, price, reminder, purchased) {
	var cr = new ComicsRelease( { comicsId: this.id, number: number, date: date, price: price, reminder: reminder, purchased: purchased } );
	this.releases.push( cr );
	return cr;
}

ComicsEntry.new = function() {
	return new ComicsEntry( { id: "new" } );
}

function ComicsRelease(opts) {
	this.comicsId = null;
	this.number = null;
	this.date = null;
	this.price = null;
	this.reminder = null;
	this.purchased = "F";

	angular.extend(this, opts);
}

ComicsRelease.new = function(comicsId) {
	return new ComicsEntry( { comicsId: comicsId } );
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

.factory('ComicsReader', function () {

	//localstorage DB
	var DB = {
		//
		uid: null,
		comics: null,
		//
		read: function(uid, refresh) {
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
				return ComicsEntry.new();
			} else {
				return _.findWhere(this.comics, { id: id }) || new ComicsEntry();
			}
		},
		//
		getReleaseById: function(item, id) {
	  	if (id == "new") {
	  		return ComicsRelease.new(item.id);
	  	} else {
	  		return _.findWhere(item.releases, { number: id }) || ComicsRelease.new(item.id);
		  }
		},
		//
		updateRelease: function(item, release) {
			//console.log("updateRelease", item.id, release.number);
			var idx = item.releases.indexByKey(release.number, 'number');
			if (idx == -1) {
				item.releases.push(release);
			}
			//aggiorno ultima modifica
			item.lastUpdate = new Date();
		},
		//
		getBestRelease: function(item) {
			//TODO
			if (item.releases.length > 0)
				return item.releases[0];
			else
				return new ComicsRelease();
		},
		//
		update: function(item) {
			if (item.id == "new") {
				item.id = item.name.hashCode().toString();
				this.comics.push(item);
			}
			//aggiorno ultima modifica
			item.lastUpdate = new Date();
		},
		//
		remove: function(item) {
			var id = item.id;
			var idx = this.comics.indexByKey(item.id, 'id');
			if (idx > -1)
				this.comics.splice(idx, 1);
		}
	};

  return DB;
});