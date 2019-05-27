import Component = Coveo.Component;
import INewQueryEventArgs = Coveo.INewQueryEventArgs;
import Initialization = Coveo.Initialization;
import ComponentOptions = Coveo.ComponentOptions;
import IComponentBindings = Coveo.IComponentBindings;
import Template = Coveo.Template;
import IQuery = Coveo.IQuery;
import IQueryResult = Coveo.IQueryResult;
import IQueryResults = Coveo.IQueryResults;
import IOmniboxSuggestion = Coveo.IOmniboxSuggestion;
import Omnibox = Coveo.Omnibox;
import KEYBOARD = Coveo.KEYBOARD;
import { CustomOmniboxSuggestionsDefaultTemplate } from './CustomOmniboxSuggestionsDefaultTemplate';
import { CustomOmniboxSuggestionsCache } from './CustomOmniboxSuggestionsCache';
import { CustomOmniboxSuggestionsLocationsTemplate } from './CustomOmniboxSuggestionsLocationsTemplate';
import { CustomOmniboxSuggestionsLocalitiesTemplate } from './CustomOmniboxSuggestionsLocalitiesTemplate';

declare const require: (svgPath: string) => string;
const SearchSVGIcon = require('./search.svg');

export interface ICustomOmniboxSuggestionsOptions {
  expression?: string;
  context: {};
  inputThresholdBaseSuggestions?: number;
  inputThresholdCustomSuggestions?: number;
  numberOfCustomSuggestions?: number;
  numberOfSuggestionsToScroll?:number;
  localitiesBaseUrl?:string;
  locationsBaseUrl?:string;
  customOmniboxResultTemplate?: Template;
  separatorLabel?: string;
}

/**
 * This component is meant to be used inside a result template to display the URI or path to access a result.
 */
export class CustomOmniboxSuggestions extends Component {
  static ID = 'CustomOmniboxSuggestions';
  static options: ICustomOmniboxSuggestionsOptions = {
    expression: Coveo.ComponentOptions.buildStringOption({
      defaultValue: '@uri'
    }),
    inputThresholdBaseSuggestions: Coveo.ComponentOptions.buildNumberOption({
      defaultValue: 1
    }),
    inputThresholdCustomSuggestions: Coveo.ComponentOptions.buildNumberOption({
      defaultValue: 3
    }),
    numberOfCustomSuggestions: Coveo.ComponentOptions.buildNumberOption({
      defaultValue: 10
    }),
    numberOfSuggestionsToScroll: Coveo.ComponentOptions.buildNumberOption({
      defaultValue: 8
    }),
    customOmniboxResultTemplate: ComponentOptions.buildTemplateOption({
      idAttr: 'data-template-id'
    }),
    separatorLabel: ComponentOptions.buildStringOption({
      defaultValue: ''
    }),
    localitiesBaseUrl: ComponentOptions.buildStringOption({
      defaultValue: 'http://www.example.com?localities='
    }),
    locationsBaseUrl: ComponentOptions.buildStringOption({
      defaultValue: 'http://www.example.com?locations='
    }),
    context: ComponentOptions.buildJsonObjectOption({
      defaultValue: {}
    })
  };

  private searchSuggestionsCache: CustomOmniboxSuggestionsCache<IQueryResults> = new CustomOmniboxSuggestionsCache<IQueryResults>();
  private currentSelectedIndex: number = 0;
  private currentScrollPageIndex: number = 0;
  private lastCustomSuggestionsQueryText: string = '';
  private lastCustomSuggestionsQueryNbResults: number = 0;
  public firstSuggestion: Coveo.IQueryResult;

