/*!
 * lazysizes 4.1.2
 * https://github.com/aFarkas/lazysizes
 */
(function(window, factory) {
  var globalInstall = function() {
    factory(window.lazySizes);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'), require('../fix-ios-sizes/fix-ios-sizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes) {
  /*jshint eqnull:true */
  'use strict';
  var polyfill;
  var config = (lazySizes && lazySizes.cfg) || window.lazySizesConfig;
  var img = document.createElement('img');
  var supportSrcset = 'sizes' in img && 'srcset' in img;
  var regHDesc = /\s+\d+h/g;
  var fixEdgeHDescriptor = (function() {
    var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
    var forEach = Array.prototype.forEach;

    return function() {
      var img = document.createElement('img');
      var removeHDescriptors = function(source) {
        var ratio, match;
        var srcset = source.getAttribute(lazySizesConfig.srcsetAttr);
        if (srcset) {
          if ((match = srcset.match(regDescriptors))) {
            if (match[2] == 'w') {
              ratio = match[1] / match[3];
            } else {
              ratio = match[3] / match[1];
            }

            if (ratio) {
              source.setAttribute('data-aspectratio', ratio);
            }
          }
          source.setAttribute(
            lazySizesConfig.srcsetAttr,
            srcset.replace(regHDesc, '')
          );
        }
      };
      var handler = function(e) {
        var picture = e.target.parentNode;

        if (picture && picture.nodeName == 'PICTURE') {
          forEach.call(
            picture.getElementsByTagName('source'),
            removeHDescriptors
          );
        }
        removeHDescriptors(e.target);
      };

      var test = function() {
        if (!!img.currentSrc) {
          document.removeEventListener('lazybeforeunveil', handler);
        }
      };

      document.addEventListener('lazybeforeunveil', handler);

      img.onload = test;
      img.onerror = test;

      img.srcset = 'data:,a 1w 1h';

      if (img.complete) {
        test();
      }
    };
  })();

  if (!config) {
    config = {};
    window.lazySizesConfig = config;
  }

  if (!config.supportsType) {
    config.supportsType = function(type /*, elem*/) {
      return !type;
    };
  }

  if (window.picturefill || config.pf) {
    return;
  }

  if (window.HTMLPictureElement && supportSrcset) {
    if (document.msElementsFromPoint) {
      fixEdgeHDescriptor(navigator.userAgent.match(/Edge\/(\d+)/));
    }

    config.pf = function() {};
    return;
  }

  config.pf = function(options) {
    var i, len;
    if (window.picturefill) {
      return;
    }
    for (i = 0, len = options.elements.length; i < len; i++) {
      polyfill(options.elements[i]);
    }
  };

  // partial polyfill
  polyfill = (function() {
    var ascendingSort = function(a, b) {
      return a.w - b.w;
    };
    var regPxLength = /^\s*\d+\.*\d*px\s*$/;
    var reduceCandidate = function(srces) {
      var lowerCandidate, bonusFactor;
      var len = srces.length;
      var candidate = srces[len - 1];
      var i = 0;

      for (i; i < len; i++) {
        candidate = srces[i];
        candidate.d = candidate.w / srces.w;

        if (candidate.d >= srces.d) {
          if (
            !candidate.cached &&
            (lowerCandidate = srces[i - 1]) &&
            lowerCandidate.d > srces.d - 0.13 * Math.pow(srces.d, 2.2)
          ) {
            bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

            if (lowerCandidate.cached) {
              lowerCandidate.d += 0.15 * bonusFactor;
            }

            if (
              lowerCandidate.d + (candidate.d - srces.d) * bonusFactor >
              srces.d
            ) {
              candidate = lowerCandidate;
            }
          }
          break;
        }
      }
      return candidate;
    };

    var parseWsrcset = (function() {
      var candidates;
      var regWCandidates = /(([^,\s].[^\s]+)\s+(\d+)w)/g;
      var regMultiple = /\s/;
      var addCandidate = function(match, candidate, url, wDescriptor) {
        candidates.push({
          c: candidate,
          u: url,
          w: wDescriptor * 1,
        });
      };

      return function(input) {
        candidates = [];
        input = input.trim();
        input.replace(regHDesc, '').replace(regWCandidates, addCandidate);

        if (!candidates.length && input && !regMultiple.test(input)) {
          candidates.push({
            c: input,
            u: input,
            w: 99,
          });
        }

        return candidates;
      };
    })();

    var runMatchMedia = function() {
      if (runMatchMedia.init) {
        return;
      }

      runMatchMedia.init = true;
      addEventListener(
        'resize',
        (function() {
          var timer;
          var matchMediaElems = document.getElementsByClassName(
            'lazymatchmedia'
          );
          var run = function() {
            var i, len;
            for (i = 0, len = matchMediaElems.length; i < len; i++) {
              polyfill(matchMediaElems[i]);
            }
          };

          return function() {
            clearTimeout(timer);
            timer = setTimeout(run, 66);
          };
        })()
      );
    };

    var createSrcset = function(elem, isImage) {
      var parsedSet;
      var srcSet =
        elem.getAttribute('srcset') || elem.getAttribute(config.srcsetAttr);

      if (!srcSet && isImage) {
        srcSet = !elem._lazypolyfill
          ? elem.getAttribute(config.srcAttr) || elem.getAttribute('src')
          : elem._lazypolyfill._set;
      }

      if (!elem._lazypolyfill || elem._lazypolyfill._set != srcSet) {
        parsedSet = parseWsrcset(srcSet || '');
        if (isImage && elem.parentNode) {
          parsedSet.isPicture =
            elem.parentNode.nodeName.toUpperCase() == 'PICTURE';

          if (parsedSet.isPicture) {
            if (window.matchMedia) {
              lazySizes.aC(elem, 'lazymatchmedia');
              runMatchMedia();
            }
          }
        }

        parsedSet._set = srcSet;
        Object.defineProperty(elem, '_lazypolyfill', {
          value: parsedSet,
          writable: true,
        });
      }
    };

    var getX = function(elem) {
      var dpr = window.devicePixelRatio || 1;
      var optimum = lazySizes.getX && lazySizes.getX(elem);
      return Math.min(optimum || dpr, 2.5, dpr);
    };

    var matchesMedia = function(media) {
      if (window.matchMedia) {
        matchesMedia = function(media) {
          return !media || (matchMedia(media) || {}).matches;
        };
      } else {
        return !media;
      }

      return matchesMedia(media);
    };

    var getCandidate = function(elem) {
      var sources, i, len, media, source, srces, src, width;

      source = elem;
      createSrcset(source, true);
      srces = source._lazypolyfill;

      if (srces.isPicture) {
        for (
          i = 0,
            sources = elem.parentNode.getElementsByTagName('source'),
            len = sources.length;
          i < len;
          i++
        ) {
          if (
            config.supportsType(sources[i].getAttribute('type'), elem) &&
            matchesMedia(sources[i].getAttribute('media'))
          ) {
            source = sources[i];
            createSrcset(source);
            srces = source._lazypolyfill;
            break;
          }
        }
      }

      if (srces.length > 1) {
        width = source.getAttribute('sizes') || '';
        width =
          (regPxLength.test(width) && parseInt(width, 10)) ||
          lazySizes.gW(elem, elem.parentNode);
        srces.d = getX(elem);
        if (!srces.src || !srces.w || srces.w < width) {
          srces.w = width;
          src = reduceCandidate(srces.sort(ascendingSort));
          srces.src = src;
        } else {
          src = srces.src;
        }
      } else {
        src = srces[0];
      }

      return src;
    };

    var p = function(elem) {
      if (
        supportSrcset &&
        elem.parentNode &&
        elem.parentNode.nodeName.toUpperCase() != 'PICTURE'
      ) {
        return;
      }
      var candidate = getCandidate(elem);

      if (candidate && candidate.u && elem._lazypolyfill.cur != candidate.u) {
        elem._lazypolyfill.cur = candidate.u;
        candidate.cached = true;
        elem.setAttribute(config.srcAttr, candidate.u);
        elem.setAttribute('src', candidate.u);
      }
    };

    p.parse = parseWsrcset;

    return p;
  })();

  if (config.loadedClass && config.loadingClass) {
    (function() {
      var sels = [];
      ['img[sizes$="px"][srcset].', 'picture > img:not([srcset]).'].forEach(
        function(sel) {
          sels.push(sel + config.loadedClass);
          sels.push(sel + config.loadingClass);
        }
      );
      config.pf({
        elements: document.querySelectorAll(sels.join(', ')),
      });
    })();
  }
});

/*
 This lazySizes extension helps to use responsive images, but to opt-out from too high retina support in case the w descriptor is used (for x descriptor this is not needed!),
 - data-sizes="auto" has to be used in conjunction

 <img src="100.jpg"
 	data-optimumx="1.8"
 	data-sizes="auto"
 	data-srcset="100.jpg 100w,
 	300.jpg 300w,
 	600.jpg 600w,
 	900.jpg 900w,
 	1200.jpg 1200w"
 	/>

 	see a live demo here: http://afarkas.github.io/lazysizes/maxdpr/
 */

(function(window, factory) {
  var globalInstall = function() {
    factory(window.lazySizes);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes) {
  /*jshint eqnull:true */
  'use strict';
  if (!window.addEventListener) {
    return;
  }

  var config;

  var regPicture = /^picture$/i;
  var docElem = document.documentElement;

  var parseWsrcset = (function() {
    var candidates;
    var reg = /(([^,\s].[^\s]+)\s+(\d+)(w|h)(\s+(\d+)(w|h))?)/g;
    var addCandidate = function(
      match,
      candidate,
      url,
      descNumber1,
      descType1,
      fullDesc,
      descNumber2,
      descType2
    ) {
      candidates.push({
        c: candidate,
        u: url,
        w: (descType2 == 'w' ? descNumber2 : descNumber1) * 1,
      });
    };

    return function(input) {
      candidates = [];
      input.replace(reg, addCandidate);
      return candidates;
    };
  })();

  var parseImg = (function() {
    var ascendingSort = function(a, b) {
      return a.w - b.w;
    };

    var parseSets = function(elem, dataName) {
      var lazyData = {
        srcset: elem.getAttribute(lazySizes.cfg.srcsetAttr) || '',
      };
      var cands = parseWsrcset(lazyData.srcset);
      Object.defineProperty(elem, dataName, {
        value: lazyData,
        writable: true,
      });

      lazyData.cands = cands;

      lazyData.index = 0;
      lazyData.dirty = false;
      if (cands[0] && cands[0].w) {
        cands.sort(ascendingSort);
        lazyData.cSrcset = [cands[lazyData.index].c];
      } else {
        lazyData.cSrcset = lazyData.srcset ? [lazyData.srcset] : [];
        lazyData.cands = [];
      }

      return lazyData;
    };

    return function parseImg(elem, dataName) {
      var sources, i, len, parent;

      if (!elem[dataName]) {
        parent = elem.parentNode || {};
        elem[dataName] = parseSets(elem, dataName);
        elem[dataName].isImg = true;
        if (regPicture.test(parent.nodeName || '')) {
          elem[dataName].picture = true;
          sources = parent.getElementsByTagName('source');
          for (i = 0, len = sources.length; i < len; i++) {
            parseSets(sources[i], dataName).isImg = false;
          }
        }
      }

      return elem[dataName];
    };
  })();

  var constraintFns = {
    _lazyOptimumx: (function() {
      var takeHighRes = function(
        lowerCandidate,
        higherCandidateResolution,
        optimumx
      ) {
        var low, bonusFactor, substract;
        if (!lowerCandidate || !lowerCandidate.d) {
          return true;
        }

        substract = optimumx > 0.7 ? 0.6 : 0.4;

        if (lowerCandidate.d >= optimumx) {
          return false;
        }

        bonusFactor = Math.pow(lowerCandidate.d - substract, 1.6) || 0.1;

        if (bonusFactor < 0.1) {
          bonusFactor = 0.1;
        } else if (bonusFactor > 3) {
          bonusFactor = 3;
        }

        low =
          lowerCandidate.d +
          (higherCandidateResolution - optimumx) * bonusFactor;

        return low < optimumx;
      };

      return function(data, width, optimumx) {
        var i, can;

        for (i = 0; i < data.cands.length; i++) {
          can = data.cands[i];
          can.d = (can.w || 1) / width;

          if (data.index >= i) {
            continue;
          }

          if (
            can.d <= optimumx ||
            takeHighRes(data.cands[i - 1], can.d, optimumx)
          ) {
            data.cSrcset.push(can.c);
            data.index = i;
          } else {
            break;
          }
        }
      };
    })(),
  };

  var constrainSets = (function() {
    var constrainSet = function(elem, displayWidth, optimumx, attr, dataName) {
      var curIndex;
      var lazyData = elem[dataName];

      if (!lazyData) {
        return;
      }
      curIndex = lazyData.index;

      constraintFns[dataName](lazyData, displayWidth, optimumx);

      if (!lazyData.dirty || curIndex != lazyData.index) {
        lazyData.cSrcset.join(', ');
        elem.setAttribute(attr, lazyData.cSrcset.join(', '));
        lazyData.dirty = true;
      }
    };

    return function(image, displayWidth, optimumx, attr, dataName) {
      var sources, parent, len, i;
      var lazyData = image[dataName];

      lazyData.width = displayWidth;

      if (lazyData.picture && (parent = image.parentNode)) {
        sources = parent.getElementsByTagName('source');
        for (i = 0, len = sources.length; i < len; i++) {
          constrainSet(sources[i], displayWidth, optimumx, attr, dataName);
        }
      }

      constrainSet(image, displayWidth, optimumx, attr, dataName);
    };
  })();

  var getOptimumX = function(element) {
    var optimumx =
      element.getAttribute('data-optimumx') ||
      element.getAttribute('data-maxdpr');

    if (!optimumx && config.constrainPixelDensity) {
      optimumx = 'auto';
    }

    if (optimumx) {
      if (optimumx == 'auto') {
        optimumx = config.getOptimumX(element);
      } else {
        optimumx = parseFloat(optimumx, 10);
      }
    }
    return optimumx;
  };

  var extentLazySizes = function() {
    if (lazySizes && !lazySizes.getOptimumX) {
      lazySizes.getX = getOptimumX;
      lazySizes.pWS = parseWsrcset;
      docElem.removeEventListener('lazybeforeunveil', extentLazySizes);
    }
  };

  docElem.addEventListener('lazybeforeunveil', extentLazySizes);
  setTimeout(extentLazySizes);

  config = (lazySizes && lazySizes.cfg) || window.lazySizesConfig;

  if (!config) {
    config = {};
    window.lazySizesConfig = config;
  }

  if (typeof config.getOptimumX != 'function') {
    config.getOptimumX = function(/*element*/) {
      var dpr = window.devicePixelRatio || 1;
      if (dpr > 2.6) {
        dpr *= 0.6; // returns 1.8 for 3
      } else if (dpr > 1.9) {
        dpr *= 0.8; // returns 1.6 for 2
      } else {
        dpr -= 0.01; // returns 0.99 for 1
      }
      return Math.min(Math.round(dpr * 100) / 100, 2);
    };
  }

  if (!window.devicePixelRatio) {
    return;
  }

  addEventListener('lazybeforesizes', function(e) {
    if (e.detail.instance != lazySizes) {
      return;
    }

    var optimumx, lazyData, width, attr;

    var elem = e.target;
    var detail = e.detail;
    var dataAttr = detail.dataAttr;

    if (
      e.defaultPrevented ||
      !(optimumx = getOptimumX(elem)) ||
      optimumx >= devicePixelRatio
    ) {
      return;
    }

    if (
      dataAttr &&
      elem._lazyOptimumx &&
      !detail.reloaded &&
      (!config.unloadedClass || !lazySizes.hC(elem, config.unloadedClass))
    ) {
      elem._lazyOptimumx = null;
    }

    lazyData = parseImg(elem, '_lazyOptimumx');

    width = detail.width;

    if (width && (lazyData.width || 0) < width) {
      attr = dataAttr ? lazySizes.cfg.srcsetAttr : 'srcset';

      lazySizes.rAF(function() {
        constrainSets(elem, width, optimumx, attr, '_lazyOptimumx');
      });
    }
  });
});

(function(window, factory) {
  var globalInstall = function(initialEvent) {
    factory(window.lazySizes, initialEvent);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes, initialEvent) {
  'use strict';
  var style = document.createElement('a').style;
  var fitSupport = 'objectFit' in style;
  var positionSupport = fitSupport && 'objectPosition' in style;
  var regCssFit = /object-fit["']*\s*:\s*["']*(contain|cover)/;
  var regCssPosition = /object-position["']*\s*:\s*["']*(.+?)(?=($|,|'|"|;))/;
  var blankSrc =
    'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  var regBgUrlEscape = /\(|\)|'/;
  var positionDefaults = {
    center: 'center',
    '50% 50%': 'center',
  };

  function getObject(element) {
    var css = getComputedStyle(element, null) || {};
    var content = css.fontFamily || '';
    var objectFit = content.match(regCssFit) || '';
    var objectPosition = (objectFit && content.match(regCssPosition)) || '';

    if (objectPosition) {
      objectPosition = objectPosition[1];
    }

    return {
      fit: (objectFit && objectFit[1]) || '',
      position: positionDefaults[objectPosition] || objectPosition || 'center',
    };
  }

  function initFix(element, config) {
    var switchClassesAdded, addedSrc;
    var lazysizesCfg = lazySizes.cfg;
    var styleElement = element.cloneNode(false);
    var styleElementStyle = styleElement.style;

    var onChange = function() {
      var src = element.currentSrc || element.src;

      if (src && addedSrc !== src) {
        addedSrc = src;
        styleElementStyle.backgroundImage =
          'url(' + (regBgUrlEscape.test(src) ? JSON.stringify(src) : src) + ')';

        if (!switchClassesAdded) {
          switchClassesAdded = true;
          lazySizes.rC(styleElement, lazysizesCfg.loadingClass);
          lazySizes.aC(styleElement, lazysizesCfg.loadedClass);
        }
      }
    };
    var rafedOnChange = function() {
      lazySizes.rAF(onChange);
    };

    element._lazysizesParentFit = config.fit;

    element.addEventListener('lazyloaded', rafedOnChange, true);
    element.addEventListener('load', rafedOnChange, true);

    styleElement.addEventListener('load', function() {
      var curSrc = styleElement.currentSrc || styleElement.src;

      if (curSrc && curSrc != blankSrc) {
        styleElement.src = blankSrc;
        styleElement.srcset = '';
      }
    });

    lazySizes.rAF(function() {
      var hideElement = element;
      var container = element.parentNode;

      if (container.nodeName.toUpperCase() == 'PICTURE') {
        hideElement = container;
        container = container.parentNode;
      }

      lazySizes.rC(styleElement, lazysizesCfg.loadedClass);
      lazySizes.rC(styleElement, lazysizesCfg.lazyClass);
      lazySizes.aC(styleElement, lazysizesCfg.loadingClass);
      lazySizes.aC(
        styleElement,
        lazysizesCfg.objectFitClass || 'lazysizes-display-clone'
      );

      if (styleElement.getAttribute(lazysizesCfg.srcsetAttr)) {
        styleElement.setAttribute(lazysizesCfg.srcsetAttr, '');
      }

      if (styleElement.getAttribute(lazysizesCfg.srcAttr)) {
        styleElement.setAttribute(lazysizesCfg.srcAttr, '');
      }

      styleElement.src = blankSrc;
      styleElement.srcset = '';

      styleElementStyle.backgroundRepeat = 'no-repeat';
      styleElementStyle.backgroundPosition = config.position;
      styleElementStyle.backgroundSize = config.fit;

      hideElement.style.display = 'none';

      element.setAttribute('data-parent-fit', config.fit);
      element.setAttribute('data-parent-container', 'prev');

      container.insertBefore(styleElement, hideElement);

      if (element._lazysizesParentFit) {
        delete element._lazysizesParentFit;
      }

      if (element.complete) {
        onChange();
      }
    });
  }

  if (!fitSupport || !positionSupport) {
    var onRead = function(e) {
      if (e.detail.instance != lazySizes) {
        return;
      }

      var element = e.target;
      var obj = getObject(element);

      if (obj.fit && (!fitSupport || obj.position != 'center')) {
        initFix(element, obj);
      }
    };

    window.addEventListener('lazyunveilread', onRead, true);

    if (initialEvent && initialEvent.detail) {
      onRead(initialEvent);
    }
  }
});

(function(window, factory) {
  var globalInstall = function() {
    factory(window.lazySizes);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes) {
  'use strict';
  if (!window.addEventListener) {
    return;
  }

  var regWhite = /\s+/g;
  var regSplitSet = /\s*\|\s+|\s+\|\s*/g;
  var regSource = /^(.+?)(?:\s+\[\s*(.+?)\s*\])(?:\s+\[\s*(.+?)\s*\])?$/;
  var regType = /^\s*\(*\s*type\s*:\s*(.+?)\s*\)*\s*$/;
  var regBgUrlEscape = /\(|\)|'/;
  var allowedBackgroundSize = {contain: 1, cover: 1};
  var proxyWidth = function(elem) {
    var width = lazySizes.gW(elem, elem.parentNode);

    if (!elem._lazysizesWidth || width > elem._lazysizesWidth) {
      elem._lazysizesWidth = width;
    }
    return elem._lazysizesWidth;
  };
  var getBgSize = function(elem) {
    var bgSize;

    bgSize = (
      getComputedStyle(elem) || {getPropertyValue: function() {}}
    ).getPropertyValue('background-size');

    if (
      !allowedBackgroundSize[bgSize] &&
      allowedBackgroundSize[elem.style.backgroundSize]
    ) {
      bgSize = elem.style.backgroundSize;
    }

    return bgSize;
  };
  var setTypeOrMedia = function(source, match) {
    if (match) {
      var typeMatch = match.match(regType);
      if (typeMatch && typeMatch[1]) {
        source.setAttribute('type', typeMatch[1]);
      } else {
        source.setAttribute(
          'media',
          lazySizesConfig.customMedia[match] || match
        );
      }
    }
  };
  var createPicture = function(sets, elem, img) {
    var picture = document.createElement('picture');
    var sizes = elem.getAttribute(lazySizesConfig.sizesAttr);
    var ratio = elem.getAttribute('data-ratio');
    var optimumx = elem.getAttribute('data-optimumx');

    if (elem._lazybgset && elem._lazybgset.parentNode == elem) {
      elem.removeChild(elem._lazybgset);
    }

    Object.defineProperty(img, '_lazybgset', {
      value: elem,
      writable: true,
    });
    Object.defineProperty(elem, '_lazybgset', {
      value: picture,
      writable: true,
    });

    sets = sets.replace(regWhite, ' ').split(regSplitSet);

    picture.style.display = 'none';
    img.className = lazySizesConfig.lazyClass;

    if (sets.length == 1 && !sizes) {
      sizes = 'auto';
    }

    sets.forEach(function(set) {
      var match;
      var source = document.createElement('source');

      if (sizes && sizes != 'auto') {
        source.setAttribute('sizes', sizes);
      }

      if ((match = set.match(regSource))) {
        source.setAttribute(lazySizesConfig.srcsetAttr, match[1]);

        setTypeOrMedia(source, match[2]);
        setTypeOrMedia(source, match[3]);
      } else {
        source.setAttribute(lazySizesConfig.srcsetAttr, set);
      }

      picture.appendChild(source);
    });

    if (sizes) {
      img.setAttribute(lazySizesConfig.sizesAttr, sizes);
      elem.removeAttribute(lazySizesConfig.sizesAttr);
      elem.removeAttribute('sizes');
    }
    if (optimumx) {
      img.setAttribute('data-optimumx', optimumx);
    }
    if (ratio) {
      img.setAttribute('data-ratio', ratio);
    }

    picture.appendChild(img);

    elem.appendChild(picture);
  };

  var proxyLoad = function(e) {
    if (!e.target._lazybgset) {
      return;
    }

    var image = e.target;
    var elem = image._lazybgset;
    var bg = image.currentSrc || image.src;

    if (bg) {
      var event = lazySizes.fire(elem, 'bgsetproxy', {
        src: bg,
        useSrc: regBgUrlEscape.test(bg) ? JSON.stringify(bg) : bg,
      });

      if (!event.defaultPrevented) {
        elem.style.backgroundImage = 'url(' + event.detail.useSrc + ')';
      }
    }

    if (image._lazybgsetLoading) {
      lazySizes.fire(elem, '_lazyloaded', {}, false, true);
      delete image._lazybgsetLoading;
    }
  };

  addEventListener('lazybeforeunveil', function(e) {
    var set, image, elem;

    if (e.defaultPrevented || !(set = e.target.getAttribute('data-bgset'))) {
      return;
    }

    elem = e.target;
    image = document.createElement('img');

    image.alt = '';

    image._lazybgsetLoading = true;
    e.detail.firesLoad = true;

    createPicture(set, elem, image);

    setTimeout(function() {
      lazySizes.loader.unveil(image);

      lazySizes.rAF(function() {
        lazySizes.fire(image, '_lazyloaded', {}, true, true);
        if (image.complete) {
          proxyLoad({target: image});
        }
      });
    });
  });

  document.addEventListener('load', proxyLoad, true);

  window.addEventListener(
    'lazybeforesizes',
    function(e) {
      if (e.detail.instance != lazySizes) {
        return;
      }
      if (e.target._lazybgset && e.detail.dataAttr) {
        var elem = e.target._lazybgset;
        var bgSize = getBgSize(elem);

        if (allowedBackgroundSize[bgSize]) {
          e.target._lazysizesParentFit = bgSize;

          lazySizes.rAF(function() {
            e.target.setAttribute('data-parent-fit', bgSize);
            if (e.target._lazysizesParentFit) {
              delete e.target._lazysizesParentFit;
            }
          });
        }
      }
    },
    true
  );

  document.documentElement.addEventListener('lazybeforesizes', function(e) {
    if (
      e.defaultPrevented ||
      !e.target._lazybgset ||
      e.detail.instance != lazySizes
    ) {
      return;
    }
    e.detail.width = proxyWidth(e.target._lazybgset);
  });
});

(function(window, factory) {
  var globalInstall = function() {
    factory(window.lazySizes);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes) {
  'use strict';
  if (!window.addEventListener) {
    return;
  }

  var rAF = window.requestAnimationFrame || setTimeout;

  var addObserver = function() {
    var connect, disconnect, observer, connected;
    var lsCfg = lazySizes.cfg;
    var attributes = {
      'data-bgset': 1,
      'data-include': 1,
      'data-poster': 1,
      'data-bg': 1,
      'data-script': 1,
    };
    var regClassTest = '(\\s|^)(' + lsCfg.loadedClass;
    var docElem = document.documentElement;

    var setClass = function(target) {
      rAF(function() {
        lazySizes.rC(target, lsCfg.loadedClass);
        if (lsCfg.unloadedClass) {
          lazySizes.rC(target, lsCfg.unloadedClass);
        }
        lazySizes.aC(target, lsCfg.lazyClass);

        if (
          target.style.display == 'none' ||
          (target.parentNode && target.parentNode.style.display == 'none')
        ) {
          setTimeout(function() {
            lazySizes.loader.unveil(target);
          }, 0);
        }
      });
    };

    var onMutation = function(mutations) {
      var i, len, mutation, target;
      for (i = 0, len = mutations.length; i < len; i++) {
        mutation = mutations[i];
        target = mutation.target;

        if (!target.getAttribute(mutation.attributeName)) {
          continue;
        }

        if (target.localName == 'source' && target.parentNode) {
          target = target.parentNode.querySelector('img');
        }

        if (target && regClassTest.test(target.className)) {
          setClass(target);
        }
      }
    };

    if (lsCfg.unloadedClass) {
      regClassTest += '|' + lsCfg.unloadedClass;
    }

    regClassTest += '|' + lsCfg.loadingClass + ')(\\s|$)';

    regClassTest = new RegExp(regClassTest);

    attributes[lsCfg.srcAttr] = 1;
    attributes[lsCfg.srcsetAttr] = 1;

    if (window.MutationObserver) {
      observer = new MutationObserver(onMutation);

      connect = function() {
        if (!connected) {
          connected = true;
          observer.observe(docElem, {
            subtree: true,
            attributes: true,
            attributeFilter: Object.keys(attributes),
          });
        }
      };
      disconnect = function() {
        if (connected) {
          connected = false;
          observer.disconnect();
        }
      };
    } else {
      docElem.addEventListener(
        'DOMAttrModified',
        (function() {
          var runs;
          var modifications = [];
          var callMutations = function() {
            onMutation(modifications);
            modifications = [];
            runs = false;
          };
          return function(e) {
            if (connected && attributes[e.attrName] && e.newValue) {
              modifications.push({target: e.target, attributeName: e.attrName});
              if (!runs) {
                setTimeout(callMutations);
                runs = true;
              }
            }
          };
        })(),
        true
      );

      connect = function() {
        connected = true;
      };
      disconnect = function() {
        connected = false;
      };
    }

    addEventListener('lazybeforeunveil', disconnect, true);
    addEventListener('lazybeforeunveil', connect);

    addEventListener('lazybeforesizes', disconnect, true);
    addEventListener('lazybeforesizes', connect);
    connect();

    removeEventListener('lazybeforeunveil', addObserver);
  };

  addEventListener('lazybeforeunveil', addObserver);
});

(function(window, factory) {
  var globalInstall = function() {
    factory(window.lazySizes);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes) {
  'use strict';

  if (!window.addEventListener) {
    return;
  }

  var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
  var regCssFit = /parent-fit["']*\s*:\s*["']*(contain|cover|width)/;
  var regCssObject = /parent-container["']*\s*:\s*["']*(.+?)(?=(\s|$|,|'|"|;))/;
  var regPicture = /^picture$/i;

  var getCSS = function(elem) {
    return getComputedStyle(elem, null) || {};
  };

  var parentFit = {
    getParent: function(element, parentSel) {
      var parent = element;
      var parentNode = element.parentNode;

      if (
        (!parentSel || parentSel == 'prev') &&
        parentNode &&
        regPicture.test(parentNode.nodeName || '')
      ) {
        parentNode = parentNode.parentNode;
      }

      if (parentSel != 'self') {
        if (parentSel == 'prev') {
          parent = element.previousElementSibling;
        } else if (parentSel && (parentNode.closest || window.jQuery)) {
          parent =
            (parentNode.closest
              ? parentNode.closest(parentSel)
              : jQuery(parentNode).closest(parentSel)[0]) || parentNode;
        } else {
          parent = parentNode;
        }
      }

      return parent;
    },

    getFit: function(element) {
      var tmpMatch, parentObj;
      var css = getCSS(element);
      var content = css.content || css.fontFamily;
      var obj = {
        fit:
          element._lazysizesParentFit ||
          element.getAttribute('data-parent-fit'),
      };

      if (!obj.fit && content && (tmpMatch = content.match(regCssFit))) {
        obj.fit = tmpMatch[1];
      }

      if (obj.fit) {
        parentObj =
          element._lazysizesParentContainer ||
          element.getAttribute('data-parent-container');

        if (!parentObj && content && (tmpMatch = content.match(regCssObject))) {
          parentObj = tmpMatch[1];
        }

        obj.parent = parentFit.getParent(element, parentObj);
      } else {
        obj.fit = css.objectFit;
      }

      return obj;
    },

    getImageRatio: function(element) {
      var i, srcset, media, ratio, match;
      var parent = element.parentNode;
      var elements =
        parent && regPicture.test(parent.nodeName || '')
          ? parent.querySelectorAll('source, img')
          : [element];

      for (i = 0; i < elements.length; i++) {
        element = elements[i];
        srcset =
          element.getAttribute(lazySizesConfig.srcsetAttr) ||
          element.getAttribute('srcset') ||
          element.getAttribute('data-pfsrcset') ||
          element.getAttribute('data-risrcset') ||
          '';
        media = element._lsMedia || element.getAttribute('media');
        media =
          lazySizesConfig.customMedia[
            element.getAttribute('data-media') || media
          ] || media;

        if (
          srcset &&
          (!media || ((window.matchMedia && matchMedia(media)) || {}).matches)
        ) {
          ratio = parseFloat(element.getAttribute('data-aspectratio'));

          if (!ratio && (match = srcset.match(regDescriptors))) {
            if (match[2] == 'w') {
              ratio = match[1] / match[3];
            } else {
              ratio = match[3] / match[1];
            }
          }
          break;
        }
      }

      return ratio;
    },

    calculateSize: function(element, width) {
      var displayRatio, height, imageRatio, retWidth;
      var fitObj = this.getFit(element);
      var fit = fitObj.fit;
      var fitElem = fitObj.parent;

      if (
        fit != 'width' &&
        ((fit != 'contain' && fit != 'cover') ||
          !(imageRatio = this.getImageRatio(element)))
      ) {
        return width;
      }

      if (fitElem) {
        width = fitElem.clientWidth;
      } else {
        fitElem = element;
      }

      retWidth = width;

      if (fit == 'width') {
        retWidth = width;
      } else {
        height = fitElem.clientHeight;

        if (
          height > 40 &&
          (displayRatio = width / height) &&
          ((fit == 'cover' && displayRatio < imageRatio) ||
            (fit == 'contain' && displayRatio > imageRatio))
        ) {
          retWidth = width * (imageRatio / displayRatio);
        }
      }

      return retWidth;
    },
  };

  lazySizes.parentFit = parentFit;

  document.addEventListener('lazybeforesizes', function(e) {
    if (e.defaultPrevented || e.detail.instance != lazySizes) {
      return;
    }

    var element = e.target;
    e.detail.width = parentFit.calculateSize(element, e.detail.width);
  });
});

(function(window, factory) {
  var globalInstall = function() {
    factory(window.lazySizes);
    window.removeEventListener('lazyunveilread', globalInstall, true);
  };

  factory = factory.bind(null, window, window.document);

  if (typeof module == 'object' && module.exports) {
    factory(require('lazysizes'));
  } else if (window.lazySizes) {
    globalInstall();
  } else {
    window.addEventListener('lazyunveilread', globalInstall, true);
  }
})(window, function(window, document, lazySizes) {
  /*jshint eqnull:true */
  'use strict';

  var config, riasCfg;
  var replaceTypes = {string: 1, number: 1};
  var regNumber = /^\-*\+*\d+\.*\d*$/;
  var regPicture = /^picture$/i;
  var regWidth = /\s*\{\s*width\s*\}\s*/i;
  var regHeight = /\s*\{\s*height\s*\}\s*/i;
  var regPlaceholder = /\s*\{\s*([a-z0-9]+)\s*\}\s*/gi;
  var regObj = /^\[.*\]|\{.*\}$/;
  var regAllowedSizes = /^(?:auto|\d+(px)?)$/;
  var anchor = document.createElement('a');
  var img = document.createElement('img');
  var buggySizes = 'srcset' in img && !('sizes' in img);
  var supportPicture = !!window.HTMLPictureElement && !buggySizes;

  (function() {
    var prop;
    var noop = function() {};
    var riasDefaults = {
      prefix: '',
      postfix: '',
      srcAttr: 'data-src',
      absUrl: false,
      modifyOptions: noop,
      widthmap: {},
      ratio: false,
    };

    config = (lazySizes && lazySizes.cfg) || window.lazySizesConfig;

    if (!config) {
      config = {};
      window.lazySizesConfig = config;
    }

    if (!config.supportsType) {
      config.supportsType = function(type /*, elem*/) {
        return !type;
      };
    }

    if (!config.rias) {
      config.rias = {};
    }
    riasCfg = config.rias;

    if (!('widths' in riasCfg)) {
      riasCfg.widths = [];
      (function(widths) {
        var width;
        var i = 0;
        while (!width || width < 3000) {
          i += 5;
          if (i > 30) {
            i += 1;
          }
          width = 36 * i;
          widths.push(width);
        }
      })(riasCfg.widths);
    }

    for (prop in riasDefaults) {
      if (!(prop in riasCfg)) {
        riasCfg[prop] = riasDefaults[prop];
      }
    }
  })();

  function getElementOptions(elem, src) {
    var attr, parent, setOption, options;
    var elemStyles = window.getComputedStyle(elem);

    parent = elem.parentNode;
    options = {
      isPicture: !!(parent && regPicture.test(parent.nodeName || '')),
    };

    setOption = function(attr, run) {
      var attrVal = elem.getAttribute('data-' + attr);

      if (!attrVal) {
        // no data- attr, get value from the CSS
        var styles = elemStyles.getPropertyValue('--ls-' + attr);
        // at least Safari 9 returns null rather than
        // an empty string for getPropertyValue causing
        // .trim() to fail
        if (styles) {
          attrVal = styles.trim();
        }
      }

      if (attrVal) {
        if (attrVal == 'true') {
          attrVal = true;
        } else if (attrVal == 'false') {
          attrVal = false;
        } else if (regNumber.test(attrVal)) {
          attrVal = parseFloat(attrVal);
        } else if (typeof riasCfg[attr] == 'function') {
          attrVal = riasCfg[attr](elem, attrVal);
        } else if (regObj.test(attrVal)) {
          try {
            attrVal = JSON.parse(attrVal);
          } catch (e) {}
        }
        options[attr] = attrVal;
      } else if (attr in riasCfg && typeof riasCfg[attr] != 'function') {
        options[attr] = riasCfg[attr];
      } else if (run && typeof riasCfg[attr] == 'function') {
        options[attr] = riasCfg[attr](elem, attrVal);
      }
    };

    for (attr in riasCfg) {
      setOption(attr);
    }
    src.replace(regPlaceholder, function(full, match) {
      if (!(match in options)) {
        setOption(match, true);
      }
    });

    return options;
  }

  function replaceUrlProps(url, options) {
    var candidates = [];
    var replaceFn = function(full, match) {
      return replaceTypes[typeof options[match]] ? options[match] : full;
    };
    candidates.srcset = [];

    if (options.absUrl) {
      anchor.setAttribute('href', url);
      url = anchor.href;
    }

    url = ((options.prefix || '') + url + (options.postfix || '')).replace(
      regPlaceholder,
      replaceFn
    );

    options.widths.forEach(function(width) {
      var widthAlias = options.widthmap[width] || width;
      var candidate = {
        u: url
          .replace(regWidth, widthAlias)
          .replace(
            regHeight,
            options.ratio ? Math.round(width * options.ratio) : ''
          ),
        w: width,
      };

      candidates.push(candidate);
      candidates.srcset.push((candidate.c = candidate.u + ' ' + width + 'w'));
    });
    return candidates;
  }

  function setSrc(src, opts, elem) {
    var elemW = 0;
    var elemH = 0;
    var sizeElement = elem;

    if (!src) {
      return;
    }

    if (opts.ratio === 'container') {
      // calculate image or parent ratio
      elemW = sizeElement.scrollWidth;
      elemH = sizeElement.scrollHeight;

      while ((!elemW || !elemH) && sizeElement !== document) {
        sizeElement = sizeElement.parentNode;
        elemW = sizeElement.scrollWidth;
        elemH = sizeElement.scrollHeight;
      }
      if (elemW && elemH) {
        opts.ratio = elemH / elemW;
      }
    }

    src = replaceUrlProps(src, opts);

    src.isPicture = opts.isPicture;

    if (buggySizes && elem.nodeName.toUpperCase() == 'IMG') {
      elem.removeAttribute(config.srcsetAttr);
    } else {
      elem.setAttribute(config.srcsetAttr, src.srcset.join(', '));
    }

    Object.defineProperty(elem, '_lazyrias', {
      value: src,
      writable: true,
    });
  }

  function createAttrObject(elem, src) {
    var opts = getElementOptions(elem, src);

    riasCfg.modifyOptions.call(elem, {
      target: elem,
      details: opts,
      detail: opts,
    });

    lazySizes.fire(elem, 'lazyriasmodifyoptions', opts);
    return opts;
  }

  function getSrc(elem) {
    return (
      elem.getAttribute(elem.getAttribute('data-srcattr') || riasCfg.srcAttr) ||
      elem.getAttribute(config.srcsetAttr) ||
      elem.getAttribute(config.srcAttr) ||
      elem.getAttribute('data-pfsrcset') ||
      ''
    );
  }

  addEventListener(
    'lazybeforesizes',
    function(e) {
      if (e.detail.instance != lazySizes) {
        return;
      }

      var elem,
        src,
        elemOpts,
        parent,
        sources,
        i,
        len,
        sourceSrc,
        sizes,
        detail,
        hasPlaceholder,
        modified,
        emptyList;
      elem = e.target;

      if (
        !e.detail.dataAttr ||
        e.defaultPrevented ||
        riasCfg.disabled ||
        !(
          (sizes =
            elem.getAttribute(config.sizesAttr) ||
            elem.getAttribute('sizes')) && regAllowedSizes.test(sizes)
        )
      ) {
        return;
      }

      src = getSrc(elem);

      elemOpts = createAttrObject(elem, src);

      hasPlaceholder =
        regWidth.test(elemOpts.prefix) || regWidth.test(elemOpts.postfix);

      if (elemOpts.isPicture && (parent = elem.parentNode)) {
        sources = parent.getElementsByTagName('source');
        for (i = 0, len = sources.length; i < len; i++) {
          if (
            hasPlaceholder ||
            regWidth.test((sourceSrc = getSrc(sources[i])))
          ) {
            setSrc(sourceSrc, elemOpts, sources[i]);
            modified = true;
          }
        }
      }

      if (hasPlaceholder || regWidth.test(src)) {
        setSrc(src, elemOpts, elem);
        modified = true;
      } else if (modified) {
        emptyList = [];
        emptyList.srcset = [];
        emptyList.isPicture = true;
        Object.defineProperty(elem, '_lazyrias', {
          value: emptyList,
          writable: true,
        });
      }

      if (modified) {
        if (supportPicture) {
          elem.removeAttribute(config.srcAttr);
        } else if (sizes != 'auto') {
          detail = {
            width: parseInt(sizes, 10),
          };
          polyfill({
            target: elem,
            detail: detail,
          });
        }
      }
    },
    true
  );
  // partial polyfill
  var polyfill = (function() {
    var ascendingSort = function(a, b) {
      return a.w - b.w;
    };

    var reduceCandidate = function(srces) {
      var lowerCandidate, bonusFactor;
      var len = srces.length;
      var candidate = srces[len - 1];
      var i = 0;

      for (i; i < len; i++) {
        candidate = srces[i];
        candidate.d = candidate.w / srces.w;
        if (candidate.d >= srces.d) {
          if (
            !candidate.cached &&
            (lowerCandidate = srces[i - 1]) &&
            lowerCandidate.d > srces.d - 0.13 * Math.pow(srces.d, 2.2)
          ) {
            bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

            if (lowerCandidate.cached) {
              lowerCandidate.d += 0.15 * bonusFactor;
            }

            if (
              lowerCandidate.d + (candidate.d - srces.d) * bonusFactor >
              srces.d
            ) {
              candidate = lowerCandidate;
            }
          }
          break;
        }
      }
      return candidate;
    };

    var getWSet = function(elem, testPicture) {
      var src;
      if (
        !elem._lazyrias &&
        lazySizes.pWS &&
        (src = lazySizes.pWS(elem.getAttribute(config.srcsetAttr || ''))).length
      ) {
        Object.defineProperty(elem, '_lazyrias', {
          value: src,
          writable: true,
        });
        if (testPicture && elem.parentNode) {
          src.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';
        }
      }
      return elem._lazyrias;
    };

    var getX = function(elem) {
      var dpr = window.devicePixelRatio || 1;
      var optimum = lazySizes.getX && lazySizes.getX(elem);
      return Math.min(optimum || dpr, 2.4, dpr);
    };

    var getCandidate = function(elem, width) {
      var sources, i, len, media, srces, src;

      srces = elem._lazyrias;

      if (srces.isPicture && window.matchMedia) {
        for (
          i = 0,
            sources = elem.parentNode.getElementsByTagName('source'),
            len = sources.length;
          i < len;
          i++
        ) {
          if (
            getWSet(sources[i]) &&
            !sources[i].getAttribute('type') &&
            (!(media = sources[i].getAttribute('media')) ||
              (matchMedia(media) || {}).matches)
          ) {
            srces = sources[i]._lazyrias;
            break;
          }
        }
      }

      if (!srces.w || srces.w < width) {
        srces.w = width;
        srces.d = getX(elem);
        src = reduceCandidate(srces.sort(ascendingSort));
      }

      return src;
    };

    var polyfill = function(e) {
      if (e.detail.instance != lazySizes) {
        return;
      }

      var candidate;
      var elem = e.target;

      if (
        !buggySizes &&
        (window.respimage || window.picturefill || lazySizesConfig.pf)
      ) {
        document.removeEventListener('lazybeforesizes', polyfill);
        return;
      }

      if (
        !('_lazyrias' in elem) &&
        (!e.detail.dataAttr || !getWSet(elem, true))
      ) {
        return;
      }

      candidate = getCandidate(elem, e.detail.width);

      if (candidate && candidate.u && elem._lazyrias.cur != candidate.u) {
        elem._lazyrias.cur = candidate.u;
        candidate.cached = true;
        lazySizes.rAF(function() {
          elem.setAttribute(config.srcAttr, candidate.u);
          elem.setAttribute('src', candidate.u);
        });
      }
    };

    if (!supportPicture) {
      addEventListener('lazybeforesizes', polyfill);
    } else {
      polyfill = function() {};
    }

    return polyfill;
  })();
});

(function(window, factory) {
  var lazySizes = factory(window, window.document);
  window.lazySizes = lazySizes;
  if (typeof module == 'object' && module.exports) {
    module.exports = lazySizes;
  }
})(window, function l(window, document) {
  'use strict';
  /*jshint eqnull:true */
  if (!document.getElementsByClassName) {
    return;
  }

  var lazysizes, lazySizesConfig;

  var docElem = document.documentElement;

  var Date = window.Date;

  var supportPicture = window.HTMLPictureElement;

  var _addEventListener = 'addEventListener';

  var _getAttribute = 'getAttribute';

  var addEventListener = window[_addEventListener];

  var setTimeout = window.setTimeout;

  var requestAnimationFrame = window.requestAnimationFrame || setTimeout;

  var requestIdleCallback = window.requestIdleCallback;

  var regPicture = /^picture$/i;

  var loadEvents = ['load', 'error', 'lazyincluded', '_lazyloaded'];

  var regClassCache = {};

  var forEach = Array.prototype.forEach;

  var hasClass = function(ele, cls) {
    if (!regClassCache[cls]) {
      regClassCache[cls] = new RegExp('(\\s|^)' + cls + '(\\s|$)');
    }
    return (
      regClassCache[cls].test(ele[_getAttribute]('class') || '') &&
      regClassCache[cls]
    );
  };

  var addClass = function(ele, cls) {
    if (!hasClass(ele, cls)) {
      ele.setAttribute(
        'class',
        (ele[_getAttribute]('class') || '').trim() + ' ' + cls
      );
    }
  };

  var removeClass = function(ele, cls) {
    var reg;
    if ((reg = hasClass(ele, cls))) {
      ele.setAttribute(
        'class',
        (ele[_getAttribute]('class') || '').replace(reg, ' ')
      );
    }
  };

  var addRemoveLoadEvents = function(dom, fn, add) {
    var action = add ? _addEventListener : 'removeEventListener';
    if (add) {
      addRemoveLoadEvents(dom, fn);
    }
    loadEvents.forEach(function(evt) {
      dom[action](evt, fn);
    });
  };

  var triggerEvent = function(elem, name, detail, noBubbles, noCancelable) {
    var event = document.createEvent('CustomEvent');

    if (!detail) {
      detail = {};
    }

    detail.instance = lazysizes;

    event.initCustomEvent(name, !noBubbles, !noCancelable, detail);

    elem.dispatchEvent(event);
    return event;
  };

  var updatePolyfill = function(el, full) {
    var polyfill;
    if (
      !supportPicture &&
      (polyfill = window.picturefill || lazySizesConfig.pf)
    ) {
      if (full && full.src && !el[_getAttribute]('srcset')) {
        el.setAttribute('srcset', full.src);
      }
      polyfill({reevaluate: true, elements: [el]});
    } else if (full && full.src) {
      el.src = full.src;
    }
  };

  var getCSS = function(elem, style) {
    return (getComputedStyle(elem, null) || {})[style];
  };

  var getWidth = function(elem, parent, width) {
    width = width || elem.offsetWidth;

    while (width < lazySizesConfig.minSize && parent && !elem._lazysizesWidth) {
      width = parent.offsetWidth;
      parent = parent.parentNode;
    }

    return width;
  };

  var rAF = (function() {
    var running, waiting;
    var firstFns = [];
    var secondFns = [];
    var fns = firstFns;

    var run = function() {
      var runFns = fns;

      fns = firstFns.length ? secondFns : firstFns;

      running = true;
      waiting = false;

      while (runFns.length) {
        runFns.shift()();
      }

      running = false;
    };

    var rafBatch = function(fn, queue) {
      if (running && !queue) {
        fn.apply(this, arguments);
      } else {
        fns.push(fn);

        if (!waiting) {
          waiting = true;
          (document.hidden ? setTimeout : requestAnimationFrame)(run);
        }
      }
    };

    rafBatch._lsFlush = run;

    return rafBatch;
  })();

  var rAFIt = function(fn, simple) {
    return simple
      ? function() {
          rAF(fn);
        }
      : function() {
          var that = this;
          var args = arguments;
          rAF(function() {
            fn.apply(that, args);
          });
        };
  };

  var throttle = function(fn) {
    var running;
    var lastTime = 0;
    var gDelay = lazySizesConfig.throttleDelay;
    var rICTimeout = lazySizesConfig.ricTimeout;
    var run = function() {
      running = false;
      lastTime = Date.now();
      fn();
    };
    var idleCallback =
      requestIdleCallback && rICTimeout > 49
        ? function() {
            requestIdleCallback(run, {timeout: rICTimeout});

            if (rICTimeout !== lazySizesConfig.ricTimeout) {
              rICTimeout = lazySizesConfig.ricTimeout;
            }
          }
        : rAFIt(function() {
            setTimeout(run);
          }, true);

    return function(isPriority) {
      var delay;

      if ((isPriority = isPriority === true)) {
        rICTimeout = 33;
      }

      if (running) {
        return;
      }

      running = true;

      delay = gDelay - (Date.now() - lastTime);

      if (delay < 0) {
        delay = 0;
      }

      if (isPriority || delay < 9) {
        idleCallback();
      } else {
        setTimeout(idleCallback, delay);
      }
    };
  };

  //based on http://modernjavascript.blogspot.de/2013/08/building-better-debounce.html
  var debounce = function(func) {
    var timeout, timestamp;
    var wait = 99;
    var run = function() {
      timeout = null;
      func();
    };
    var later = function() {
      var last = Date.now() - timestamp;

      if (last < wait) {
        setTimeout(later, wait - last);
      } else {
        (requestIdleCallback || run)(run);
      }
    };

    return function() {
      timestamp = Date.now();

      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
    };
  };

  (function() {
    var prop;

    var lazySizesDefaults = {
      lazyClass: 'lazyload',
      loadedClass: 'lazyloaded',
      loadingClass: 'lazyloading',
      preloadClass: 'lazypreload',
      errorClass: 'lazyerror',
      //strictClass: 'lazystrict',
      autosizesClass: 'lazyautosizes',
      srcAttr: 'data-src',
      srcsetAttr: 'data-srcset',
      sizesAttr: 'data-sizes',
      //preloadAfterLoad: false,
      minSize: 40,
      customMedia: {},
      init: true,
      expFactor: 1.5,
      hFac: 0.8,
      loadMode: 2,
      loadHidden: true,
      ricTimeout: 0,
      throttleDelay: 125,
    };

    lazySizesConfig = window.lazySizesConfig || window.lazysizesConfig || {};

    for (prop in lazySizesDefaults) {
      if (!(prop in lazySizesConfig)) {
        lazySizesConfig[prop] = lazySizesDefaults[prop];
      }
    }

    window.lazySizesConfig = lazySizesConfig;

    setTimeout(function() {
      if (lazySizesConfig.init) {
        init();
      }
    });
  })();

  var loader = (function() {
    var preloadElems, isCompleted, resetPreloadingTimer, loadMode, started;

    var eLvW, elvH, eLtop, eLleft, eLright, eLbottom;

    var defaultExpand, preloadExpand, hFac;

    var regImg = /^img$/i;
    var regIframe = /^iframe$/i;

    var supportScroll =
      'onscroll' in window && !/(gle|ing)bot/.test(navigator.userAgent);

    var shrinkExpand = 0;
    var currentExpand = 0;

    var isLoading = 0;
    var lowRuns = -1;

    var resetPreloading = function(e) {
      isLoading--;
      if (e && e.target) {
        addRemoveLoadEvents(e.target, resetPreloading);
      }

      if (!e || isLoading < 0 || !e.target) {
        isLoading = 0;
      }
    };

    var isNestedVisible = function(elem, elemExpand) {
      var outerRect;
      var parent = elem;
      var visible =
        getCSS(document.body, 'visibility') == 'hidden' ||
        (getCSS(elem.parentNode, 'visibility') != 'hidden' &&
          getCSS(elem, 'visibility') != 'hidden');

      eLtop -= elemExpand;
      eLbottom += elemExpand;
      eLleft -= elemExpand;
      eLright += elemExpand;

      while (
        visible &&
        (parent = parent.offsetParent) &&
        parent != document.body &&
        parent != docElem
      ) {
        visible = (getCSS(parent, 'opacity') || 1) > 0;

        if (visible && getCSS(parent, 'overflow') != 'visible') {
          outerRect = parent.getBoundingClientRect();
          visible =
            eLright > outerRect.left &&
            eLleft < outerRect.right &&
            eLbottom > outerRect.top - 1 &&
            eLtop < outerRect.bottom + 1;
        }
      }

      return visible;
    };

    var checkElements = function() {
      var eLlen,
        i,
        rect,
        autoLoadElem,
        loadedSomething,
        elemExpand,
        elemNegativeExpand,
        elemExpandVal,
        beforeExpandVal;

      var lazyloadElems = lazysizes.elements;

      if (
        (loadMode = lazySizesConfig.loadMode) &&
        isLoading < 8 &&
        (eLlen = lazyloadElems.length)
      ) {
        i = 0;

        lowRuns++;

        if (preloadExpand == null) {
          if (!('expand' in lazySizesConfig)) {
            lazySizesConfig.expand =
              docElem.clientHeight > 500 && docElem.clientWidth > 500
                ? 500
                : 370;
          }

          defaultExpand = lazySizesConfig.expand;
          preloadExpand = defaultExpand * lazySizesConfig.expFactor;
        }

        if (
          currentExpand < preloadExpand &&
          isLoading < 1 &&
          lowRuns > 2 &&
          loadMode > 2 &&
          !document.hidden
        ) {
          currentExpand = preloadExpand;
          lowRuns = 0;
        } else if (loadMode > 1 && lowRuns > 1 && isLoading < 6) {
          currentExpand = defaultExpand;
        } else {
          currentExpand = shrinkExpand;
        }

        for (; i < eLlen; i++) {
          if (!lazyloadElems[i] || lazyloadElems[i]._lazyRace) {
            continue;
          }

          if (!supportScroll) {
            unveilElement(lazyloadElems[i]);
            continue;
          }

          if (
            !(elemExpandVal = lazyloadElems[i][_getAttribute]('data-expand')) ||
            !(elemExpand = elemExpandVal * 1)
          ) {
            elemExpand = currentExpand;
          }

          if (beforeExpandVal !== elemExpand) {
            eLvW = innerWidth + elemExpand * hFac;
            elvH = innerHeight + elemExpand;
            elemNegativeExpand = elemExpand * -1;
            beforeExpandVal = elemExpand;
          }

          rect = lazyloadElems[i].getBoundingClientRect();

          if (
            (eLbottom = rect.bottom) >= elemNegativeExpand &&
            (eLtop = rect.top) <= elvH &&
            (eLright = rect.right) >= elemNegativeExpand * hFac &&
            (eLleft = rect.left) <= eLvW &&
            (eLbottom || eLright || eLleft || eLtop) &&
            (lazySizesConfig.loadHidden ||
              getCSS(lazyloadElems[i], 'visibility') != 'hidden') &&
            ((isCompleted &&
              isLoading < 3 &&
              !elemExpandVal &&
              (loadMode < 3 || lowRuns < 4)) ||
              isNestedVisible(lazyloadElems[i], elemExpand))
          ) {
            unveilElement(lazyloadElems[i]);
            loadedSomething = true;
            if (isLoading > 9) {
              break;
            }
          } else if (
            !loadedSomething &&
            isCompleted &&
            !autoLoadElem &&
            isLoading < 4 &&
            lowRuns < 4 &&
            loadMode > 2 &&
            (preloadElems[0] || lazySizesConfig.preloadAfterLoad) &&
            (preloadElems[0] ||
              (!elemExpandVal &&
                (eLbottom ||
                  eLright ||
                  eLleft ||
                  eLtop ||
                  lazyloadElems[i][_getAttribute](lazySizesConfig.sizesAttr) !=
                    'auto')))
          ) {
            autoLoadElem = preloadElems[0] || lazyloadElems[i];
          }
        }

        if (autoLoadElem && !loadedSomething) {
          unveilElement(autoLoadElem);
        }
      }
    };

    var throttledCheckElements = throttle(checkElements);

    var switchLoadingClass = function(e) {
      addClass(e.target, lazySizesConfig.loadedClass);
      removeClass(e.target, lazySizesConfig.loadingClass);
      addRemoveLoadEvents(e.target, rafSwitchLoadingClass);
      triggerEvent(e.target, 'lazyloaded');
    };
    var rafedSwitchLoadingClass = rAFIt(switchLoadingClass);
    var rafSwitchLoadingClass = function(e) {
      rafedSwitchLoadingClass({target: e.target});
    };

    var changeIframeSrc = function(elem, src) {
      try {
        elem.contentWindow.location.replace(src);
      } catch (e) {
        elem.src = src;
      }
    };

    var handleSources = function(source) {
      var customMedia;

      var sourceSrcset = source[_getAttribute](lazySizesConfig.srcsetAttr);

      if (
        (customMedia =
          lazySizesConfig.customMedia[
            source[_getAttribute]('data-media') ||
              source[_getAttribute]('media')
          ])
      ) {
        source.setAttribute('media', customMedia);
      }

      if (sourceSrcset) {
        source.setAttribute('srcset', sourceSrcset);
      }
    };

    var lazyUnveil = rAFIt(function(elem, detail, isAuto, sizes, isImg) {
      var src, srcset, parent, isPicture, event, firesLoad;

      if (
        !(event = triggerEvent(elem, 'lazybeforeunveil', detail))
          .defaultPrevented
      ) {
        if (sizes) {
          if (isAuto) {
            addClass(elem, lazySizesConfig.autosizesClass);
          } else {
            elem.setAttribute('sizes', sizes);
          }
        }

        srcset = elem[_getAttribute](lazySizesConfig.srcsetAttr);
        src = elem[_getAttribute](lazySizesConfig.srcAttr);

        if (isImg) {
          parent = elem.parentNode;
          isPicture = parent && regPicture.test(parent.nodeName || '');
        }

        firesLoad =
          detail.firesLoad || ('src' in elem && (srcset || src || isPicture));

        event = {target: elem};

        if (firesLoad) {
          addRemoveLoadEvents(elem, resetPreloading, true);
          clearTimeout(resetPreloadingTimer);
          resetPreloadingTimer = setTimeout(resetPreloading, 2500);

          addClass(elem, lazySizesConfig.loadingClass);
          addRemoveLoadEvents(elem, rafSwitchLoadingClass, true);
        }

        if (isPicture) {
          forEach.call(parent.getElementsByTagName('source'), handleSources);
        }

        if (srcset) {
          elem.setAttribute('srcset', srcset);
        } else if (src && !isPicture) {
          if (regIframe.test(elem.nodeName)) {
            changeIframeSrc(elem, src);
          } else {
            elem.src = src;
          }
        }

        if (isImg && (srcset || isPicture)) {
          updatePolyfill(elem, {src: src});
        }
      }

      if (elem._lazyRace) {
        delete elem._lazyRace;
      }
      removeClass(elem, lazySizesConfig.lazyClass);

      rAF(function() {
        if (!firesLoad || (elem.complete && elem.naturalWidth > 1)) {
          if (firesLoad) {
            resetPreloading(event);
          } else {
            isLoading--;
          }
          switchLoadingClass(event);
        }
      }, true);
    });

    var unveilElement = function(elem) {
      var detail;

      var isImg = regImg.test(elem.nodeName);

      //allow using sizes="auto", but don't use. it's invalid. Use data-sizes="auto" or a valid value for sizes instead (i.e.: sizes="80vw")
      var sizes =
        isImg &&
        (elem[_getAttribute](lazySizesConfig.sizesAttr) ||
          elem[_getAttribute]('sizes'));
      var isAuto = sizes == 'auto';

      if (
        (isAuto || !isCompleted) &&
        isImg &&
        (elem[_getAttribute]('src') || elem.srcset) &&
        !elem.complete &&
        !hasClass(elem, lazySizesConfig.errorClass) &&
        hasClass(elem, lazySizesConfig.lazyClass)
      ) {
        return;
      }

      detail = triggerEvent(elem, 'lazyunveilread').detail;

      if (isAuto) {
        autoSizer.updateElem(elem, true, elem.offsetWidth);
      }

      elem._lazyRace = true;
      isLoading++;

      lazyUnveil(elem, detail, isAuto, sizes, isImg);
    };

    var onload = function() {
      if (isCompleted) {
        return;
      }
      if (Date.now() - started < 999) {
        setTimeout(onload, 999);
        return;
      }
      var afterScroll = debounce(function() {
        lazySizesConfig.loadMode = 3;
        throttledCheckElements();
      });

      isCompleted = true;

      lazySizesConfig.loadMode = 3;

      throttledCheckElements();

      addEventListener(
        'scroll',
        function() {
          if (lazySizesConfig.loadMode == 3) {
            lazySizesConfig.loadMode = 2;
          }
          afterScroll();
        },
        true
      );
    };

    return {
      _: function() {
        started = Date.now();

        lazysizes.elements = document.getElementsByClassName(
          lazySizesConfig.lazyClass
        );
        preloadElems = document.getElementsByClassName(
          lazySizesConfig.lazyClass + ' ' + lazySizesConfig.preloadClass
        );
        hFac = lazySizesConfig.hFac;

        addEventListener('scroll', throttledCheckElements, true);

        addEventListener('resize', throttledCheckElements, true);

        if (window.MutationObserver) {
          new MutationObserver(throttledCheckElements).observe(docElem, {
            childList: true,
            subtree: true,
            attributes: true,
          });
        } else {
          docElem[_addEventListener](
            'DOMNodeInserted',
            throttledCheckElements,
            true
          );
          docElem[_addEventListener](
            'DOMAttrModified',
            throttledCheckElements,
            true
          );
          setInterval(throttledCheckElements, 999);
        }

        addEventListener('hashchange', throttledCheckElements, true);

        //, 'fullscreenchange'
        [
          'focus',
          'mouseover',
          'click',
          'load',
          'transitionend',
          'animationend',
          'webkitAnimationEnd',
        ].forEach(function(name) {
          document[_addEventListener](name, throttledCheckElements, true);
        });

        if (/d$|^c/.test(document.readyState)) {
          onload();
        } else {
          addEventListener('load', onload);
          document[_addEventListener](
            'DOMContentLoaded',
            throttledCheckElements
          );
          setTimeout(onload, 20000);
        }

        if (lazysizes.elements.length) {
          checkElements();
          rAF._lsFlush();
        } else {
          throttledCheckElements();
        }
      },
      checkElems: throttledCheckElements,
      unveil: unveilElement,
    };
  })();

  var autoSizer = (function() {
    var autosizesElems;

    var sizeElement = rAFIt(function(elem, parent, event, width) {
      var sources, i, len;
      elem._lazysizesWidth = width;
      width += 'px';

      elem.setAttribute('sizes', width);

      if (regPicture.test(parent.nodeName || '')) {
        sources = parent.getElementsByTagName('source');
        for (i = 0, len = sources.length; i < len; i++) {
          sources[i].setAttribute('sizes', width);
        }
      }

      if (!event.detail.dataAttr) {
        updatePolyfill(elem, event.detail);
      }
    });
    var getSizeElement = function(elem, dataAttr, width) {
      var event;
      var parent = elem.parentNode;

      if (parent) {
        width = getWidth(elem, parent, width);
        event = triggerEvent(elem, 'lazybeforesizes', {
          width: width,
          dataAttr: !!dataAttr,
        });

        if (!event.defaultPrevented) {
          width = event.detail.width;

          if (width && width !== elem._lazysizesWidth) {
            sizeElement(elem, parent, event, width);
          }
        }
      }
    };

    var updateElementsSizes = function() {
      var i;
      var len = autosizesElems.length;
      if (len) {
        i = 0;

        for (; i < len; i++) {
          getSizeElement(autosizesElems[i]);
        }
      }
    };

    var debouncedUpdateElementsSizes = debounce(updateElementsSizes);

    return {
      _: function() {
        autosizesElems = document.getElementsByClassName(
          lazySizesConfig.autosizesClass
        );
        addEventListener('resize', debouncedUpdateElementsSizes);
      },
      checkElems: debouncedUpdateElementsSizes,
      updateElem: getSizeElement,
    };
  })();

  var init = function() {
    if (!init.i) {
      init.i = true;
      autoSizer._();
      loader._();
    }
  };

  lazysizes = {
    cfg: lazySizesConfig,
    autoSizer: autoSizer,
    loader: loader,
    init: init,
    uP: updatePolyfill,
    aC: addClass,
    rC: removeClass,
    hC: hasClass,
    fire: triggerEvent,
    gW: getWidth,
    rAF: rAF,
  };

  return lazysizes;
});

