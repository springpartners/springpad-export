(function(window){

  'use strict';

  var globals, BlocksView, BlocksCollection, Block, BlockView;

  // Global namespace to collect vars used across instances
  globals = {};

  // Utils/helpers
  Element.implement({
    getSelfOrParent: function(selector, parent){
      // If we passed an element to check for, then add add an id, if there isn't one,
      // and set the selector to find it.
      if(typeOf(selector) === 'element'){
        var element, newId;
        element = selector;
        if(!element.get('id')){
          newId = String.uniqueID();
          element.set('id', newId);
        }
        selector = '#'+element.get('id');
      }

      parent = parent || document.html || document.getElementsByTagName('html')[0];
      var el, els, found;
      els = parent.getElements(selector);
      el = this;
      found = null;
      do{
        if(els.contains(el))
          found = el;
      }while((el = el.getParent()) && el != parent && found === null);
      // If we set a new id on the element, remove it
      if(element && newId)
        element.removeProperty('id');
      return found;
    },
    removeClassesWithPrefix: function(prefix){
      this.set('class', (this.get('class') || '').replace(new RegExp('(?:^|\\s)'+prefix+'[^\\s$]+', 'ig'), ' '));
      return this;
    },
    removeClassesWithPostfix: function(postfix){
      this.set('class', (this.get('class') || '').replace(new RegExp('(?:^|\\s)([^^\\s]+)'+postfix+'(?:\\s+|$)', 'ig'), ' '));
      return this;
    },
    changeClassWithPrefix: function(prefix, value){
      return this.removeClassesWithPrefix(prefix).addClass(prefix+value);
    },
  });

  Array.implement({
    eachToFragment: function(fn){
      var frag = document.createDocumentFragment();
      Array.each(this || [], function(item, i){
        var el = fn && fn.apply(null, arguments) || null;
        if(typeOf(el) === 'element')
          frag.appendChild(el);
      });
      return frag;
    }
  });

  String.implement({
    parseQueryString:function(d,a){
      if(d==null){d=true;
      }if(a==null){a=true;}var c=this.split(/[&;]/),b={};if(!c.length){return b;}c.each(function(i){var e=i.indexOf("=")+1,g=e?i.substr(e):"",f=e?i.substr(0,e-1).match(/([^\]\[]+|(\B)(?=\]))/g):[i],h=b;
      if(!f){return;}if(a){g=decodeURIComponent(g);}f.each(function(k,j){if(d){k=decodeURIComponent(k);}var l=h[k];if(j<f.length-1){h=h[k]=l||{};}else{if(typeOf(l)=="array"){l.push(g);
      }else{h[k]=l!=null?[l,g]:g;}}});});return b;
    },
    cleanQueryString:function(a){
      return this.split("&").filter(function(e){
        var b=e.indexOf("="),c=b<0?"":e.substr(0,b),d=e.substr(b+1);
        return a?a.call(null,c,d):(d||d===0);
      }).join("&");
    }
  });

  Number.implement({
    /**
     * Pads a number with zeros
     *
     * @return {String}
     */
    pad: function(length, toPadWith){
      return (new Array(length+1).join(toPadWith || '0')+this).slice(String(this).length);
    }
  });

  Date.implement({
    setFromIso: function(str){
      if(typeOf(Date.parse(str)) === 'number'){
        this.setTime(Date.parse(str));
      }else{
        // IE9 doesn't parse ISO correctly, so make it look like a differently formatted date
        str = str.replace(/^(\d{4})\-(\d{2})\-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\+\d+)?)/i, '$1/$2/$3 $4:$5:$6');
        this.setTime(Date.parse(str));
      }
      return this;
    },
    format: function(showTime){
      var formatted, hour;
      formatted = (this.getMonth()+1).pad(2)+'/'+this.getDate().pad(2)+'/'+this.getFullYear();
      if(showTime !== false){
        hour = this.getHours() % 12;
        formatted += ' at '+(hour === 0 ? '12':hour)+':'+this.getMinutes().pad(2)+(this.getHours() >= 12 ? 'pm':'am');
      }
      return formatted;
    }
  });

  // Mootools.More/Asset
  var Asset={javascript:function(d,b){if(!b){b={};}var a=new Element("script",{src:d,type:"text/javascript"}),e=b.document||document,c=b.onload||b.onLoad;
  delete b.onload;delete b.onLoad;delete b.document;if(c){if(typeof a.onreadystatechange!="undefined"){a.addEvent("readystatechange",function(){if(["loaded","complete"].contains(this.readyState)){c.call(this);
  }});}else{a.addEvent("load",c);}}return a.set(b).inject(e.head);},css:function(d,a){if(!a){a={};}var b=new Element("link",{rel:"stylesheet",media:"screen",type:"text/css",href:d});
  var c=a.onload||a.onLoad,e=a.document||document;delete a.onload;delete a.onLoad;delete a.document;if(c){b.addEvent("load",c);}return b.set(a).inject(e.head);
  },image:function(c,b){if(!b){b={};}var d=new Image(),a=document.id(d)||new Element("img");["load","abort","error"].each(function(e){var g="on"+e,f="on"+e.capitalize(),h=b[g]||b[f]||function(){};
  delete b[f];delete b[g];d[g]=function(){if(!d){return;}if(!a.parentNode){a.width=d.width;a.height=d.height;}d=d.onload=d.onabort=d.onerror=null;h.delay(1,a,a);
  a.fireEvent(e,a,1);};});d.src=a.src=c;if(d&&d.complete){d.onload.delay(1);}return a.set(b);},images:function(c,b){c=Array.from(c);var d=function(){},a=0;
  b=Object.merge({onComplete:d,onProgress:d,onError:d,properties:{}},b);return new Elements(c.map(function(f,e){return Asset.image(f,Object.append(b.properties,{onload:function(){a++;
  b.onProgress.call(this,a,e,f);if(a==c.length){b.onComplete();}},onerror:function(){a++;b.onError.call(this,a,e,f);if(a==c.length){b.onComplete();}}}));
  }));}};


  /**
   * Describes the basic block model.
   *
   * @class
   */
  Block = new Class({
    Extends: MooVeeStar.Model,
    idProperty: 'uuid',

    // For viewer presentation, let's only set image and url if they are separate, otherwise, choose image.
    properties: {
      url: {
        get: function(){
          if(this.get('url', true) !== this.get('image', true))
            return this.get('url', true);
          return null;
        }
      }
    },

    /**
     * Returns an object with a formatted label and value field for use in autorendering
     *
     * @return {Object|Null}
     */
    getFormattedMap: function(key, value){
      var self, frag, label, value;
      self = this;
      if(!/^(_|(uuid|modified|name|type|subtitle|complete|liked|public|rating)$)/.test(key)){
        value = value || this.get(key);

        if(value != null && value.length !== 0){
          label = key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').capitalize();
          if(label === 'Ingredients' || label === 'Directions' || label === 'Plot' || label === 'Bio')
            value = value.replace(/\n+/g, '<br>');

          if(label === 'Tags')
            value = Array.from(value||[]).eachToFragment(function(item){ return new Element('span[text="'+item+'"]'); });

          if(label === 'Notebooks')
            value = Array.from(value||[]).map(function(item){ return globals.collection.findFirst(item).get('name'); });

          if(label === 'Items')
            value = Array.from(value||[]).eachToFragment(function(item){ return MooVeeStar.templates.inflateOnce('block-data-checklist-item', item); });

          if(label === 'Attachments'){
            frag = Array.from(value||[]).eachToFragment(function(item){ return MooVeeStar.templates.inflateOnce('block-data-attachment-item', self.getFormattedMap('url', item.url)); });
            value = new Element('ul');
            value.appendChild(frag);
          }

          if(label === 'Comments'){
            frag = Array.from(value||[]).eachToFragment(function(item){
              item.date = new Date().setFromIso(item.date).format(false);
              return MooVeeStar.templates.inflateOnce('block-data-comment-item', item);
            });
            value = new Element('ul');
            value.appendChild(frag);
          }

          if(/^\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}/.test(String(value)))
            value = new Date().setFromIso(value).format();

          if(/^http[^\s]+$/.test(value))
            value = '<a href="'+value+'" target="_blank">'+value+'</a>';

          // Local File
          if(/^attachments\/[^\s]+$/.test(value)){
            label = 'Local Download';
            value = '<a href="./'+value+'" target="_blank">'+value.replace('attachments/', '')+'</a>';
          }

          if(typeOf(value) === 'array')
            value = value.join(', ');

          if(typeOf(value) === 'object' && !value.nodeType){
            if(value.text){
              value = value.text;
            }else{
              frag = document.createDocumentFragment();
              Object.forEach(value, function(v,k){
                frag.appendChild(MooVeeStar.templates.inflateOnce('block-data-row', self.getFormattedMap(k,v)))
              });
              value = new Element('table');
              value.appendChild(frag);
            }
          }

          return { label:label, value:value };
        }
      }
      return null;
    },

    /**
     * Returns the raw JSON data of a block, adding two additional
     * presentational "_" prefixed properties for templates
     */
    toJSON: function(){
      var data = this.parent();
      data['_markup-name'] = data.name;
      if(data.type === 'Task')
        data['_markup-name'] = '<input type="checkbox" '+(data.complete ? 'checked':'')+' disabled /> '+ data['_markup-name'];
      data['_type-classname'] = '-'+data.type.replace(/[\s-_]*/g, '').toLowerCase();
      return data;
    }
  });


  /**
   * The block "fpv"
   *
   * @class
   */
  BlockView = new Class({
    Extends: MooVeeStar.View,
    template:'block-fpv',

    events: {
      'click':'onClick'
    },

    /**
     * Initializes the view. Also checks to see if our model has not a
     * "_loaded" property, then load the corresponding javascript file
     */
    initialize: function(){
      var self = this;
      self.parent.apply(this, arguments);
      if(!self.model.get('_loaded')){
        Asset.javascript('./viewer_data/blocks/'+self.model.get('uuid')+'.js', {
          onLoad: function(){
            self.model.set(window.block);
            self.model.set('_loaded', true);
            window.block = null;;
            self.render();
          }
        });
      }
    },

    /**
     * Renders the
     *
     * @return {[type]} [description]
     */
    render: function(){
      var self, el, data, frag, primaryFields, finalFields;
      self = this;
      self.parent();

      frag = document.createDocumentFragment();

      primaryFields = ['description', 'url', 'items'];
      finalFields = ['attachments', 'tags', 'notebooks', 'created', 'comments'];

      primaryFields.forEach(function(k){
        var obj = self.model.getFormattedMap(k);
        if(obj)
          frag.appendChild(MooVeeStar.templates.inflateOnce('block-data-row', obj));
      });

      Object.forEach(self.model.toJSON(), function(v, k){
        if(!primaryFields.contains(k) && !finalFields.contains(k) && k !== 'comments'){
          var obj = self.model.getFormattedMap(k);
          if(obj)
            frag.appendChild(MooVeeStar.templates.inflateOnce('block-data-row', obj));
        }
      });

      finalFields.forEach(function(k){
        var obj = self.model.getFormattedMap(k);
        if(obj)
          frag.appendChild(MooVeeStar.templates.inflateOnce('block-data-row', obj));
      });

      this.element.changeClassWithPrefix('-liked-', !!this.model.get('liked'));
      this.element.changeClassWithPrefix('-private-', !this.model.get('public'));
      this.element.changeClassWithPrefix('-rating-', !!this.model.get('rating'));
      this.element.changeClassWithPrefix('-complete-', !!this.model.get('complete'));

      self.empty(el = self.element.getElement('.block-data'));
      el.appendChild(frag);
      document.body.addClass('-noscroll');
    },

    onClick: function(e){
      if(e.target.getSelfOrParent(this.element.getFirst())){
        var target = e.target.getSelfOrParent('[data-on-click]');
        return target && this[target.get('data-on-click')] && this[target.get('data-on-click')](e, target);
      }
      this.destroy();
    },

    destroy: function(){
      document.body.removeClass('-noscroll');
      this.parent();
    }

  });

  /**
   * The blocks collection
   *
   * @class
   */
  BlocksCollection = new Class({
    Extends: MooVeeStar.Collection,
    modelClass: Block
  });

  /**
   * The blocks index/list view
   *
   * @class
   */
  BlocksView = new Class({
    Extends: MooVeeStar.View,
    template:'app-view',
    options: {
      'page-size': 100,
      'autorender': false
    },

    events: {
      'model:change:filter':'render',
      'model:change:page':'render',
      'collection:add':'onCollectionAdd',
      'change:relay([data-on-change])':'onDataChange',
      'keydown:relay([data-on-enter])':'onDataEnter',
      'click:relay([data-on-click])':'onDataClick'
    },

    initialize: function(collection, blocks){
      this.collection = collection;
      this.parent(new MooVeeStar.Model({ page:0 }));
      // A map of filtered items to items. Used for paging
      this._cachedLists = {};
      this.elements.list = this.element.getElement('.block-list');
      this.elements.filters = {
        notebook: this.element.getElement('select[data-on-change][name="notebook"]'),
        type: this.element.getElement('select[data-on-change][name="type"]'),
        tag: this.element.getElement('select[data-on-change][name="tag"]'),
        text: this.element.getElement('input[data-on-enter][name="text"]')
      };
      this.collection.add(blocks);
      this.setFilter(true).render();
    },

    renderFilters: function(){
      var self = this;
      ['tag', 'type', 'notebook'].forEach(function(filter){
        var frag = (self.model.get(filter+'s') || []).eachToFragment(function(item, i){
          return new Element('option[value="'+(i > 0 ? (item && item.get && item.get('uuid') || item || '') : '')+'"][text="'+(item && item.get && item.get('name') || item || '')+'"]');
        });
        self.empty(self.elements.filters[filter]);
        self.elements.filters[filter].appendChild(frag);
      });
    },

    render: function(){
      var i, frag, filters, data, item, items, page, pageSize;

      data = this.model.toJSON();
      data.filter = data.filter || '';
      filters = (data.filter).parseQueryString();

      // If we don't have a cached list for this filterset, create one.
      if(this._cachedLists[data.filter] == null){
        items = [];
        this.collection.getAll().forEach(function(item){
          if(
            (item.get('type') !== 'Notebook')
            && (!filters.type || item.get('type') === filters.type)
            && (!filters.tag || (item.get('tags') || []).contains(filters.tag))
            && (!filters.text || (item.get('name') || '').toLowerCase().contains(filters.text.toLowerCase()))
            && (!filters.notebook || (item.get('notebooks') || []).contains(filters.notebook))
            ){
            items.push(item);
          }
        });
        this._cachedLists[data.filter] = items;
      }

      // Okay, let's figure out what to display based on pages
      items = this._cachedLists[data.filter];
      page = this.model.get('page');
      pageSize = this.options['page-size'];

      frag = document.createDocumentFragment();
      for(i = (page*pageSize); i < ((page+1)*pageSize); i++){
        item = this._cachedLists[data.filter][i];
        if(item){
          var el = MooVeeStar.templates.inflateOnce('block-list-item', item.toJSON());
          el.changeClassWithPrefix('-liked-', !!item.get('liked'));
          el.changeClassWithPrefix('-private-', !item.get('public'));
          el.changeClassWithPrefix('-rating-', !!item.get('rating'));
          el.changeClassWithPrefix('-complete-', !!item.get('complete'));
          frag.appendChild(el);
        }
      }

      // Let's derive our filter text and page selector
      data.pages = [];
      data['total-pages'] = Math.ceil(items.length / pageSize);
      for(i = 0; i < data['total-pages']; i++)
        data.pages.push({ value:i, label:i+1 });      

      data['filter-text'] = 'Showing ';
      if(data.pages.length < 2){
        data['filter-text'] += 'all '+items.length+' ';
      }else{
        var to = ((page+1)*pageSize);
        to = to > items.length ? items.length : to;
        data['filter-text'] += ((page*pageSize)+1)+' to '+to+' of '+items.length+' ';
      }
      data['filter-text'] += (filters.type ? filters.type.toLowerCase()+'s':'items');
      if(filters.notebook)
        data['filter-text'] += ' in the "'+this.collection.findFirst(filters.notebook).get('name')+'" notebook';
      if(filters.tag)
        data['filter-text'] += ' tagged with "'+filters.tag+'"';
      if(filters.text)
        data['filter-text'] += (filters.tag ? ' and':'')+' matching "'+filters.text+'"';
      data['filter-text'] += '.';

      // Finally, bind data and adjust classnames before attaching our fragment
      this.parent(data);
      this.element.getElements('select[data-bind="pages"]').set('value', page.toString());
      this.element.changeClassWithPrefix('-filters-', !!(filters.notebook || filters.type || filters.tag || filters.text));
      this.element.changeClassWithPrefix('-pages-', data.pages.length > 1);
      this.element.changeClassWithPrefix('-previous-page-', page > 0);
      this.element.changeClassWithPrefix('-next-page-', page !== data.pages.length-1);
      this.empty(this.elements.list);
      this.elements.list.appendChild(frag);
    },

    previousPage: function(e){
      this.model.set('page', this.model.get('page')-1);
    },

    nextPage: function(e){
      this.model.set('page', this.model.get('page')+1);
    },

    selectPage: function(e, target){
      this.model.set('page', parseInt(target.get('value'), 10));
    },

    setFilter: function(silent){
      var filters = {};
      Object.forEach(this.elements.filters, function(el, k){
        filters[k] = el.get('value').trim() || '';
      })
      this.model.set({ filter: Object.toQueryString(filters), page:0 }, { silent: silent === true });
      return this;
    },

    clearFilters: function(){
      Object.forEach(this.elements.filters, function(el, k){
        if(el.get('tag') === 'select')
          el.selectedIndex = 0;
        else
          el.set('value', '');
      });
      this.model.set({ filter:'', page:0 });
      return this;
    },

    showBlock: function(){
      var el;
      if(arguments[1] && typeOf(arguments[1]) === 'element'){
        el = arguments[1];
      }
      if(el && el.get('data-uuid')){
        document.body.grab($(new BlockView(this.collection.findFirst(el.get('data-uuid')))));
      }
    },

    onCollectionAdd: function(e){
      var self, tags, types, notebooks;
      self = this;
      notebooks = [];
      tags = [];
      types = [];
      (e.models || []).forEach(function(model){
        if(model.get('type') === 'Notebook'){
          notebooks.include(model);
        }else{
          tags.combine(Array.from(model.get('tags') || []));
          if(model.get('type') && !types.contains(model.get('type')))
            types.include(model.get('type'));
          if(!(model.get('notebooks')||[]).length)
            model.set('notebooks', ['__unfiled']);
        }
      });
      if(notebooks.length){
        notebooks.sort(function(a,b){ return (a.get('name')||'').toLowerCase().localeCompare((b.get('name')||'').toLowerCase()); });
        var unfiled = new Block({ name:'Unfiled', type:'Notebook', uuid:'__unfiled'});
        self.collection.add(unfiled, { silent:true });
        notebooks.unshift(unfiled);
      }
      notebooks.unshift('All');

      tags.sort(function(a,b){ return (a||'').toLowerCase().localeCompare((b||'').toLowerCase()); });
      tags.unshift('All');

      types.sort(function(a,b){ return (a||'').toLowerCase().localeCompare((b||'').toLowerCase()); });
      types.unshift('All');

      self.model.set({ tags:tags, types:types, notebooks:notebooks });
      self.renderFilters();
    },

    onDataClick: function(e, target){
      this[target.get('data-on-click')] && this[target.get('data-on-click')](e, target);
    },

    onDataChange: function(e, target){
      this[target.get('data-on-change')] && this[target.get('data-on-change')](e, target);
    },

    onDataEnter: function(e, target){
      if(e.key === 'enter')
        this[target.get('data-on-enter')] && this[target.get('data-on-enter')](e, target);
    }

  });

  Asset.javascript('./viewer_data/blocks.js', {
    onLoad: function(){
      globals.collection = new BlocksCollection();
      document.body.grab(new BlocksView(globals.collection, window.blocksIndex));
      document.body.removeClass('-loading');
    }
  });

})(window);
