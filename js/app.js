
function onError(e) {
  console.log(e);
}

// FILESYSTEM SUPPORT ----------------------------------------------------------
var fs = null;
var FOLDERNAME = 'test';

var gGalleryIndex = 0; // gallery currently being iterated
var progress = 0;
var gGalleryReader = null; // the filesytem reader for the current gallery
var gDirectories = []; // used to process subdirectories
var gGalleryArray = []; // holds information about all top-level Galleries found
// - list of DomFileSystem
var gGalleryData = []; // hold computed information about each Gallery
var gCurOptGrp = null;
var vidFormats = ['3gp', '3gpp', 'avi', 'flv', 'mov', 'mpeg', 'mpeg4', 'mp4',
    'ogg', 'webm', 'wmv', 'mkv'
];

function errorPrintFactory(custom) {
    return function(e) {
        var msg = '';

        switch (e.code) {
            case FileError.QUOTA_EXCEEDED_ERR:
                msg = 'QUOTA_EXCEEDED_ERR';
                break;
            case FileError.NOT_FOUND_ERR:
                msg = 'NOT_FOUND_ERR';
                break;
            case FileError.SECURITY_ERR:
                msg = 'SECURITY_ERR';
                break;
            case FileError.INVALID_MODIFICATION_ERR:
                msg = 'INVALID_MODIFICATION_ERR';
                break;
            case FileError.INVALID_STATE_ERR:
                msg = 'INVALID_STATE_ERR';
                break;
            default:
                msg = 'Unknown Error';
                break;
        };

        console.log(custom + ': ' + msg);
    };
}

function GalleryData(id, name) {
    this._id = id;
    this.name = name;
    this.path = "";
    this.sizeBytes = 0;
    this.numFiles = 0;
    this.numDirs = 0;
}

function clearList() {
    gGalleryIndex = 0; 
    gGalleryReader = null;
    gDirectories = [];
    gGalleryArray = [];
    gGalleryData = []; 
    gCurOptGrp = null;
}

function getExtension(fileName) {
    var arr = fileName.split(".");
    if (arr.length === 1 || (arr[0] === "" && arr.length === 2)) {
        return "";
    }
    return arr.pop().toLowerCase();
}

function isMovieFile(fileName) {
    return !(vidFormats.indexOf(getExtension(fileName)) === -1);
}

function addItem(itemEntry) {
    var item = {};
    item.fullPath = itemEntry.fullPath;
    item.size = itemEntry.sizeBytes;
    item.fileName = itemEntry.name;
    var scope = angular.element('#gallery').scope();
    scope.$apply(function(){
        scope.galleryItems.push(item);
    });
}

function scanGallery(entries) {
    // when the size of the entries array is 0, we've processed all the
    // directory contents
    if (entries.length == 0) {
        if (gDirectories.length > 0) {
            var dir_entry = gDirectories.shift();
            console.log('Doing subdir: ' + dir_entry.fullPath);
            gGalleryReader = dir_entry.createReader();
            gGalleryReader.readEntries(scanGallery,
                errorPrintFactory('readEntries'));
        } else {
            gGalleryIndex++;
            console.log("Hooooray!");
            angular.element('#gallery').scope().$apply(function(){
            	progress = 0;
        			angular.element('#gallery').scope().completeProgress();
    				});
            if (gGalleryIndex < gGalleryArray.length) {
                console.log('Doing next Gallery: ' + gGalleryArray[gGalleryIndex].name);
                scanGalleries(gGalleryArray[gGalleryIndex]);
            }
        }
        return;
    }
    for (var i = 0; i < entries.length; i++) {
        console.log(entries[i].name);

        if (entries[i].isFile && isMovieFile(entries[i].name)) {
            addItem(entries[i]);
            gGalleryData[gGalleryIndex].numFiles++;
            (function(galData) {
                entries[i].getMetadata(function(metadata) {
                    galData.sizeBytes += metadata.size;
                });
            }(gGalleryData[gGalleryIndex]));
        } else if (entries[i].isDirectory) {
            gDirectories.push(entries[i]);
        } else {
            console.log("Got something other than a file or directory.");
        }
        // loader progress
        if(progress < 90){
        	progress++ ;
        	angular.element('#gallery').scope().$apply(function(){
        			angular.element('#gallery').scope().incrementProgress(progress);
    				});
    		}
    }
    // readEntries has to be called until it returns an empty array. According
    // to the spec,
    // the function might not return all of the directory's contents during a
    // given call.
    gGalleryReader.readEntries(scanGallery,
        errorPrintFactory('readMoreEntries'));
}

