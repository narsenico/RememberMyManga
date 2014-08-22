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

	this.indexOfRelease = function(number) {
		for (var ii=0; ii<this.releases.length; ii++) {
			if (this.releases[ii].number == number) {
				return ii;
			}
		}

		return -1;
	}

	angular.extend(this, opts);
}	

ComicsEntry.new = function() {
	return new ComicsEntry( { id: "new" } );
}

function ComicsRelease(opts) {
	this.comicsId = null;
	this.date = null;
	this.number = null;
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

	var dataLoaded = false;
	var comics = [ ];

  function getComicsById(id) {
  	if (id == "new") {
  		return ComicsEntry.new();
  	} else {
	  	for (var ii=0; ii<comics.length; ii++) {
	  		if (comics[ii].id == id) {
	  			return comics[ii];
	  		}
	  	}

	  	//ritorno elemento vuoto se non trovato
	  	return new ComicsEntry();
	  }
	}

	function getReleaseById(entry, id) {
  	if (id == "new") {
  		return ComicsRelease.new(entry.id);
  	} else {
	  	for (var ii=0; ii<entry.releases.length; ii++) {
	  		if (entry.releases[ii].id == id) {
	  			return entry.releases[ii];
	  		}
	  	}

	  	//ritorno elemento vuoto se non trovato
	  	return new ComicsRelease();
	  }		
	}

	function readComics(uid) {
		//TODO
		if (!dataLoaded) {
			console.log("read comics for ", uid);
			comics.push( new ComicsEntry( { id: 1, name: "One Piece", series: "Techno", publisher: "Star Comics", authors: "Eichiro Oda", 
				releases: [ new ComicsRelease( { comicsId: 1, date: new Date(), number: 56 } ) ]
			} ));
	  	comics.push( new ComicsEntry( { id: 2, name: "Cage of Eden", series: "Alibaba", publisher: "GP", periodicity: "W1", reserved: "T" } ));
	  	
	  	for (var ii=3; ii<=10; ii++) {
	  		comics.push( new ComicsEntry( { id: ii, name: "Comics " + ii, publisher: "GreatPubli", 
	  			releases: [ new ComicsRelease( { comicsId: ii, date: new Date(), number: 1 } ), new ComicsRelease( { comicsId: ii, date: new Date(), number: 2 } ) ]
	  		} ));	
	  	}

	  	dataLoaded = true;
		}
	}

	function update(entry) {
		//TODO
		if (entry.id == "new") {
			entry.id = new Date().getTime();
			comics.push(entry);
		}
	}

	function updateRelease(entry, release) {
		
	}

	function remove(entry) {
		//TODO
		//console.log("remove", entry.id)
		for (var ii=0; ii<comics.length; ii++) {
			if (comics[ii].id == entry.id) {
				comics.splice(ii, 1);
				break;
			}
		}
	}

	function getBestRelease(entry) {
		//TODO
		//console.log("gbr", entry.releases)
		if (entry.releases.length > 0)
			return entry.releases[0];
		else
			return new ComicsRelease();
	}

  return {
  	comics: comics,
  	read: readComics,
  	update: update,
  	remove: remove,
  	getComicsById: getComicsById,
  	getReleaseById: getReleaseById,
  	getBestRelease: getBestRelease
  };
});