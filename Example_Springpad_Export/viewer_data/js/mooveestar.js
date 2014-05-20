// > MooVeeStar v0.1.0+20140330 - https://rgthree.github.io/mooveestar/
// > by Regis Gaughan, III <regis.gaughan@gmail.com> http://regisgaughan.com
// > MooVeeStar may be freely distributed under the MIT license.

// **MooVeeStar** is a client-side MV\* Framework built ontop of MooTools. It has been based off other JavaScript MV\* Frameworks such as Backbone.js and Epitome.
/* jshint mootools:true, expr:true, eqnull:true */
;(function(root){
  
  "use strict";

  // ---
  // ## MooVeeStar (Mediator/namespace)
  //   
  // The **MooVeeStar** namespace is an instantiated MooTools Events object
  // allowing it to be used as a global mediator.
  // 
  //     MooVeeStar.fireEvent('some-event', { /* ... */ });
  //     MooVeeStar.addEvent('some-event', function(e){ /* ... */ });
  //     
  var MooVeeStar = root.MooVeeStar = new Events();



  // ---
  // ## MooVeeStar.Event
  // 
  // A Simple Object wrapper for the event payload. Useful when wanting to check instance of an object
  MooVeeStar.Event = new Class({
    initialize: function(obj){
      var self = this;
      Object.forEach(obj || {}, function(v,k){ self[k] = v; });
    }
  });



  // ---
  // ## MooVeeStar.Events
  // 
  // An events mixin that wraps `fireEvent` to fire an additional `*` event.
  // Specifically, so collection add listen to all events of their models
  // to pass through. 
  MooVeeStar.Events = new Class({
    Implements: [Events],


    // ### Events#fireEvent
    // 
    // Wrap this instance's "fireEvent" to additionally fire a "*" event with additional information
    fireEvent: function(type, message){
      if(!(message instanceof MooVeeStar.Event))
        message = new MooVeeStar.Event(message);

      Events.prototype.fireEvent.call(this, type, message);
      Events.prototype.fireEvent.call(this, '*', { event:type, message:message });
    },


    // ### Events#silence
    // 
    // Overloaded method to silence an object's operations. Pass a boolean
    // to set silent, or pass a function to execute silently. For example, one or the other:
    //     
    //     model.silence(function(){ model.set('somrthing', 123); });
    //     // or...
    //     model.silence(true).set('somrthing', 123).silence(false);
    //     
    silence: function(functionOrBoolean){
      var currentSilence = !!this._silent;
      if(typeof functionOrBoolean === 'boolean'){
        this._silent = functionOrBoolean;
      }else if(typeof functionOrBoolean === 'function'){
        this._silent = true;
        functionOrBoolean();
        this._silent = currentIgnore;
      }else if(typeof functionOrBoolean === 'undefined'){
        this._silent = true;
      }
      return this;
    }

  });



  // ---
  // ## MooVeeStar.Model
  // 
  // MooVeeStar **Model**s are the stars of the framework. A model is a basic
  // data object that can be uniquely identified and have methods for manipulating
  // its data.
  MooVeeStar.Model = new Class({

    Implements: [MooVeeStar.Events, Options],

    // The key to identify the model by. Returned by `Model#getId()`
    idProperty: 'id',

    // A client identifier for this model. Guarenteed to be unique, it will use the model's
    // `idProperty` if it exists when it's called, otherwise it will fall back to `String.uniqueID()`
    cid: null,

    // Define specific properties values and methods w/ the property name as the key, and a value being 
    // a map containing: 'initial', 'possible', 'get', 'set', 'sanitize', and/ or 'validate'
    properties: {},

    // Internal properties map. Accessed via get/set
    _props: {},

    options: {},

    // ### Model Constructor
    //     
    // Create a new **Model**. Merges a passed object with the **Model**'s default values in the
    // `properties` map, looking for 'initial', 'default' or the first 'possible' value.
    // 
    //     var model = new MooVeeStar.Model({ id:1, name:Edward });
    //     
    initialize: function(object, options){
      this.setOptions(options);
      object = object && typeOf(object) === 'object' ? object : {};

      this.set(Object.merge(Object.map(this.properties, function(p){
        if(p.initial != null)
          return p.initial;
        if(p['default'] != null)
          return p['default'];
        if(p.possible && p.possible.length)
          return p.possible[0];
        return null;
      }), object), true);
      this.changed = [];
      this.fireEvent('ready', { model:this });
      return this;
    },


    // ### Model#set
    // 
    // Overloaded set method to set a property or properties on the model. Can be called with a single
    // key/value, or an object with many keys/values. Options can have a silent key that, when true, supresses events.
    //     
    //     model.set('name', 'Edward', { silent:true });
    //     // or...
    //     model.set({ name:'Edward' }, { silent:true });
    //     
    set: function(keyOrObject, valueOrOptions, optionsOrUndefined){
      var self, props, options;
      self = this;

      if(!keyOrObject)
        return self;

      if(typeof(keyOrObject) === 'object'){
        props = keyOrObject;
        options = valueOrOptions || {};
      }else{
        (props = {})[keyOrObject] = valueOrOptions;
        options = optionsOrUndefined || {};
      }

      // Backwards compatibility for a boolean silent param
      if(typeof(options) === 'boolean')
        options = { silent:options };

      self.changed = [];
      self.errors = [];

      Object.forEach(props, function(v,k){ self._set(k, v, options); });

      if(!self._silent && !options.silent){
        self.changed.length && self.fireEvent('change', { model: self, changed: self.changed.associate(self.changed.map(function(change){ return change.key; })) });
        self.errors.length && self.fireEvent('error', { model: self, errors: self.errors.associate(self.errors.map(function(error){ return error.key; })) });
      }

      return self;
    },

    // ### _Model#_set_
    //     
    // _Private_. Internal set method, called from exposed `Model#set`
    // While `Model#set` files changed & errors events, `Model#_set` is in charge of firing seperate
    // `change:_prop_` events.
    // 
    _set: function(key, value, options){
      var self, from, valid, error, changedPayload;
      self = this;

      if(!key || typeof(value) === 'undefined')
        return self;

      // Backwards compatibility for a boolean silent param
      if(typeof(options) === 'boolean')
        options = { silent:options };

      options = options || {};
      
      // Get the raw from value
      from = self.get(key, true);

      // Sanitize the value
      if(value !== null && self.properties[key] && self.properties[key].sanitize)
        value = self.properties[key].sanitize.call(self, value);     

      // If we have a custom setter, call it.
      if(self.properties[key] && self.properties[key].set){
        self.properties[key].set.call(self, value, key);
      }else{
        // No change? Then abandon
        if(from === value)
          return self;

        // Basic validator support
        valid = self._validate(key, value);
        if(self.properties[key] && (self.properties[key].validate || self.properties[key].possible) && valid !== true){
          error = { key:key, value:value, error:valid, from:from };
          self.errors.push(error);
          self.fireEvent('error:'+key, Object.merge({ model:self }, error));
          return self;
        }

        if(value === null)
          delete self._props[key];
        else
          self._props[key] = value;
      }

      changedPayload = { key:key, from:from, value:value };
      self.changed.push(changedPayload);

      if(!self._silent && !options.silent)
        self.fireEvent('change:'+key, Object.merge({ model:self }, changedPayload));
      return self;
    },

    // ### Model#get
    // 
    // Overloaded get method to get a single value, or a map of `property:_proeprtyValue_`.
    // Passing `raw` as true will get the raw value directly as it's stored, without checking
    // if there's a custom getter within the Model's properties
    //     
    //     model.get('name');
    //     // or...
    //     model.get(['name', 'id']);
    //     
    get: function(keyOrArray, raw) {
      var self, gets;
      self = this;
      if(typeOf(keyOrArray) === 'array'){
        gets = {};
        Array.forEach(keyOrArray, function(k){ gets[k] = self._get(k, raw); });
        return gets;
      }      
      return self._get(keyOrArray, raw);
    },


    // ### _Model#_get_
    //     
    // _Private_. Returns the value of a property, or `null` if it does not exist.
    // Passing `raw` as true will get the raw value directly as it's stored, without checking
    // if there's a custom getter within the Model's properties
    // 
    _get: function(key, raw) {
      if(!raw && this.properties[key] && this.properties[key].get)
        return this.properties[key].get.apply(this, arguments);

      // If we asked for the cid, return it if it exists, otherwise call `getId` and return it
      if(key === 'cid')
        return this.cid || this.getId();

      return (key && typeof(this._props[key]) !== 'undefined') ? this._props[key] : null;
    },


    // ### Model#getId
    //     
    // Returns an id for the model. If the `idProperty` exists, it will return it, otherwise
    // it will return a unique string.
    // If there is no `cid` set yet, it will permenently assign it at this time.
    // **MooVeeStar.Collection** uses this to identify models within itself.
    // 
    getId: function(){
      var id = this.get(this.idProperty) || this.cid || String.uniqueID();
      !this.cid && (this.cid = id);
      return id;
    },


    // ### Model#unset
    //     
    // Accepts a list of keys and passes them to `Model#set` with a null value.
    // 
    unset: function(keys, options){
      keys = Array.from(keys).clean();

      if(!keys.length)
        return this;

      var toUnset = {};
      keys.forEach(function(k){ toUnset[k] = null; });
      return this.set(toUnset, options);
    },


    // ### Model#destroy
    //     
    // Destroys a model by setting it's property to an empty map and firing a destroy event
    // 
    destroy: function() {
      var props, id;
      id = this.getId();
      props = Object.clone(this.toJSON());
      this._props = {};
      this.fireEvent('destroy', { model:this, properties:props, id:id, cid:this.cid });
    },


    // ### _Model#_validate_
    //     
    // _Private_. Called when setting a value, it 
    //  - calls a `validate` function set in the `Model.properties` map and returns the value
    //  - checks the new value against a `possible` array of values in the `Model.properties` map
    //  
    _validate: function(key, value) {
      var prop = this.properties[key];
      if(prop){
        if(typeof prop.validate === 'function')
          return prop.validate.call(this, value);
        if(typeOf(prop.possible) === 'array')
          return prop.possible.contains(value) || ('"'+value+'" is not a valid value for "'+key+'"');
      }
      return true;
    },


    // ### Model#toJSON
    //     
    // Returns a recursively cloned value map of the model's _raw_ properties.
    // 
    toJSON: function(){
      var self, data, recurse;
      self = this;
      recurse = function(v, k, obj){
        if(v){
          if(v.toJSON)
            obj[k] = v.toJSON();
          else if(typeOf(v) === 'object')
            Object.each(v, recurse);
          else if(typeOf(v) === 'array')
            Array.each(v, recurse);
        }
      };
      data = Object.clone(self._props);
      recurse(data);
      return data;
    }

  });


  // ---
  // ## MooVeeStar.Collection
  //   
  // The *MooVeeStar.Collection* is essentially an ordered list of your models.
  // 
  MooVeeStar.Collection = new Class({

    Implements: [MooVeeStar.Events, Options],

    // The model class to define. When a model is added, it checks to see if the object is a
    // model and, if not, instantiates a new model of this class
    modelClass: MooVeeStar.Model, 

    options: {
      // Does this collection allow the same model in multiple positions?
      allowDuplicates: false
    },

     // The internal list of models
    _models: [],
    // A map of model's by their `id` (`getId()`), with a map of `count` and `model`
    _modelsById: {},


    // ### Collection Constructor
    //     
    // Create a new **Collection**. Pass it a list of items to be added immediately
    // 
    //     new MooVeeStar.Collection([model1, model2, model3]);
    //     
    initialize: function(items, options){
      options = options || {};

      // Bind the onModelEvent passthrough so it can be removed
      this._onModelEvent = this._onModelEvent.bind(this);

      // Set a `cid` immediately. If `options.id` is passed, use it, otherwise assign as a unique string
      this.cid = (options.id) || String.uniqueID();

      // If `options.silent` was passed in, set silent immediately
      this.silence(!!options.silent);

      delete options.id;
      delete options.silent;
      this.setOptions(options);

      if(items)
        this.add(items, { silent:true });
    },


    // ### _Collection#_onModelEvent_
    //     
    // _Private_. Callback for every event fired from a model. Fires a collection event with a `'model:'` prefix.
    // If a model fires a destroy event, we automatically remove it from the collection
    // 
    _onModelEvent: function(e){
      if(e.event === 'destroy')
        this.remove(e.message.model);

      this.fireEvent('model:'+e.event, e.message);
    },


    // ### Collection#add
    //     
    // Callback for every event fired from a model. Fires a collection event with a `'model:'` prefix.
    // If a model fires a destroy event, we automatically remove it from the collection
    // 
    add: function(items, options){
      var self, added, errors, addedCount;
      self = this;
      options = options || {};
      added = [];
      errors = [];
      addedCount = 0;

      Array.forEach(Array.from(items), function(item){
        // If not a MooVeeStar.Model and a `modelClass` is defined, then instantiate
        var model = item;
        if(!(model instanceof MooVeeStar.Model) && self.modelClass)
          model = new self.modelClass(model);

        // If we don't find the model in our list already, or we allowDuplicates
        if(self.options.allowDuplicates || !self.findFirst(model.getId())){
          model.addEvent('*', self._onModelEvent);
          added.push(model);
          // Add/or increase the count of the model's id
          if(self._modelsById[model.getId()])
            self._modelsById[model.getId()].count += 1;
          else
            self._modelsById[model.getId()] = { count:0, model:model};

          if(options.at != null)
            self._models.splice(options.at+addedCount, 0, model);
          else
            self._models.push(model);
          addedCount++;
          if(model.errors.length)
            errors.push({ model:model, errors:model.errors });
        }
      });
      
      if(!self._silent && !options.silent){
        added.length && self.fireEvent('change', { event:'add', models:added, options:options });
        added.length && self.fireEvent('add', { models:added, options:options });
        errors.length && self.fireEvent('error', { data:errors, options:options });
      }
      return self;
    },


    // ### Collection#remove
    //     
    // Removes a model by index or all instance of a model or array of models from the collection. If `indexOrModels`
    // is a number, then remove at that index; if it is a string id, then get the model and remove all instances of it;
    // if it is a model or array of models, then remove all instances of each.
    // 
    // Fires `Collection#change` and `Collection#remove`
    // 
    remove: function(indexOrModels, options){
      var self, modelsRemoved, model;
      self = this;
      options = options || {};
      modelsRemoved = [];

      // If we passed a number in, then handle as an index and remove only the item at that index      
      // even if that model exists elsewhere
      if(typeof(indexOrModels) === 'number'){
        model = self.at(indexOrModels);
        if(self._modelsById[model.getId()] && self._modelsById[model.getId()].count > 0){
          modelsRemoved.include(model);
          Array.splice(self._models, indexOrModels, 1);
          self._modelsById[model.getId()].count -= 1;
          // Only remove the event listener when there's no more instances of the model in the collection
          if(self._modelsById[model.getId()].count === 0){
            model.removeEvent('*', self._onModelEvent);
            delete self._modelsById[model.getId()];
          }
        }

      // Otherwise, remove all occurrences of the model(s) passed in
      }else{
        indexOrModels = Array.from(indexOrModels);
        // Loop over inversely so we do not mess with order if `indexOrModels === this._model` when `removeAll()`
        for(var i = indexOrModels.length-1, l = 0; i >= 0; i--){
          model = typeof(indexOrModels[i]) !== 'object' ? self.findFirst(indexOrModels[i]) : indexOrModels[i];
          if(self._models.contains(model)){
            model.removeEvent('*', self._onModelEvent);
            modelsRemoved.include(model);
            // Array.erase removes all instances of the model
            self._models.erase(model);
            delete self._modelsById[model.getId()];
          }
        }
      }
      if(!self._silent && !options.silent && modelsRemoved.length){
        self.fireEvent('change', { event:'remove', models:modelsRemoved, options:options });
        self.fireEvent('remove', { models:modelsRemoved, options:options });
      }
      return self;
    },

    // ### Collection#empty
    //     
    // Empties the **Collection** by callng remove on all items
    // 
    empty: function(options){
      options = options || {};
      this.remove(this.getAll(), options);
      if(!this._silent && !options.silent){
        this.fireEvent('change', { event:'empty', options:options });  
        this.fireEvent('empty', { options:options });
      }
      return this;
    },


    // ### Collection#move
    //     
    // Moves a model from one index to another. If `indexOrModel` is a number, then move the model at that index.
    // If it is a model then _only whose first instance of the model_ in the collection will be moved.
    // 
    move: function(indexOrModel, to, options){
      var self, from;
      self = this;
      options = options || {};
      from = indexOrModel;

      if(typeof(from) !== 'number')
        from = self.indexOf(self.get(from));

      if(typeof(from) !== 'number' || from === -1)
        return self;

      if(to == null || to >= self.getLength()){
        Array.push(self._models, Array.splice(self._models, from, 1)[0]);
        to = self.getLength() - 1;
      }else{
        Array.splice(self._models, to, 0, Array.splice(self._models, from, 1)[0]);
      }

      if(!self._silent && !options.silent){
        self.fireEvent('change', { event:'move', model:self.at(to), from:from, to:to, options:options });
        self.fireEvent('move', { model:self.at(to), from:from, to:to, options:options });
      }
      return this;
    },


    // ### Collection#getId
    //     
    // Returns the `cid`.
    // 
    getId: function(){
      return this.cid;
    },


    // ### Collection#getLength
    //     
    // Returns the number of items in the collection.
    // 
    getLength: function(){
      return this._models.length;
    },


    // ### Collection#at
    //     
    // Returns the model at a specific index, if it exists.
    // 
    at: function(index){
      return this._models.length > index ? this._models[index] : null;
    },


    // ### Collection#get
    //     
    // Returns the first model found from the key.
    // If `key` is `null`, return all items;
    // or call `Collection:findFirst` with `key`;
    // or if `key` is numeric call `Collection:at`
    // 
    get: function(key){
      if(key instanceof MooVeeStar.Model)
        return key;
      return key == null ? this.getAll() : (this.findFirst(key) || (typeof(key) === 'number' && this.at(key)) || null);
    },


    // ### Collection#getAll
    //     
    // Returns the list of models
    // 
    getAll: function(){
      return this._models;
    },


    // ### Collection#find
    //     
    // Accept a value or list of values and returns any models who's `idProperty` is within the values list.
    // Pass `keyToFind` to compare that key's value instread of `idProperty`
    // 
    find: function(values, keyToFind){
      values = Array.from(values);
      return this._models.filter(function(model){ return values.contains(keyToFind ? model.get(keyToFind) : model.getId()); });
    },


    // ### Collection#findFirst
    //     
    // Returns the first model whos `idProperty` (or `keyToFind` value) matches the passed value
    // 
    findFirst: function(valueOrObj, keyToFind){
      // If there's no keyToFind, then we can assume we're looking up by the model's id
      if(!keyToFind){
        var found = this._modelsById[valueOrObj] || (valueOrObj instanceof MooVeeStar.Model && this._modelsById(valueOrObj.getId())) || this._modelsById[valueOrObj.id] || this._modelsById[valueOrObj.cid] || null;
        return found && found.model || null;
      }

      var models = this.find(valueOrObj, keyToFind);
      return models.length ? models[0] : null;
    },


    // ### Collection#toJSON
    //     
    // Returns a new array of all of the `Models.toJSON` values
    // 
    toJSON: function() {
      return Array.map(this._models, function(model){ return model.toJSON(); });
    },


    // ### Collection#destroy
    //     
    // Silently empties the list and fires a destroy message
    // 
    destroy: function(options){
      options = options || {};
      this.empty(Object.merge({}, options, { silent:true }));
      if(!this._silent && !options.silent)
        this.fireEvent('destroy', { collection:this, options:options });
      return this;
    },

    // ### Collection#applyToModels
    //     
    // Calls a method on all models, or all models found
    // 
    //     // Set all models to complete
    //     collection.applyToModels('set', ['complete', true]);
    //     
    //     // Set all models whos 'complete' key is === false
    //     collection.applyToModels('set', [{ complete:true }], false, 'complete');
    //     
    //     // Unset 'complete' and 'due' on models whos 'complete' key is === false
    //     collection.applyToModels('unset', [['complete','due']], collection.find(false, 'complete'));
    // 
    applyToModels: function(operation, opArgs, modelsOrFindValues, findKeyToFind){
      var models;
      if(!modelsOrFindValues)
        models = this._models;
      else if((modelsOrFindValues instanceof MooVeeStar.Model) || (typeOf(modelsOrFindValues) === 'array' && (modelsOrFindValues[0] instanceof MooVeeStar.Model)))
        models = modelsOrFindValues;
      else
        models = this.find(modelsOrFindValues, findKeyToFind);
      Array.forEach(Array.from(models), function(model){
        model[operation].apply(model, Array.from(opArgs));
      });
      return this;
    },


    // ### Collection#set
    // 
    //   __DEPRECATED__
    // Call set on all items in the collection
    // _Should use `applyToModels('set', ...)` instead_
    // 
    set: function(){
      var args = arguments;
      Array.forEach(this._models, function(model){
        model.set.apply(model, args);
      });
      return this;
    },



  });

  // Implement Select Array methods
  Array.each(['forEach','each','every','invoke','filter','map','some','indexOf','contains','getRandom','getLast'], function(k){
    MooVeeStar.Collection.implement(k, function() {
      return Array.prototype[k].apply(this._models, arguments);
    });
  });


  // ---
  // ## MooVeeStar.View
  //   
  // The **MooVeeStar.View** helps you take control of how your interface interacts with user input and data changes.
  // It was built to take full power of the MooVeeStar templating system, but can be used with any templating library.
  // 
  MooVeeStar.View = new Class({

    Implements: [MooVeeStar.Events, Options],

    options:{
      autoattach: true,
      autorender: true,
      inflater: null,   // Lazily set in constructor
      binder: null      // Lazily set in constructor
    },

    // The `events` are somewhat magical. There is a lot you can throw at it, and it will only fail
    // when it can't find what you're trying to attach to, or the string method name doesn't exist on your view.
    // 
    //     'model:change': 'render',          // Listen for 'change' events on 'this.model'
    //     'this.model:change': 'render',     // (Same as above)
    //     'model:change:name': 'render',     // Listen for the specific 'change:name' events on 'this.model'
    //     'click': 'onClick',                // Listen for 'click' events on 'this.element'
    //     'element:click': 'onClick',        // (Same as above)
    //     'this.element:click': 'onClick',   // (Same as above)
    //     'this:click': 'onFiredClick',      // Not a mouse-click! Force listening to an internal view event
    //                                        // named "click" fired through 'this.fireEvent("click")'
    //
    //     'click:relay(button)': 'onButtonClick',   // Listen for 'click' events on button children of 'this.element'
    //     'elements.button:click': 'onButtonClick', // Assuming 'this.elements.button' was set before attaching events
    //                                               // this will listen for clicks on this element
    //     'someProperty:some-event': 'someFn',      // Assuming 'this.someProperty' exists and has an 'addEvent' method
    //     'this.someProperty:some-event': 'someFn', // (Same as above)
    //
    //     'window:scroll': 'onWindowScroll',        // Window Scroll event
    //     'document:click': 'onWindowScroll',       // Click events on the 'document'
    //
    //     'MooVeeStar:some-event': 'someFn',        // Listen for 'some-event' fired through the MooVeeStar mediator
    //
    //     'someGlobalObject:some-event': 'someFn',  // Assuming 'window.someGlobalObject' exists and has an 'addEvent' method
    //
    //     'someHtmlId:keydown':'onSomeKeydown'      // Assuming an element with 'id="someHtmlId"', listen for it's keydowns
    //    
    events:{},

    // The template string to use
    template: null,

    // The element. Will be assigned to the inflated template, unless already defined before calling the MooVeeStar.View parent.
    // Also defined as `this.elements.container`
    element: null,

    // An elements map.
    elements: {},


    // ### View Constructor
    //     
    // Create a new **MooVeeStar.View**. Pass it a list of items to be added immediately
    // 
    //     new MooVeeStar.View();
    //     
    initialize: function(modelOrObject, options){
      options = options || {};
      options.inflater = options.inflater || this.options.inflater || (MooVeeStar.templates && MooVeeStar.templates.inflate) || null;
      options.binder = options.binder || this.options.binder || (MooVeeStar.templates && MooVeeStar.templates.init) || null;
      this.setOptions(options);

      this.events = Object.clone(this.events || {});
      this.model = this.model || modelOrObject || null;

      // If we passed a plain object, inflate to a generic MooVeeStar.Model
      if(!(this.model instanceof MooVeeStar.Model))
        this.model = new MooVeeStar.Model(this.model);

      this.setElement();
      this.options.autoattach && this.attachEvents();
      this.options.autorender && this.render();
    },
    

    // ### View#setElement
    // 
    // Sets the element property of the view to `this.element` and `this.elements.container`
    // Also modifies the elements' dataset attributes to stop autobinding and mark as having a view controller
    // as well as storing this view instance to the elements `__view` key.
    // 
    setElement: function(element){
      if(!this.element){
        this.element = $(element);
        if(!this.element && this.template && this.options.inflater){
          
          // Check if we're using MooVeeStar.templates and passing an element or a string that is not a registered
          // template key, then inflate it as an element with an generated key
          if(typeOf(this.template) === 'element'){
            // Otherwise, if we passed an element, then use it directly
            this.element = this.template;
          }else if(MooVeeStar.templates && this.options.inflater === MooVeeStar.templates.inflate && !MooVeeStar.templates.check(this.template)){
            var _uinqueTemplateID = String.uniqueID();
            MooVeeStar.templates.register(_uinqueTemplateID, this.template);
            this.template = _uinqueTemplateID;
            this.element = this.options.inflater(this.template, null, true);
          }else {
            // Finally, call the inflater with the passed template
            this.element = this.options.inflater(this.template, null, true);
          }
        }
      }
      if(this.element){
        this.element.set('data-autobind', 'false');
        this.element.set('data-has-view-controller', 'true');
        this.element.store('__view', this);
        this.elements.container = this.element;
      }
      return this;
    },


    // ### View#toElement
    // 
    // Returns the views element. `toElement` gets called by MooTools in most DOM manipulation methods
    // 
    toElement: function(){
      return this.element;
    },


    // ### View#render
    // 
    // Likely overridden and called through `parent()`, this determines the data to bind to the element. Pass a **MooVeeStar.Event**
    // instance which contains a `changed` key, it will only rebind those changed values. Otherwise, it will use the passed argument
    // or, more likely, call `model.toJSON`
    // 
    render: function(objectOrChangeEvent){
      if(this.options.binder){
        var data, isChangeEvent;
        data = objectOrChangeEvent;
        isChangeEvent = !!(objectOrChangeEvent instanceof MooVeeStar.Event && objectOrChangeEvent.changed);
        // If data is an event and there's items changed, then just bind the changed values
        if(isChangeEvent){
          data = {};
          Object.forEach(objectOrChangeEvent.changed, function(v,k){
            data[k] = v.value;
          });
        }
        // Pass the data to the binder. First param is the element, second is the data, and third is an options map
        // containing a boolean to tell the binder we may only want to bind the data defined (not unbind undefined fields)
        this.options.binder(this.element, data || (this.model.toJSON && this.model.toJSON()) || this.model || {}, { onlyDefined:isChangeEvent });        
      }
      return this;
    },


    // ### View#destroy
    // 
    // Destroy the passed element, or the view's `element`. Calls `view.destroy()`
    // for all _attached_ views within the element's DOM.
    // Fires the `View#destroy` event
    // 
    destroy: function(elOrUndefined){
      this._doDomManipulation('destroy', elOrUndefined);
      this._destroyed = true;
      return this;
    },


    // ### View#empty
    // 
    // Empties the passed element, or the view's `element`. Calls `view.destroy()`
    // for all _attached_ views within the element's DOM.
    // Fires the `View#empty` event
    // 
    empty: function(elOrUndefined){
      return this._doDomManipulation('empty', elOrUndefined);
    },


    // ### View#dispose
    // 
    // Disposes of an element, or the view's `element`. This _does not_ affect and
    // attached sub views (like `destroy` and `empty`).
    // Fires the `View#dispose` event
    // 
    dispose: function(elOrUndefined){
      return this._doDomManipulation('dispose', elOrUndefined);
    },

    
    // ### _View#_doDomManipulation_
    // 
    // _Private_. Manipulates the DOM under the element, or passed element. Using the `data-has-view-controller` attribute
    // we can find the stored `__view` to cleanup any views that need to be.
    // If we're emptying or destroying an element we call `destroy` on all elements being removed.
    // Fires the event for the manipulation method (`destroy`, `empty`, `dispose`)
    // 
    _doDomManipulation: function(fn, elOrUndefined){
      var el = typeOf(elOrUndefined) === 'element' && elOrUndefined || this.element;
      fn = fn || 'dispose'; 
      // If we're destroying or emptying an element, then destroy all views underneath.
      // // (dispose shouldn't touch view's elements underneath, except to detach them)
      if(fn === 'destroy' || fn == 'empty')
        this._doNestedViewsCall('destroy', el);
      this.detach(el, fn === 'empty');
      el[fn]();
      this.fireEvent(fn, { view:this, element:el });
      return this;
    },

    
    // ### _View#_doNestedViewsCall_
    // 
    // _Private_. Using the `data-has-view-controller` attribute we can find the stored `__view` to call a method on them
    // 
    _doNestedViewsCall: function(methods, elOrUndefined){
      var views, element;
      element = typeOf(elOrUndefined) === 'element' && elOrUndefined || this.element;
      methods = Array.from(methods);
      views = element.getElements('*[data-has-view-controller]').clean().reverse();
      views.forEach(function(el){
        var controller = el.retrieve('__view');
        methods.forEach(function(method){
          if(controller && typeof(controller[method]) === 'function')
            controller[method]();
        });
      });
    },


    // ### View#attach
    // 
    // Attaches all events from the `element` or passed element and all the descendants within the DOM.
    // `excludeSelf` will only do so for all descendants
    // 
    attach: function(elOrUndefined, excludeSelf){
      return this._doAttachDetach('attach', elOrUndefined, excludeSelf);
    },


    // ### View#detach
    // 
    // Detaches all events from the `element` or passed element and all the descendants within the DOM.
    // `excludeSelf` will only do so for all descendants
    // 
    detach: function(elOrUndefined, excludeSelf){
      return this._doAttachDetach('detach', elOrUndefined, excludeSelf);
    },


    // ### _View#_doAttachDetach_
    // 
    // _Private_. Attaches or detaches its events and all children views as well as rendering
    // 
    _doAttachDetach: function(operation, elOrUndefined, excludeSelf){
      var self, element, methods;
      self = this;
      element = elOrUndefined || self.element;
      operation = (operation || 'attach');
      methods = [operation+'Events']; // `View#attachEvents` or `View#detachEvents`

      // If we're attaching events, call render afterwards
      if(operation === 'attach')
        methods.push('render');

      self._doNestedViewsCall(methods, element);

      if(!excludeSelf){
        methods.forEach(function(method){
          self[method]();
        });
      }
      return this;
    },


    // ### View#attachEvents
    // 
    // Loops over the models events map and attaches the events
    // 
    attachEvents: function(){
      var self;
      self = this;

      // Keep track of attached events && bound functions (for detaching)
      self._attachedEvents = self._attachedEvents || {};
      self._boundEventFns = self._boundEventFns || {};

      Object.each(self.events, function(v, k){
        // Only if we haven't attached this event and it's string value is a method name on this view instance
        if(!self._attachedEvents[k] && typeOf(self[v]) === 'function'){
          var name, attach, nativeName;
          nativeName = k.substr(0, k.indexOf(':') > 0 ? k.indexOf(':') : k.length);

          // If we just passed in a `Element.Event` (with an optional relay) then the target is the view's element, and the event name is the item's key
          //     
          //     'click' // 'this.element:click'
          //     'mousedown:relay([data-action])' // 'this.element:click:relay([data-action])'
          //     
          if((!k.contains(':') || /\:relay\(/gi.test(k)) && (Element.NativeEvents[nativeName] || Element.Events[nativeName])){
            attach = $(self.element);
            name = k;

          // Otherwise, split on ':' where the first item is the attachment, the name is everything else
          //      
          //      'window:scroll:relay(.overflow)'
          //      'MooVeeStar:some-event'
          //      'model:destroy'
          //      'model:change:id'
          //      'collection:model:change'
          // 
          }else{
            attach = k.split(':')[0];
            name = k.replace(attach+':','');
            attach = self._getEventObj(attach) || self;
          }

          // If we found an attachment and it has an `addEvent`, add the bound method name to it and add to `_atachedEvents`
          if(attach && name && attach.addEvent){
            self._boundEventFns[v] = self._boundEventFns[v] || self[v].bind(self);
            attach.addEvent(name, self._boundEventFns[v]);
            self._attachedEvents[k] = { attach:attach, name:name, fn:self._boundEventFns[v] };
          }else{
            throw new Error('[VIEW ERROR] Could not attach event "'+k+'". Something went awry.');
          }
        }
      });
      return self;
    },


    // ### View#detachEvents
    // 
    // Loops over the `_attachedEvents` and removes them from their attached item.
    // This gets invoked automatically if `destroy` or `empty` is called.
    // 
    detachEvents: function(){
      Object.each(this._attachedEvents || {}, function(v){
        v.attach.removeEvent(v.name, v.fn);
      });
      this._attachedEvents = {};
      return this;
    },


    // ### _View#_getEventObj_
    // 
    // _Private_. Taking an attachment string, finds what the appropriate attachment target is
    // 
    _getEventObj: function(name){
      var obj, names;
      if(name === 'this')
        return this;
      if(name === 'window')
        return $(window);
      if(name === 'document')
        return $(document);
      if(name === 'MooVeeStar')
        return MooVeeStar;
      if($(name))
        return $(name);
      if(root[name] && typeOf(root[name].addEvent) === 'function')
        return root[name];

      names = (name||'').replace(/^this\./gi, '').split('.');
      obj = this;
      for(var i = 0, l = names.length; i < l; i++){
        if(typeof(obj[names[i]]) !== 'undefined'){
          obj = obj[names[i]];
        }else{
          throw new Error('[VIEW ERROR] Could not attach event to this["'+name.replace('.','"]["')+'"]. "'+names[i]+'" is undefined.');
        }
      }
      if(obj && typeOf(obj.addEvent) === 'function'){
        return obj;
      }else if(!obj || typeOf(obj.addEvent) !== 'function'){
        throw new Error('[VIEW ERROR] Could not attach event to this['+name.replace('.','][')+'], it does not have an addEvent method.');
      }
      return null;
    }

  });



  // ---
  // ## MooVeeStar.Storage
  //   
  // A _very simple_ local storage class. This can be used as a mixin, to store the current model/collection,
  // or instantiated to store passed objects and listen for events separately
  // 
  MooVeeStar.Storage = new Class({

    Implements: [Events],

    // ### Storage#store
    // 
    // Pass an model/collection/whatever to store. If an `id` parameter is passed it will be stored under that,
    // otherwise if the item has an `getId` method, or `id` property, that will be used.
    // Additionally, if there is no arguments, and `Storage` has been implemented within a Model or Class, it will store the
    // instance.
    // 
    store: function(item, id){
      if(!item && this.toJSON && this.getId)
        item = this;

      if(item && !id)
        id = (item.getId && item.getId()) || (item.id) || null;

      if(item && id){
        try{
          root.localStorage.setItem(id, JSON.encode(item.toJSON && item.toJSON() || item));
          this.fireEvent('store', { item:item });
          return true;
        }catch(e){
          return false;
        }
      }
    },

    // ### Storage#retrieve
    // 
    retrieve: function(id){
      id = id || (this.getId && this.getId()) || null;
      if(id){
        try{
          var item = JSON.decode(root.localStorage.getItem(id));
          this.fireEvent('retrieve', { item:item });
          return item;
        }catch(e){
          return null;
        }
      }
    },


    // ### Storage#eliminate
    // 
    eliminate: function(id){
      id = id || (this.getId && this.getId()) || null;
      root.localStorage.removeItem(id);
      this.fireEvent('eliminate');
      return true;
    }

  });



  // ---
  // ## MooVeeStar.templates
  //   
  // The **MooVeeStar.templates** power the UI using _completely logicless_ templating system relying on 
  // HTML5 mindset and technologies.
  // 
  var mvstpl = MooVeeStar.templates = {

    // The templates registry
    _templates: {},

    // Test if the browser supports HTML5 <template> tags
    supportsTemplate: ('content' in document.createElement('template')),


    // ### _templates::_cleanKey_
    // 
    // _Private_. Cleans a key to ensure odd names are valid
    // 
    _cleanKey: function(key){
      return key.toLowerCase().trim().replace(/\s/g,'');
    },


    // ### _templates::_parseShorthand_
    // 
    // _Private_. Parses the shorthand template style to the full template style
    //      
    //      // <li data-bind="name uuid:data-uuid accent:class privacy:(data-private class)" data-action="choose"></li>
    //      <li data-bind="name uuid accent privacy" data-bind-uuid="data-uuid" data-bind-accent="class" data-bind-privacy="data-private class" data-action="choose"></li>
    //
    _parseShorthand: function(elementOrFragment){
      var elements, dataBind;
      elements = elementOrFragment.querySelectorAll('[data-bind]');
      if(elementOrFragment.getAttribute && elementOrFragment.getAttribute('data-bind'))
        elements.unshift(elementOrFragment);


      Array.from(elements).forEach(function(el){
        var dataBind = el.getAttribute('data-bind');
        if(dataBind && dataBind.contains(':')){
          [
            /\s*([^\s]+?)(?!\\):\(([^\)]+)\)/,  // Capture bindings with parens
            /\s*([^\s]+?)(?!\\):([^\s]+)/       // Capture bdings without parens
          ].each(function(regex){
            var match;
            while((match = regex.exec(dataBind))){
              dataBind = dataBind.replace(match[0], ' '+match[1]);
              el.setAttribute('data-bind-'+match[1], match[2]);
            }
          });
          el.setAttribute('data-bind', dataBind.trim());
        }
      });
      return elementOrFragment;
    },


    // ### templates::register
    // 
    // Register a template to an html string and create a dom from it
    // Overloaded to accept a register a script as second param
    // 
    register: function(key, htmlOrElementOrFunction){
      var html, type, tag, parentTag, fragment;
      key = mvstpl._cleanKey(key);
      type = typeOf(htmlOrElementOrFunction);
      tag = type === 'element' && htmlOrElementOrFunction.get('tag') || null;

      if(type === 'function')
        return mvstpl.registerScript(key, htmlOrElementOrFunction);

      if(type !== 'element' && (type !== 'string' || !htmlOrElementOrFunction.length))
        throw new Error('A registered script must pass an element or an html string. (key:"'+key+'")');

      mvstpl._templates[key] = mvstpl._templates[key] || {};

      // If we support shadowDom templates, then use it
      if(false && mvstpl.supportsTemplate && tag === 'template' && htmlOrElementOrFunction.content){
        fragment = htmlOrElementOrFunction.content;
      }else{
        if(type === 'element'){
          if(tag === 'script' || tag === 'template'){
            html = htmlOrElementOrFunction.get(tag === 'script' ? 'text' : 'html');
          }else{
            parentTag = tag === 'tr' ? 'tbody' : (/^t(d|h)/.test(tag) ? 'tr' : 'tpl');
            html = new Element(parentTag).grab(htmlOrElementOrFunction).get('html');
          }
        }else{
          html = htmlOrElementOrFunction;
        }

        fragment = document.createDocumentFragment();
        html = html.replace(/<\!\-\-.*?\-\->/g, '').trim().replace(/\n/g,' ').replace(/\s+/g,' ');
        parentTag = parentTag || (html.indexOf('<tr') === 0 && 'tbody') || (/^\<t(d|h)/i.test(html) && 'tr') || 'tpl';
        new Element(parentTag+'[html="'+html+'"]').getChildren().forEach(function(el){
         fragment.appendChild(el);
        });
      }
      mvstpl._templates[key].fragment = mvstpl._parseShorthand(fragment);
      /*
        // If it's an element, use it's inner HTML (ior text content if a `<script>`)
        if(type === 'element'){
          if(htmlOrElementOrFunction.get('tag') === 'script')
            html = htmlOrElementOrFunction.get('text');
          else if(htmlOrElementOrFunction.get('tag') === 'template')
            html = htmlOrElementOrFunction.get('html');
          else{
            parentTag = htmlOrElementOrFunction.get('tag') === 'tr' ? 'tbody' : (/^t(d|h)/.test(htmlOrElementOrFunction.get('tag')) ? 'tr' : 'tpl');
            html = new Element(pNode).grab(htmlOrElementOrFunction).get('html');
          }
        }else if(type === 'string'){
          html = htmlOrElementOrFunction;
        }else{
          throw new Error('A registered script must pass an element or a string. (key:"'+key+'")');
        }

        html = html.replace(/<\!\-\-.*?\-\->/g, '').trim().replace(/\n/g,' ').replace(/\s+/g,' ');
        parentTag = parentTag || (html.indexOf('<tr') === 0 && 'tbody') || (/^\<t(d|h)/i.test(html) && 'tr') || 'tpl';
        mvstpl._templates[key].fragment = mvstpl._parseShorthand(new Element(parentTag+'[html="'+html+'"]'));
        mvstpl._templates[key].markup = mvstpl._templates[key].fragment.innerHTML;
      }
      */
    },


    // ### templates::registerScript
    // 
    // Register a script to be called when a template is bind
    // 
    registerScript: function(key, fn){
      key = mvstpl._cleanKey(key);
      mvstpl._templates[key] = mvstpl._templates[key] || {};
      mvstpl._templates[key].script = fn;
    },


    // ### templates::getScript
    // 
    // Return the script associated with a key
    // 
    getScript: function(key){
      key = mvstpl._cleanKey(key);
      if(mvstpl._templates[key] && mvstpl._templates[key].script)
        return mvstpl._templates[key].script;
      else
        throw new Error('Ain\'t no script for the template called '+key+' ('+typeOf(mvstpl._templates[key].script)+')');
    },


    // ### templates::check
    // 
    // check for the existance of a template key
    // 
    check: function(key){
      return !!mvstpl._templates[mvstpl._cleanKey(key)];
    },


    // ### templates::get
    // 
    // Return the dom of a template
    // 
    get: function(key){
      var data, markupEl, els, childrenTemplates;
      key = mvstpl._cleanKey(key);
      data = mvstpl._templates[key];
      if(data && data.fragment){
        var node = data.fragment.cloneNode(true);
        node._templateid = key;
        return node;
      }else{
        throw new Error('Ain\'t no template called '+key+' ('+typeOf(mvstpl._templates[key])+')');
      }
      return null;
    },


    // ### templates::inflateOnce
    // 
    // Same as inflate, but removes bindings after inflating.
    // Useful when an element only needs to be inflated once without a desire to rebind
    // (or accidentally unbind elements)
    // 
    inflateOnce: function(dom, scriptData, skipInit){
      var r = mvstpl.inflate(dom, scriptData, skipInit);
      [(r || [])].flatten().each(function(el){
        el.removeProperty('data-bind');
        el.getElements('[data-bind]').removeProperty('data-bind');
      });
      return r;
    },


    // ### templates::inflate
    //     
    // Inflate a template.
    // 
    inflate: function(dom, scriptData, skipInit){
      if(typeOf(dom) === 'string'){
        // Assume a key was passed in
        dom = mvstpl.get(dom);
      }
      if(dom){
        var markups, children, script;
        // Check for nested templates by way of a [data-template] attribute
        Array.from(dom.querySelectorAll('[data-template], [data-templateid], [template]')).each(function(child){
          var tpls, className;
          // If there's a class name specified on the <markup> tag, add it to the children
          className = child.className || null;
          // If we passed in skipInit, use it, otherwise set to true assuming this pass is initializing final markup
          tpls = mvstpl.inflate(child.get('data-template') || child.get('data-templateid') || child.get('template'), scriptData, skipInit != null ? skipInit : true);
          tpls = typeOf(tpls) !== 'array' ? [tpls] : tpls;
          tpls.reverse().each(function(tplChild){
            tplChild.inject(child, 'after');
            className && tplChild.addClass(className);
          });    
          child.destroy();
        });
        children = [];
        Array.from(dom.childNodes).each(function(child){
          if(child.nodeType === 1){
            child.setAttribute('data-tpl', (child.getAttribute('data-tpl') || '').split(' ').include(dom._templateid).join(' ').clean());
            children.push(child);
          }
        });
        children = children.length === 1 ? children[0] : children;
        !skipInit && mvstpl.init(children, scriptData);
        return children;
      }
      return null;
    },


    // ### templates::inflateSurround
    // 
    // Inflate a template and pass it's elements to another.
    // Useful when wanting to inflate a template inside another
    // generic template (like a dialog/popup/etc).
    // 
    inflateSurround: function(template, surround, scriptData, skipInit){
      var tpl, surroundData;
      scriptData = scriptData || {};
      tpl = typeOf(template) === 'element' || typeOf(template) === 'elements'  || typeOf(template) === 'array' ? template : mvstpl.inflate(template, scriptData, skipInit);
      if(tpl){
        if(surround && mvstpl.check(surround)){
          surroundData = (scriptData || {})[surround] || (scriptData || {}).surround || {};
          surroundData.els = tpl;
          return mvstpl.inflate(surround, surroundData);
        }else{
          throw new Error('Could not find the surround template: '+surround);
        }
      }
    },


    // ### templates::init
    // 
    // Initialize a template and bind to it's data.
    // Different than bind in that it will check for a registered script
    // and call that (bind simply binds the data to data-bind fields)
    // 
    init: function(els, data, options){
      (!els ? [] : (typeOf(els) === 'element' ? [els] : els)).each(function(el){
        if(el.get('data-tpl')){
          var tpls = el.get('data-tpl').split(' ');
          tpls.each(function(tpl){
            if(mvstpl._templates[tpl].script)
              mvstpl._templates[tpl].script(el, (data && (data[tpl] || data[tpl.replace('tpl:','')])) || data, options);
            else
              mvstpl.bind(el, data, options);
          });
        }else{
          mvstpl.bind(el, data, options);
        }
      });
    },


    // ### templates::bind
    // 
    // Binds all elements under a template to the passed `data` JSON object. This *does not* call a registered script.
    // It will stop binding elements once it reaches an element in the DOM with a `data-autobind` attribute set to false
    // (which **MooVeeStar.View**s do automatically -- so each view is in control of it's binding)
    // 
    //  - If a single empty element is passed, and data is a string value, then it will be used
    //    as the value for that element
    //  - If `options.onlyDefined === true` then no `data-bind` fields will be unbound, only those
    //    `data-bind` keys in the data map will be bound
    //
    bind: function(els, data, options){
      data = data || {};
      options = options || {};

      // If `els` is a single empty element w/ no `[data-bind]` set _and_ `data` is a string, set it to be the value of the el
      if(typeOf(data) === 'string' && typeOf(els) === 'element' && els.getChildren().length === 0 && !els.get('data-bind')){
        els.set('data-bind','value');
        data = { value:data };
      }

      // Get all children to be bind that are not inner binds
      Array.from(els).each(function(el){
        var toBindEls, innerBindsElements;
        toBindEls = el.getElements('[data-bind]:not([data-tpl])');
        if(el.get('data-bind'))
          toBindEls.unshift(el);

        if(toBindEls.length){
          // Exclude any els that are in their own data-tpl (which will follow)
          innerBindsElements = el.getElements('*[data-tpl] *[data-bind]');
          toBindEls = toBindEls.filter(function(maybeBind){ return !innerBindsElements.contains(maybeBind); });
          toBindEls.each(function(child){
            var bindings;
            // Get the bindings this elements wants
            bindings = child.get('data-bind').replace(/\s+/,' ').trim().split(' ') || [];
            bindings.each(function(binding){
              var fields, value;
              value = data[binding];
              // If the value is undefined, then return if we want to ignore it (via `onlyDefined`)
              // or set to null to unbind this binding key
              if(value === undefined){
                if(options.onlyDefined === true)
                  return;
                else
                  value = null;
              }
              // Get the fields for this binding
              fields = child.get('data-bind-'+binding) ? child.get('data-bind-'+binding).split(' ') : ['default'];
              fields.each(function bindField(field){
                var val = value; // Reassign the value in case we change it below
                // If it's a style binding
                if(field.indexOf('style:') === 0){
                  if(val && !String(val).contains('url(') && (field.contains('background-image') && (String(val) !== 'none')) || String(val).indexOf('http') === 0)
                    val = 'url('+val+')';
                  child.setStyle(field.replace('style:',''), val);

                // tpl:[array] will inflate the specified template for each item
                }else if(field.indexOf('tpl:') === 0 && mvstpl.check(field.replace('tpl:',''))){
                  child.empty();
                  if(typeOf(val) === 'array'){
                    var frag = document.createDocumentFragment();
                    val.each(function(item){
                      // Inflate each template passing in item and have them init (force false skipInit)
                      // Then, remove data-tpl b/c we just inflated it (and, presumably, it's data is
                      // already set so we don't want to set it again below).
                      var tpl = mvstpl.inflate(field.replace('tpl:',''), item, false);
                      tpl.removeProperty('data-tpl').getElements('*[data-tpl]').removeProperty('data-tpl');
                      frag.appendChild(tpl);
                    });
                    child.empty().appendChild(frag);
                  }else if(val){
                    child.grab(mvstpl.inflate(field.replace('tpl:',''), val));
                  }

                // TODO: Revert previously bound classes?
                }else if(field === 'class' || (binding === 'class' && field === 'default')){
                  val && child.addClass(val);

                }else if((field === 'html' || field === 'default') && (/^element/.test(typeOf(val)) || val instanceof DocumentFragment)) {
                  child.empty();
                  if(val instanceof DocumentFragment){
                    child.appendChild(val);
                  }else{
                    Array.from(val).forEach(function(val){
                      child.grab(val);
                    });
                  }
                   
                }else if(field === 'default'){
                  field = /input|textarea|select/.test(child.get('tag')) ? 'value' : 'html';
                  child.set(field, val !== null ? val : '');
                }else if(val !== null){
                  child.set(field, val);
                }else{
                  // IE 11 puts a 'null' if 'html' is used with removeProperty, so let's use `set`
                  if(field === 'html')
                    child.set(field, value);
                  else
                    child.removeProperty(field);
                }
              });
            });
          });
        }

        // Now loop over children w/ "data-tpl" and init them, unless they have an "data-autobind" set to "false"
        // (as in, they have a separate View Controller rendering their data)
        var toInitEls, innerInits;
        toInitEls = el.getElements('*[data-tpl]');
        if(toInitEls.length){
          innerInits = el.getElements('*[data-tpl] *[data-tpl]');
          toInitEls = toInitEls.filter(function(maybeInitEl){
            // If the el is inside another [data-tpl] don't init now (it will recursively next time)
            if(innerInits.contains(maybeInitEl))
              return false;

            // If we passed in a specific map in data for this, then init
            var tplKey = maybeInitEl.get('data-tpl');
            if(data && (data[tplKey] || data[tplKey.replace('tpl:','')]))
              return true;

            // Only init cascadingly if autobind is not "false" (as in, a separate controller handles it's own rendering)
            return maybeInitEl.get('data-autobind') !== 'false';

          }); 
          toInitEls.each(function(tplEl){
            var tplKey = tplEl.get('data-tpl');
            mvstpl.init(tplEl, (data && (data[tplKey] || data[tplKey.replace('tpl:','')])) || data);
          });
        }
      });
    },


    // ### templates::scrape
    // 
    // Scrape the dom and register any templates as `<template id="xxx">`, `<template data-id="xxx">` or `<script type="text/x-tpl" data-id="xxx">`
    scrape: function(htmlOrEl){
      var el = document.html;
      if(typeOf(htmlOrEl) === 'string')
        el = new Element('div', { html:htmlOrEl });
      if(typeOf(htmlOrEl) === 'element')
        el = htmlOrEl;
      el.getElements('template[id], template[data-id], script[type="text/x-tpl"]').each(function(tpl){
        mvstpl.register(tpl.get('id') || tpl.get('data-id'), tpl);

        tpl.destroy();
      });
    },

    // ### templates::load
    // 
    // Give it the path to templates file/text and it will scrape the results
    load: function(path, callback){
      return new Request({ url:path, evalScripts:false, evalResponse:false, onSuccess: function(){
        mvstpl.scrape(this.response.text);
        callback && callback();
      }}).get();
    }
  };

  // ---

  // Create the "markup" element **MooVeeStar.tempaltes* uses.
  // If html5 shiv, then let's shiv in <markup> (<=IE8 support)
  if(window && window.html5 && window.html5.supportsUnknownElements === false){
    window.html5.elements += ' tpl template';
    html5.shivDocument(document);
  }
  document.createElement('tpl');
  document.createElement('template');

  // Scrape the page on initialization
  MooVeeStar.templates.scrape();

})(this);