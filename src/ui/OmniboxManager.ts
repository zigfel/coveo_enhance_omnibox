import {
  Component,
  ComponentOptions,
  IComponentBindings,
  $$,
  Initialization,
  Facet,
  Dom,
  get,
  Searchbox,
  executeQuery,
  QueryEvents,
  INewQueryEventArgs
} from 'coveo-search-ui';

import $ = require("jquery");
import axios from 'axios'

declare const require: (svgPath: string) => string;
const SearchSVGIcon = require('./search.svg');
const LocationSVGIcon = require('./location-pin.svg');
var manuallyExpanded = false;

export interface IOmniboxManagerOptions {
  searchboxContainer: string;
}
  
export class OmniboxManager extends Component {
  static ID = 'OmniboxManager';
  
  /**
  * The options for the OmniboxManager.
  * @componentOptions
  */
  static options: IOmniboxManagerOptions = {
  
    /**
    * Whether to reset the facets when q is cleared.
    */
     searchboxContainer: ComponentOptions.buildStringOption({
       defaultValue: ''
     })
  };
  
  constructor(public element: HTMLElement, public options: IOmniboxManagerOptions,
              public bindings: IComponentBindings) {
    super(element, OmniboxManager.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, OmniboxManager,
                                                         options);
    
      this.AddOmniboxEventHandler()
      this.AddOmniboxBeforeRedirectEventHandler()
      this.bind.onRootElement(QueryEvents.newQuery, (args:INewQueryEventArgs) => this.NewQueryEventHandler(args));
      
  }
  
  
 public getData()  {

  axios({
    method: 'post',
    url: 'https://www.post.ch/api/LocationsAutocomplete/AutocompleteLocation?sc_site=post-portal&sc_lang=en',
    data: {
      topic:'1',
      PreselectText:'Geneve',
      from_directentry:'True', 
      lang:'en',
      service:'places'
    }
  }).then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });
}
private AddOmniboxBeforeRedirectEventHandler() {
  
  var searchBox = document.querySelector('div[data-omnibox-expander="true"]')

  Coveo.$$(<HTMLElement>searchBox).on(Coveo.StandaloneSearchInterfaceEvents.beforeRedirect,function(e,data){
  
  let isLocationItem =  $('.magic-box-suggestion.coveo-omnibox-selectable.coveo-omnibox-selected[data-swiss-post-location="true"]').length
  let query =  Coveo.state(<HTMLElement>searchBox, "q");

  if(isLocationItem > 0){
    // Cancel the current redirection
    data.cancel = true;
    window.location.href  = "https://www.example.com?place=" + query;
  }  
    
    let regexp: RegExp = /^[a-zA-Z0-9-]{12,23}$/;

    if(regexp.test(query)){
       // Cancel the current redirection
       //call track and trace API here:
      data.cancel = true;
      window.location.href  = "https://www.example.com?package=" + query;
    }
  

  });
}

  /**
  * Adds an event handler 
  */
  private AddOmniboxEventHandler() {
    if (Coveo.LazyInitialization) {
      Coveo.load('Searchbox').then(function () {

      var searchBoxInput = document.querySelector('div[data-omnibox-expander="true"] input')

      searchBoxInput.setAttribute("class", "ppm-main-navigation__search-input");
      searchBoxInput.setAttribute("id", "ppm-main-navigation__search-input");
      searchBoxInput.setAttribute("data-com.agilebits.onepassword.user-edited", "yes");
      
      searchBoxInput.addEventListener("keyup", function(){
       
       let foundLocation = false;
       if((<HTMLInputElement>searchBoxInput).value =="coveoG"){
         console.log('coveoG typed');
          var suggestionNode = document.getElementsByClassName('magic-box-suggestions')[0];

          var locations = document.querySelectorAll(".magic-box-suggestion[data-swiss-post-location='true']");
          

          _.each(locations, (location) => {
            if((<HTMLInputElement>searchBoxInput).value.toLowerCase() == (<HTMLInputElement>searchBoxInput).value.toLocaleLowerCase() ){
              foundLocation = true;
              return;
            }
          });

          if(!foundLocation){
          
           var srvLocations: string[]  = new Array();
           var srvLocalities: string[]  = new Array();
           let locationsIdx = -1;
           let localitiesIdx = -1;

           let response=  ["<strong class=\"title\">Locations</strong>",
           "Post Branch 1200 Genève 1 Mont-Blanc",
           "Post Branch 1200 Genève 11 Rue du Stand",
           "Post Branch 1200 Genève 12 Champel",
           "Post Branch 1200 Genève 13 Les Charmilles",
           "Post Branch 1200 Genève 17 Malagnou",
           "<strong class=\"title\">Localities</strong>",
           "Canton Geneva",
           "Genève",
           "1200 Genève",
           "Rue de Genève, 1003 Lausanne",
           "Rue de Genève, 1004 Lausanne"]
          
           let idx = 0;

           for (let item in response) {
              if(response[item].toLowerCase().indexOf('class="title"') > -1  && response[item].toLowerCase().indexOf('locations') > -1){
                locationsIdx = idx;
              }
              else if(response[item].toLowerCase().indexOf('class="title"') > -1 && response[item].toLowerCase().indexOf('localities') > -1){
                localitiesIdx = idx;
              }
              if(locationsIdx > -1 && localitiesIdx > -1){
                break;
              }
              idx++;
            }
            for (let i = 0; i < localitiesIdx; i++) {
              if(i!=locationsIdx){
                srvLocations.push(response[i]);
              }
            }
            for (let i = localitiesIdx; i < response.length; i++) {
              if(i!=localitiesIdx){
                srvLocalities.push(response[i]);
              }
            }

            // axios({
            //   method: 'post',
            //   url: 'https://www.post.ch/api/LocationsAutocomplete/AutocompleteLocation?sc_site=post-portal&sc_lang=en',
            //   data: {
            //     topic:1,
            //     PreselectText:'Geneve',
            //     from_directentry:true,
            //     lang:'en',
            //     service:'places'
            //   },
            //   headers: { 
            //     'Content-Type': 'text/plain;charset=utf-8'
            //   }
            // }).then(function (response) {
            //   console.log(response);
            // })
            // .catch(function (error) {
            //   if (error.response) {
            //     console.log(error.response.headers);
            //   } 
              
            // });

            document.querySelector('.magic-box-suggestions').classList.add("magic-box-hasSuggestion");
            
            for (let i = 0; i < srvLocalities.length; i++) {
             
              let currentID = "magic-box-suggestion-" + ids;
              const suggestionItem = $$('div', { className: 'magic-box-suggestion coveo-omnibox-selectable',ID:  currentID,role:'option',dataSwissPostLocation:'true' }).el;
              
              let handleSuggestionClick = (event) => {
                
                //Get the search interface
                let element = document.querySelector('div[data-omnibox-expander="true"]');
               
                if(element != null){
                  // Specifying a type is only useful when logging Custom usage analytics events.
                  
                  let customEventCause = { name : 'placesSuggestion', type : 'customEventCause' };
                  let metadata = { valueSelected: event.target.textContent };
                  Coveo.logCustomEvent (<HTMLElement>element, customEventCause, metadata);
                
                  window.location.href  = "https://www.example.com?place=" + event.target.textContent;
                }
              };


              Coveo.$$(suggestionItem).on('click', handleSuggestionClick);
                            
              const iconPlaceItem = $$('span', { className: 'coveo-suggestion-location-icon'}, LocationSVGIcon).el;
              const placeItem = $$('span', { className: 'coveo-suggestion-place' }, srvLocalities[i]).el;
              
              suggestionItem.insertBefore(placeItem,suggestionItem.firstChild);
              suggestionItem.insertBefore(iconPlaceItem,suggestionItem.firstChild);
  
              
              suggestionNode.insertBefore(suggestionItem,suggestionNode.firstChild);
            }

           
            manuallyExpanded = true;
          }
        }
      });

       // Select the node that will be observed for mutations
       var targetNode = document.getElementsByClassName('magic-box-suggestions')[0];
        
      // Options for the observer (which mutations to observe)
      var config = {  attributes: true};
      var ids =100;
      // Callback function to execute when mutations are observed
      var callback = function(mutationsList, observer) {
     

        for(var mutation of mutationsList) {
              if (mutation.type == 'attributes') {
                //setTimeout( getData(mutation), 100);
                  
                  if(manuallyExpanded){
                    manuallyExpanded = false;
                    break;
                    
                  }
                  console.log('A child node has been added or removed.');
                  
                  for(var child of mutation.target.childNodes) {
                      let suggestionContainer = child;
                     
                      ids= ids + 1;
                      for(var sugg of child.children) {
                        let suggestionIcon = sugg.getElementsByClassName('coveo-suggestion-icon')[0];
                        let suggestionLocationIcon = sugg.getElementsByClassName('coveo-suggestion-location-icon')[0];
                        
                        if(suggestionIcon == null && suggestionLocationIcon == null){
                          let suggestion = sugg;
                           
                          const iconItem = $$('span', { className: 'coveo-suggestion-icon' }, SearchSVGIcon).el;
                          suggestion.insertBefore(iconItem,suggestion.childNodes[0]);
                          //suggestion.prepend(iconItem);
                        }
                      }
                      
                  }
                
              }
              
          }
      };

      // Create an observer instance linked to the callback function
      var observer = new MutationObserver(callback);

      // Start observing the target node for configured mutations
      observer.observe(targetNode, config);
       
    });
    }
  }

  private NewQueryEventHandler(args: INewQueryEventArgs){
    if($('.CoveoSearchInterface[data-main-search-interface="true"]') != null){
      let isLocationItem =  $('.magic-box-suggestion.coveo-omnibox-selectable.coveo-omnibox-selected[data-swiss-post-location="true"]').length
      var searchBoxInput = document.querySelector('div[data-omnibox-expander="true"] input')
      let query =  Coveo.state(<HTMLElement>searchBoxInput, "q");

      if(isLocationItem > 0){
        // Cancel the current redirection
        args.cancel = true;
        window.location.href  = "https://www.example.com?place=" + query;
      }
      
    }
  }
 
  
};
  
Initialization.registerAutoCreateComponent(OmniboxManager);