function scanGalleries(dirReader, name) {
		var id = new Date().getTime();
    gGalleryData[gGalleryIndex] = new GalleryData(id, name);
    var scope = angular.element('#gallery').scope();
    scope.$apply(function(){
        scope.galleryInfo = gGalleryData[gGalleryIndex];
    });
    gGalleryReader = dirReader;
    gGalleryReader.readEntries(scanGallery, errorPrintFactory('readEntries'));
}

function writeFile(blob) {
  if (!fs) {
    return;
  }

  fs.root.getDirectory(FOLDERNAME, {create: true}, function(dirEntry) {
    dirEntry.getFile(blob.name, {create: true, exclusive: false}, function(fileEntry) {
      // Create a FileWriter object for our FileEntry, and write out blob.
      fileEntry.createWriter(function(fileWriter) {
        fileWriter.onerror = onError;
        fileWriter.onwriteend = function(e) {
          console.log('Write completed.');
        };
        fileWriter.write(blob);
      }, onError);
    }, onError);
  }, onError);
}
// -----------------------------------------------------------------------------

var qflicksApp = angular.module('qflicksApp', ['ngProgress']);

qflicksApp.filter('bytes', function() {
	return function(bytes, precision) {
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		var units = ['bytes', 'kB', 'MB', 'GB', 'TB', 'PB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	}
});

qflicksApp.factory('mdbClient', function() {
  var mdbClient = {};

  /*var dnd = new DnDFileController('body', function(files) {
    var $scope = angular.element(this).scope();
    Util.toArray(files).forEach(function(file, i) {
      gdocs.upload(file, function() {
        $scope.fetchDocs(true);
      }, true);
    });
  });*/

  return mdbClient;
});

//qflicksApp.service('FileSystemScanner', FileSystemScanner);

// Main Angular controller for app.
function GalleryController($scope, $http, $timeout, mdbClient, ngProgress) {

  $scope.galleryName = "My Gallery";
  
  $scope.galleryItems = [];
  
  $scope.galleryInfo = {
  	"name" : "",
  	"numFiles": 0,
  	"sizBytes": 0
  };
  
  $scope.galleryPopulated = false;
  
	$scope.addGallery = function(){
		chrome.fileSystem.chooseEntry({
                type: "openDirectory"
            }, function(rootDir) {
                console.log("Is Dir: " + rootDir.isDirectory);
                console.log("Name: "+rootDir.name);
                if (rootDir.isDirectory) {
                    var dirReader = rootDir.createReader();
                    scanGalleries(dirReader, $scope.galleryName);
                } else {
                    alert("Select a directory, not a file!");
                }
                ngProgress.start();
								ngProgress.set(2);
            });
    $scope.galleryPopulated = true;
	};
	
	$scope.completeProgress = function(){
		ngProgress.complete();
	}
	
	$scope.incrementProgress = function(num){
		ngProgress.set(num);
	}
	
	$scope.change= function(option){
        alert(option.fileName);
  }
	
	$scope.clearList = function(){
		clearList();
		$scope.galleryItems = [];
		$scope.galleryInfo = {
  	"name" : "",
  	"numFiles": 0,
  	"sizBytes": 0
  	};
  	$scope.galleryPopulated = false;
	}

  /*$scope.docs = [];

  // Response handler that caches file icons in the filesystem API.
  function successCallbackWithFsCaching(resp, status, headers, config) {
    var docs = [];

    var totalEntries = resp.items.length;

    resp.items.forEach(function(entry, i) {
      var doc = {
        title: entry.title,
        updatedDate: Util.formatDate(entry.modifiedDate),
        updatedDateFull: entry.modifiedDate,
        icon: entry.iconLink,
        alternateLink: entry.alternateLink,
        size: entry.fileSize ? '( ' + entry.fileSize + ' bytes)' : null
      };

      // 'http://gstatic.google.com/doc_icon_128.png' -> 'doc_icon_128.png'
      doc.iconFilename = doc.icon.substring(doc.icon.lastIndexOf('/') + 1);

      // If file exists, it we'll get back a FileEntry for the filesystem URL.
      // Otherwise, the error callback will fire and we need to XHR it in and
      // write it to the FS.
      var fsURL = fs.root.toURL() + FOLDERNAME + '/' + doc.iconFilename;
      window.webkitResolveLocalFileSystemURL(fsURL, function(entry) {
        console.log('Fetched icon from the FS cache');

        doc.icon = entry.toURL(); // should be === to fsURL, but whatevs.

        $scope.docs.push(doc);

        // Only want to sort and call $apply() when we have all entries.
        if (totalEntries - 1 == i) {
          $scope.docs.sort(Util.sortByDate);
          $scope.$apply(function($scope) {}); // Inform angular we made changes.
        }
      }, function(e) {

        $http.get(doc.icon, {responseType: 'blob'}).success(function(blob) {
          console.log('Fetched icon via XHR');

          blob.name = doc.iconFilename; // Add icon filename to blob.

          writeFile(blob); // Write is async, but that's ok.

          doc.icon = window.URL.createObjectURL(blob);

          $scope.docs.push(doc);
          if (totalEntries - 1 == i) {
            $scope.docs.sort(Util.sortByDate);
          }
        });

      });
    });
  }

  $scope.clearDocs = function() {
    $scope.docs = []; // Clear out old results.
  };

  $scope.fetchDocs = function(retry) {
    this.clearDocs();

    if (gdocs.accessToken) {
      var config = {
        params: {'alt': 'json'},
        headers: {
          'Authorization': 'Bearer ' + gdocs.accessToken
        }
      };

      $http.get(gdocs.DOCLIST_FEED, config).
        success(successCallbackWithFsCaching).
        error(function(data, status, headers, config) {
          if (status == 401 && retry) {
            gdocs.removeCachedAuthToken(
                gdocs.auth.bind(gdocs, true, 
                    $scope.fetchDocs.bind($scope, false)));
          }
        });
    }
  };

  // Toggles the authorization state.
  /*$scope.toggleAuth = function(interactive) {
    if (!gdocs.accessToken) {
      gdocs.auth(interactive, function() {
        $scope.fetchDocs(false);
      });
    } else {
      gdocs.revokeAuthToken(function() {});
      this.clearDocs();
    }
  }

  // Controls the label of the authorize/deauthorize button.
  $scope.authButtonLabel = function() {
    if (gdocs.accessToken)
      return 'Deauthorize';
    else
      return 'Authorize';
  };

  $scope.toggleAuth(false);*/
}

GalleryController.$inject = ['$scope', '$http', '$timeout', 'mdbClient', 'ngProgress']; // For code minifiers.

// Init setup and attach event listeners.
document.addEventListener('DOMContentLoaded', function(e) {
  var closeButton = document.querySelector('#close-button');
  closeButton.addEventListener('click', function(e) {
    window.close();
  });
  
  /*document.getElementById('add-folder-button').addEventListener("click",
        function() {
            chrome.fileSystem.chooseEntry({
                type: "openDirectory"
            }, function(rootDir) {
                console.log("Is Dir: " + rootDir.isDirectory);
                if (rootDir.isDirectory) {
                    var dirReader = rootDir.createReader();
                    scanGalleries(dirReader);
                } else {
                    alert("Select a directory, not a file!");
                }
            });
        });
    document.getElementById('clear-gallery').addEventListener("click", clearList);*/

  // FILESYSTEM SUPPORT --------------------------------------------------------
  window.webkitRequestFileSystem(TEMPORARY, 1024 * 1024, function(localFs) {
    fs = localFs;
  }, onError);
  // ---------------------------------------------------------------------------
});
