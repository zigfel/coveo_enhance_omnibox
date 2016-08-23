'use strict';
let sass = require('node-sass');
let fs = require('fs');

let result = sass.renderSync({
  file: './sass/Index.scss',
  outFile: './bin/css/coveoextension.css'
})

fs.writeFile('./bin/css/coveoextension.css', result.css);
