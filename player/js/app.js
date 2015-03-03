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

VMP.factory('ytPlayer', ['SongService', function(SongService) {
  return {
    setPlayer: function(player) {
      this.flash = player;
      this.flash.addEventListener("onStateChange", "angular.injector(['ng', 'VMP']).get('ytPlayer').playerStateChanged");
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

VMP.factory('SongService', function(ytPlayer) {
  var SongService = {};
  VK.Api.call('audio.get', {}, function(response) {
    SongService.songs = response.response;
    SongService.isRandom = true;
  });
  SongService.getNextSong = function() {
    return this.songs[Math.floor(Math.random()*this.songs.length)];
  };
  return SongService;
});

VMP.controller('GreetingController', ['$scope', '$location', function($scope, $location) {
  VK.init({ apiId: "4797696" });
  $scope.login = function() {
    VK.Auth.login(function(response) {
      if (response.session) {
        $location('/player');
      }
    })
  };
}]);

VMP.controller('ContentController', ['$scope', 'SongService', 'ytPlayer', function($scope, SongService, ytPlayer) {
  var params = { allowScriptAccess: "always", allowFullScreen: true };
  var attrs = { id: "yt-player" };
  swfobject.embedSWF("https://www.youtube.com/apiplayer?enablejsapi=1&version=3&controls=0&autoplay=1&fs=1&showinfo=0&modestbranding=1&playerapiid=yt-player", "yt-player", "100%", "100%", "8", null, null, params, attrs);
  $scope.next = function() {
    ytPlayer.playNextSong();
  };
  $scope.shuffleToggle = function() {
    SongService.shuffle = !SongService.shuffle;
  };

}]);
