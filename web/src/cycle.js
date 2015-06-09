(function(){
  angular
    .module('cycleApp', ['cycle.home','cycle.terms','cycle.about','cycle.maps','cycle.shop','cycle.partners','ngNewRouter','ngMaterial','ngMessages','firebase'])
    .config(function($mdThemingProvider, $mdIconProvider,$sceDelegateProvider,$httpProvider){

        $mdIconProvider
            .defaultIconSet("./bower_components/angular-material/demos/icon/demoSvgIconSets/assets/core-icons.svg", 128)
            .icon("menu"       , "./assets/svg/menu.svg"        , 24)
            .icon("star"      , "./assets/svg/star.svg"       , 24)
            .icon("help"      , "./assets/svg/help.svg"       , 24)
            .icon("shopping"      , "./assets/svg/shopping.svg"       , 24)
            .icon("map"      , "./assets/svg/map.svg"       , 24)
            .icon("share"      , "./assets/svg/share.svg"       , 24)
            .icon("home"      , "./assets/svg/home.svg"       , 24)
            

            $mdThemingProvider.theme('default')
                 .primaryPalette('grey', {
                  'default': 'A100', // by default use shade 400 from the pink palette for primary intentions
                  'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
                  'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
                  'hue-3': '900' // use shade A100 for the <code>md-hue-3</code> class
                })
                .accentPalette('light-blue', {
                  'default': 'A100', // by default use shade 400 from the pink palette for primary intentions
                  'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
                  'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
                  'hue-3': '900' // use shade A100 for the <code>md-hue-3</code> class
                });
            $mdThemingProvider.theme('green')
                .primaryPalette('green')
                .accentPalette('grey');

            $sceDelegateProvider.resourceUrlWhitelist(['self', 'http://cycle.li/**']);

            delete $httpProvider.defaults.headers.common["X-Requested-With"]

    })
    .controller('CycleController', [
      '$router','$location', '$mdSidenav', '$mdBottomSheet','$mdDialog','$mdToast', '$log', '$q','$filter','$scope','$rootScope', '$http',
      CycleController
    ])
    .controller('RightCtrl', function ($scope, $timeout, $mdSidenav, $log) {
      $scope.close = function () {
        $mdSidenav('right').close()
          .then(function () {
            $log.debug("close RIGHT is done");
          });
      };
    });

  /**
   * Main Controller for the Cycle_ App
   * @param $scope
   * @param $mdSidenav
   * @param avatarsService
   * @constructor
   */
  function CycleController( $router,$location, $mdSidenav, $mdBottomSheet,$mdDialog,$mdToast, $log, $q,$filter,$scope,$rootScope,$http) {
    var self = this;
    self.ApplicationTitle = "CyclePhilly";
    var parentEl = angular.element(document.body);
    var ref = new Firebase("https://cycle-x.firebaseio.com");
    
    var iconData = [
      {name: 'icon-home'        , color: "#777" },
      {name: 'icon-cloudy'   , color: "rgb(0, 104, 180)" },
      {name: 'icon-google-plus2', color: "#A00" },
      {name: 'icon-youtube4'    , color:"#00A" },
       // Use theming to color the font-icon
      {name: 'icon-settings'    , color:"#A00", theme:"md-warn md-hue-5"}
    ]
    
    var weatherRef = new Firebase('https://publicdata-weather.firebaseio.com/philadelphia/currently');
    var hourlyWeatherRef = new Firebase('https://publicdata-weather.firebaseio.com/philadelphia/hourly');
    hourlyWeatherRef.child('summary').on('value', function(snapshot) {
        //console.log('Temperature is currently ' + snapshot.val());
        self.weather ={};
        self.weather.icon = iconData[1];
        self.weather.temperatureicon = {name: 'icon-Fahrenheit'   , color: "rgb(0,0,0)" }
        self.weather.message = snapshot.val();
        self.weather.style = "weather-style";
        console.log(self.weather)
    });
    weatherRef.child('temperature').on('value', function(snapshot) {
      // console.log('Temperature is currently ' + snapshot.val());
      self.weather.temperature = snapshot.val();
  });

    // var ref = new Firebase("https://platformx.firebaseio.com");
    self.toggleList = function (){
      $mdSidenav('right').toggle()
    }
    self.openPage = function(page){
      $mdSidenav('right').close();
      $location.path(page);
    };

    self.openSignIn = function($event){
      $mdDialog.show({
       parent: parentEl,
       targetEvent: $event,
       templateUrl:
         './src/users/view/signInSheet.html',
       locals: {
       },
       controller: DialogController,
       clickOutsideToClose: true,
       escapeToClose: false,
      });

      function DialogController(scope, $mdDialog) {
        //Firebase this
        scope.confirming = false;
        scope.name = '';
        scope.saveContact = function(){
          //Create firebase user if none exists
          scope.confirming = true;
          ref.createUser({
            email    : scope.email,
            password : "cycl3us3r"
          }, function(error, userData) {
            if (error) {
              console.log("Error creating user:", error);
              if(scope.name !=''){
                toastMessage = "Thanks "+scope.name+" we'll drop you a line real soon!";
              }else{
                toastMessage = "Thanks! We'll drop you a line real soon!";
              }
              $mdToast.show(
                $mdToast.simple()
                  .content(toastMessage)
                  .position('left')
                  .hideDelay(4000)
              );
              scope.closeDialog();
            } else {
              console.log("Successfully created user account with uid:", userData.uid);
              if(scope.name !=''){
                toastMessage = "Thanks "+scope.name+" we'll drop you a line real soon!";
              }else{
                toastMessage = "Thanks! We'll drop you a line real soon!";
              }
              $mdToast.show(
                $mdToast.simple()
                  .content(toastMessage)
                  .position('left')
                  .hideDelay(4000)
              );
              scope.closeDialog();
                }
              });
          
        }
        scope.closeDialog = function() {
          $mdDialog.hide();
          console.log('here')
        }
      }
    }
    $router.config([
     { path: '/', redirectTo: '/home' },
     { path: '/home', component: 'home' },
     { path: '/dashboard/:id', component: 'dashboard' },
     { path: '/about', component: 'about' },
     { path: '/maps', component: 'maps' },
     { path: '/shop', component: 'shop' },
     { path: '/partners', component: 'partners' },
     { path: '/profile', component: 'profile' },
     { path: '/terms', component: 'terms' },
     { path: '/auth', component: 'auth' },
     { path: '/register', component: 'register' }
    ]);
    

  }

})();