  /**
   * Create a new OmniboxCustomSuggestions
   * @param element
   * @param options
   * @param bindings
   * @param result
   */
  constructor(public element: HTMLElement, public options: ICustomOmniboxSuggestionsOptions, bindings?: IComponentBindings, public result?: IQueryResult) {
    super(element, CustomOmniboxSuggestions.ID, bindings);
    this.options = ComponentOptions.initComponentOptions(element, CustomOmniboxSuggestions, options);
    //this.bind.onRootElement(Coveo.QueryEvents.newQuery, (args: Coveo.INewQueryEventArgs) => this.handleCustomSuggestionRedirect(args));
    this.bind.onRootElement(Coveo.OmniboxEvents.populateOmniboxSuggestions, (args: Coveo.IPopulateOmniboxSuggestionsEventArgs) => this.handlePopulateOmniboxSuggestions(args));
    this.bind.onRootElement(Coveo.InitializationEvents.afterComponentsInitialization, () => this.handleAfterComponentInitialization());
    this.bind.onRootElement(Coveo.ResultListEvents.newResultsDisplayed, (args: any) => this.handlePopulateOmnibox(args));
  }

  private handlePopulateOmnibox (args: any) {
    console.log('args',args);
  }

  private handleAfterComponentInitialization() {
    let omniboxInput: HTMLElement = <HTMLElement>document.querySelector('.CoveoOmnibox input');
    if (omniboxInput) {
      omniboxInput.setAttribute("class", "ppm-main-navigation__search-input");
      omniboxInput.setAttribute("id", "ppm-main-navigation__search-input");
      omniboxInput.setAttribute("data-com.agilebits.onepassword.user-edited", "yes");
      Coveo.$$(omniboxInput).on('keyup', (e) => { this.handleScrollThroughCustomSuggestions(e) });
    }
  }

  private handleScrollThroughCustomSuggestions(evt) {

    let currentSelectedHTML: HTMLElement = <HTMLElement>document.querySelector('.magic-box-suggestion.coveo-omnibox-selectable.coveo-omnibox-selected');
    let selectedElements = document.getElementsByClassName('magic-box-suggestion');
    if (currentSelectedHTML) {
      let i = 0;
      _.each(selectedElements, (selectedElement) => {
        if (selectedElement.className == currentSelectedHTML.className) {
          this.currentSelectedIndex = i;
          return;
        }
        i++;
      });
    }

    let wrapper: HTMLElement = <HTMLElement>document.querySelector('.magic-box-suggestions.magic-box-hasSuggestion');
    if (wrapper) {
      if ((<KeyboardEvent>evt).keyCode == KEYBOARD.DOWN_ARROW) {
        if (this.currentSelectedIndex == selectedElements.length) {
          this.currentScrollPageIndex = 0;
        }

        if (this.currentScrollPageIndex > 11) {
          this.currentScrollPageIndex--;
          wrapper.scrollTop = (this.currentSelectedIndex - 11) * (23.75);
        }

        this.currentScrollPageIndex++;
      } else if ((<KeyboardEvent>evt).keyCode == KEYBOARD.UP_ARROW) {
        if (this.currentSelectedIndex == selectedElements.length) {
          this.currentScrollPageIndex = 11;
          wrapper.scrollTop = selectedElements.length * (23.75);
        }

        if (this.currentScrollPageIndex == 1) {
          this.currentScrollPageIndex++;
          wrapper.scrollTop = this.currentSelectedIndex * (23.75);
        }

        this.currentScrollPageIndex--;
      }
    }
  }

  private handleCustomSuggestionRedirect(args: INewQueryEventArgs) {
    var searchbox = <HTMLElement>document.querySelector('.CoveoSearchbox .magic-box-input');
    if (searchbox.textContent != "" &&
      this.firstSuggestion // &&
    ) {
      args.cancel = true;
      this.onSearchSuggestionsSelection(this.firstSuggestion);
    }
  }

  private addCustomSuggestionsScroll() {
    let suggestionWrapperEl: HTMLElement = <HTMLElement>document.querySelector('.magic-box-suggestions');
    suggestionWrapperEl && (suggestionWrapperEl.style.maxHeight = '289px');
    suggestionWrapperEl && (suggestionWrapperEl.style.overflowY = 'scroll');
  }

  private removeCustomSuggestionsScroll() {
    let suggestionWrapperEl: HTMLElement = <HTMLElement>document.querySelector('.magic-box-suggestions');
    suggestionWrapperEl && (suggestionWrapperEl.style.maxHeight = 'auto');
    suggestionWrapperEl && (suggestionWrapperEl.style.overflowY = 'hidden');
  }

