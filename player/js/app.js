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
    playNextSong: function() {
      if (this.shuffle) {
        this.currentSong = this.nextSong;
        this.nextSong = this.randomSong();
      } else {
        var i = this.songs.indexOf(this.currentSong);
        if (i < this.songs.length) {
          this.currentSong = this.songs[i+1];
          if (i > offset+limit) { offset += limit; }
        } else {
          this.currentSong = this.songs[0];
          offset = 0;
        }
      }
      return this.currentSong;
    },
    hasNextPage: function() { return this.songs.length > this.offset + this.limit; },
    nextPage: function() { this.offset += this.limit; },
    hasPrevPage: function() { this.offset > 0 },
    prevPage: function() { this.offset -= this.limit; },
    songsPage: function() { return this.songs.slice(this.offset, this.offset+this.limit); },
    isShuffle: function() { return this.shuffle; },
    getNextSong: function() { return this.nextSong; },
    getCurrentSong: function() { return this.currentSong; }
  };
});

VMP.factory('ytPlayer', ['SongService', '$scope', function(SongService, $scope) {
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
      if (!$scope.$$phase) {
        $scope.$digest();
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
  $scope.toggleShuffle = function() { SongService.shuffle = !SongService.shuffle; }
  $scope.songService = SongService;
}]);
