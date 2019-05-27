export class CustomOmniboxSuggestionsDefaultTemplate {

    static instantiateToString(): string {
      let template: string = '<div class="CoveoResultLink coveo-result-cell">' +
        `<a href="{{- clickUri }}" >` +
        `<div>{{= raw.highlightedTitle }}</div>` +
        '</a>' +
        '</div>';
  
       
      return template;
    }
  }