  private handlePopulateOmniboxSuggestions(args: Coveo.IPopulateOmniboxSuggestionsEventArgs) {
    
    args.suggestions.push(this.getCustomSuggestions(args.suggestions.pop(), args.omnibox));
  }

  private getCustomSuggestions(baseSuggestions: Coveo.MagicBox.Suggestion[] | Promise<Coveo.MagicBox.Suggestion[]>, omnibox: Omnibox): Promise<IOmniboxSuggestion[]> {
    return new Promise<IOmniboxSuggestion[]>((resolve) => {

      let shouldGetBaseSuggestions: Boolean = false;
      let shouldGetCustomSuggestions: Boolean = false;

      // input threshold + number of suggestions
      if (omnibox.getText().length >= this.options.inputThresholdBaseSuggestions) {
        shouldGetBaseSuggestions = true;
      }

      if (this.options.numberOfCustomSuggestions > 0 && omnibox.getText().length >= this.options.inputThresholdCustomSuggestions) {
        shouldGetCustomSuggestions = true;
      }

      if (!shouldGetBaseSuggestions && !shouldGetCustomSuggestions) {
        resolve([]);
        return;
      }

      // Not clean, but necessary to check if baseSuggestions is still a promise or is returned
      if ((<any>baseSuggestions)._result) {
        console.log('ootb suggestion', baseSuggestions);
        const text = omnibox.getText();

        let mergedSuggestions: Coveo.Suggestion[] = [];

        if (shouldGetBaseSuggestions) {
          console.log(<Coveo.Suggestion[]>baseSuggestions);
          mergedSuggestions = mergedSuggestions.concat(<Coveo.Suggestion[]>baseSuggestions);
        }

        if (shouldGetCustomSuggestions) {
          this.searchCustomSuggestions(text).then((searchCustomSuggestions) => {
            mergedSuggestions = mergedSuggestions.concat(searchCustomSuggestions);

            if (mergedSuggestions.length == 0) {
              this.removeCustomSuggestionsScroll();
              resolve(mergedSuggestions || []);
            } else {
              if (mergedSuggestions.length > this.options.numberOfSuggestionsToScroll) {
                this.addCustomSuggestionsScroll();
              } else {
                this.removeCustomSuggestionsScroll();
              }
              resolve(mergedSuggestions || []);
            }
          });
        }
        else {
          if (mergedSuggestions.length == 0) {
            this.removeCustomSuggestionsScroll();
            resolve(mergedSuggestions || []);
          } else {
            if (mergedSuggestions.length > this.options.numberOfSuggestionsToScroll) {
              this.addCustomSuggestionsScroll();
            } else {
              this.removeCustomSuggestionsScroll();
            }
            resolve(mergedSuggestions || []);
          }
        }
      } else {

        (<Promise<Coveo.MagicBox.Suggestion[]>>baseSuggestions).then((suggestions) => {
          const text = omnibox.getText();

          let mergedSuggestions: Coveo.Suggestion[] = [];

          if (shouldGetBaseSuggestions) {
           
            _.each(suggestions, (sugg) => {
              if(sugg.html.indexOf("coveo-suggestion-icon") < 0){
              sugg.html = "<span class='coveo-suggestion-icon'>" + SearchSVGIcon +"</span>" +sugg.html; 
            }
              
            });
          
            
            mergedSuggestions = mergedSuggestions.concat(suggestions);
          }

          if (shouldGetCustomSuggestions) {
            this.searchCustomSuggestions(text).then((searchCustomSuggestions) => {
              mergedSuggestions = mergedSuggestions.concat(searchCustomSuggestions);

              if (mergedSuggestions.length == 0) {
                this.removeCustomSuggestionsScroll();
                resolve(mergedSuggestions || []);
              } else {
                if (mergedSuggestions.length > this.options.numberOfSuggestionsToScroll) {
                  this.addCustomSuggestionsScroll();
                } else {
                  this.removeCustomSuggestionsScroll();
                }
                resolve(mergedSuggestions || []);
              }
            });
          } else {
            if (mergedSuggestions.length == 0) {
              this.removeCustomSuggestionsScroll();
              resolve(mergedSuggestions || []);
            } else {
              if (mergedSuggestions.length > this.options.numberOfSuggestionsToScroll) {
                this.addCustomSuggestionsScroll();
              } else {
                this.removeCustomSuggestionsScroll();
              }
              resolve(mergedSuggestions || []);
            }
          }
        });
      }
    });
  }

