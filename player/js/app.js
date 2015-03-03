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
      console.log('trying to fetch songs')
      VK.Api.call('audio.get', {}, function(response) {
        this.songs = response.response;
        this.isRandom = true;
      })
    },
    getNextSong: function() {
      return this.songs[Math.floor(Math.random()*this.songs.length)];
    }
  };
});

VMP.factory('ytPlayer', ['SongService', function(SongService) {
  return {
    setPlayer: function(player) {
      this.flash = player;
      this.flash.addEventListener("onStateChange", "angular.element(document.body).injector().get('ytPlayer').playerStateChanged");
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
      song = SongService.getNextSong();
      this.playVideoByRequest(song.artist + ' ' + song.title);
    },
    playerStateChanged: function(state) {
      if (state == 0) {
        this.playNextSong();
      }
    }
  };
}]);

VMP.controller('GreetingController', ['$scope', '$location', 'SongService', function($scope, $location, SongService) {
  VK.init({ apiId: "4797696" });
  $scope.login = function() {
    console.log('login inititated')
    VK.Auth.login(function(response) {
      console.log(response)
      if (response.session) {
        console.log('okay, go')
        SongService.fetchSongs();
        $location.path('/player');
        $scope.apply();
      }
    }, 8);
  };
}]);

VMP.controller('ContentController', ['$scope', 'SongService', 'ytPlayer', function($scope, SongService, ytPlayer) {
  var params = { allowScriptAccess: "always", allowFullScreen: true };
  var attrs = { id: "yt-player" };
  swfobject.embedSWF("https://www.youtube.com/apiplayer?enablejsapi=1&version=3&controls=0&autoplay=1&fs=1&showinfo=0&modestbranding=1&playerapiid=yt-player", "yt-player", "100%", "100%", "8", null, null, params, attrs);
  $scope.next = function() {
    ytPlayer.playNextSong();
  };
  $scope.fullscreen = function() {
    ytPlayer.requestFullScreen();
  };
  $scope.shuffleToggle = function() {
    SongService.shuffle = !SongService.shuffle;
  };
}]);
