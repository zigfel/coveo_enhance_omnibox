declare const require: (svgPath: string) => string;
const LocationSVGIcon = require('./location-pin.svg');

export class CustomOmniboxSuggestionsLocalitiesTemplate {

    static instantiateToString(): string {
      let template: string = '<div class="CoveoResultLink coveo-result-cell"><span class="coveo-suggestion-location-icon">' + LocationSVGIcon +  '</span>' +
        `<a href="{{- clickUri }}" >` +
        `<div>{{= raw.highlightedTitle }}</div>` +
        '</a>' +
        '</div>';
  
       
      return template;
    }
  }