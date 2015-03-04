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
    fetchSongs: function() {
      var _this = this;
      VK.Api.call('audio.get', {}, function(response) {
        _this.songs = response.response;
        _this.shuffle = true;
        _this.currentSong = _this.randomSong();
        _this.nextSong = _this.randomSong();
        _this.offset = 0;
        _this.limit = 10;
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
      this.shuffle != this.shuffle;
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
          setOffset();
        }
      }
      return this.currentSong;
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
        player.loadVideoById(videoId);
      });
    },
    playNextSong: function() {
      song = SongService.playNextSong();
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
  VK.init({ apiId: "4797696" });
  $scope.login = function() {
    VK.Auth.login(function(response) {
      if (response.session) {
        SongService.fetchSongs();
        $rootScope.$apply(function() {
          $location.path('/player');
        });
      }
    }, 8);
  };
}]);

VMP.controller('ContentController', ['$scope', 'SongService', 'ytPlayer', function($scope, SongService, ytPlayer) {
  var params = { allowScriptAccess: "always", allowFullScreen: true };
  var attrs = { id: "yt-player" };
  swfobject.embedSWF("https://www.youtube.com/v/ktvTqknDobU?enablejsapi=1&version=3&controls=0&autoplay=1&fs=1&showinfo=0&modestbranding=1&playerapiid=yt-player", "yt-player", "100%", "650px", "8", null, null, params, attrs);
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
  $scope.toggleShuffle = function() { SongService.toggleShuffle() }
  $scope.songService = SongService;
}]);

VMP.controller('HeaderController', ['$scope', 'SongService', function($scope, SongService) {
  var titles = [
    "А я и не знал, что у этой песни клип есть!",
    "Проигрыватель музыкальных клипов из социальной сети вконтакте",
    "Круто, ещё и клип есть!",
    "Смотри, чо ща поставлю",
    "Нажми на видео два раза - и оно займёт весь экран"
  ], titleIndex = Math.floor(Math.random()*titles.length);
  $scope.header = titles[titleIndex];
  $scope.title = function() {
    var song = SongService.currentSong();
    if (song) {
      return 'VCP: ' + song.artist + ' - ' + song.title;
    } else {
      return 'VCP: Vk.com music clips player';
    }
  }
}]);
