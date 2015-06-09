'use strict';

describe('ngViewport', function () {

  var elt,
      $compile,
      $rootScope,
      $router,
      $templateCache,
      $controllerProvider;


  beforeEach(function() {
    module('ng');
    module('ngNewRouter');
    module(function(_$controllerProvider_) {
      $controllerProvider = _$controllerProvider_;
    });

    inject(function(_$compile_, _$rootScope_, _$router_, _$templateCache_) {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $router = _$router_;
      $templateCache = _$templateCache_;
    });

    registerComponent('user', '<div>hello {{user.name}}</div>', function($routeParams) {
      this.name = $routeParams.name;
    });
    registerComponent('one', '<div>{{one.number}}</div>', boringController('number', 'one'));
    registerComponent('two', '<div>{{two.number}}</div>', boringController('number', 'two'));
  });


  it('should work in a simple case', function () {
    compile('<ng-viewport></ng-viewport>');

    $router.config([
      { path: '/', component: 'one' }
    ]);

    $router.navigate('/');
    $rootScope.$digest();

    expect(elt.text()).toBe('one');
  });


  // See https://github.com/angular/router/issues/105
  it('should warn when instantiating a component with no controller', function () {
    put('noController', '<div>{{ 2 + 2 }}</div>');
    $router.config([
      { path: '/', component: 'noController' }
    ]);

    spyOn(console, 'warn');
    compile('<ng-viewport></ng-viewport>');
    $router.navigate('/');

    expect(console.warn).toHaveBeenCalledWith('Could not instantiate controller', 'NoControllerController');
    expect(elt.text()).toBe('4');
  });


  it('should navigate between components with different parameters', function () {
    $router.config([
      { path: '/user/:name', component: 'user' }
    ]);
    compile('<ng-viewport></ng-viewport>');

    $router.navigate('/user/brian');
    $rootScope.$digest();
    expect(elt.text()).toBe('hello brian');

    $router.navigate('/user/igor');
    $rootScope.$digest();
    expect(elt.text()).toBe('hello igor');
  });


  it('should not reactivate a parent when navigating between child components with different parameters', function () {
    ParentController.$routeConfig = [
      { path: '/user/:name', component: 'user' }
    ];
    function ParentController () {}
    var spy = ParentController.prototype.activate = jasmine.createSpy('activate');

    registerComponent('parent', 'parent { <ng-viewport></ng-viewport> }', ParentController);

    $router.config([
      { path: '/parent', component: 'parent' }
    ]);
    compile('<ng-viewport></ng-viewport>');

    $router.navigate('/parent/user/brian');
    $rootScope.$digest();
    expect(spy).toHaveBeenCalled();
    expect(elt.text()).toBe('parent { hello brian }');

    spy.calls.reset();

    $router.navigate('/parent/user/igor');
    $rootScope.$digest();
    expect(spy).not.toHaveBeenCalled();
    expect(elt.text()).toBe('parent { hello igor }');
  });


  it('should work with multiple named viewports', function () {
    $router.config([
      { path: '/',         component:  {left: 'one', right: 'two'} },
      { path: '/switched', components: {left: 'two', right: 'one'} }
    ]);
    compile('port 1: <div ng-viewport="left"></div> | ' +
            'port 2: <div ng-viewport="right"></div>');

    $router.navigate('/');
    $rootScope.$digest();
    expect(elt.text()).toBe('port 1: one | port 2: two');

    $router.navigate('/switched');
    $rootScope.$digest();
    expect(elt.text()).toBe('port 1: two | port 2: one');
  });


  it('should work with nested viewports', function () {
    registerComponent('childRouter', '<div>inner { <div ng-viewport></div> }</div>', [
      { path: '/b', component: 'one' }
    ]);

    $router.config([
      { path: '/a', component: 'childRouter' }
    ]);
    compile('<div>outer { <div ng-viewport></div> }</div>');

    $router.navigate('/a/b');
    $rootScope.$digest();

    expect(elt.text()).toBe('outer { inner { one } }');
  });


  it('should work with recursive nested viewports', function () {
    put('router', '<div>recur { <div ng-viewport></div> }</div>');
    $router.config([
      { path: '/recur', component: 'router' },
      { path: '/', component: 'one' }
    ]);

    compile('<div>root { <div ng-viewport></div> }</div>');
    $router.navigate('/');
    $rootScope.$digest();
    expect(elt.text()).toBe('root { one }');
  });


  it('should update anchor hrefs with the routerLink directive', function () {
    put('one', '<div><a ng-link="two">{{number}}</a></div>');

    $router.config([
      { path: '/a', component: 'one' },
      { path: '/b', component: 'two' }
    ]);
    compile('<div>outer { <div ng-viewport></div> }</div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(elt.find('a').attr('href')).toBe('./b');
  });


  it('should allow params in routerLink directive', function () {
    put('router', '<div>outer { <div ng-viewport></div> }</div>');
    put('one', '<div><a ng-link="two({param: \'lol\'})">{{number}}</a></div>');

    $router.config([
      { path: '/a', component: 'one' },
      { path: '/b/:param', component: 'two' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(elt.find('a').attr('href')).toBe('./b/lol');
  });

  // TODO: test dynamic links


  it('should update the href of links', function () {
    put('router', '<div>outer { <div ng-viewport></div> }</div>');
    put('one', '<div><a ng-link="two({param: one.number})">{{one.number}}</a></div>');

    $router.config([
      { path: '/a', component: 'one' },
      { path: '/b/:param', component: 'two' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(elt.find('a').attr('href')).toBe('./b/one');
  });


  it('should run the activate hook of controllers', function () {
    var spy = jasmine.createSpy('activate');
    registerComponent('activate', '', {
      activate: spy
    });

    $router.config([
      { path: '/a', component: 'activate' }
    ]);
    compile('<div>outer { <div ng-viewport></div> }</div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(spy).toHaveBeenCalled();
  });


  it('should inject into the activate hook of a controller', inject(function ($http) {
    var spy = jasmine.createSpy('activate');
    spy.$inject = ['$routeParams', '$http'];
    registerComponent('user', '', {
      activate: spy
    });

    $router.config([
      { path: '/user/:name', component: 'user' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/user/brian');
    $rootScope.$digest();

    expect(spy).toHaveBeenCalledWith({name: 'brian'}, $http);
  }));


  it('should inject $scope into the activate hook of a controller', function () {
    var spy = jasmine.createSpy('activate');
    spy.$inject = ['$scope'];
    registerComponent('user', '', {
      activate: spy
    });

    $router.config([
      { path: '/user/:name', component: 'user' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/user/brian');
    $rootScope.$digest();

    expect(spy.calls.first().args[0].$root).toEqual($rootScope);
  });


  it('should run the deactivate hook of controllers', function () {
    var spy = jasmine.createSpy('deactivate');
    registerComponent('deactivate', '', {
      deactivate: spy
    });

    $router.config([
      { path: '/a', component: 'deactivate' },
      { path: '/b', component: 'one' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/a');
    $rootScope.$digest();
    $router.navigate('/b');
    $rootScope.$digest();
    expect(spy).toHaveBeenCalled();
  });


  it('should inject into the deactivate hook of controllers', inject(function ($http) {
    var spy = jasmine.createSpy('deactivate');
    spy.$inject = ['$routeParams', '$http'];
    registerComponent('deactivate', '', {
      deactivate: spy
    });

    $router.config([
      { path: '/user/:name', component: 'deactivate' },
      { path: '/post/:id', component: 'one' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/user/brian');
    $rootScope.$digest();
    $router.navigate('/post/123');
    $rootScope.$digest();
    expect(spy).toHaveBeenCalledWith({id: '123'}, $http);
  }));


  it('should run the deactivate hook before the activate hook', function () {
    var log = [];

    registerComponent('activate', '', {
      activate: function () { log.push('activate'); }
    });

    registerComponent('deactivate', '', {
      deactivate: function () { log.push('deactivate'); }
    });

    $router.config([
      { path: '/a', component: 'deactivate' },
      { path: '/b', component: 'activate' }
    ]);
    compile('outer { <div ng-viewport></div> }');

    $router.navigate('/a');
    $rootScope.$digest();
    $router.navigate('/b');
    $rootScope.$digest();

    expect(log).toEqual(['deactivate', 'activate']);
  });


  it('should not activate a component when canActivate returns false', function () {
    var spy = jasmine.createSpy('activate');
    registerComponent('activate', '', {
      canActivate: function () { return false; },
      activate: spy
    });

    $router.config([
      { path: '/a', component: 'activate' }
    ]);
    compile('outer { <div ng-viewport></div> }');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(spy).not.toHaveBeenCalled();
    expect(elt.text()).toBe('outer {  }');
  });


  it('should not activate a component when canActivate returns a rejected promise', inject(function ($q) {
    var spy = jasmine.createSpy('activate');
    registerComponent('activate', '', {
      canActivate: function () { return $q.reject(); },
      activate: spy
    });

    $router.config([
      { path: '/a', component: 'activate' }
    ]);
    compile('outer { <div ng-viewport></div> }');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(spy).not.toHaveBeenCalled();
    expect(elt.text()).toBe('outer {  }');
  }));


  it('should activate a component when canActivate returns true', function () {
    var spy = jasmine.createSpy('activate');
    registerComponent('activate', 'hi', {
      canActivate: function () { return true; },
      activate: spy
    });

    $router.config([
      { path: '/a', component: 'activate' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(spy).toHaveBeenCalled();
    expect(elt.text()).toBe('hi');
  });


  it('should activate a component when canActivate returns a resolved promise', inject(function ($q) {
    var spy = jasmine.createSpy('activate');
    registerComponent('activate', 'hi', {
      canActivate: function () { return $q.when(); },
      activate: spy
    });

    $router.config([
      { path: '/a', component: 'activate' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(spy).toHaveBeenCalled();
    expect(elt.text()).toBe('hi');
  }));


  it('should inject into the canActivate hook of controllers', inject(function ($http) {
    var spy = jasmine.createSpy('canActivate').and.returnValue(true);
    spy.$inject = ['$routeParams', '$http'];
    registerComponent('activate', '', {
      canActivate: spy
    });

    $router.config([
      { path: '/user/:name', component: 'activate' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/user/brian');
    $rootScope.$digest();
    expect(spy).toHaveBeenCalledWith({name: 'brian'}, $http);
  }));


  it('should not navigate when canDeactivate returns false', function () {
    registerComponent('activate', 'hi', {
      canDeactivate: function () { return false; }
    });

    $router.config([
      { path: '/a', component: 'activate' },
      { path: '/b', component: 'one' }
    ]);
    compile('outer { <div ng-viewport></div> }');

    $router.navigate('/a');
    $rootScope.$digest();
    expect(elt.text()).toBe('outer { hi }');

    $router.navigate('/b');
    $rootScope.$digest();
    expect(elt.text()).toBe('outer { hi }');
  });


  it('should not navigate when canDeactivate returns a rejected promise', inject(function ($q) {
    registerComponent('activate', 'hi', {
      canDeactivate: function () { return $q.reject(); }
    });

    $router.config([
      { path: '/a', component: 'activate' },
      { path: '/b', component: 'one' }
    ]);
    compile('outer { <div ng-viewport></div> }');

    $router.navigate('/a');
    $rootScope.$digest();
    expect(elt.text()).toBe('outer { hi }');

    $router.navigate('/b');
    $rootScope.$digest();
    expect(elt.text()).toBe('outer { hi }');
  }));


  it('should navigate when canDeactivate returns true', function () {
    registerComponent('activate', 'hi', {
      canDeactivate: function () { return true; }
    });

    $router.config([
      { path: '/a', component: 'activate' },
      { path: '/b', component: 'one' }
    ]);
    compile('outer { <div ng-viewport></div> }');

    $router.navigate('/a');
    $rootScope.$digest();
    expect(elt.text()).toBe('outer { hi }');

    $router.navigate('/b');
    $rootScope.$digest();
    expect(elt.text()).toBe('outer { one }');
  });


  it('should activate a component when canActivate returns true', function () {
    var spy = jasmine.createSpy('activate');
    registerComponent('activate', 'hi', {
      canActivate: function () { return true; },
      activate: spy
    });

    $router.config([
      { path: '/a', component: 'activate' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/a');
    $rootScope.$digest();

    expect(spy).toHaveBeenCalled();
    expect(elt.text()).toBe('hi');
  });


  it('should inject into the canDeactivate hook of controllers', inject(function ($http) {
    var spy = jasmine.createSpy('canDeactivate').and.returnValue(true);
    spy.$inject = ['$routeParams', '$http'];
    registerComponent('deactivate', '', {
      canDeactivate: spy
    });

    $router.config([
      { path: '/user/:name', component: 'deactivate' },
      { path: '/post/:id', component: 'one' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/user/brian');
    $rootScope.$digest();
    $router.navigate('/post/123');
    $rootScope.$digest();
    expect(spy).toHaveBeenCalledWith({id: '123'}, $http);
  }));


  it('should change location path', inject(function ($location) {
    $router.config([
      { path: '/user', component: 'user' }
    ]);

    compile('<div ng-viewport></div>');

    $router.navigate('/user');
    $rootScope.$digest();

    expect($location.path()).toBe('/user');
  }));

  // TODO: test injecting $scope

  it('should navigate when a link url matches a route', function () {
    $router.config([
      { path: '/', component: 'one' },
      { path: '/two', component: 'two' },
    ]);

    compile('<a href="./two">link</a> | <div ng-viewport></div>');
    $rootScope.$digest();
    expect(elt.text()).toBe('link | one');
    elt.find('a')[0].click();

    $rootScope.$digest();
    expect(elt.text()).toBe('link | two');
  });

  // See https://github.com/angular/router/issues/206
  it('should not navigate a link without an href', function () {
    $router.config([
      { path: '/', component: 'one' },
      { path: '/two', component: 'two' },
    ]);
    expect(function() {
      compile('<a>link</a>');
      $rootScope.$digest();
      expect(elt.text()).toBe('link');
      elt.find('a')[0].click();
      $rootScope.$digest();
    }).not.toThrow();
  });


  it('should change location to the canonical route', inject(function ($location) {
    compile('<div ng-viewport></div>');

    $router.config([
      { path: '/',     redirectTo: '/user' },
      { path: '/user', component:  'user' }
    ]);

    $router.navigate('/');
    $rootScope.$digest();

    expect($location.path()).toBe('/user');
  }));


  it('should change location to the canonical route with nested components', inject(function ($location) {
    $router.config([
      { path: '/old-parent', redirectTo: '/new-parent' },
      { path: '/new-parent', component:  'childRouter' }
    ]);

    registerComponent('childRouter', '<div>inner { <div ng-viewport></div> }</div>', [
      { path: '/old-child', redirectTo: '/new-child' },
      { path: '/new-child', component: 'one'},
      { path: '/old-child-two', redirectTo: '/new-child-two' },
      { path: '/new-child-two', component: 'two'}
    ]);

    compile('<div ng-viewport></div>');

    $router.navigate('/old-parent/old-child');
    $rootScope.$digest();

    expect($location.path()).toBe('/new-parent/new-child');
    expect(elt.text()).toBe('inner { one }');

    $router.navigate('/old-parent/old-child-two');
    $rootScope.$digest();

    expect($location.path()).toBe('/new-parent/new-child-two');
    expect(elt.text()).toBe('inner { two }');
  }));


  it('should navigate when the location path changes', inject(function ($location) {
    $router.config([
      { path: '/one', component: 'one' }
    ]);
    compile('<div ng-viewport></div>');

    $location.path('/one');
    $rootScope.$digest();

    expect(elt.text()).toBe('one');
  }));


  it('should expose a "navigating" property on $router', function () {
    $router.config([
      { path: '/one', component: 'one' }
    ]);
    compile('<div ng-viewport></div>');

    $router.navigate('/one');
    expect($router.navigating).toBe(true);
    $rootScope.$digest();
    expect($router.navigating).toBe(false);
  });


  function registerComponent(name, template, config) {
    if (!template) {
      template = '';
    }
    var ctrl;
    if (!config) {
      ctrl = function () {};
    } else if (angular.isArray(config)) {
      ctrl = function () {};
      ctrl.$routeConfig = config;
    } else if (typeof config === 'function') {
      ctrl = config;
    } else {
      ctrl = function () {};
      ctrl.prototype = config;
    }
    $controllerProvider.register(componentControllerName(name), ctrl);
    put(name, template);
  }

  function boringController (model, value) {
    return function () {
      this[model] = value;
    };
  }

  function put (name, template) {
    $templateCache.put(componentTemplatePath(name), [200, template, {}]);
  }

  function compile(template) {
    elt = $compile('<div>' + template + '</div>')($rootScope);
    $rootScope.$digest();
    return elt;
  }
});


describe('ngViewport animations', function () {

  var elt,
      $animate,
      $compile,
      $rootScope,
      $router,
      $templateCache,
      $controllerProvider;

  beforeEach(function() {
    module('ngAnimate');
    module('ngAnimateMock');
    module('ngNewRouter');
    module(function(_$controllerProvider_) {
      $controllerProvider = _$controllerProvider_;
    });

    inject(function(_$animate_, _$compile_, _$rootScope_, _$router_, _$templateCache_) {
      $animate = _$animate_;
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $router = _$router_;
      $templateCache = _$templateCache_;
    });

    put('user', '<div>hello {{user.name}}</div>');
    $controllerProvider.register('UserController', function($routeParams) {
      this.name = $routeParams.name;
    });
  });

  afterEach(function() {
    expect($animate.queue).toEqual([]);
  });

  it('should work in a simple case', function () {
    var item;

    compile('<div ng-viewport></div>');

    $router.config([
      { path: '/user/:name', component: 'user' }
    ]);

    $router.navigate('/user/brian');
    $rootScope.$digest();
    expect(elt.text()).toBe('hello brian');

    // "user" component enters
    item = $animate.queue.shift();
    expect(item.event).toBe('enter');

    // navigate to pete
    $router.navigate('/user/pete');
    $rootScope.$digest();
    expect(elt.text()).toBe('hello pete');

    // "user pete" component enters
    item = $animate.queue.shift();
    expect(item.event).toBe('enter');
    expect(item.element.text()).toBe('hello pete');

    // "user brian" component leaves
    item = $animate.queue.shift();
    expect(item.event).toBe('leave');
    expect(item.element.text()).toBe('hello brian');
  });

  function put (name, template) {
    $templateCache.put(componentTemplatePath(name), [200, template, {}]);
  }

  function compile(template) {
    elt = $compile('<div>' + template + '</div>')($rootScope);
    $rootScope.$digest();
    return elt;
  }
});
