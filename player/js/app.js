var VMP = angular.module('vmpApp', ['ngRoute']);

VMP.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/greeting', {
        templateUrl: 'partials/greeting.html',
        controller: 'GreetingController'
      }).
      when('/player', {
        templateUrl: 'partials/player.html',
        controller: 'ContentController'
      }).
      otherwise({
        redirectTo: '/greeting'
      })
  }]);

VMP.factory('SongService', function() {
  return {
    vkLogin: function(callback) {
      var _this = this;
      VK.Auth.login(function(response) {
        if (response.session) {
          _this.fetchSongs(callback);
        }
      }, 65544);
    },
    fetchSongs: function(callback) {
      var _this = this;
      VK.Api.call('audio.get', {}, function(response) {
        _this.songs = response.response;
        _this.shuffle = true;
        _this.currentSong = _this.randomSong();
        _this.nextSong = _this.randomSong();
        _this.offset = 0;
        _this.limit = 10;
        callback();
      });
    },
    randomSong: function() {
      return this.songs[Math.floor(Math.random()*this.songs.length)];
    },
    changeNextSong: function() {
      this.nextSong = this.randomSong();
    },
    getCurrentIndex: function() {
      return this.songs.indexOf(this.currentSong);
    },
    setOffset: function() {
      var i = this.getCurrentIndex();
      this.offset = Math.floor(i/this.limit)*this.limit;
    },
    toggleShuffle: function() {
      this.shuffle = !this.shuffle;
      this.setOffset();
    },
    playNextSong: function() {
      if (this.shuffle) {
        this.currentSong = this.nextSong;
        this.nextSong = this.randomSong();
      } else {
        if (this.queued) {
          for (var i=0; i<this.songs.length; i++) {
            if (this.songs[i].aid == this.queued) {
              this.currentSong = this.songs[i];
              break;
            }
          }
          this.queued = undefined;
        } else {
          var i = this.getCurrentIndex();
          if (i < this.songs.length) {
            this.currentSong = this.songs[i+1];
          } else {
            this.currentSong = this.songs[0];
          }
          this.setOffset();
        }
      }
      return this.currentSong;
    },
    setPicture: function(scope) {
      var _this = this;
      var lastFMUrl = 'http://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist=' + this.currentSong.artist.trim().replace(' ', '+') + '&autocorrect=1&api_key=96f7a50b8a09b44d40da06b985eafd16&format=json';
      $.get(lastFMUrl, function(data) {
        _this.currentPicture = data['artist']['image'].pop()['#text'];
        if (!scope.$$phase) {
          scope.$digest();
        }
      })
    },
    hasNextPage: function() { return this.songs.length > this.offset + this.limit; },
    nextPage: function() { this.offset += this.limit; },
    hasPrevPage: function() { return this.offset > 0 },
    prevPage: function() { this.offset -= this.limit; },
    songsPage: function() { return this.songs.slice(this.offset, this.offset+this.limit); },
    isShuffle: function() { return this.shuffle; },
    getNextSong: function() { return this.nextSong; },
    getCurrentSong: function() { return this.currentSong; }
  };
});

VMP.factory('ytPlayer', ['SongService', function(SongService) {
  var scope = angular.element('#where-magic-happens').scope();
  return {
    setPlayer: function(player) {
      this.flash = player;
      this.flash.addEventListener("onStateChange", "onYouTubePlayerStateChanged");
      this.playNextSong();
    },
    requestFullScreen: function() {
      if (this.flash.webkitRequestFullScreen) {
        this.flash.webkitRequestFullScreen();
      } else if (this.flash.requestFullScreen) {
        this.flash.requestFullScreen();
      } else if (this.flash.mozRequestFullScreen) {
        this.flash.mozRequestFullScreen();
      }
    },
    playVideoByRequest: function(query) {
      var request, player = this.flash;

      request = gapi.client.youtube.search.list({q: query, part: "id", maxResults: 1, type: "video"});
      request.execute(function(response) {
        var videoId = response.result.items[0].id.videoId;
        // suggestedQuality: 'hd1080'
        player.loadVideoById(videoId);
      });
    },
    playNextSong: function() {
      song = SongService.playNextSong();
      SongService.setPicture(scope);
      this.playVideoByRequest(song.artist + ' ' + song.title);
      if (!scope.$$phase) {
        scope.$digest();
      }
    },
    playerStateChanged: function(state) {
      if (state == 0) {
        this.playNextSong();
      }
    }
  };
}]);

VMP.controller('GreetingController', ['$scope', '$rootScope', '$location', 'SongService', function($scope, $rootScope, $location, SongService) {
  var callback = function() {
    $rootScope.$apply(function() {
      $location.path('/player');
    });
  }
  $scope.login = function() { SongService.vkLogin(callback) }
  if (VK.Auth.getSession()) { SongService.fetchSongs(callback) }
}]);

VMP.controller('ContentController', ['$scope', '$rootScope', '$location', 'SongService', 'ytPlayer', function($scope, $rootScope, $location, SongService, ytPlayer) {
  if (VK.Auth.getSession() == null) {
    setTimeout(function() {
      $rootScope.$apply(function() {
        $location.path('/greeting');
      })
    }, 300);
  } else {
    var params = { allowScriptAccess: "always", allowFullScreen: true };
    var attrs = { id: "yt-player" };
    swfobject.embedSWF("https://www.youtube.com/v/ktvTqknDobU?enablejsapi=1&version=3&controls=0&autoplay=1&fs=1&showinfo=0&modestbranding=1&playerapiid=yt-player", "yt-player", "100%", "100%", "8", null, null, params, attrs);
    $scope.next = function() {
      ytPlayer.playNextSong();
    };
    $scope.fullscreen = function() {
      ytPlayer.requestFullScreen();
    };
    $scope.changeNextSong = function() {
      SongService.changeNextSong();
    };
    $scope.playSong = function(aid) { SongService.queued = aid; this.next() };
    $scope.toggleShuffle = function() { SongService.toggleShuffle(); }
    $scope.songService = SongService;
  }
}]);

VMP.controller('HeaderController', ['$scope', 'SongService', function($scope, SongService) {
  $scope.title = function() {
    var song = SongService.currentSong();
    if (song) {
      return 'VCP: ' + song.artist + ' - ' + song.title;
    } else {
      return 'VCP: Vk.com music clips player';
    }
  }
}]);

$(document).ready(function(){
  VK.init({ apiId: "4797696" });
  var img = new Image();
  img_src =  window.getComputedStyle(document.querySelector('body'), ':before').getPropertyValue('background');
  img_src = img_src.split(/url/)[1].split('no-repeat')[0].trim().replace(/\(|\)/g, '');
  $(img).load(function() {
    $('body').addClass('loaded');
  });
  img.src = img_src;
})
