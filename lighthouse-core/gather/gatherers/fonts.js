/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');

/* eslint-disable */
function getAllLoadedFonts() {
  const getFont = fontFace => ({
    display: fontFace.display,
    family: fontFace.family,
    stretch: fontFace.stretch,
    style: fontFace.style,
    weight: fontFace.weight,
  });

  return document.fonts.ready.then(() => {
    return Array.from(document.fonts).filter(fontFace => fontFace.status === 'loaded')
      .map(getFont);
  });
}

function getFontFaceFromStylesheets() {
  function resolveUrl(url) {
    const link = document.createElement('a');
    link.href = url;

    return link.href;
  }

  const fontUrlRegex = new RegExp('url\\((?:"|\')([^"]+)(?:"|\')\\)');
  const fontFaceRules = [];
  // get all loaded stylesheets
  for (let sheet = 0; sheet < document.styleSheets.length; sheet++) {
    const stylesheet = document.styleSheets[sheet];
    for (let i = 0; stylesheet.cssRules && i < stylesheet.cssRules.length; i++) {
      var rule = stylesheet.cssRules[i];

      if (rule instanceof CSSFontFaceRule) {
        const fontsObject = {
          display: rule.style.fontDisplay || 'auto',
          family: rule.style.fontFamily.replace(/"|'/g, ''),
          stretch: rule.style.fontStretch || 'normal',
          style: rule.style.fontStyle || 'normal',
          weight: rule.style.fontWeight || 'normal',
          src: [],
        }

        if (rule.style.src) {
          const matches = rule.style.src.match(fontUrlRegex);
          if (matches) {
            fontsObject.src.push(resolveUrl(matches[1]));
          }
        }

        fontFaceRules.push(fontsObject);
      }
    }
  }

  return fontFaceRules;
}
/* eslint-enable */

class Fonts extends Gatherer {
  constructor() {
    super();

    this.stylesheetIds = [];
  }

  _findSameFontFamily(fontFace, fontFacesList) {
    return fontFacesList.find(fontItem => {
      return fontFace.family === fontItem.family &&
        fontFace.style === fontItem.style &&
        fontFace.weight === fontItem.weight;
    });
  }

  afterPass({driver}) {
    return Promise.all(
      [
        driver.evaluateAsync(`(${getAllLoadedFonts.toString()})()`),
        driver.evaluateAsync(`(${getFontFaceFromStylesheets.toString()})()`),
      ]
    ).then(([loadedFonts, fontFaces]) => {
      return loadedFonts.map(fontFace => {
        const fontFaceItem = this._findSameFontFamily(fontFace, fontFaces);
        fontFace.src = fontFaceItem.src || [];

        return fontFace;
      });
    });
  }
}

module.exports = Fonts;