  private searchCustomSuggestions(text: string): Promise<IOmniboxSuggestion[]> {
    return new Promise<IOmniboxSuggestion[]>((resolve) => {
      try {
        if (this.triggerNextCustomSuggestionsQuery(text)) {
          console.log('triggerNextCustomSuggestionsQuery', text);
          const suggestions = this.searchSuggestionsCache.getSuggestions(text, () => this.queryForCustomSuggestions(text));
          suggestions.then((queryResults) => {
            this.lastCustomSuggestionsQueryText = text;
            this.lastCustomSuggestionsQueryNbResults = queryResults.results.length;
            if (queryResults.results.length > 0) {
              this.firstSuggestion = queryResults.results[0];
              let omniboxedSuggestions: IOmniboxSuggestion[] = new Array<IOmniboxSuggestion>();

              _.each(queryResults.results.map((result, index) => this.mapQueryResult(result, queryResults.results.length - index, text)), (suggestion) => {
                console.log('custom suggestion', suggestion);
                omniboxedSuggestions.push(suggestion);
              });

              resolve(omniboxedSuggestions);
            } else {
              resolve([]);
            }
          });
        }
        else {
          resolve([]);
        }
      } catch (error) {
        this.logger.error(error);
        resolve([]);
      }
    });
  }

  // to-do refactor these conditions...
  private triggerNextCustomSuggestionsQuery(text: string): boolean {
    if (text.indexOf('"') > -1) {
      return false;
    } else if (this.lastCustomSuggestionsQueryText == '') {
      return true;
    } else if (text.indexOf(this.lastCustomSuggestionsQueryText) > -1 && this.lastCustomSuggestionsQueryNbResults == 0) {
      return false;
    } else {
      return true;
    }
  }

  private queryForCustomSuggestions(text: string): Promise<IQueryResults> {
    
    var customSuggestions = new Promise<IQueryResults>((resolve) => {
      var srvLocations: string[]  = new Array();
      var srvLocalities: string[]  = new Array();
      let locationsIdx = -1;
      let localitiesIdx = -1;
      let mergedSuggestion;

      let maxSuggestion = this.options.inputThresholdCustomSuggestions; // use this option when calling your API to get the amount of suggestion per configuration
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

      let queryResults = [];

      for (let i = 0; i < localitiesIdx; i++) {
        if(i!=locationsIdx){
          srvLocations.push(response[i]);

          let result = {} as IQueryResult;

          result.title = response[i];
          result.clickUri = this.options.locationsBaseUrl + response[i];
          var obj = { title: response[i], highlightedTitle: '',type:'locations'};
          result.raw = obj;
          queryResults.push(result);
        }
      }
      for (let i = localitiesIdx; i < response.length; i++) {
        if(i!=localitiesIdx){
         let result = {} as IQueryResult;

          result.title = response[i];
          result.clickUri = this.options.localitiesBaseUrl + response[i];
          var obj = { title: response[i], highlightedTitle: '',type:'localities'};
          result.raw = obj;
          queryResults.push(result);
        }
      }

      let results = {} as IQueryResults;
      results.results = queryResults;
      
      resolve(results);
      
    });

    
    return customSuggestions;
  }

 
  private handleClickSuggestionAnalytics(element: HTMLElement){
                  
    let customEventCause = { name : 'placesSuggestion', type : 'customEventCause' };
    let metadata = { valueSelected: 'event.target.textContent' };
    Coveo.logCustomEvent (element, customEventCause, metadata);
  }
  private handleSearchSuggestionsAnalytics(query: IQuery, searchPromise: Promise<IQueryResults>) {
    if (this.getBindings().usageAnalytics) {

      this.getBindings().usageAnalytics.logSearchEvent({
        name: 'omniboxCustomSuggestionsSearch',
        type: 'omnibox'
      }, {
          q: query
        });

      Coveo.$$(this.queryController.element).trigger(Coveo.QueryEvents.duringQuery, this.buildDataToSendDuringQuery(query, searchPromise));
      // this.removeResultListAnimation();
      // this.removeFacetAnimation();
    }
  }

  private buildDataToSendDuringQuery(query: IQuery, searchPromise: Promise<IQueryResults>): Coveo.IDuringQueryEventArgs {
    let searchAsYouType = (<Coveo.Searchbox>Coveo.get(<HTMLElement>document.querySelector('.CoveoSearchbox'), Coveo.Searchbox)).options.enableSearchAsYouType;
    let qb: Coveo.QueryBuilder = new Coveo.QueryBuilder();
    qb.expression.add(query.aq);

    return {
      queryBuilder: qb,
      query: query,
      searchAsYouType: searchAsYouType || false,
      promise: searchPromise
    };
  }

  private removeFacetAnimation() {
    let facetElements = document.getElementsByClassName('CoveoFacet');
    _.each(facetElements, (facetElement) => {
      Coveo.$$(<HTMLElement>facetElement).removeClass('coveo-facet-fade');
    });

    let facetRangeElements = document.getElementsByClassName('CoveoFacetRange');
    _.each(facetRangeElements, (facetRangeElement) => {
      Coveo.$$(<HTMLElement>facetRangeElement).removeClass('coveo-facet-fade');
    });
  }

  private removeResultListAnimation() {
    let resultListContainer = document.getElementsByClassName('coveo-result-list-container');
    if (resultListContainer) {
      Coveo.$$(<HTMLElement>resultListContainer[0]).removeClass('coveo-fade-out')
    }
  }

  private mapQueryResult(result: IQueryResult, index: number, text: string): IOmniboxSuggestion {
    return <IOmniboxSuggestion>{
      html: this.buildSearchSuggestionsTemplate(result, text),
      text: result.title,
      onSelect: () => this.onSearchSuggestionsSelection(result),
      index: index
    };
  }

  private buildSearchSuggestionsTemplate(result: IQueryResult, text: string): string {
    let omniboxtemplate: Template = this.options.customOmniboxResultTemplate;
    result.raw.highlightedTitle = this.getHighlightedTitle(text, result.title);
    if (omniboxtemplate) {
      return omniboxtemplate.instantiateToString(result);
    } else {
      let template;
      if(result.raw.type == "locations"){
        template = _.template(CustomOmniboxSuggestionsLocationsTemplate.instantiateToString());
      }else if(result.raw.type == "localities"){
        template = _.template(CustomOmniboxSuggestionsLocalitiesTemplate.instantiateToString());
      }else{
        template = _.template(CustomOmniboxSuggestionsDefaultTemplate.instantiateToString());
      }
      return template(result);
    }
  }

  private getHighlightedTitle(text: string, resultTitle: string): string {
    let title = this.replace(resultTitle, text);
    return title;
  }

  private replace(str: string, find: string): string {

    if (str.length == 0 || find.length == 0) {
      return str;
    }

    let terms: string = find.replace(/\s+/g, '|');
    if (terms == '') {
      return str;
    }

    let replacement = `<span class="coveo-omnibox-hightlight">$&</span>`
    return str.replace(new RegExp(terms, 'ig'), replacement);
  }

  private onSearchSuggestionsSelection(result: IQueryResult) {
    let element = <HTMLElement>document.querySelector('div[data-omnibox-expander="true"]'); 
    let customEventCause = { name : 'customSuggestionClick', type : 'customEventCause' };
    let metadata = { valueSelected: result.raw.title,type: result.raw.type }; 
    Coveo.logCustomEvent (element, customEventCause, metadata);
    
    // Timeout to bypass query state model uri change
    setTimeout(() => {
      window.location.href = result.clickUri;
    }, 10)
  }

  
  private isValidSuggestionsPromise(suggestions: any): boolean {
    let isValid = true;
    _.each((<any>suggestions)._result, (suggestion) => {
      if (!suggestion) {
        isValid = false;
      }
    });
    return isValid;
  }
}

Initialization.registerAutoCreateComponent(CustomOmniboxSuggestions);