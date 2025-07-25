(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["TestChimpSDK"] = factory();
	else
		root["TestChimpSDK"] = factory();
})(this, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./node_modules/rrweb/dist/rrweb.js
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var _a;
var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var NodeType$2 = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["Document"] = 0] = "Document";
  NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
  NodeType2[NodeType2["Element"] = 2] = "Element";
  NodeType2[NodeType2["Text"] = 3] = "Text";
  NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
  NodeType2[NodeType2["Comment"] = 5] = "Comment";
  return NodeType2;
})(NodeType$2 || {});
function isElement(n2) {
  return n2.nodeType === n2.ELEMENT_NODE;
}
function isShadowRoot(n2) {
  const host = n2 == null ? void 0 : n2.host;
  return Boolean((host == null ? void 0 : host.shadowRoot) === n2);
}
function isNativeShadowDom(shadowRoot) {
  return Object.prototype.toString.call(shadowRoot) === "[object ShadowRoot]";
}
function fixBrowserCompatibilityIssuesInCSS(cssText) {
  if (cssText.includes(" background-clip: text;") && !cssText.includes(" -webkit-background-clip: text;")) {
    cssText = cssText.replace(
      /\sbackground-clip:\s*text;/g,
      " -webkit-background-clip: text; background-clip: text;"
    );
  }
  return cssText;
}
function escapeImportStatement(rule) {
  const { cssText } = rule;
  if (cssText.split('"').length < 3)
    return cssText;
  const statement = ["@import", `url(${JSON.stringify(rule.href)})`];
  if (rule.layerName === "") {
    statement.push(`layer`);
  } else if (rule.layerName) {
    statement.push(`layer(${rule.layerName})`);
  }
  if (rule.supportsText) {
    statement.push(`supports(${rule.supportsText})`);
  }
  if (rule.media.length) {
    statement.push(rule.media.mediaText);
  }
  return statement.join(" ") + ";";
}
function stringifyStylesheet(s2) {
  try {
    const rules2 = s2.rules || s2.cssRules;
    return rules2 ? fixBrowserCompatibilityIssuesInCSS(
      Array.from(rules2, stringifyRule).join("")
    ) : null;
  } catch (error) {
    return null;
  }
}
function stringifyRule(rule) {
  let importStringified;
  if (isCSSImportRule(rule)) {
    try {
      importStringified = // for same-origin stylesheets,
      // we can access the imported stylesheet rules directly
      stringifyStylesheet(rule.styleSheet) || // work around browser issues with the raw string `@import url(...)` statement
      escapeImportStatement(rule);
    } catch (error) {
    }
  } else if (isCSSStyleRule(rule) && rule.selectorText.includes(":")) {
    return fixSafariColons(rule.cssText);
  }
  return importStringified || rule.cssText;
}
function fixSafariColons(cssStringified) {
  const regex = /(\[(?:[\w-]+)[^\\])(:(?:[\w-]+)\])/gm;
  return cssStringified.replace(regex, "$1\\$2");
}
function isCSSImportRule(rule) {
  return "styleSheet" in rule;
}
function isCSSStyleRule(rule) {
  return "selectorText" in rule;
}
class Mirror {
  constructor() {
    __publicField$1(this, "idNodeMap", /* @__PURE__ */ new Map());
    __publicField$1(this, "nodeMetaMap", /* @__PURE__ */ new WeakMap());
  }
  getId(n2) {
    var _a2;
    if (!n2)
      return -1;
    const id = (_a2 = this.getMeta(n2)) == null ? void 0 : _a2.id;
    return id ?? -1;
  }
  getNode(id) {
    return this.idNodeMap.get(id) || null;
  }
  getIds() {
    return Array.from(this.idNodeMap.keys());
  }
  getMeta(n2) {
    return this.nodeMetaMap.get(n2) || null;
  }
  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n2) {
    const id = this.getId(n2);
    this.idNodeMap.delete(id);
    if (n2.childNodes) {
      n2.childNodes.forEach(
        (childNode) => this.removeNodeFromMap(childNode)
      );
    }
  }
  has(id) {
    return this.idNodeMap.has(id);
  }
  hasNode(node) {
    return this.nodeMetaMap.has(node);
  }
  add(n2, meta) {
    const id = meta.id;
    this.idNodeMap.set(id, n2);
    this.nodeMetaMap.set(n2, meta);
  }
  replace(id, n2) {
    const oldNode = this.getNode(id);
    if (oldNode) {
      const meta = this.nodeMetaMap.get(oldNode);
      if (meta)
        this.nodeMetaMap.set(n2, meta);
    }
    this.idNodeMap.set(id, n2);
  }
  reset() {
    this.idNodeMap = /* @__PURE__ */ new Map();
    this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
  }
}
function createMirror$2() {
  return new Mirror();
}
function maskInputValue({
  element,
  maskInputOptions,
  tagName,
  type,
  value,
  maskInputFn
}) {
  let text = value || "";
  const actualType = type && toLowerCase(type);
  if (maskInputOptions[tagName.toLowerCase()] || actualType && maskInputOptions[actualType]) {
    if (maskInputFn) {
      text = maskInputFn(text, element);
    } else {
      text = "*".repeat(text.length);
    }
  }
  return text;
}
function toLowerCase(str) {
  return str.toLowerCase();
}
const ORIGINAL_ATTRIBUTE_NAME = "__rrweb_original__";
function is2DCanvasBlank(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx)
    return true;
  const chunkSize = 50;
  for (let x = 0; x < canvas.width; x += chunkSize) {
    for (let y = 0; y < canvas.height; y += chunkSize) {
      const getImageData = ctx.getImageData;
      const originalGetImageData = ORIGINAL_ATTRIBUTE_NAME in getImageData ? getImageData[ORIGINAL_ATTRIBUTE_NAME] : getImageData;
      const pixelBuffer = new Uint32Array(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        originalGetImageData.call(
          ctx,
          x,
          y,
          Math.min(chunkSize, canvas.width - x),
          Math.min(chunkSize, canvas.height - y)
        ).data.buffer
      );
      if (pixelBuffer.some((pixel) => pixel !== 0))
        return false;
    }
  }
  return true;
}
function isNodeMetaEqual(a2, b) {
  if (!a2 || !b || a2.type !== b.type)
    return false;
  if (a2.type === NodeType$2.Document)
    return a2.compatMode === b.compatMode;
  else if (a2.type === NodeType$2.DocumentType)
    return a2.name === b.name && a2.publicId === b.publicId && a2.systemId === b.systemId;
  else if (a2.type === NodeType$2.Comment || a2.type === NodeType$2.Text || a2.type === NodeType$2.CDATA)
    return a2.textContent === b.textContent;
  else if (a2.type === NodeType$2.Element)
    return a2.tagName === b.tagName && JSON.stringify(a2.attributes) === JSON.stringify(b.attributes) && a2.isSVG === b.isSVG && a2.needBlock === b.needBlock;
  return false;
}
function getInputType(element) {
  const type = element.type;
  return element.hasAttribute("data-rr-is-password") ? "password" : type ? (
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    toLowerCase(type)
  ) : null;
}
function extractFileExtension(path, baseURL) {
  let url;
  try {
    url = new URL(path, baseURL ?? window.location.href);
  } catch (err) {
    return null;
  }
  const regex = /\.([0-9a-z]+)(?:$)/i;
  const match = url.pathname.match(regex);
  return (match == null ? void 0 : match[1]) ?? null;
}
let _id = 1;
const tagNameRegex = new RegExp("[^a-z0-9-_:]");
const IGNORED_NODE = -2;
function genId() {
  return _id++;
}
function getValidTagName$1(element) {
  if (element instanceof HTMLFormElement) {
    return "form";
  }
  const processedTagName = toLowerCase(element.tagName);
  if (tagNameRegex.test(processedTagName)) {
    return "div";
  }
  return processedTagName;
}
function extractOrigin(url) {
  let origin = "";
  if (url.indexOf("//") > -1) {
    origin = url.split("/").slice(0, 3).join("/");
  } else {
    origin = url.split("/")[0];
  }
  origin = origin.split("?")[0];
  return origin;
}
let canvasService;
let canvasCtx;
const URL_IN_CSS_REF = /url\((?:(')([^']*)'|(")(.*?)"|([^)]*))\)/gm;
const URL_PROTOCOL_MATCH = /^(?:[a-z+]+:)?\/\//i;
const URL_WWW_MATCH = /^www\..*/i;
const DATA_URI = /^(data:)([^,]*),(.*)/i;
function absoluteToStylesheet(cssText, href) {
  return (cssText || "").replace(
    URL_IN_CSS_REF,
    (origin, quote1, path1, quote2, path2, path3) => {
      const filePath = path1 || path2 || path3;
      const maybeQuote = quote1 || quote2 || "";
      if (!filePath) {
        return origin;
      }
      if (URL_PROTOCOL_MATCH.test(filePath) || URL_WWW_MATCH.test(filePath)) {
        return `url(${maybeQuote}${filePath}${maybeQuote})`;
      }
      if (DATA_URI.test(filePath)) {
        return `url(${maybeQuote}${filePath}${maybeQuote})`;
      }
      if (filePath[0] === "/") {
        return `url(${maybeQuote}${extractOrigin(href) + filePath}${maybeQuote})`;
      }
      const stack = href.split("/");
      const parts = filePath.split("/");
      stack.pop();
      for (const part of parts) {
        if (part === ".") {
          continue;
        } else if (part === "..") {
          stack.pop();
        } else {
          stack.push(part);
        }
      }
      return `url(${maybeQuote}${stack.join("/")}${maybeQuote})`;
    }
  );
}
const SRCSET_NOT_SPACES = /^[^ \t\n\r\u000c]+/;
const SRCSET_COMMAS_OR_SPACES = /^[, \t\n\r\u000c]+/;
function getAbsoluteSrcsetString(doc, attributeValue) {
  if (attributeValue.trim() === "") {
    return attributeValue;
  }
  let pos = 0;
  function collectCharacters(regEx) {
    let chars2;
    const match = regEx.exec(attributeValue.substring(pos));
    if (match) {
      chars2 = match[0];
      pos += chars2.length;
      return chars2;
    }
    return "";
  }
  const output = [];
  while (true) {
    collectCharacters(SRCSET_COMMAS_OR_SPACES);
    if (pos >= attributeValue.length) {
      break;
    }
    let url = collectCharacters(SRCSET_NOT_SPACES);
    if (url.slice(-1) === ",") {
      url = absoluteToDoc(doc, url.substring(0, url.length - 1));
      output.push(url);
    } else {
      let descriptorsStr = "";
      url = absoluteToDoc(doc, url);
      let inParens = false;
      while (true) {
        const c2 = attributeValue.charAt(pos);
        if (c2 === "") {
          output.push((url + descriptorsStr).trim());
          break;
        } else if (!inParens) {
          if (c2 === ",") {
            pos += 1;
            output.push((url + descriptorsStr).trim());
            break;
          } else if (c2 === "(") {
            inParens = true;
          }
        } else {
          if (c2 === ")") {
            inParens = false;
          }
        }
        descriptorsStr += c2;
        pos += 1;
      }
    }
  }
  return output.join(", ");
}
const cachedDocument = /* @__PURE__ */ new WeakMap();
function absoluteToDoc(doc, attributeValue) {
  if (!attributeValue || attributeValue.trim() === "") {
    return attributeValue;
  }
  return getHref(doc, attributeValue);
}
function isSVGElement(el) {
  return Boolean(el.tagName === "svg" || el.ownerSVGElement);
}
function getHref(doc, customHref) {
  let a2 = cachedDocument.get(doc);
  if (!a2) {
    a2 = doc.createElement("a");
    cachedDocument.set(doc, a2);
  }
  if (!customHref) {
    customHref = "";
  } else if (customHref.startsWith("blob:") || customHref.startsWith("data:")) {
    return customHref;
  }
  a2.setAttribute("href", customHref);
  return a2.href;
}
function transformAttribute(doc, tagName, name, value) {
  if (!value) {
    return value;
  }
  if (name === "src" || name === "href" && !(tagName === "use" && value[0] === "#")) {
    return absoluteToDoc(doc, value);
  } else if (name === "xlink:href" && value[0] !== "#") {
    return absoluteToDoc(doc, value);
  } else if (name === "background" && (tagName === "table" || tagName === "td" || tagName === "th")) {
    return absoluteToDoc(doc, value);
  } else if (name === "srcset") {
    return getAbsoluteSrcsetString(doc, value);
  } else if (name === "style") {
    return absoluteToStylesheet(value, getHref(doc));
  } else if (tagName === "object" && name === "data") {
    return absoluteToDoc(doc, value);
  }
  return value;
}
function ignoreAttribute(tagName, name, _value) {
  return (tagName === "video" || tagName === "audio") && name === "autoplay";
}
function _isBlockedElement(element, blockClass, blockSelector) {
  try {
    if (typeof blockClass === "string") {
      if (element.classList.contains(blockClass)) {
        return true;
      }
    } else {
      for (let eIndex = element.classList.length; eIndex--; ) {
        const className = element.classList[eIndex];
        if (blockClass.test(className)) {
          return true;
        }
      }
    }
    if (blockSelector) {
      return element.matches(blockSelector);
    }
  } catch (e2) {
  }
  return false;
}
function classMatchesRegex(node, regex, checkAncestors) {
  if (!node)
    return false;
  if (node.nodeType !== node.ELEMENT_NODE) {
    if (!checkAncestors)
      return false;
    return classMatchesRegex(node.parentNode, regex, checkAncestors);
  }
  for (let eIndex = node.classList.length; eIndex--; ) {
    const className = node.classList[eIndex];
    if (regex.test(className)) {
      return true;
    }
  }
  if (!checkAncestors)
    return false;
  return classMatchesRegex(node.parentNode, regex, checkAncestors);
}
function needMaskingText(node, maskTextClass, maskTextSelector, checkAncestors) {
  try {
    const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
    if (el === null)
      return false;
    if (typeof maskTextClass === "string") {
      if (checkAncestors) {
        if (el.closest(`.${maskTextClass}`))
          return true;
      } else {
        if (el.classList.contains(maskTextClass))
          return true;
      }
    } else {
      if (classMatchesRegex(el, maskTextClass, checkAncestors))
        return true;
    }
    if (maskTextSelector) {
      if (checkAncestors) {
        if (el.closest(maskTextSelector))
          return true;
      } else {
        if (el.matches(maskTextSelector))
          return true;
      }
    }
  } catch (e2) {
  }
  return false;
}
function onceIframeLoaded(iframeEl, listener, iframeLoadTimeout) {
  const win = iframeEl.contentWindow;
  if (!win) {
    return;
  }
  let fired = false;
  let readyState;
  try {
    readyState = win.document.readyState;
  } catch (error) {
    return;
  }
  if (readyState !== "complete") {
    const timer = setTimeout(() => {
      if (!fired) {
        listener();
        fired = true;
      }
    }, iframeLoadTimeout);
    iframeEl.addEventListener("load", () => {
      clearTimeout(timer);
      fired = true;
      listener();
    });
    return;
  }
  const blankUrl = "about:blank";
  if (win.location.href !== blankUrl || iframeEl.src === blankUrl || iframeEl.src === "") {
    setTimeout(listener, 0);
    return iframeEl.addEventListener("load", listener);
  }
  iframeEl.addEventListener("load", listener);
}
function onceStylesheetLoaded(link, listener, styleSheetLoadTimeout) {
  let fired = false;
  let styleSheetLoaded;
  try {
    styleSheetLoaded = link.sheet;
  } catch (error) {
    return;
  }
  if (styleSheetLoaded)
    return;
  const timer = setTimeout(() => {
    if (!fired) {
      listener();
      fired = true;
    }
  }, styleSheetLoadTimeout);
  link.addEventListener("load", () => {
    clearTimeout(timer);
    fired = true;
    listener();
  });
}
function serializeNode(n2, options) {
  const {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    needsMask,
    inlineStylesheet,
    maskInputOptions = {},
    maskTextFn,
    maskInputFn,
    dataURLOptions = {},
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement = false
  } = options;
  const rootId = getRootId(doc, mirror2);
  switch (n2.nodeType) {
    case n2.DOCUMENT_NODE:
      if (n2.compatMode !== "CSS1Compat") {
        return {
          type: NodeType$2.Document,
          childNodes: [],
          compatMode: n2.compatMode
          // probably "BackCompat"
        };
      } else {
        return {
          type: NodeType$2.Document,
          childNodes: []
        };
      }
    case n2.DOCUMENT_TYPE_NODE:
      return {
        type: NodeType$2.DocumentType,
        name: n2.name,
        publicId: n2.publicId,
        systemId: n2.systemId,
        rootId
      };
    case n2.ELEMENT_NODE:
      return serializeElementNode(n2, {
        doc,
        blockClass,
        blockSelector,
        inlineStylesheet,
        maskInputOptions,
        maskInputFn,
        dataURLOptions,
        inlineImages,
        recordCanvas,
        keepIframeSrcFn,
        newlyAddedElement,
        rootId
      });
    case n2.TEXT_NODE:
      return serializeTextNode(n2, {
        doc,
        needsMask,
        maskTextFn,
        rootId
      });
    case n2.CDATA_SECTION_NODE:
      return {
        type: NodeType$2.CDATA,
        textContent: "",
        rootId
      };
    case n2.COMMENT_NODE:
      return {
        type: NodeType$2.Comment,
        textContent: n2.textContent || "",
        rootId
      };
    default:
      return false;
  }
}
function getRootId(doc, mirror2) {
  if (!mirror2.hasNode(doc))
    return void 0;
  const docId = mirror2.getId(doc);
  return docId === 1 ? void 0 : docId;
}
function serializeTextNode(n2, options) {
  var _a2;
  const { needsMask, maskTextFn, rootId } = options;
  const parentTagName = n2.parentNode && n2.parentNode.tagName;
  let textContent = n2.textContent;
  const isStyle = parentTagName === "STYLE" ? true : void 0;
  const isScript = parentTagName === "SCRIPT" ? true : void 0;
  if (isStyle && textContent) {
    try {
      if (n2.nextSibling || n2.previousSibling) {
      } else if ((_a2 = n2.parentNode.sheet) == null ? void 0 : _a2.cssRules) {
        textContent = stringifyStylesheet(
          n2.parentNode.sheet
        );
      }
    } catch (err) {
      console.warn(
        `Cannot get CSS styles from text's parentNode. Error: ${err}`,
        n2
      );
    }
    textContent = absoluteToStylesheet(textContent, getHref(options.doc));
  }
  if (isScript) {
    textContent = "SCRIPT_PLACEHOLDER";
  }
  if (!isStyle && !isScript && textContent && needsMask) {
    textContent = maskTextFn ? maskTextFn(textContent, n2.parentElement) : textContent.replace(/[\S]/g, "*");
  }
  return {
    type: NodeType$2.Text,
    textContent: textContent || "",
    isStyle,
    rootId
  };
}
function serializeElementNode(n2, options) {
  const {
    doc,
    blockClass,
    blockSelector,
    inlineStylesheet,
    maskInputOptions = {},
    maskInputFn,
    dataURLOptions = {},
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement = false,
    rootId
  } = options;
  const needBlock = _isBlockedElement(n2, blockClass, blockSelector);
  const tagName = getValidTagName$1(n2);
  let attributes2 = {};
  const len = n2.attributes.length;
  for (let i2 = 0; i2 < len; i2++) {
    const attr = n2.attributes[i2];
    if (!ignoreAttribute(tagName, attr.name, attr.value)) {
      attributes2[attr.name] = transformAttribute(
        doc,
        tagName,
        toLowerCase(attr.name),
        attr.value
      );
    }
  }
  if (tagName === "link" && inlineStylesheet) {
    const stylesheet = Array.from(doc.styleSheets).find((s2) => {
      return s2.href === n2.href;
    });
    let cssText = null;
    if (stylesheet) {
      cssText = stringifyStylesheet(stylesheet);
    }
    if (cssText) {
      delete attributes2.rel;
      delete attributes2.href;
      attributes2._cssText = absoluteToStylesheet(cssText, stylesheet.href);
    }
  }
  if (tagName === "style" && n2.sheet && // TODO: Currently we only try to get dynamic stylesheet when it is an empty style element
  !(n2.innerText || n2.textContent || "").trim().length) {
    const cssText = stringifyStylesheet(
      n2.sheet
    );
    if (cssText) {
      attributes2._cssText = absoluteToStylesheet(cssText, getHref(doc));
    }
  }
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    const value = n2.value;
    const checked = n2.checked;
    if (attributes2.type !== "radio" && attributes2.type !== "checkbox" && attributes2.type !== "submit" && attributes2.type !== "button" && value) {
      attributes2.value = maskInputValue({
        element: n2,
        type: getInputType(n2),
        tagName,
        value,
        maskInputOptions,
        maskInputFn
      });
    } else if (checked) {
      attributes2.checked = checked;
    }
  }
  if (tagName === "option") {
    if (n2.selected && !maskInputOptions["select"]) {
      attributes2.selected = true;
    } else {
      delete attributes2.selected;
    }
  }
  if (tagName === "canvas" && recordCanvas) {
    if (n2.__context === "2d") {
      if (!is2DCanvasBlank(n2)) {
        attributes2.rr_dataURL = n2.toDataURL(
          dataURLOptions.type,
          dataURLOptions.quality
        );
      }
    } else if (!("__context" in n2)) {
      const canvasDataURL = n2.toDataURL(
        dataURLOptions.type,
        dataURLOptions.quality
      );
      const blankCanvas = doc.createElement("canvas");
      blankCanvas.width = n2.width;
      blankCanvas.height = n2.height;
      const blankCanvasDataURL = blankCanvas.toDataURL(
        dataURLOptions.type,
        dataURLOptions.quality
      );
      if (canvasDataURL !== blankCanvasDataURL) {
        attributes2.rr_dataURL = canvasDataURL;
      }
    }
  }
  if (tagName === "img" && inlineImages) {
    if (!canvasService) {
      canvasService = doc.createElement("canvas");
      canvasCtx = canvasService.getContext("2d");
    }
    const image = n2;
    const imageSrc = image.currentSrc || image.getAttribute("src") || "<unknown-src>";
    const priorCrossOrigin = image.crossOrigin;
    const recordInlineImage = () => {
      image.removeEventListener("load", recordInlineImage);
      try {
        canvasService.width = image.naturalWidth;
        canvasService.height = image.naturalHeight;
        canvasCtx.drawImage(image, 0, 0);
        attributes2.rr_dataURL = canvasService.toDataURL(
          dataURLOptions.type,
          dataURLOptions.quality
        );
      } catch (err) {
        if (image.crossOrigin !== "anonymous") {
          image.crossOrigin = "anonymous";
          if (image.complete && image.naturalWidth !== 0)
            recordInlineImage();
          else
            image.addEventListener("load", recordInlineImage);
          return;
        } else {
          console.warn(
            `Cannot inline img src=${imageSrc}! Error: ${err}`
          );
        }
      }
      if (image.crossOrigin === "anonymous") {
        priorCrossOrigin ? attributes2.crossOrigin = priorCrossOrigin : image.removeAttribute("crossorigin");
      }
    };
    if (image.complete && image.naturalWidth !== 0)
      recordInlineImage();
    else
      image.addEventListener("load", recordInlineImage);
  }
  if (tagName === "audio" || tagName === "video") {
    const mediaAttributes = attributes2;
    mediaAttributes.rr_mediaState = n2.paused ? "paused" : "played";
    mediaAttributes.rr_mediaCurrentTime = n2.currentTime;
    mediaAttributes.rr_mediaPlaybackRate = n2.playbackRate;
    mediaAttributes.rr_mediaMuted = n2.muted;
    mediaAttributes.rr_mediaLoop = n2.loop;
    mediaAttributes.rr_mediaVolume = n2.volume;
  }
  if (!newlyAddedElement) {
    if (n2.scrollLeft) {
      attributes2.rr_scrollLeft = n2.scrollLeft;
    }
    if (n2.scrollTop) {
      attributes2.rr_scrollTop = n2.scrollTop;
    }
  }
  if (needBlock) {
    const { width, height } = n2.getBoundingClientRect();
    attributes2 = {
      class: attributes2.class,
      rr_width: `${width}px`,
      rr_height: `${height}px`
    };
  }
  if (tagName === "iframe" && !keepIframeSrcFn(attributes2.src)) {
    if (!n2.contentDocument) {
      attributes2.rr_src = attributes2.src;
    }
    delete attributes2.src;
  }
  let isCustomElement;
  try {
    if (customElements.get(tagName))
      isCustomElement = true;
  } catch (e2) {
  }
  return {
    type: NodeType$2.Element,
    tagName,
    attributes: attributes2,
    childNodes: [],
    isSVG: isSVGElement(n2) || void 0,
    needBlock,
    rootId,
    isCustom: isCustomElement
  };
}
function lowerIfExists(maybeAttr) {
  if (maybeAttr === void 0 || maybeAttr === null) {
    return "";
  } else {
    return maybeAttr.toLowerCase();
  }
}
function slimDOMExcluded(sn, slimDOMOptions) {
  if (slimDOMOptions.comment && sn.type === NodeType$2.Comment) {
    return true;
  } else if (sn.type === NodeType$2.Element) {
    if (slimDOMOptions.script && // script tag
    (sn.tagName === "script" || // (module)preload link
    sn.tagName === "link" && (sn.attributes.rel === "preload" || sn.attributes.rel === "modulepreload") && sn.attributes.as === "script" || // prefetch link
    sn.tagName === "link" && sn.attributes.rel === "prefetch" && typeof sn.attributes.href === "string" && extractFileExtension(sn.attributes.href) === "js")) {
      return true;
    } else if (slimDOMOptions.headFavicon && (sn.tagName === "link" && sn.attributes.rel === "shortcut icon" || sn.tagName === "meta" && (lowerIfExists(sn.attributes.name).match(
      /^msapplication-tile(image|color)$/
    ) || lowerIfExists(sn.attributes.name) === "application-name" || lowerIfExists(sn.attributes.rel) === "icon" || lowerIfExists(sn.attributes.rel) === "apple-touch-icon" || lowerIfExists(sn.attributes.rel) === "shortcut icon"))) {
      return true;
    } else if (sn.tagName === "meta") {
      if (slimDOMOptions.headMetaDescKeywords && lowerIfExists(sn.attributes.name).match(/^description|keywords$/)) {
        return true;
      } else if (slimDOMOptions.headMetaSocial && (lowerIfExists(sn.attributes.property).match(/^(og|twitter|fb):/) || // og = opengraph (facebook)
      lowerIfExists(sn.attributes.name).match(/^(og|twitter):/) || lowerIfExists(sn.attributes.name) === "pinterest")) {
        return true;
      } else if (slimDOMOptions.headMetaRobots && (lowerIfExists(sn.attributes.name) === "robots" || lowerIfExists(sn.attributes.name) === "googlebot" || lowerIfExists(sn.attributes.name) === "bingbot")) {
        return true;
      } else if (slimDOMOptions.headMetaHttpEquiv && sn.attributes["http-equiv"] !== void 0) {
        return true;
      } else if (slimDOMOptions.headMetaAuthorship && (lowerIfExists(sn.attributes.name) === "author" || lowerIfExists(sn.attributes.name) === "generator" || lowerIfExists(sn.attributes.name) === "framework" || lowerIfExists(sn.attributes.name) === "publisher" || lowerIfExists(sn.attributes.name) === "progid" || lowerIfExists(sn.attributes.property).match(/^article:/) || lowerIfExists(sn.attributes.property).match(/^product:/))) {
        return true;
      } else if (slimDOMOptions.headMetaVerification && (lowerIfExists(sn.attributes.name) === "google-site-verification" || lowerIfExists(sn.attributes.name) === "yandex-verification" || lowerIfExists(sn.attributes.name) === "csrf-token" || lowerIfExists(sn.attributes.name) === "p:domain_verify" || lowerIfExists(sn.attributes.name) === "verify-v1" || lowerIfExists(sn.attributes.name) === "verification" || lowerIfExists(sn.attributes.name) === "shopify-checkout-api-token")) {
        return true;
      }
    }
  }
  return false;
}
function serializeNodeWithId(n2, options) {
  const {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    maskTextClass,
    maskTextSelector,
    skipChild = false,
    inlineStylesheet = true,
    maskInputOptions = {},
    maskTextFn,
    maskInputFn,
    slimDOMOptions,
    dataURLOptions = {},
    inlineImages = false,
    recordCanvas = false,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout = 5e3,
    onStylesheetLoad,
    stylesheetLoadTimeout = 5e3,
    keepIframeSrcFn = () => false,
    newlyAddedElement = false
  } = options;
  let { needsMask } = options;
  let { preserveWhiteSpace = true } = options;
  if (!needsMask && n2.childNodes) {
    const checkAncestors = needsMask === void 0;
    needsMask = needMaskingText(
      n2,
      maskTextClass,
      maskTextSelector,
      checkAncestors
    );
  }
  const _serializedNode = serializeNode(n2, {
    doc,
    mirror: mirror2,
    blockClass,
    blockSelector,
    needsMask,
    inlineStylesheet,
    maskInputOptions,
    maskTextFn,
    maskInputFn,
    dataURLOptions,
    inlineImages,
    recordCanvas,
    keepIframeSrcFn,
    newlyAddedElement
  });
  if (!_serializedNode) {
    console.warn(n2, "not serialized");
    return null;
  }
  let id;
  if (mirror2.hasNode(n2)) {
    id = mirror2.getId(n2);
  } else if (slimDOMExcluded(_serializedNode, slimDOMOptions) || !preserveWhiteSpace && _serializedNode.type === NodeType$2.Text && !_serializedNode.isStyle && !_serializedNode.textContent.replace(/^\s+|\s+$/gm, "").length) {
    id = IGNORED_NODE;
  } else {
    id = genId();
  }
  const serializedNode2 = Object.assign(_serializedNode, { id });
  mirror2.add(n2, serializedNode2);
  if (id === IGNORED_NODE) {
    return null;
  }
  if (onSerialize) {
    onSerialize(n2);
  }
  let recordChild = !skipChild;
  if (serializedNode2.type === NodeType$2.Element) {
    recordChild = recordChild && !serializedNode2.needBlock;
    delete serializedNode2.needBlock;
    const shadowRoot = n2.shadowRoot;
    if (shadowRoot && isNativeShadowDom(shadowRoot))
      serializedNode2.isShadowHost = true;
  }
  if ((serializedNode2.type === NodeType$2.Document || serializedNode2.type === NodeType$2.Element) && recordChild) {
    if (slimDOMOptions.headWhitespace && serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "head") {
      preserveWhiteSpace = false;
    }
    const bypassOptions = {
      doc,
      mirror: mirror2,
      blockClass,
      blockSelector,
      needsMask,
      maskTextClass,
      maskTextSelector,
      skipChild,
      inlineStylesheet,
      maskInputOptions,
      maskTextFn,
      maskInputFn,
      slimDOMOptions,
      dataURLOptions,
      inlineImages,
      recordCanvas,
      preserveWhiteSpace,
      onSerialize,
      onIframeLoad,
      iframeLoadTimeout,
      onStylesheetLoad,
      stylesheetLoadTimeout,
      keepIframeSrcFn
    };
    if (serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "textarea" && serializedNode2.attributes.value !== void 0)
      ;
    else {
      for (const childN of Array.from(n2.childNodes)) {
        const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
        if (serializedChildNode) {
          serializedNode2.childNodes.push(serializedChildNode);
        }
      }
    }
    if (isElement(n2) && n2.shadowRoot) {
      for (const childN of Array.from(n2.shadowRoot.childNodes)) {
        const serializedChildNode = serializeNodeWithId(childN, bypassOptions);
        if (serializedChildNode) {
          isNativeShadowDom(n2.shadowRoot) && (serializedChildNode.isShadow = true);
          serializedNode2.childNodes.push(serializedChildNode);
        }
      }
    }
  }
  if (n2.parentNode && isShadowRoot(n2.parentNode) && isNativeShadowDom(n2.parentNode)) {
    serializedNode2.isShadow = true;
  }
  if (serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "iframe") {
    onceIframeLoaded(
      n2,
      () => {
        const iframeDoc = n2.contentDocument;
        if (iframeDoc && onIframeLoad) {
          const serializedIframeNode = serializeNodeWithId(iframeDoc, {
            doc: iframeDoc,
            mirror: mirror2,
            blockClass,
            blockSelector,
            needsMask,
            maskTextClass,
            maskTextSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn
          });
          if (serializedIframeNode) {
            onIframeLoad(
              n2,
              serializedIframeNode
            );
          }
        }
      },
      iframeLoadTimeout
    );
  }
  if (serializedNode2.type === NodeType$2.Element && serializedNode2.tagName === "link" && typeof serializedNode2.attributes.rel === "string" && (serializedNode2.attributes.rel === "stylesheet" || serializedNode2.attributes.rel === "preload" && typeof serializedNode2.attributes.href === "string" && extractFileExtension(serializedNode2.attributes.href) === "css")) {
    onceStylesheetLoaded(
      n2,
      () => {
        if (onStylesheetLoad) {
          const serializedLinkNode = serializeNodeWithId(n2, {
            doc,
            mirror: mirror2,
            blockClass,
            blockSelector,
            needsMask,
            maskTextClass,
            maskTextSelector,
            skipChild: false,
            inlineStylesheet,
            maskInputOptions,
            maskTextFn,
            maskInputFn,
            slimDOMOptions,
            dataURLOptions,
            inlineImages,
            recordCanvas,
            preserveWhiteSpace,
            onSerialize,
            onIframeLoad,
            iframeLoadTimeout,
            onStylesheetLoad,
            stylesheetLoadTimeout,
            keepIframeSrcFn
          });
          if (serializedLinkNode) {
            onStylesheetLoad(
              n2,
              serializedLinkNode
            );
          }
        }
      },
      stylesheetLoadTimeout
    );
  }
  return serializedNode2;
}
function snapshot(n2, options) {
  const {
    mirror: mirror2 = new Mirror(),
    blockClass = "rr-block",
    blockSelector = null,
    maskTextClass = "rr-mask",
    maskTextSelector = null,
    inlineStylesheet = true,
    inlineImages = false,
    recordCanvas = false,
    maskAllInputs = false,
    maskTextFn,
    maskInputFn,
    slimDOM = false,
    dataURLOptions,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
    onStylesheetLoad,
    stylesheetLoadTimeout,
    keepIframeSrcFn = () => false
  } = options || {};
  const maskInputOptions = maskAllInputs === true ? {
    color: true,
    date: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true,
    textarea: true,
    select: true,
    password: true
  } : maskAllInputs === false ? {
    password: true
  } : maskAllInputs;
  const slimDOMOptions = slimDOM === true || slimDOM === "all" ? (
    // if true: set of sensible options that should not throw away any information
    {
      script: true,
      comment: true,
      headFavicon: true,
      headWhitespace: true,
      headMetaDescKeywords: slimDOM === "all",
      // destructive
      headMetaSocial: true,
      headMetaRobots: true,
      headMetaHttpEquiv: true,
      headMetaAuthorship: true,
      headMetaVerification: true
    }
  ) : slimDOM === false ? {} : slimDOM;
  return serializeNodeWithId(n2, {
    doc: n2,
    mirror: mirror2,
    blockClass,
    blockSelector,
    maskTextClass,
    maskTextSelector,
    skipChild: false,
    inlineStylesheet,
    maskInputOptions,
    maskTextFn,
    maskInputFn,
    slimDOMOptions,
    dataURLOptions,
    inlineImages,
    recordCanvas,
    preserveWhiteSpace,
    onSerialize,
    onIframeLoad,
    iframeLoadTimeout,
    onStylesheetLoad,
    stylesheetLoadTimeout,
    keepIframeSrcFn,
    newlyAddedElement: false
  });
}
const commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
function parse(css, options = {}) {
  let lineno = 1;
  let column = 1;
  function updatePosition(str) {
    const lines = str.match(/\n/g);
    if (lines) {
      lineno += lines.length;
    }
    const i2 = str.lastIndexOf("\n");
    column = i2 === -1 ? column + str.length : str.length - i2;
  }
  function position() {
    const start = { line: lineno, column };
    return (node) => {
      node.position = new Position(start);
      whitespace();
      return node;
    };
  }
  const _Position = class _Position2 {
    constructor(start) {
      __publicField$1(this, "content");
      __publicField$1(this, "start");
      __publicField$1(this, "end");
      __publicField$1(this, "source");
      this.start = start;
      this.end = { line: lineno, column };
      this.source = options.source;
      this.content = _Position2.content;
    }
  };
  __publicField$1(_Position, "content");
  let Position = _Position;
  Position.content = css;
  const errorsList = [];
  function error(msg) {
    const err = new Error(
      `${options.source || ""}:${lineno}:${column}: ${msg}`
    );
    err.reason = msg;
    err.filename = options.source;
    err.line = lineno;
    err.column = column;
    err.source = css;
    if (options.silent) {
      errorsList.push(err);
    } else {
      throw err;
    }
  }
  function stylesheet() {
    const rulesList = rules2();
    return {
      type: "stylesheet",
      stylesheet: {
        source: options.source,
        rules: rulesList,
        parsingErrors: errorsList
      }
    };
  }
  function open() {
    return match(/^{\s*/);
  }
  function close() {
    return match(/^}/);
  }
  function rules2() {
    let node;
    const rules22 = [];
    whitespace();
    comments(rules22);
    while (css.length && css.charAt(0) !== "}" && (node = atrule() || rule())) {
      if (node) {
        rules22.push(node);
        comments(rules22);
      }
    }
    return rules22;
  }
  function match(re) {
    const m = re.exec(css);
    if (!m) {
      return;
    }
    const str = m[0];
    updatePosition(str);
    css = css.slice(str.length);
    return m;
  }
  function whitespace() {
    match(/^\s*/);
  }
  function comments(rules22 = []) {
    let c2;
    while (c2 = comment()) {
      if (c2) {
        rules22.push(c2);
      }
      c2 = comment();
    }
    return rules22;
  }
  function comment() {
    const pos = position();
    if ("/" !== css.charAt(0) || "*" !== css.charAt(1)) {
      return;
    }
    let i2 = 2;
    while ("" !== css.charAt(i2) && ("*" !== css.charAt(i2) || "/" !== css.charAt(i2 + 1))) {
      ++i2;
    }
    i2 += 2;
    if ("" === css.charAt(i2 - 1)) {
      return error("End of comment missing");
    }
    const str = css.slice(2, i2 - 2);
    column += 2;
    updatePosition(str);
    css = css.slice(i2);
    column += 2;
    return pos({
      type: "comment",
      comment: str
    });
  }
  const selectorMatcher = new RegExp(
    "^((" + [
      /[^\\]"(?:\\"|[^"])*"/.source,
      // consume any quoted parts (checking that the double quote isn't itself escaped)
      /[^\\]'(?:\\'|[^'])*'/.source,
      // same but for single quotes
      "[^{]"
    ].join("|") + ")+)"
  );
  function selector() {
    whitespace();
    while (css[0] == "}") {
      error("extra closing bracket");
      css = css.slice(1);
      whitespace();
    }
    const m = match(selectorMatcher);
    if (!m) {
      return;
    }
    const cleanedInput = m[0].trim().replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, "").replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, (m2) => {
      return m2.replace(/,/g, "‌");
    });
    return customSplit(cleanedInput).map(
      (s2) => s2.replace(/\u200C/g, ",").trim()
    );
  }
  function customSplit(input) {
    const result = [];
    let currentSegment = "";
    let depthParentheses = 0;
    let depthBrackets = 0;
    let currentStringChar = null;
    for (const char of input) {
      const hasStringEscape = currentSegment.endsWith("\\");
      if (currentStringChar) {
        if (currentStringChar === char && !hasStringEscape) {
          currentStringChar = null;
        }
      } else if (char === "(") {
        depthParentheses++;
      } else if (char === ")") {
        depthParentheses--;
      } else if (char === "[") {
        depthBrackets++;
      } else if (char === "]") {
        depthBrackets--;
      } else if (`'"`.includes(char)) {
        currentStringChar = char;
      }
      if (char === "," && depthParentheses === 0 && depthBrackets === 0) {
        result.push(currentSegment);
        currentSegment = "";
      } else {
        currentSegment += char;
      }
    }
    if (currentSegment) {
      result.push(currentSegment);
    }
    return result;
  }
  function declaration() {
    const pos = position();
    const propMatch = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
    if (!propMatch) {
      return;
    }
    const prop = trim(propMatch[0]);
    if (!match(/^:\s*/)) {
      return error(`property missing ':'`);
    }
    const val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);
    const ret = pos({
      type: "declaration",
      property: prop.replace(commentre, ""),
      value: val ? trim(val[0]).replace(commentre, "") : ""
    });
    match(/^[;\s]*/);
    return ret;
  }
  function declarations() {
    const decls = [];
    if (!open()) {
      return error(`missing '{'`);
    }
    comments(decls);
    let decl;
    while (decl = declaration()) {
      if (decl !== false) {
        decls.push(decl);
        comments(decls);
      }
      decl = declaration();
    }
    if (!close()) {
      return error(`missing '}'`);
    }
    return decls;
  }
  function keyframe() {
    let m;
    const vals = [];
    const pos = position();
    while (m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/)) {
      vals.push(m[1]);
      match(/^,\s*/);
    }
    if (!vals.length) {
      return;
    }
    return pos({
      type: "keyframe",
      values: vals,
      declarations: declarations()
    });
  }
  function atkeyframes() {
    const pos = position();
    let m = match(/^@([-\w]+)?keyframes\s*/);
    if (!m) {
      return;
    }
    const vendor = m[1];
    m = match(/^([-\w]+)\s*/);
    if (!m) {
      return error("@keyframes missing name");
    }
    const name = m[1];
    if (!open()) {
      return error(`@keyframes missing '{'`);
    }
    let frame;
    let frames = comments();
    while (frame = keyframe()) {
      frames.push(frame);
      frames = frames.concat(comments());
    }
    if (!close()) {
      return error(`@keyframes missing '}'`);
    }
    return pos({
      type: "keyframes",
      name,
      vendor,
      keyframes: frames
    });
  }
  function atsupports() {
    const pos = position();
    const m = match(/^@supports *([^{]+)/);
    if (!m) {
      return;
    }
    const supports = trim(m[1]);
    if (!open()) {
      return error(`@supports missing '{'`);
    }
    const style = comments().concat(rules2());
    if (!close()) {
      return error(`@supports missing '}'`);
    }
    return pos({
      type: "supports",
      supports,
      rules: style
    });
  }
  function athost() {
    const pos = position();
    const m = match(/^@host\s*/);
    if (!m) {
      return;
    }
    if (!open()) {
      return error(`@host missing '{'`);
    }
    const style = comments().concat(rules2());
    if (!close()) {
      return error(`@host missing '}'`);
    }
    return pos({
      type: "host",
      rules: style
    });
  }
  function atmedia() {
    const pos = position();
    const m = match(/^@media *([^{]+)/);
    if (!m) {
      return;
    }
    const media = trim(m[1]);
    if (!open()) {
      return error(`@media missing '{'`);
    }
    const style = comments().concat(rules2());
    if (!close()) {
      return error(`@media missing '}'`);
    }
    return pos({
      type: "media",
      media,
      rules: style
    });
  }
  function atcustommedia() {
    const pos = position();
    const m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
    if (!m) {
      return;
    }
    return pos({
      type: "custom-media",
      name: trim(m[1]),
      media: trim(m[2])
    });
  }
  function atpage() {
    const pos = position();
    const m = match(/^@page */);
    if (!m) {
      return;
    }
    const sel = selector() || [];
    if (!open()) {
      return error(`@page missing '{'`);
    }
    let decls = comments();
    let decl;
    while (decl = declaration()) {
      decls.push(decl);
      decls = decls.concat(comments());
    }
    if (!close()) {
      return error(`@page missing '}'`);
    }
    return pos({
      type: "page",
      selectors: sel,
      declarations: decls
    });
  }
  function atdocument() {
    const pos = position();
    const m = match(/^@([-\w]+)?document *([^{]+)/);
    if (!m) {
      return;
    }
    const vendor = trim(m[1]);
    const doc = trim(m[2]);
    if (!open()) {
      return error(`@document missing '{'`);
    }
    const style = comments().concat(rules2());
    if (!close()) {
      return error(`@document missing '}'`);
    }
    return pos({
      type: "document",
      document: doc,
      vendor,
      rules: style
    });
  }
  function atfontface() {
    const pos = position();
    const m = match(/^@font-face\s*/);
    if (!m) {
      return;
    }
    if (!open()) {
      return error(`@font-face missing '{'`);
    }
    let decls = comments();
    let decl;
    while (decl = declaration()) {
      decls.push(decl);
      decls = decls.concat(comments());
    }
    if (!close()) {
      return error(`@font-face missing '}'`);
    }
    return pos({
      type: "font-face",
      declarations: decls
    });
  }
  const atimport = _compileAtrule("import");
  const atcharset = _compileAtrule("charset");
  const atnamespace = _compileAtrule("namespace");
  function _compileAtrule(name) {
    const re = new RegExp(
      "^@" + name + "\\s*((?:" + [
        /[^\\]"(?:\\"|[^"])*"/.source,
        // consume any quoted parts (checking that the double quote isn't itself escaped)
        /[^\\]'(?:\\'|[^'])*'/.source,
        // same but for single quotes
        "[^;]"
      ].join("|") + ")+);"
    );
    return () => {
      const pos = position();
      const m = match(re);
      if (!m) {
        return;
      }
      const ret = { type: name };
      ret[name] = m[1].trim();
      return pos(ret);
    };
  }
  function atrule() {
    if (css[0] !== "@") {
      return;
    }
    return atkeyframes() || atmedia() || atcustommedia() || atsupports() || atimport() || atcharset() || atnamespace() || atdocument() || atpage() || athost() || atfontface();
  }
  function rule() {
    const pos = position();
    const sel = selector();
    if (!sel) {
      return error("selector missing");
    }
    comments();
    return pos({
      type: "rule",
      selectors: sel,
      declarations: declarations()
    });
  }
  return addParent(stylesheet());
}
function trim(str) {
  return str ? str.replace(/^\s+|\s+$/g, "") : "";
}
function addParent(obj, parent) {
  const isNode = obj && typeof obj.type === "string";
  const childParent = isNode ? obj : parent;
  for (const k of Object.keys(obj)) {
    const value = obj[k];
    if (Array.isArray(value)) {
      value.forEach((v2) => {
        addParent(v2, childParent);
      });
    } else if (value && typeof value === "object") {
      addParent(value, childParent);
    }
  }
  if (isNode) {
    Object.defineProperty(obj, "parent", {
      configurable: true,
      writable: true,
      enumerable: false,
      value: parent || null
    });
  }
  return obj;
}
const tagMap = {
  script: "noscript",
  // camel case svg element tag names
  altglyph: "altGlyph",
  altglyphdef: "altGlyphDef",
  altglyphitem: "altGlyphItem",
  animatecolor: "animateColor",
  animatemotion: "animateMotion",
  animatetransform: "animateTransform",
  clippath: "clipPath",
  feblend: "feBlend",
  fecolormatrix: "feColorMatrix",
  fecomponenttransfer: "feComponentTransfer",
  fecomposite: "feComposite",
  feconvolvematrix: "feConvolveMatrix",
  fediffuselighting: "feDiffuseLighting",
  fedisplacementmap: "feDisplacementMap",
  fedistantlight: "feDistantLight",
  fedropshadow: "feDropShadow",
  feflood: "feFlood",
  fefunca: "feFuncA",
  fefuncb: "feFuncB",
  fefuncg: "feFuncG",
  fefuncr: "feFuncR",
  fegaussianblur: "feGaussianBlur",
  feimage: "feImage",
  femerge: "feMerge",
  femergenode: "feMergeNode",
  femorphology: "feMorphology",
  feoffset: "feOffset",
  fepointlight: "fePointLight",
  fespecularlighting: "feSpecularLighting",
  fespotlight: "feSpotLight",
  fetile: "feTile",
  feturbulence: "feTurbulence",
  foreignobject: "foreignObject",
  glyphref: "glyphRef",
  lineargradient: "linearGradient",
  radialgradient: "radialGradient"
};
function getTagName(n2) {
  let tagName = tagMap[n2.tagName] ? tagMap[n2.tagName] : n2.tagName;
  if (tagName === "link" && n2.attributes._cssText) {
    tagName = "style";
  }
  return tagName;
}
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const MEDIA_SELECTOR = /(max|min)-device-(width|height)/;
const MEDIA_SELECTOR_GLOBAL = new RegExp(MEDIA_SELECTOR.source, "g");
const HOVER_SELECTOR = /([^\\]):hover/;
const HOVER_SELECTOR_GLOBAL = new RegExp(HOVER_SELECTOR.source, "g");
function adaptCssForReplay(cssText, cache) {
  const cachedStyle = cache == null ? void 0 : cache.stylesWithHoverClass.get(cssText);
  if (cachedStyle)
    return cachedStyle;
  const ast = parse(cssText, {
    silent: true
  });
  if (!ast.stylesheet) {
    return cssText;
  }
  const selectors = [];
  const medias = [];
  function getSelectors(rule) {
    if ("selectors" in rule && rule.selectors) {
      rule.selectors.forEach((selector) => {
        if (HOVER_SELECTOR.test(selector)) {
          selectors.push(selector);
        }
      });
    }
    if ("media" in rule && rule.media && MEDIA_SELECTOR.test(rule.media)) {
      medias.push(rule.media);
    }
    if ("rules" in rule && rule.rules) {
      rule.rules.forEach(getSelectors);
    }
  }
  getSelectors(ast.stylesheet);
  let result = cssText;
  if (selectors.length > 0) {
    const selectorMatcher = new RegExp(
      selectors.filter((selector, index) => selectors.indexOf(selector) === index).sort((a2, b) => b.length - a2.length).map((selector) => {
        return escapeRegExp(selector);
      }).join("|"),
      "g"
    );
    result = result.replace(selectorMatcher, (selector) => {
      const newSelector = selector.replace(
        HOVER_SELECTOR_GLOBAL,
        "$1.\\:hover"
      );
      return `${selector}, ${newSelector}`;
    });
  }
  if (medias.length > 0) {
    const mediaMatcher = new RegExp(
      medias.filter((media, index) => medias.indexOf(media) === index).sort((a2, b) => b.length - a2.length).map((media) => {
        return escapeRegExp(media);
      }).join("|"),
      "g"
    );
    result = result.replace(mediaMatcher, (media) => {
      return media.replace(MEDIA_SELECTOR_GLOBAL, "$1-$2");
    });
  }
  cache == null ? void 0 : cache.stylesWithHoverClass.set(cssText, result);
  return result;
}
function createCache() {
  const stylesWithHoverClass = /* @__PURE__ */ new Map();
  return {
    stylesWithHoverClass
  };
}
function buildNode(n2, options) {
  var _a2;
  const { doc, hackCss, cache } = options;
  switch (n2.type) {
    case NodeType$2.Document:
      return doc.implementation.createDocument(null, "", null);
    case NodeType$2.DocumentType:
      return doc.implementation.createDocumentType(
        n2.name || "html",
        n2.publicId,
        n2.systemId
      );
    case NodeType$2.Element: {
      const tagName = getTagName(n2);
      let node;
      if (n2.isSVG) {
        node = doc.createElementNS("http://www.w3.org/2000/svg", tagName);
      } else {
        if (
          // If the tag name is a custom element name
          n2.isCustom && // If the browser supports custom elements
          ((_a2 = doc.defaultView) == null ? void 0 : _a2.customElements) && // If the custom element hasn't been defined yet
          !doc.defaultView.customElements.get(n2.tagName)
        )
          doc.defaultView.customElements.define(
            n2.tagName,
            class extends doc.defaultView.HTMLElement {
            }
          );
        node = doc.createElement(tagName);
      }
      const specialAttributes = {};
      for (const name in n2.attributes) {
        if (!Object.prototype.hasOwnProperty.call(n2.attributes, name)) {
          continue;
        }
        let value = n2.attributes[name];
        if (tagName === "option" && name === "selected" && value === false) {
          continue;
        }
        if (value === null) {
          continue;
        }
        if (value === true)
          value = "";
        if (name.startsWith("rr_")) {
          specialAttributes[name] = value;
          continue;
        }
        const isTextarea = tagName === "textarea" && name === "value";
        const isRemoteOrDynamicCss = tagName === "style" && name === "_cssText";
        if (isRemoteOrDynamicCss && hackCss && typeof value === "string") {
          value = adaptCssForReplay(value, cache);
        }
        if ((isTextarea || isRemoteOrDynamicCss) && typeof value === "string") {
          node.appendChild(doc.createTextNode(value));
          n2.childNodes = [];
          continue;
        }
        try {
          if (n2.isSVG && name === "xlink:href") {
            node.setAttributeNS(
              "http://www.w3.org/1999/xlink",
              name,
              value.toString()
            );
          } else if (name === "onload" || name === "onclick" || name.substring(0, 7) === "onmouse") {
            node.setAttribute("_" + name, value.toString());
          } else if (tagName === "meta" && n2.attributes["http-equiv"] === "Content-Security-Policy" && name === "content") {
            node.setAttribute("csp-content", value.toString());
            continue;
          } else if (tagName === "link" && (n2.attributes.rel === "preload" || n2.attributes.rel === "modulepreload") && n2.attributes.as === "script") {
          } else if (tagName === "link" && n2.attributes.rel === "prefetch" && typeof n2.attributes.href === "string" && n2.attributes.href.endsWith(".js")) {
          } else if (tagName === "img" && n2.attributes.srcset && n2.attributes.rr_dataURL) {
            node.setAttribute(
              "rrweb-original-srcset",
              n2.attributes.srcset
            );
          } else {
            node.setAttribute(name, value.toString());
          }
        } catch (error) {
        }
      }
      for (const name in specialAttributes) {
        const value = specialAttributes[name];
        if (tagName === "canvas" && name === "rr_dataURL") {
          const image = doc.createElement("img");
          image.onload = () => {
            const ctx = node.getContext("2d");
            if (ctx) {
              ctx.drawImage(image, 0, 0, image.width, image.height);
            }
          };
          image.src = value.toString();
          if (node.RRNodeType)
            node.rr_dataURL = value.toString();
        } else if (tagName === "img" && name === "rr_dataURL") {
          const image = node;
          if (!image.currentSrc.startsWith("data:")) {
            image.setAttribute(
              "rrweb-original-src",
              n2.attributes.src
            );
            image.src = value.toString();
          }
        }
        if (name === "rr_width") {
          node.style.width = value.toString();
        } else if (name === "rr_height") {
          node.style.height = value.toString();
        } else if (name === "rr_mediaCurrentTime" && typeof value === "number") {
          node.currentTime = value;
        } else if (name === "rr_mediaState") {
          switch (value) {
            case "played":
              node.play().catch((e2) => console.warn("media playback error", e2));
              break;
            case "paused":
              node.pause();
              break;
          }
        } else if (name === "rr_mediaPlaybackRate" && typeof value === "number") {
          node.playbackRate = value;
        } else if (name === "rr_mediaMuted" && typeof value === "boolean") {
          node.muted = value;
        } else if (name === "rr_mediaLoop" && typeof value === "boolean") {
          node.loop = value;
        } else if (name === "rr_mediaVolume" && typeof value === "number") {
          node.volume = value;
        }
      }
      if (n2.isShadowHost) {
        if (!node.shadowRoot) {
          node.attachShadow({ mode: "open" });
        } else {
          while (node.shadowRoot.firstChild) {
            node.shadowRoot.removeChild(node.shadowRoot.firstChild);
          }
        }
      }
      return node;
    }
    case NodeType$2.Text:
      return doc.createTextNode(
        n2.isStyle && hackCss ? adaptCssForReplay(n2.textContent, cache) : n2.textContent
      );
    case NodeType$2.CDATA:
      return doc.createCDATASection(n2.textContent);
    case NodeType$2.Comment:
      return doc.createComment(n2.textContent);
    default:
      return null;
  }
}
function buildNodeWithSN(n2, options) {
  const {
    doc,
    mirror: mirror2,
    skipChild = false,
    hackCss = true,
    afterAppend,
    cache
  } = options;
  if (mirror2.has(n2.id)) {
    const nodeInMirror = mirror2.getNode(n2.id);
    const meta = mirror2.getMeta(nodeInMirror);
    if (isNodeMetaEqual(meta, n2))
      return mirror2.getNode(n2.id);
  }
  let node = buildNode(n2, { doc, hackCss, cache });
  if (!node) {
    return null;
  }
  if (n2.rootId && mirror2.getNode(n2.rootId) !== doc) {
    mirror2.replace(n2.rootId, doc);
  }
  if (n2.type === NodeType$2.Document) {
    doc.close();
    doc.open();
    if (n2.compatMode === "BackCompat" && n2.childNodes && n2.childNodes[0].type !== NodeType$2.DocumentType) {
      if (n2.childNodes[0].type === NodeType$2.Element && "xmlns" in n2.childNodes[0].attributes && n2.childNodes[0].attributes.xmlns === "http://www.w3.org/1999/xhtml") {
        doc.write(
          '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">'
        );
      } else {
        doc.write(
          '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">'
        );
      }
    }
    node = doc;
  }
  mirror2.add(node, n2);
  if ((n2.type === NodeType$2.Document || n2.type === NodeType$2.Element) && !skipChild) {
    for (const childN of n2.childNodes) {
      const childNode = buildNodeWithSN(childN, {
        doc,
        mirror: mirror2,
        skipChild: false,
        hackCss,
        afterAppend,
        cache
      });
      if (!childNode) {
        console.warn("Failed to rebuild", childN);
        continue;
      }
      if (childN.isShadow && isElement(node) && node.shadowRoot) {
        node.shadowRoot.appendChild(childNode);
      } else if (n2.type === NodeType$2.Document && childN.type == NodeType$2.Element) {
        const htmlElement = childNode;
        let body = null;
        htmlElement.childNodes.forEach((child) => {
          if (child.nodeName === "BODY")
            body = child;
        });
        if (body) {
          htmlElement.removeChild(body);
          node.appendChild(childNode);
          htmlElement.appendChild(body);
        } else {
          node.appendChild(childNode);
        }
      } else {
        node.appendChild(childNode);
      }
      if (afterAppend) {
        afterAppend(childNode, childN.id);
      }
    }
  }
  return node;
}
function visit(mirror2, onVisit) {
  function walk(node) {
    onVisit(node);
  }
  for (const id of mirror2.getIds()) {
    if (mirror2.has(id)) {
      walk(mirror2.getNode(id));
    }
  }
}
function handleScroll(node, mirror2) {
  const n2 = mirror2.getMeta(node);
  if ((n2 == null ? void 0 : n2.type) !== NodeType$2.Element) {
    return;
  }
  const el = node;
  for (const name in n2.attributes) {
    if (!(Object.prototype.hasOwnProperty.call(n2.attributes, name) && name.startsWith("rr_"))) {
      continue;
    }
    const value = n2.attributes[name];
    if (name === "rr_scrollLeft") {
      el.scrollLeft = value;
    }
    if (name === "rr_scrollTop") {
      el.scrollTop = value;
    }
  }
}
function rebuild(n2, options) {
  const {
    doc,
    onVisit,
    hackCss = true,
    afterAppend,
    cache,
    mirror: mirror2 = new Mirror()
  } = options;
  const node = buildNodeWithSN(n2, {
    doc,
    mirror: mirror2,
    skipChild: false,
    hackCss,
    afterAppend,
    cache
  });
  visit(mirror2, (visitedNode) => {
    if (onVisit) {
      onVisit(visitedNode);
    }
    handleScroll(visitedNode, mirror2);
  });
  return node;
}
function on(type, fn, target = document) {
  const options = { capture: true, passive: true };
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}
const DEPARTED_MIRROR_ACCESS_WARNING = "Please stop import mirror directly. Instead of that,\r\nnow you can use replayer.getMirror() to access the mirror instance of a replayer,\r\nor you can use record.mirror to access the mirror instance during recording.";
let _mirror = {
  map: {},
  getId() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return -1;
  },
  getNode() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return null;
  },
  removeNodeFromMap() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  },
  has() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
    return false;
  },
  reset() {
    console.error(DEPARTED_MIRROR_ACCESS_WARNING);
  }
};
if (typeof window !== "undefined" && window.Proxy && window.Reflect) {
  _mirror = new Proxy(_mirror, {
    get(target, prop, receiver) {
      if (prop === "map") {
        console.error(DEPARTED_MIRROR_ACCESS_WARNING);
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
function throttle(func, wait, options = {}) {
  let timeout = null;
  let previous = 0;
  return function(...args) {
    const now = Date.now();
    if (!previous && options.leading === false) {
      previous = now;
    }
    const remaining = wait - (now - previous);
    const context = this;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(() => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}
function hookSetter(target, key, d, isRevoked, win = window) {
  const original = win.Object.getOwnPropertyDescriptor(target, key);
  win.Object.defineProperty(
    target,
    key,
    isRevoked ? d : {
      set(value) {
        setTimeout(() => {
          d.set.call(this, value);
        }, 0);
        if (original && original.set) {
          original.set.call(this, value);
        }
      }
    }
  );
  return () => hookSetter(target, key, original || {}, true);
}
function patch(source, name, replacement) {
  try {
    if (!(name in source)) {
      return () => {
      };
    }
    const original = source[name];
    const wrapped = replacement(original);
    if (typeof wrapped === "function") {
      wrapped.prototype = wrapped.prototype || {};
      Object.defineProperties(wrapped, {
        __rrweb_original__: {
          enumerable: false,
          value: original
        }
      });
    }
    source[name] = wrapped;
    return () => {
      source[name] = original;
    };
  } catch {
    return () => {
    };
  }
}
let nowTimestamp = Date.now;
if (!/* @__PURE__ */ /[1-9][0-9]{12}/.test(Date.now().toString())) {
  nowTimestamp = () => (/* @__PURE__ */ new Date()).getTime();
}
function getWindowScroll(win) {
  var _a2, _b, _c, _d, _e, _f;
  const doc = win.document;
  return {
    left: doc.scrollingElement ? doc.scrollingElement.scrollLeft : win.pageXOffset !== void 0 ? win.pageXOffset : (doc == null ? void 0 : doc.documentElement.scrollLeft) || ((_b = (_a2 = doc == null ? void 0 : doc.body) == null ? void 0 : _a2.parentElement) == null ? void 0 : _b.scrollLeft) || ((_c = doc == null ? void 0 : doc.body) == null ? void 0 : _c.scrollLeft) || 0,
    top: doc.scrollingElement ? doc.scrollingElement.scrollTop : win.pageYOffset !== void 0 ? win.pageYOffset : (doc == null ? void 0 : doc.documentElement.scrollTop) || ((_e = (_d = doc == null ? void 0 : doc.body) == null ? void 0 : _d.parentElement) == null ? void 0 : _e.scrollTop) || ((_f = doc == null ? void 0 : doc.body) == null ? void 0 : _f.scrollTop) || 0
  };
}
function getWindowHeight() {
  return window.innerHeight || document.documentElement && document.documentElement.clientHeight || document.body && document.body.clientHeight;
}
function getWindowWidth() {
  return window.innerWidth || document.documentElement && document.documentElement.clientWidth || document.body && document.body.clientWidth;
}
function closestElementOfNode(node) {
  if (!node) {
    return null;
  }
  const el = node.nodeType === node.ELEMENT_NODE ? node : node.parentElement;
  return el;
}
function isBlocked(node, blockClass, blockSelector, checkAncestors) {
  if (!node) {
    return false;
  }
  const el = closestElementOfNode(node);
  if (!el) {
    return false;
  }
  try {
    if (typeof blockClass === "string") {
      if (el.classList.contains(blockClass))
        return true;
      if (checkAncestors && el.closest("." + blockClass) !== null)
        return true;
    } else {
      if (classMatchesRegex(el, blockClass, checkAncestors))
        return true;
    }
  } catch (e2) {
  }
  if (blockSelector) {
    if (el.matches(blockSelector))
      return true;
    if (checkAncestors && el.closest(blockSelector) !== null)
      return true;
  }
  return false;
}
function isSerialized(n2, mirror2) {
  return mirror2.getId(n2) !== -1;
}
function isIgnored(n2, mirror2, slimDOMOptions) {
  if (n2.tagName === "TITLE" && slimDOMOptions.headTitleMutations) {
    return true;
  }
  return mirror2.getId(n2) === IGNORED_NODE;
}
function isAncestorRemoved(target, mirror2) {
  if (isShadowRoot(target)) {
    return false;
  }
  const id = mirror2.getId(target);
  if (!mirror2.has(id)) {
    return true;
  }
  if (target.parentNode && target.parentNode.nodeType === target.DOCUMENT_NODE) {
    return false;
  }
  if (!target.parentNode) {
    return true;
  }
  return isAncestorRemoved(target.parentNode, mirror2);
}
function legacy_isTouchEvent(event) {
  return Boolean(event.changedTouches);
}
function polyfill$1(win = window) {
  if ("NodeList" in win && !win.NodeList.prototype.forEach) {
    win.NodeList.prototype.forEach = Array.prototype.forEach;
  }
  if ("DOMTokenList" in win && !win.DOMTokenList.prototype.forEach) {
    win.DOMTokenList.prototype.forEach = Array.prototype.forEach;
  }
  if (!Node.prototype.contains) {
    Node.prototype.contains = (...args) => {
      let node = args[0];
      if (!(0 in args)) {
        throw new TypeError("1 argument is required");
      }
      do {
        if (this === node) {
          return true;
        }
      } while (node = node && node.parentNode);
      return false;
    };
  }
}
function queueToResolveTrees(queue) {
  const queueNodeMap = {};
  const putIntoMap = (m, parent) => {
    const nodeInTree = {
      value: m,
      parent,
      children: []
    };
    queueNodeMap[m.node.id] = nodeInTree;
    return nodeInTree;
  };
  const queueNodeTrees = [];
  for (const mutation of queue) {
    const { nextId, parentId } = mutation;
    if (nextId && nextId in queueNodeMap) {
      const nextInTree = queueNodeMap[nextId];
      if (nextInTree.parent) {
        const idx = nextInTree.parent.children.indexOf(nextInTree);
        nextInTree.parent.children.splice(
          idx,
          0,
          putIntoMap(mutation, nextInTree.parent)
        );
      } else {
        const idx = queueNodeTrees.indexOf(nextInTree);
        queueNodeTrees.splice(idx, 0, putIntoMap(mutation, null));
      }
      continue;
    }
    if (parentId in queueNodeMap) {
      const parentInTree = queueNodeMap[parentId];
      parentInTree.children.push(putIntoMap(mutation, parentInTree));
      continue;
    }
    queueNodeTrees.push(putIntoMap(mutation, null));
  }
  return queueNodeTrees;
}
function iterateResolveTree(tree, cb) {
  cb(tree.value);
  for (let i2 = tree.children.length - 1; i2 >= 0; i2--) {
    iterateResolveTree(tree.children[i2], cb);
  }
}
function isSerializedIframe(n2, mirror2) {
  return Boolean(n2.nodeName === "IFRAME" && mirror2.getMeta(n2));
}
function isSerializedStylesheet(n2, mirror2) {
  return Boolean(
    n2.nodeName === "LINK" && n2.nodeType === n2.ELEMENT_NODE && n2.getAttribute && n2.getAttribute("rel") === "stylesheet" && mirror2.getMeta(n2)
  );
}
function getBaseDimension(node, rootIframe) {
  var _a2, _b;
  const frameElement = (_b = (_a2 = node.ownerDocument) == null ? void 0 : _a2.defaultView) == null ? void 0 : _b.frameElement;
  if (!frameElement || frameElement === rootIframe) {
    return {
      x: 0,
      y: 0,
      relativeScale: 1,
      absoluteScale: 1
    };
  }
  const frameDimension = frameElement.getBoundingClientRect();
  const frameBaseDimension = getBaseDimension(frameElement, rootIframe);
  const relativeScale = frameDimension.height / frameElement.clientHeight;
  return {
    x: frameDimension.x * frameBaseDimension.relativeScale + frameBaseDimension.x,
    y: frameDimension.y * frameBaseDimension.relativeScale + frameBaseDimension.y,
    relativeScale,
    absoluteScale: frameBaseDimension.absoluteScale * relativeScale
  };
}
function hasShadowRoot(n2) {
  return Boolean(n2 == null ? void 0 : n2.shadowRoot);
}
function getNestedRule(rules2, position) {
  const rule = rules2[position[0]];
  if (position.length === 1) {
    return rule;
  } else {
    return getNestedRule(
      rule.cssRules[position[1]].cssRules,
      position.slice(2)
    );
  }
}
function getPositionsAndIndex(nestedIndex) {
  const positions = [...nestedIndex];
  const index = positions.pop();
  return { positions, index };
}
function uniqueTextMutations(mutations) {
  const idSet = /* @__PURE__ */ new Set();
  const uniqueMutations = [];
  for (let i2 = mutations.length; i2--; ) {
    const mutation = mutations[i2];
    if (!idSet.has(mutation.id)) {
      uniqueMutations.push(mutation);
      idSet.add(mutation.id);
    }
  }
  return uniqueMutations;
}
class StyleSheetMirror {
  constructor() {
    __publicField(this, "id", 1);
    __publicField(this, "styleIDMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "idStyleMap", /* @__PURE__ */ new Map());
  }
  getId(stylesheet) {
    return this.styleIDMap.get(stylesheet) ?? -1;
  }
  has(stylesheet) {
    return this.styleIDMap.has(stylesheet);
  }
  /**
   * @returns If the stylesheet is in the mirror, returns the id of the stylesheet. If not, return the new assigned id.
   */
  add(stylesheet, id) {
    if (this.has(stylesheet))
      return this.getId(stylesheet);
    let newId;
    if (id === void 0) {
      newId = this.id++;
    } else
      newId = id;
    this.styleIDMap.set(stylesheet, newId);
    this.idStyleMap.set(newId, stylesheet);
    return newId;
  }
  getStyle(id) {
    return this.idStyleMap.get(id) || null;
  }
  reset() {
    this.styleIDMap = /* @__PURE__ */ new WeakMap();
    this.idStyleMap = /* @__PURE__ */ new Map();
    this.id = 1;
  }
  generateId() {
    return this.id++;
  }
}
function getShadowHost(n2) {
  var _a2, _b;
  let shadowHost = null;
  if (((_b = (_a2 = n2.getRootNode) == null ? void 0 : _a2.call(n2)) == null ? void 0 : _b.nodeType) === Node.DOCUMENT_FRAGMENT_NODE && n2.getRootNode().host)
    shadowHost = n2.getRootNode().host;
  return shadowHost;
}
function getRootShadowHost(n2) {
  let rootShadowHost = n2;
  let shadowHost;
  while (shadowHost = getShadowHost(rootShadowHost))
    rootShadowHost = shadowHost;
  return rootShadowHost;
}
function shadowHostInDom(n2) {
  const doc = n2.ownerDocument;
  if (!doc)
    return false;
  const shadowHost = getRootShadowHost(n2);
  return doc.contains(shadowHost);
}
function inDom(n2) {
  const doc = n2.ownerDocument;
  if (!doc)
    return false;
  return doc.contains(n2) || shadowHostInDom(n2);
}
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  StyleSheetMirror,
  get _mirror() {
    return _mirror;
  },
  closestElementOfNode,
  getBaseDimension,
  getNestedRule,
  getPositionsAndIndex,
  getRootShadowHost,
  getShadowHost,
  getWindowHeight,
  getWindowScroll,
  getWindowWidth,
  hasShadowRoot,
  hookSetter,
  inDom,
  isAncestorRemoved,
  isBlocked,
  isIgnored,
  isSerialized,
  isSerializedIframe,
  isSerializedStylesheet,
  iterateResolveTree,
  legacy_isTouchEvent,
  get nowTimestamp() {
    return nowTimestamp;
  },
  on,
  patch,
  polyfill: polyfill$1,
  queueToResolveTrees,
  shadowHostInDom,
  throttle,
  uniqueTextMutations
}, Symbol.toStringTag, { value: "Module" }));
var EventType = /* @__PURE__ */ ((EventType2) => {
  EventType2[EventType2["DomContentLoaded"] = 0] = "DomContentLoaded";
  EventType2[EventType2["Load"] = 1] = "Load";
  EventType2[EventType2["FullSnapshot"] = 2] = "FullSnapshot";
  EventType2[EventType2["IncrementalSnapshot"] = 3] = "IncrementalSnapshot";
  EventType2[EventType2["Meta"] = 4] = "Meta";
  EventType2[EventType2["Custom"] = 5] = "Custom";
  EventType2[EventType2["Plugin"] = 6] = "Plugin";
  return EventType2;
})(EventType || {});
var IncrementalSource = /* @__PURE__ */ ((IncrementalSource2) => {
  IncrementalSource2[IncrementalSource2["Mutation"] = 0] = "Mutation";
  IncrementalSource2[IncrementalSource2["MouseMove"] = 1] = "MouseMove";
  IncrementalSource2[IncrementalSource2["MouseInteraction"] = 2] = "MouseInteraction";
  IncrementalSource2[IncrementalSource2["Scroll"] = 3] = "Scroll";
  IncrementalSource2[IncrementalSource2["ViewportResize"] = 4] = "ViewportResize";
  IncrementalSource2[IncrementalSource2["Input"] = 5] = "Input";
  IncrementalSource2[IncrementalSource2["TouchMove"] = 6] = "TouchMove";
  IncrementalSource2[IncrementalSource2["MediaInteraction"] = 7] = "MediaInteraction";
  IncrementalSource2[IncrementalSource2["StyleSheetRule"] = 8] = "StyleSheetRule";
  IncrementalSource2[IncrementalSource2["CanvasMutation"] = 9] = "CanvasMutation";
  IncrementalSource2[IncrementalSource2["Font"] = 10] = "Font";
  IncrementalSource2[IncrementalSource2["Log"] = 11] = "Log";
  IncrementalSource2[IncrementalSource2["Drag"] = 12] = "Drag";
  IncrementalSource2[IncrementalSource2["StyleDeclaration"] = 13] = "StyleDeclaration";
  IncrementalSource2[IncrementalSource2["Selection"] = 14] = "Selection";
  IncrementalSource2[IncrementalSource2["AdoptedStyleSheet"] = 15] = "AdoptedStyleSheet";
  IncrementalSource2[IncrementalSource2["CustomElement"] = 16] = "CustomElement";
  return IncrementalSource2;
})(IncrementalSource || {});
var MouseInteractions = /* @__PURE__ */ ((MouseInteractions2) => {
  MouseInteractions2[MouseInteractions2["MouseUp"] = 0] = "MouseUp";
  MouseInteractions2[MouseInteractions2["MouseDown"] = 1] = "MouseDown";
  MouseInteractions2[MouseInteractions2["Click"] = 2] = "Click";
  MouseInteractions2[MouseInteractions2["ContextMenu"] = 3] = "ContextMenu";
  MouseInteractions2[MouseInteractions2["DblClick"] = 4] = "DblClick";
  MouseInteractions2[MouseInteractions2["Focus"] = 5] = "Focus";
  MouseInteractions2[MouseInteractions2["Blur"] = 6] = "Blur";
  MouseInteractions2[MouseInteractions2["TouchStart"] = 7] = "TouchStart";
  MouseInteractions2[MouseInteractions2["TouchMove_Departed"] = 8] = "TouchMove_Departed";
  MouseInteractions2[MouseInteractions2["TouchEnd"] = 9] = "TouchEnd";
  MouseInteractions2[MouseInteractions2["TouchCancel"] = 10] = "TouchCancel";
  return MouseInteractions2;
})(MouseInteractions || {});
var PointerTypes = /* @__PURE__ */ ((PointerTypes2) => {
  PointerTypes2[PointerTypes2["Mouse"] = 0] = "Mouse";
  PointerTypes2[PointerTypes2["Pen"] = 1] = "Pen";
  PointerTypes2[PointerTypes2["Touch"] = 2] = "Touch";
  return PointerTypes2;
})(PointerTypes || {});
var CanvasContext = /* @__PURE__ */ ((CanvasContext2) => {
  CanvasContext2[CanvasContext2["2D"] = 0] = "2D";
  CanvasContext2[CanvasContext2["WebGL"] = 1] = "WebGL";
  CanvasContext2[CanvasContext2["WebGL2"] = 2] = "WebGL2";
  return CanvasContext2;
})(CanvasContext || {});
var MediaInteractions = /* @__PURE__ */ ((MediaInteractions2) => {
  MediaInteractions2[MediaInteractions2["Play"] = 0] = "Play";
  MediaInteractions2[MediaInteractions2["Pause"] = 1] = "Pause";
  MediaInteractions2[MediaInteractions2["Seeked"] = 2] = "Seeked";
  MediaInteractions2[MediaInteractions2["VolumeChange"] = 3] = "VolumeChange";
  MediaInteractions2[MediaInteractions2["RateChange"] = 4] = "RateChange";
  return MediaInteractions2;
})(MediaInteractions || {});
var ReplayerEvents = /* @__PURE__ */ ((ReplayerEvents2) => {
  ReplayerEvents2["Start"] = "start";
  ReplayerEvents2["Pause"] = "pause";
  ReplayerEvents2["Resume"] = "resume";
  ReplayerEvents2["Resize"] = "resize";
  ReplayerEvents2["Finish"] = "finish";
  ReplayerEvents2["FullsnapshotRebuilded"] = "fullsnapshot-rebuilded";
  ReplayerEvents2["LoadStylesheetStart"] = "load-stylesheet-start";
  ReplayerEvents2["LoadStylesheetEnd"] = "load-stylesheet-end";
  ReplayerEvents2["SkipStart"] = "skip-start";
  ReplayerEvents2["SkipEnd"] = "skip-end";
  ReplayerEvents2["MouseInteraction"] = "mouse-interaction";
  ReplayerEvents2["EventCast"] = "event-cast";
  ReplayerEvents2["CustomEvent"] = "custom-event";
  ReplayerEvents2["Flush"] = "flush";
  ReplayerEvents2["StateChange"] = "state-change";
  ReplayerEvents2["PlayBack"] = "play-back";
  ReplayerEvents2["Destroy"] = "destroy";
  return ReplayerEvents2;
})(ReplayerEvents || {});
function isNodeInLinkedList(n2) {
  return "__ln" in n2;
}
class DoubleLinkedList {
  constructor() {
    __publicField(this, "length", 0);
    __publicField(this, "head", null);
    __publicField(this, "tail", null);
  }
  get(position) {
    if (position >= this.length) {
      throw new Error("Position outside of list range");
    }
    let current = this.head;
    for (let index = 0; index < position; index++) {
      current = (current == null ? void 0 : current.next) || null;
    }
    return current;
  }
  addNode(n2) {
    const node = {
      value: n2,
      previous: null,
      next: null
    };
    n2.__ln = node;
    if (n2.previousSibling && isNodeInLinkedList(n2.previousSibling)) {
      const current = n2.previousSibling.__ln.next;
      node.next = current;
      node.previous = n2.previousSibling.__ln;
      n2.previousSibling.__ln.next = node;
      if (current) {
        current.previous = node;
      }
    } else if (n2.nextSibling && isNodeInLinkedList(n2.nextSibling) && n2.nextSibling.__ln.previous) {
      const current = n2.nextSibling.__ln.previous;
      node.previous = current;
      node.next = n2.nextSibling.__ln;
      n2.nextSibling.__ln.previous = node;
      if (current) {
        current.next = node;
      }
    } else {
      if (this.head) {
        this.head.previous = node;
      }
      node.next = this.head;
      this.head = node;
    }
    if (node.next === null) {
      this.tail = node;
    }
    this.length++;
  }
  removeNode(n2) {
    const current = n2.__ln;
    if (!this.head) {
      return;
    }
    if (!current.previous) {
      this.head = current.next;
      if (this.head) {
        this.head.previous = null;
      } else {
        this.tail = null;
      }
    } else {
      current.previous.next = current.next;
      if (current.next) {
        current.next.previous = current.previous;
      } else {
        this.tail = current.previous;
      }
    }
    if (n2.__ln) {
      delete n2.__ln;
    }
    this.length--;
  }
}
const moveKey = (id, parentId) => `${id}@${parentId}`;
class MutationBuffer {
  constructor() {
    __publicField(this, "frozen", false);
    __publicField(this, "locked", false);
    __publicField(this, "texts", []);
    __publicField(this, "attributes", []);
    __publicField(this, "attributeMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "removes", []);
    __publicField(this, "mapRemoves", []);
    __publicField(this, "movedMap", {});
    /**
     * the browser MutationObserver emits multiple mutations after
     * a delay for performance reasons, making tracing added nodes hard
     * in our `processMutations` callback function.
     * For example, if we append an element el_1 into body, and then append
     * another element el_2 into el_1, these two mutations may be passed to the
     * callback function together when the two operations were done.
     * Generally we need to trace child nodes of newly added nodes, but in this
     * case if we count el_2 as el_1's child node in the first mutation record,
     * then we will count el_2 again in the second mutation record which was
     * duplicated.
     * To avoid of duplicate counting added nodes, we use a Set to store
     * added nodes and its child nodes during iterate mutation records. Then
     * collect added nodes from the Set which have no duplicate copy. But
     * this also causes newly added nodes will not be serialized with id ASAP,
     * which means all the id related calculation should be lazy too.
     */
    __publicField(this, "addedSet", /* @__PURE__ */ new Set());
    __publicField(this, "movedSet", /* @__PURE__ */ new Set());
    __publicField(this, "droppedSet", /* @__PURE__ */ new Set());
    __publicField(this, "mutationCb");
    __publicField(this, "blockClass");
    __publicField(this, "blockSelector");
    __publicField(this, "maskTextClass");
    __publicField(this, "maskTextSelector");
    __publicField(this, "inlineStylesheet");
    __publicField(this, "maskInputOptions");
    __publicField(this, "maskTextFn");
    __publicField(this, "maskInputFn");
    __publicField(this, "keepIframeSrcFn");
    __publicField(this, "recordCanvas");
    __publicField(this, "inlineImages");
    __publicField(this, "slimDOMOptions");
    __publicField(this, "dataURLOptions");
    __publicField(this, "doc");
    __publicField(this, "mirror");
    __publicField(this, "iframeManager");
    __publicField(this, "stylesheetManager");
    __publicField(this, "shadowDomManager");
    __publicField(this, "canvasManager");
    __publicField(this, "processedNodeManager");
    __publicField(this, "unattachedDoc");
    __publicField(this, "processMutations", (mutations) => {
      mutations.forEach(this.processMutation);
      this.emit();
    });
    __publicField(this, "emit", () => {
      if (this.frozen || this.locked) {
        return;
      }
      const adds = [];
      const addedIds = /* @__PURE__ */ new Set();
      const addList = new DoubleLinkedList();
      const getNextId = (n2) => {
        let ns = n2;
        let nextId = IGNORED_NODE;
        while (nextId === IGNORED_NODE) {
          ns = ns && ns.nextSibling;
          nextId = ns && this.mirror.getId(ns);
        }
        return nextId;
      };
      const pushAdd = (n2) => {
        if (!n2.parentNode || !inDom(n2) || n2.parentNode.tagName === "TEXTAREA") {
          return;
        }
        const parentId = isShadowRoot(n2.parentNode) ? this.mirror.getId(getShadowHost(n2)) : this.mirror.getId(n2.parentNode);
        const nextId = getNextId(n2);
        if (parentId === -1 || nextId === -1) {
          return addList.addNode(n2);
        }
        const sn = serializeNodeWithId(n2, {
          doc: this.doc,
          mirror: this.mirror,
          blockClass: this.blockClass,
          blockSelector: this.blockSelector,
          maskTextClass: this.maskTextClass,
          maskTextSelector: this.maskTextSelector,
          skipChild: true,
          newlyAddedElement: true,
          inlineStylesheet: this.inlineStylesheet,
          maskInputOptions: this.maskInputOptions,
          maskTextFn: this.maskTextFn,
          maskInputFn: this.maskInputFn,
          slimDOMOptions: this.slimDOMOptions,
          dataURLOptions: this.dataURLOptions,
          recordCanvas: this.recordCanvas,
          inlineImages: this.inlineImages,
          onSerialize: (currentN) => {
            if (isSerializedIframe(currentN, this.mirror)) {
              this.iframeManager.addIframe(currentN);
            }
            if (isSerializedStylesheet(currentN, this.mirror)) {
              this.stylesheetManager.trackLinkElement(
                currentN
              );
            }
            if (hasShadowRoot(n2)) {
              this.shadowDomManager.addShadowRoot(n2.shadowRoot, this.doc);
            }
          },
          onIframeLoad: (iframe, childSn) => {
            this.iframeManager.attachIframe(iframe, childSn);
            this.shadowDomManager.observeAttachShadow(iframe);
          },
          onStylesheetLoad: (link, childSn) => {
            this.stylesheetManager.attachLinkElement(link, childSn);
          }
        });
        if (sn) {
          adds.push({
            parentId,
            nextId,
            node: sn
          });
          addedIds.add(sn.id);
        }
      };
      while (this.mapRemoves.length) {
        this.mirror.removeNodeFromMap(this.mapRemoves.shift());
      }
      for (const n2 of this.movedSet) {
        if (isParentRemoved(this.removes, n2, this.mirror) && !this.movedSet.has(n2.parentNode)) {
          continue;
        }
        pushAdd(n2);
      }
      for (const n2 of this.addedSet) {
        if (!isAncestorInSet(this.droppedSet, n2) && !isParentRemoved(this.removes, n2, this.mirror)) {
          pushAdd(n2);
        } else if (isAncestorInSet(this.movedSet, n2)) {
          pushAdd(n2);
        } else {
          this.droppedSet.add(n2);
        }
      }
      let candidate = null;
      while (addList.length) {
        let node = null;
        if (candidate) {
          const parentId = this.mirror.getId(candidate.value.parentNode);
          const nextId = getNextId(candidate.value);
          if (parentId !== -1 && nextId !== -1) {
            node = candidate;
          }
        }
        if (!node) {
          let tailNode = addList.tail;
          while (tailNode) {
            const _node = tailNode;
            tailNode = tailNode.previous;
            if (_node) {
              const parentId = this.mirror.getId(_node.value.parentNode);
              const nextId = getNextId(_node.value);
              if (nextId === -1)
                continue;
              else if (parentId !== -1) {
                node = _node;
                break;
              } else {
                const unhandledNode = _node.value;
                if (unhandledNode.parentNode && unhandledNode.parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                  const shadowHost = unhandledNode.parentNode.host;
                  const parentId2 = this.mirror.getId(shadowHost);
                  if (parentId2 !== -1) {
                    node = _node;
                    break;
                  }
                }
              }
            }
          }
        }
        if (!node) {
          while (addList.head) {
            addList.removeNode(addList.head.value);
          }
          break;
        }
        candidate = node.previous;
        addList.removeNode(node.value);
        pushAdd(node.value);
      }
      const payload = {
        texts: this.texts.map((text) => {
          const n2 = text.node;
          if (n2.parentNode && n2.parentNode.tagName === "TEXTAREA") {
            this.genTextAreaValueMutation(n2.parentNode);
          }
          return {
            id: this.mirror.getId(n2),
            value: text.value
          };
        }).filter((text) => !addedIds.has(text.id)).filter((text) => this.mirror.has(text.id)),
        attributes: this.attributes.map((attribute) => {
          const { attributes } = attribute;
          if (typeof attributes.style === "string") {
            const diffAsStr = JSON.stringify(attribute.styleDiff);
            const unchangedAsStr = JSON.stringify(attribute._unchangedStyles);
            if (diffAsStr.length < attributes.style.length) {
              if ((diffAsStr + unchangedAsStr).split("var(").length === attributes.style.split("var(").length) {
                attributes.style = attribute.styleDiff;
              }
            }
          }
          return {
            id: this.mirror.getId(attribute.node),
            attributes
          };
        }).filter((attribute) => !addedIds.has(attribute.id)).filter((attribute) => this.mirror.has(attribute.id)),
        removes: this.removes,
        adds
      };
      if (!payload.texts.length && !payload.attributes.length && !payload.removes.length && !payload.adds.length) {
        return;
      }
      this.texts = [];
      this.attributes = [];
      this.attributeMap = /* @__PURE__ */ new WeakMap();
      this.removes = [];
      this.addedSet = /* @__PURE__ */ new Set();
      this.movedSet = /* @__PURE__ */ new Set();
      this.droppedSet = /* @__PURE__ */ new Set();
      this.movedMap = {};
      this.mutationCb(payload);
    });
    __publicField(this, "genTextAreaValueMutation", (textarea) => {
      let item = this.attributeMap.get(textarea);
      if (!item) {
        item = {
          node: textarea,
          attributes: {},
          styleDiff: {},
          _unchangedStyles: {}
        };
        this.attributes.push(item);
        this.attributeMap.set(textarea, item);
      }
      item.attributes.value = Array.from(
        textarea.childNodes,
        (cn) => cn.textContent || ""
      ).join("");
    });
    __publicField(this, "processMutation", (m) => {
      if (isIgnored(m.target, this.mirror, this.slimDOMOptions)) {
        return;
      }
      switch (m.type) {
        case "characterData": {
          const value = m.target.textContent;
          if (!isBlocked(m.target, this.blockClass, this.blockSelector, false) && value !== m.oldValue) {
            this.texts.push({
              value: needMaskingText(
                m.target,
                this.maskTextClass,
                this.maskTextSelector,
                true
                // checkAncestors
              ) && value ? this.maskTextFn ? this.maskTextFn(value, closestElementOfNode(m.target)) : value.replace(/[\S]/g, "*") : value,
              node: m.target
            });
          }
          break;
        }
        case "attributes": {
          const target = m.target;
          let attributeName = m.attributeName;
          let value = m.target.getAttribute(attributeName);
          if (attributeName === "value") {
            const type = getInputType(target);
            value = maskInputValue({
              element: target,
              maskInputOptions: this.maskInputOptions,
              tagName: target.tagName,
              type,
              value,
              maskInputFn: this.maskInputFn
            });
          }
          if (isBlocked(m.target, this.blockClass, this.blockSelector, false) || value === m.oldValue) {
            return;
          }
          let item = this.attributeMap.get(m.target);
          if (target.tagName === "IFRAME" && attributeName === "src" && !this.keepIframeSrcFn(value)) {
            if (!target.contentDocument) {
              attributeName = "rr_src";
            } else {
              return;
            }
          }
          if (!item) {
            item = {
              node: m.target,
              attributes: {},
              styleDiff: {},
              _unchangedStyles: {}
            };
            this.attributes.push(item);
            this.attributeMap.set(m.target, item);
          }
          if (attributeName === "type" && target.tagName === "INPUT" && (m.oldValue || "").toLowerCase() === "password") {
            target.setAttribute("data-rr-is-password", "true");
          }
          if (!ignoreAttribute(target.tagName, attributeName)) {
            item.attributes[attributeName] = transformAttribute(
              this.doc,
              toLowerCase(target.tagName),
              toLowerCase(attributeName),
              value
            );
            if (attributeName === "style") {
              if (!this.unattachedDoc) {
                try {
                  this.unattachedDoc = document.implementation.createHTMLDocument();
                } catch (e2) {
                  this.unattachedDoc = this.doc;
                }
              }
              const old = this.unattachedDoc.createElement("span");
              if (m.oldValue) {
                old.setAttribute("style", m.oldValue);
              }
              for (const pname of Array.from(target.style)) {
                const newValue = target.style.getPropertyValue(pname);
                const newPriority = target.style.getPropertyPriority(pname);
                if (newValue !== old.style.getPropertyValue(pname) || newPriority !== old.style.getPropertyPriority(pname)) {
                  if (newPriority === "") {
                    item.styleDiff[pname] = newValue;
                  } else {
                    item.styleDiff[pname] = [newValue, newPriority];
                  }
                } else {
                  item._unchangedStyles[pname] = [newValue, newPriority];
                }
              }
              for (const pname of Array.from(old.style)) {
                if (target.style.getPropertyValue(pname) === "") {
                  item.styleDiff[pname] = false;
                }
              }
            }
          }
          break;
        }
        case "childList": {
          if (isBlocked(m.target, this.blockClass, this.blockSelector, true))
            return;
          if (m.target.tagName === "TEXTAREA") {
            this.genTextAreaValueMutation(m.target);
            return;
          }
          m.addedNodes.forEach((n2) => this.genAdds(n2, m.target));
          m.removedNodes.forEach((n2) => {
            const nodeId = this.mirror.getId(n2);
            const parentId = isShadowRoot(m.target) ? this.mirror.getId(m.target.host) : this.mirror.getId(m.target);
            if (isBlocked(m.target, this.blockClass, this.blockSelector, false) || isIgnored(n2, this.mirror, this.slimDOMOptions) || !isSerialized(n2, this.mirror)) {
              return;
            }
            if (this.addedSet.has(n2)) {
              deepDelete(this.addedSet, n2);
              this.droppedSet.add(n2);
            } else if (this.addedSet.has(m.target) && nodeId === -1)
              ;
            else if (isAncestorRemoved(m.target, this.mirror))
              ;
            else if (this.movedSet.has(n2) && this.movedMap[moveKey(nodeId, parentId)]) {
              deepDelete(this.movedSet, n2);
            } else {
              this.removes.push({
                parentId,
                id: nodeId,
                isShadow: isShadowRoot(m.target) && isNativeShadowDom(m.target) ? true : void 0
              });
            }
            this.mapRemoves.push(n2);
          });
          break;
        }
      }
    });
    /**
     * Make sure you check if `n`'s parent is blocked before calling this function
     * */
    __publicField(this, "genAdds", (n2, target) => {
      if (this.processedNodeManager.inOtherBuffer(n2, this))
        return;
      if (this.addedSet.has(n2) || this.movedSet.has(n2))
        return;
      if (this.mirror.hasNode(n2)) {
        if (isIgnored(n2, this.mirror, this.slimDOMOptions)) {
          return;
        }
        this.movedSet.add(n2);
        let targetId = null;
        if (target && this.mirror.hasNode(target)) {
          targetId = this.mirror.getId(target);
        }
        if (targetId && targetId !== -1) {
          this.movedMap[moveKey(this.mirror.getId(n2), targetId)] = true;
        }
      } else {
        this.addedSet.add(n2);
        this.droppedSet.delete(n2);
      }
      if (!isBlocked(n2, this.blockClass, this.blockSelector, false)) {
        n2.childNodes.forEach((childN) => this.genAdds(childN));
        if (hasShadowRoot(n2)) {
          n2.shadowRoot.childNodes.forEach((childN) => {
            this.processedNodeManager.add(childN, this);
            this.genAdds(childN, n2);
          });
        }
      }
    });
  }
  init(options) {
    [
      "mutationCb",
      "blockClass",
      "blockSelector",
      "maskTextClass",
      "maskTextSelector",
      "inlineStylesheet",
      "maskInputOptions",
      "maskTextFn",
      "maskInputFn",
      "keepIframeSrcFn",
      "recordCanvas",
      "inlineImages",
      "slimDOMOptions",
      "dataURLOptions",
      "doc",
      "mirror",
      "iframeManager",
      "stylesheetManager",
      "shadowDomManager",
      "canvasManager",
      "processedNodeManager"
    ].forEach((key) => {
      this[key] = options[key];
    });
  }
  freeze() {
    this.frozen = true;
    this.canvasManager.freeze();
  }
  unfreeze() {
    this.frozen = false;
    this.canvasManager.unfreeze();
    this.emit();
  }
  isFrozen() {
    return this.frozen;
  }
  lock() {
    this.locked = true;
    this.canvasManager.lock();
  }
  unlock() {
    this.locked = false;
    this.canvasManager.unlock();
    this.emit();
  }
  reset() {
    this.shadowDomManager.reset();
    this.canvasManager.reset();
  }
}
function deepDelete(addsSet, n2) {
  addsSet.delete(n2);
  n2.childNodes.forEach((childN) => deepDelete(addsSet, childN));
}
function isParentRemoved(removes, n2, mirror2) {
  if (removes.length === 0)
    return false;
  return _isParentRemoved(removes, n2, mirror2);
}
function _isParentRemoved(removes, n2, mirror2) {
  let node = n2.parentNode;
  while (node) {
    const parentId = mirror2.getId(node);
    if (removes.some((r2) => r2.id === parentId)) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}
function isAncestorInSet(set, n2) {
  if (set.size === 0)
    return false;
  return _isAncestorInSet(set, n2);
}
function _isAncestorInSet(set, n2) {
  const { parentNode } = n2;
  if (!parentNode) {
    return false;
  }
  if (set.has(parentNode)) {
    return true;
  }
  return _isAncestorInSet(set, parentNode);
}
let errorHandler;
function registerErrorHandler(handler) {
  errorHandler = handler;
}
function unregisterErrorHandler() {
  errorHandler = void 0;
}
const callbackWrapper = (cb) => {
  if (!errorHandler) {
    return cb;
  }
  const rrwebWrapped = (...rest) => {
    try {
      return cb(...rest);
    } catch (error) {
      if (errorHandler && errorHandler(error) === true) {
        return;
      }
      throw error;
    }
  };
  return rrwebWrapped;
};
const mutationBuffers = [];
function getEventTarget(event) {
  try {
    if ("composedPath" in event) {
      const path = event.composedPath();
      if (path.length) {
        return path[0];
      }
    } else if ("path" in event && event.path.length) {
      return event.path[0];
    }
  } catch {
  }
  return event && event.target;
}
function initMutationObserver(options, rootEl) {
  var _a2, _b;
  const mutationBuffer = new MutationBuffer();
  mutationBuffers.push(mutationBuffer);
  mutationBuffer.init(options);
  let mutationObserverCtor = window.MutationObserver || /**
  * Some websites may disable MutationObserver by removing it from the window object.
  * If someone is using rrweb to build a browser extention or things like it, they
  * could not change the website's code but can have an opportunity to inject some
  * code before the website executing its JS logic.
  * Then they can do this to store the native MutationObserver:
  * window.__rrMutationObserver = MutationObserver
  */
  window.__rrMutationObserver;
  const angularZoneSymbol = (_b = (_a2 = window == null ? void 0 : window.Zone) == null ? void 0 : _a2.__symbol__) == null ? void 0 : _b.call(_a2, "MutationObserver");
  if (angularZoneSymbol && window[angularZoneSymbol]) {
    mutationObserverCtor = window[angularZoneSymbol];
  }
  const observer = new mutationObserverCtor(
    callbackWrapper(mutationBuffer.processMutations.bind(mutationBuffer))
  );
  observer.observe(rootEl, {
    attributes: true,
    attributeOldValue: true,
    characterData: true,
    characterDataOldValue: true,
    childList: true,
    subtree: true
  });
  return observer;
}
function initMoveObserver({
  mousemoveCb,
  sampling,
  doc,
  mirror: mirror2
}) {
  if (sampling.mousemove === false) {
    return () => {
    };
  }
  const threshold = typeof sampling.mousemove === "number" ? sampling.mousemove : 50;
  const callbackThreshold = typeof sampling.mousemoveCallback === "number" ? sampling.mousemoveCallback : 500;
  let positions = [];
  let timeBaseline;
  const wrappedCb = throttle(
    callbackWrapper(
      (source) => {
        const totalOffset = Date.now() - timeBaseline;
        mousemoveCb(
          positions.map((p) => {
            p.timeOffset -= totalOffset;
            return p;
          }),
          source
        );
        positions = [];
        timeBaseline = null;
      }
    ),
    callbackThreshold
  );
  const updatePosition = callbackWrapper(
    throttle(
      callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        const { clientX, clientY } = legacy_isTouchEvent(evt) ? evt.changedTouches[0] : evt;
        if (!timeBaseline) {
          timeBaseline = nowTimestamp();
        }
        positions.push({
          x: clientX,
          y: clientY,
          id: mirror2.getId(target),
          timeOffset: nowTimestamp() - timeBaseline
        });
        wrappedCb(
          typeof DragEvent !== "undefined" && evt instanceof DragEvent ? IncrementalSource.Drag : evt instanceof MouseEvent ? IncrementalSource.MouseMove : IncrementalSource.TouchMove
        );
      }),
      threshold,
      {
        trailing: false
      }
    )
  );
  const handlers = [
    on("mousemove", updatePosition, doc),
    on("touchmove", updatePosition, doc),
    on("drag", updatePosition, doc)
  ];
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initMouseInteractionObserver({
  mouseInteractionCb,
  doc,
  mirror: mirror2,
  blockClass,
  blockSelector,
  sampling
}) {
  if (sampling.mouseInteraction === false) {
    return () => {
    };
  }
  const disableMap = sampling.mouseInteraction === true || sampling.mouseInteraction === void 0 ? {} : sampling.mouseInteraction;
  const handlers = [];
  let currentPointerType = null;
  const getHandler = (eventKey) => {
    return (event) => {
      const target = getEventTarget(event);
      if (isBlocked(target, blockClass, blockSelector, true)) {
        return;
      }
      let pointerType = null;
      let thisEventKey = eventKey;
      if ("pointerType" in event) {
        switch (event.pointerType) {
          case "mouse":
            pointerType = PointerTypes.Mouse;
            break;
          case "touch":
            pointerType = PointerTypes.Touch;
            break;
          case "pen":
            pointerType = PointerTypes.Pen;
            break;
        }
        if (pointerType === PointerTypes.Touch) {
          if (MouseInteractions[eventKey] === MouseInteractions.MouseDown) {
            thisEventKey = "TouchStart";
          } else if (MouseInteractions[eventKey] === MouseInteractions.MouseUp) {
            thisEventKey = "TouchEnd";
          }
        } else if (pointerType === PointerTypes.Pen)
          ;
      } else if (legacy_isTouchEvent(event)) {
        pointerType = PointerTypes.Touch;
      }
      if (pointerType !== null) {
        currentPointerType = pointerType;
        if (thisEventKey.startsWith("Touch") && pointerType === PointerTypes.Touch || thisEventKey.startsWith("Mouse") && pointerType === PointerTypes.Mouse) {
          pointerType = null;
        }
      } else if (MouseInteractions[eventKey] === MouseInteractions.Click) {
        pointerType = currentPointerType;
        currentPointerType = null;
      }
      const e2 = legacy_isTouchEvent(event) ? event.changedTouches[0] : event;
      if (!e2) {
        return;
      }
      const id = mirror2.getId(target);
      const { clientX, clientY } = e2;
      callbackWrapper(mouseInteractionCb)({
        type: MouseInteractions[thisEventKey],
        id,
        x: clientX,
        y: clientY,
        ...pointerType !== null && { pointerType }
      });
    };
  };
  Object.keys(MouseInteractions).filter(
    (key) => Number.isNaN(Number(key)) && !key.endsWith("_Departed") && disableMap[key] !== false
  ).forEach((eventKey) => {
    let eventName = toLowerCase(eventKey);
    const handler = getHandler(eventKey);
    if (window.PointerEvent) {
      switch (MouseInteractions[eventKey]) {
        case MouseInteractions.MouseDown:
        case MouseInteractions.MouseUp:
          eventName = eventName.replace(
            "mouse",
            "pointer"
          );
          break;
        case MouseInteractions.TouchStart:
        case MouseInteractions.TouchEnd:
          return;
      }
    }
    handlers.push(on(eventName, handler, doc));
  });
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initScrollObserver({
  scrollCb,
  doc,
  mirror: mirror2,
  blockClass,
  blockSelector,
  sampling
}) {
  const updatePosition = callbackWrapper(
    throttle(
      callbackWrapper((evt) => {
        const target = getEventTarget(evt);
        if (!target || isBlocked(target, blockClass, blockSelector, true)) {
          return;
        }
        const id = mirror2.getId(target);
        if (target === doc && doc.defaultView) {
          const scrollLeftTop = getWindowScroll(doc.defaultView);
          scrollCb({
            id,
            x: scrollLeftTop.left,
            y: scrollLeftTop.top
          });
        } else {
          scrollCb({
            id,
            x: target.scrollLeft,
            y: target.scrollTop
          });
        }
      }),
      sampling.scroll || 100
    )
  );
  return on("scroll", updatePosition, doc);
}
function initViewportResizeObserver({ viewportResizeCb }, { win }) {
  let lastH = -1;
  let lastW = -1;
  const updateDimension = callbackWrapper(
    throttle(
      callbackWrapper(() => {
        const height = getWindowHeight();
        const width = getWindowWidth();
        if (lastH !== height || lastW !== width) {
          viewportResizeCb({
            width: Number(width),
            height: Number(height)
          });
          lastH = height;
          lastW = width;
        }
      }),
      200
    )
  );
  return on("resize", updateDimension, win);
}
const INPUT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];
const lastInputValueMap = /* @__PURE__ */ new WeakMap();
function initInputObserver({
  inputCb,
  doc,
  mirror: mirror2,
  blockClass,
  blockSelector,
  ignoreClass,
  ignoreSelector,
  maskInputOptions,
  maskInputFn,
  sampling,
  userTriggeredOnInput
}) {
  function eventHandler(event) {
    let target = getEventTarget(event);
    const userTriggered = event.isTrusted;
    const tagName = target && target.tagName;
    if (target && tagName === "OPTION") {
      target = target.parentElement;
    }
    if (!target || !tagName || INPUT_TAGS.indexOf(tagName) < 0 || isBlocked(target, blockClass, blockSelector, true)) {
      return;
    }
    if (target.classList.contains(ignoreClass) || ignoreSelector && target.matches(ignoreSelector)) {
      return;
    }
    let text = target.value;
    let isChecked = false;
    const type = getInputType(target) || "";
    if (type === "radio" || type === "checkbox") {
      isChecked = target.checked;
    } else if (maskInputOptions[tagName.toLowerCase()] || maskInputOptions[type]) {
      text = maskInputValue({
        element: target,
        maskInputOptions,
        tagName,
        type,
        value: text,
        maskInputFn
      });
    }
    cbWithDedup(
      target,
      userTriggeredOnInput ? { text, isChecked, userTriggered } : { text, isChecked }
    );
    const name = target.name;
    if (type === "radio" && name && isChecked) {
      doc.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((el) => {
        if (el !== target) {
          const text2 = el.value;
          cbWithDedup(
            el,
            userTriggeredOnInput ? { text: text2, isChecked: !isChecked, userTriggered: false } : { text: text2, isChecked: !isChecked }
          );
        }
      });
    }
  }
  function cbWithDedup(target, v2) {
    const lastInputValue = lastInputValueMap.get(target);
    if (!lastInputValue || lastInputValue.text !== v2.text || lastInputValue.isChecked !== v2.isChecked) {
      lastInputValueMap.set(target, v2);
      const id = mirror2.getId(target);
      callbackWrapper(inputCb)({
        ...v2,
        id
      });
    }
  }
  const events = sampling.input === "last" ? ["change"] : ["input", "change"];
  const handlers = events.map(
    (eventName) => on(eventName, callbackWrapper(eventHandler), doc)
  );
  const currentWindow = doc.defaultView;
  if (!currentWindow) {
    return () => {
      handlers.forEach((h) => h());
    };
  }
  const propertyDescriptor = currentWindow.Object.getOwnPropertyDescriptor(
    currentWindow.HTMLInputElement.prototype,
    "value"
  );
  const hookProperties = [
    [currentWindow.HTMLInputElement.prototype, "value"],
    [currentWindow.HTMLInputElement.prototype, "checked"],
    [currentWindow.HTMLSelectElement.prototype, "value"],
    [currentWindow.HTMLTextAreaElement.prototype, "value"],
    // Some UI library use selectedIndex to set select value
    [currentWindow.HTMLSelectElement.prototype, "selectedIndex"],
    [currentWindow.HTMLOptionElement.prototype, "selected"]
  ];
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...hookProperties.map(
        (p) => hookSetter(
          p[0],
          p[1],
          {
            set() {
              callbackWrapper(eventHandler)({
                target: this,
                isTrusted: false
                // userTriggered to false as this could well be programmatic
              });
            }
          },
          false,
          currentWindow
        )
      )
    );
  }
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function getNestedCSSRulePositions(rule) {
  const positions = [];
  function recurse(childRule, pos) {
    if (hasNestedCSSRule("CSSGroupingRule") && childRule.parentRule instanceof CSSGroupingRule || hasNestedCSSRule("CSSMediaRule") && childRule.parentRule instanceof CSSMediaRule || hasNestedCSSRule("CSSSupportsRule") && childRule.parentRule instanceof CSSSupportsRule || hasNestedCSSRule("CSSConditionRule") && childRule.parentRule instanceof CSSConditionRule) {
      const rules2 = Array.from(
        childRule.parentRule.cssRules
      );
      const index = rules2.indexOf(childRule);
      pos.unshift(index);
    } else if (childRule.parentStyleSheet) {
      const rules2 = Array.from(childRule.parentStyleSheet.cssRules);
      const index = rules2.indexOf(childRule);
      pos.unshift(index);
    }
    return pos;
  }
  return recurse(rule, positions);
}
function getIdAndStyleId(sheet, mirror2, styleMirror) {
  let id, styleId;
  if (!sheet)
    return {};
  if (sheet.ownerNode)
    id = mirror2.getId(sheet.ownerNode);
  else
    styleId = styleMirror.getId(sheet);
  return {
    styleId,
    id
  };
}
function initStyleSheetObserver({ styleSheetRuleCb, mirror: mirror2, stylesheetManager }, { win }) {
  if (!win.CSSStyleSheet || !win.CSSStyleSheet.prototype) {
    return () => {
    };
  }
  const insertRule = win.CSSStyleSheet.prototype.insertRule;
  win.CSSStyleSheet.prototype.insertRule = new Proxy(insertRule, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        const [rule, index] = argumentsList;
        const { id, styleId } = getIdAndStyleId(
          thisArg,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleSheetRuleCb({
            id,
            styleId,
            adds: [{ rule, index }]
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  const deleteRule = win.CSSStyleSheet.prototype.deleteRule;
  win.CSSStyleSheet.prototype.deleteRule = new Proxy(deleteRule, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        const [index] = argumentsList;
        const { id, styleId } = getIdAndStyleId(
          thisArg,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleSheetRuleCb({
            id,
            styleId,
            removes: [{ index }]
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  let replace;
  if (win.CSSStyleSheet.prototype.replace) {
    replace = win.CSSStyleSheet.prototype.replace;
    win.CSSStyleSheet.prototype.replace = new Proxy(replace, {
      apply: callbackWrapper(
        (target, thisArg, argumentsList) => {
          const [text] = argumentsList;
          const { id, styleId } = getIdAndStyleId(
            thisArg,
            mirror2,
            stylesheetManager.styleMirror
          );
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              replace: text
            });
          }
          return target.apply(thisArg, argumentsList);
        }
      )
    });
  }
  let replaceSync;
  if (win.CSSStyleSheet.prototype.replaceSync) {
    replaceSync = win.CSSStyleSheet.prototype.replaceSync;
    win.CSSStyleSheet.prototype.replaceSync = new Proxy(replaceSync, {
      apply: callbackWrapper(
        (target, thisArg, argumentsList) => {
          const [text] = argumentsList;
          const { id, styleId } = getIdAndStyleId(
            thisArg,
            mirror2,
            stylesheetManager.styleMirror
          );
          if (id && id !== -1 || styleId && styleId !== -1) {
            styleSheetRuleCb({
              id,
              styleId,
              replaceSync: text
            });
          }
          return target.apply(thisArg, argumentsList);
        }
      )
    });
  }
  const supportedNestedCSSRuleTypes = {};
  if (canMonkeyPatchNestedCSSRule("CSSGroupingRule")) {
    supportedNestedCSSRuleTypes.CSSGroupingRule = win.CSSGroupingRule;
  } else {
    if (canMonkeyPatchNestedCSSRule("CSSMediaRule")) {
      supportedNestedCSSRuleTypes.CSSMediaRule = win.CSSMediaRule;
    }
    if (canMonkeyPatchNestedCSSRule("CSSConditionRule")) {
      supportedNestedCSSRuleTypes.CSSConditionRule = win.CSSConditionRule;
    }
    if (canMonkeyPatchNestedCSSRule("CSSSupportsRule")) {
      supportedNestedCSSRuleTypes.CSSSupportsRule = win.CSSSupportsRule;
    }
  }
  const unmodifiedFunctions = {};
  Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
    unmodifiedFunctions[typeKey] = {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      insertRule: type.prototype.insertRule,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      deleteRule: type.prototype.deleteRule
    };
    type.prototype.insertRule = new Proxy(
      unmodifiedFunctions[typeKey].insertRule,
      {
        apply: callbackWrapper(
          (target, thisArg, argumentsList) => {
            const [rule, index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(
              thisArg.parentStyleSheet,
              mirror2,
              stylesheetManager.styleMirror
            );
            if (id && id !== -1 || styleId && styleId !== -1) {
              styleSheetRuleCb({
                id,
                styleId,
                adds: [
                  {
                    rule,
                    index: [
                      ...getNestedCSSRulePositions(thisArg),
                      index || 0
                      // defaults to 0
                    ]
                  }
                ]
              });
            }
            return target.apply(thisArg, argumentsList);
          }
        )
      }
    );
    type.prototype.deleteRule = new Proxy(
      unmodifiedFunctions[typeKey].deleteRule,
      {
        apply: callbackWrapper(
          (target, thisArg, argumentsList) => {
            const [index] = argumentsList;
            const { id, styleId } = getIdAndStyleId(
              thisArg.parentStyleSheet,
              mirror2,
              stylesheetManager.styleMirror
            );
            if (id && id !== -1 || styleId && styleId !== -1) {
              styleSheetRuleCb({
                id,
                styleId,
                removes: [
                  { index: [...getNestedCSSRulePositions(thisArg), index] }
                ]
              });
            }
            return target.apply(thisArg, argumentsList);
          }
        )
      }
    );
  });
  return callbackWrapper(() => {
    win.CSSStyleSheet.prototype.insertRule = insertRule;
    win.CSSStyleSheet.prototype.deleteRule = deleteRule;
    replace && (win.CSSStyleSheet.prototype.replace = replace);
    replaceSync && (win.CSSStyleSheet.prototype.replaceSync = replaceSync);
    Object.entries(supportedNestedCSSRuleTypes).forEach(([typeKey, type]) => {
      type.prototype.insertRule = unmodifiedFunctions[typeKey].insertRule;
      type.prototype.deleteRule = unmodifiedFunctions[typeKey].deleteRule;
    });
  });
}
function initAdoptedStyleSheetObserver({
  mirror: mirror2,
  stylesheetManager
}, host) {
  var _a2, _b, _c;
  let hostId = null;
  if (host.nodeName === "#document")
    hostId = mirror2.getId(host);
  else
    hostId = mirror2.getId(host.host);
  const patchTarget = host.nodeName === "#document" ? (_a2 = host.defaultView) == null ? void 0 : _a2.Document : (_c = (_b = host.ownerDocument) == null ? void 0 : _b.defaultView) == null ? void 0 : _c.ShadowRoot;
  const originalPropertyDescriptor = (patchTarget == null ? void 0 : patchTarget.prototype) ? Object.getOwnPropertyDescriptor(
    patchTarget == null ? void 0 : patchTarget.prototype,
    "adoptedStyleSheets"
  ) : void 0;
  if (hostId === null || hostId === -1 || !patchTarget || !originalPropertyDescriptor)
    return () => {
    };
  Object.defineProperty(host, "adoptedStyleSheets", {
    configurable: originalPropertyDescriptor.configurable,
    enumerable: originalPropertyDescriptor.enumerable,
    get() {
      var _a3;
      return (_a3 = originalPropertyDescriptor.get) == null ? void 0 : _a3.call(this);
    },
    set(sheets) {
      var _a3;
      const result = (_a3 = originalPropertyDescriptor.set) == null ? void 0 : _a3.call(this, sheets);
      if (hostId !== null && hostId !== -1) {
        try {
          stylesheetManager.adoptStyleSheets(sheets, hostId);
        } catch (e2) {
        }
      }
      return result;
    }
  });
  return callbackWrapper(() => {
    Object.defineProperty(host, "adoptedStyleSheets", {
      configurable: originalPropertyDescriptor.configurable,
      enumerable: originalPropertyDescriptor.enumerable,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      get: originalPropertyDescriptor.get,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      set: originalPropertyDescriptor.set
    });
  });
}
function initStyleDeclarationObserver({
  styleDeclarationCb,
  mirror: mirror2,
  ignoreCSSAttributes,
  stylesheetManager
}, { win }) {
  const setProperty = win.CSSStyleDeclaration.prototype.setProperty;
  win.CSSStyleDeclaration.prototype.setProperty = new Proxy(setProperty, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        var _a2;
        const [property, value, priority] = argumentsList;
        if (ignoreCSSAttributes.has(property)) {
          return setProperty.apply(thisArg, [property, value, priority]);
        }
        const { id, styleId } = getIdAndStyleId(
          (_a2 = thisArg.parentRule) == null ? void 0 : _a2.parentStyleSheet,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleDeclarationCb({
            id,
            styleId,
            set: {
              property,
              value,
              priority
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            index: getNestedCSSRulePositions(thisArg.parentRule)
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  const removeProperty = win.CSSStyleDeclaration.prototype.removeProperty;
  win.CSSStyleDeclaration.prototype.removeProperty = new Proxy(removeProperty, {
    apply: callbackWrapper(
      (target, thisArg, argumentsList) => {
        var _a2;
        const [property] = argumentsList;
        if (ignoreCSSAttributes.has(property)) {
          return removeProperty.apply(thisArg, [property]);
        }
        const { id, styleId } = getIdAndStyleId(
          (_a2 = thisArg.parentRule) == null ? void 0 : _a2.parentStyleSheet,
          mirror2,
          stylesheetManager.styleMirror
        );
        if (id && id !== -1 || styleId && styleId !== -1) {
          styleDeclarationCb({
            id,
            styleId,
            remove: {
              property
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            index: getNestedCSSRulePositions(thisArg.parentRule)
          });
        }
        return target.apply(thisArg, argumentsList);
      }
    )
  });
  return callbackWrapper(() => {
    win.CSSStyleDeclaration.prototype.setProperty = setProperty;
    win.CSSStyleDeclaration.prototype.removeProperty = removeProperty;
  });
}
function initMediaInteractionObserver({
  mediaInteractionCb,
  blockClass,
  blockSelector,
  mirror: mirror2,
  sampling,
  doc
}) {
  const handler = callbackWrapper(
    (type) => throttle(
      callbackWrapper((event) => {
        const target = getEventTarget(event);
        if (!target || isBlocked(target, blockClass, blockSelector, true)) {
          return;
        }
        const { currentTime, volume, muted, playbackRate, loop } = target;
        mediaInteractionCb({
          type,
          id: mirror2.getId(target),
          currentTime,
          volume,
          muted,
          playbackRate,
          loop
        });
      }),
      sampling.media || 500
    )
  );
  const handlers = [
    on("play", handler(MediaInteractions.Play), doc),
    on("pause", handler(MediaInteractions.Pause), doc),
    on("seeked", handler(MediaInteractions.Seeked), doc),
    on("volumechange", handler(MediaInteractions.VolumeChange), doc),
    on("ratechange", handler(MediaInteractions.RateChange), doc)
  ];
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initFontObserver({ fontCb, doc }) {
  const win = doc.defaultView;
  if (!win) {
    return () => {
    };
  }
  const handlers = [];
  const fontMap = /* @__PURE__ */ new WeakMap();
  const originalFontFace = win.FontFace;
  win.FontFace = function FontFace2(family, source, descriptors) {
    const fontFace = new originalFontFace(family, source, descriptors);
    fontMap.set(fontFace, {
      family,
      buffer: typeof source !== "string",
      descriptors,
      fontSource: typeof source === "string" ? source : JSON.stringify(Array.from(new Uint8Array(source)))
    });
    return fontFace;
  };
  const restoreHandler = patch(
    doc.fonts,
    "add",
    function(original) {
      return function(fontFace) {
        setTimeout(
          callbackWrapper(() => {
            const p = fontMap.get(fontFace);
            if (p) {
              fontCb(p);
              fontMap.delete(fontFace);
            }
          }),
          0
        );
        return original.apply(this, [fontFace]);
      };
    }
  );
  handlers.push(() => {
    win.FontFace = originalFontFace;
  });
  handlers.push(restoreHandler);
  return callbackWrapper(() => {
    handlers.forEach((h) => h());
  });
}
function initSelectionObserver(param) {
  const { doc, mirror: mirror2, blockClass, blockSelector, selectionCb } = param;
  let collapsed = true;
  const updateSelection = callbackWrapper(() => {
    const selection = doc.getSelection();
    if (!selection || collapsed && (selection == null ? void 0 : selection.isCollapsed))
      return;
    collapsed = selection.isCollapsed || false;
    const ranges = [];
    const count = selection.rangeCount || 0;
    for (let i2 = 0; i2 < count; i2++) {
      const range = selection.getRangeAt(i2);
      const { startContainer, startOffset, endContainer, endOffset } = range;
      const blocked = isBlocked(startContainer, blockClass, blockSelector, true) || isBlocked(endContainer, blockClass, blockSelector, true);
      if (blocked)
        continue;
      ranges.push({
        start: mirror2.getId(startContainer),
        startOffset,
        end: mirror2.getId(endContainer),
        endOffset
      });
    }
    selectionCb({ ranges });
  });
  updateSelection();
  return on("selectionchange", updateSelection);
}
function initCustomElementObserver({
  doc,
  customElementCb
}) {
  const win = doc.defaultView;
  if (!win || !win.customElements)
    return () => {
    };
  const restoreHandler = patch(
    win.customElements,
    "define",
    function(original) {
      return function(name, constructor, options) {
        try {
          customElementCb({
            define: {
              name
            }
          });
        } catch (e2) {
          console.warn(`Custom element callback failed for ${name}`);
        }
        return original.apply(this, [name, constructor, options]);
      };
    }
  );
  return restoreHandler;
}
function mergeHooks(o2, hooks) {
  const {
    mutationCb,
    mousemoveCb,
    mouseInteractionCb,
    scrollCb,
    viewportResizeCb,
    inputCb,
    mediaInteractionCb,
    styleSheetRuleCb,
    styleDeclarationCb,
    canvasMutationCb,
    fontCb,
    selectionCb,
    customElementCb
  } = o2;
  o2.mutationCb = (...p) => {
    if (hooks.mutation) {
      hooks.mutation(...p);
    }
    mutationCb(...p);
  };
  o2.mousemoveCb = (...p) => {
    if (hooks.mousemove) {
      hooks.mousemove(...p);
    }
    mousemoveCb(...p);
  };
  o2.mouseInteractionCb = (...p) => {
    if (hooks.mouseInteraction) {
      hooks.mouseInteraction(...p);
    }
    mouseInteractionCb(...p);
  };
  o2.scrollCb = (...p) => {
    if (hooks.scroll) {
      hooks.scroll(...p);
    }
    scrollCb(...p);
  };
  o2.viewportResizeCb = (...p) => {
    if (hooks.viewportResize) {
      hooks.viewportResize(...p);
    }
    viewportResizeCb(...p);
  };
  o2.inputCb = (...p) => {
    if (hooks.input) {
      hooks.input(...p);
    }
    inputCb(...p);
  };
  o2.mediaInteractionCb = (...p) => {
    if (hooks.mediaInteaction) {
      hooks.mediaInteaction(...p);
    }
    mediaInteractionCb(...p);
  };
  o2.styleSheetRuleCb = (...p) => {
    if (hooks.styleSheetRule) {
      hooks.styleSheetRule(...p);
    }
    styleSheetRuleCb(...p);
  };
  o2.styleDeclarationCb = (...p) => {
    if (hooks.styleDeclaration) {
      hooks.styleDeclaration(...p);
    }
    styleDeclarationCb(...p);
  };
  o2.canvasMutationCb = (...p) => {
    if (hooks.canvasMutation) {
      hooks.canvasMutation(...p);
    }
    canvasMutationCb(...p);
  };
  o2.fontCb = (...p) => {
    if (hooks.font) {
      hooks.font(...p);
    }
    fontCb(...p);
  };
  o2.selectionCb = (...p) => {
    if (hooks.selection) {
      hooks.selection(...p);
    }
    selectionCb(...p);
  };
  o2.customElementCb = (...c2) => {
    if (hooks.customElement) {
      hooks.customElement(...c2);
    }
    customElementCb(...c2);
  };
}
function initObservers(o2, hooks = {}) {
  const currentWindow = o2.doc.defaultView;
  if (!currentWindow) {
    return () => {
    };
  }
  mergeHooks(o2, hooks);
  let mutationObserver;
  if (o2.recordDOM) {
    mutationObserver = initMutationObserver(o2, o2.doc);
  }
  const mousemoveHandler = initMoveObserver(o2);
  const mouseInteractionHandler = initMouseInteractionObserver(o2);
  const scrollHandler = initScrollObserver(o2);
  const viewportResizeHandler = initViewportResizeObserver(o2, {
    win: currentWindow
  });
  const inputHandler = initInputObserver(o2);
  const mediaInteractionHandler = initMediaInteractionObserver(o2);
  let styleSheetObserver = () => {
  };
  let adoptedStyleSheetObserver = () => {
  };
  let styleDeclarationObserver = () => {
  };
  let fontObserver = () => {
  };
  if (o2.recordDOM) {
    styleSheetObserver = initStyleSheetObserver(o2, { win: currentWindow });
    adoptedStyleSheetObserver = initAdoptedStyleSheetObserver(o2, o2.doc);
    styleDeclarationObserver = initStyleDeclarationObserver(o2, {
      win: currentWindow
    });
    if (o2.collectFonts) {
      fontObserver = initFontObserver(o2);
    }
  }
  const selectionObserver = initSelectionObserver(o2);
  const customElementObserver = initCustomElementObserver(o2);
  const pluginHandlers = [];
  for (const plugin of o2.plugins) {
    pluginHandlers.push(
      plugin.observer(plugin.callback, currentWindow, plugin.options)
    );
  }
  return callbackWrapper(() => {
    mutationBuffers.forEach((b) => b.reset());
    mutationObserver == null ? void 0 : mutationObserver.disconnect();
    mousemoveHandler();
    mouseInteractionHandler();
    scrollHandler();
    viewportResizeHandler();
    inputHandler();
    mediaInteractionHandler();
    styleSheetObserver();
    adoptedStyleSheetObserver();
    styleDeclarationObserver();
    fontObserver();
    selectionObserver();
    customElementObserver();
    pluginHandlers.forEach((h) => h());
  });
}
function hasNestedCSSRule(prop) {
  return typeof window[prop] !== "undefined";
}
function canMonkeyPatchNestedCSSRule(prop) {
  return Boolean(
    typeof window[prop] !== "undefined" && // Note: Generally, this check _shouldn't_ be necessary
    // However, in some scenarios (e.g. jsdom) this can sometimes fail, so we check for it here
    window[prop].prototype && "insertRule" in window[prop].prototype && "deleteRule" in window[prop].prototype
  );
}
class CrossOriginIframeMirror {
  constructor(generateIdFn) {
    __publicField(this, "iframeIdToRemoteIdMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "iframeRemoteIdToIdMap", /* @__PURE__ */ new WeakMap());
    this.generateIdFn = generateIdFn;
  }
  getId(iframe, remoteId, idToRemoteMap, remoteToIdMap) {
    const idToRemoteIdMap = idToRemoteMap || this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = remoteToIdMap || this.getRemoteIdToIdMap(iframe);
    let id = idToRemoteIdMap.get(remoteId);
    if (!id) {
      id = this.generateIdFn();
      idToRemoteIdMap.set(remoteId, id);
      remoteIdToIdMap.set(id, remoteId);
    }
    return id;
  }
  getIds(iframe, remoteId) {
    const idToRemoteIdMap = this.getIdToRemoteIdMap(iframe);
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
    return remoteId.map(
      (id) => this.getId(iframe, id, idToRemoteIdMap, remoteIdToIdMap)
    );
  }
  getRemoteId(iframe, id, map) {
    const remoteIdToIdMap = map || this.getRemoteIdToIdMap(iframe);
    if (typeof id !== "number")
      return id;
    const remoteId = remoteIdToIdMap.get(id);
    if (!remoteId)
      return -1;
    return remoteId;
  }
  getRemoteIds(iframe, ids) {
    const remoteIdToIdMap = this.getRemoteIdToIdMap(iframe);
    return ids.map((id) => this.getRemoteId(iframe, id, remoteIdToIdMap));
  }
  reset(iframe) {
    if (!iframe) {
      this.iframeIdToRemoteIdMap = /* @__PURE__ */ new WeakMap();
      this.iframeRemoteIdToIdMap = /* @__PURE__ */ new WeakMap();
      return;
    }
    this.iframeIdToRemoteIdMap.delete(iframe);
    this.iframeRemoteIdToIdMap.delete(iframe);
  }
  getIdToRemoteIdMap(iframe) {
    let idToRemoteIdMap = this.iframeIdToRemoteIdMap.get(iframe);
    if (!idToRemoteIdMap) {
      idToRemoteIdMap = /* @__PURE__ */ new Map();
      this.iframeIdToRemoteIdMap.set(iframe, idToRemoteIdMap);
    }
    return idToRemoteIdMap;
  }
  getRemoteIdToIdMap(iframe) {
    let remoteIdToIdMap = this.iframeRemoteIdToIdMap.get(iframe);
    if (!remoteIdToIdMap) {
      remoteIdToIdMap = /* @__PURE__ */ new Map();
      this.iframeRemoteIdToIdMap.set(iframe, remoteIdToIdMap);
    }
    return remoteIdToIdMap;
  }
}
class IframeManager {
  constructor(options) {
    __publicField(this, "iframes", /* @__PURE__ */ new WeakMap());
    __publicField(this, "crossOriginIframeMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "crossOriginIframeMirror", new CrossOriginIframeMirror(genId));
    __publicField(this, "crossOriginIframeStyleMirror");
    __publicField(this, "crossOriginIframeRootIdMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "mirror");
    __publicField(this, "mutationCb");
    __publicField(this, "wrappedEmit");
    __publicField(this, "loadListener");
    __publicField(this, "stylesheetManager");
    __publicField(this, "recordCrossOriginIframes");
    this.mutationCb = options.mutationCb;
    this.wrappedEmit = options.wrappedEmit;
    this.stylesheetManager = options.stylesheetManager;
    this.recordCrossOriginIframes = options.recordCrossOriginIframes;
    this.crossOriginIframeStyleMirror = new CrossOriginIframeMirror(
      this.stylesheetManager.styleMirror.generateId.bind(
        this.stylesheetManager.styleMirror
      )
    );
    this.mirror = options.mirror;
    if (this.recordCrossOriginIframes) {
      window.addEventListener("message", this.handleMessage.bind(this));
    }
  }
  addIframe(iframeEl) {
    this.iframes.set(iframeEl, true);
    if (iframeEl.contentWindow)
      this.crossOriginIframeMap.set(iframeEl.contentWindow, iframeEl);
  }
  addLoadListener(cb) {
    this.loadListener = cb;
  }
  attachIframe(iframeEl, childSn) {
    var _a2, _b;
    this.mutationCb({
      adds: [
        {
          parentId: this.mirror.getId(iframeEl),
          nextId: null,
          node: childSn
        }
      ],
      removes: [],
      texts: [],
      attributes: [],
      isAttachIframe: true
    });
    if (this.recordCrossOriginIframes)
      (_a2 = iframeEl.contentWindow) == null ? void 0 : _a2.addEventListener(
        "message",
        this.handleMessage.bind(this)
      );
    (_b = this.loadListener) == null ? void 0 : _b.call(this, iframeEl);
    if (iframeEl.contentDocument && iframeEl.contentDocument.adoptedStyleSheets && iframeEl.contentDocument.adoptedStyleSheets.length > 0)
      this.stylesheetManager.adoptStyleSheets(
        iframeEl.contentDocument.adoptedStyleSheets,
        this.mirror.getId(iframeEl.contentDocument)
      );
  }
  handleMessage(message) {
    const crossOriginMessageEvent = message;
    if (crossOriginMessageEvent.data.type !== "rrweb" || // To filter out the rrweb messages which are forwarded by some sites.
    crossOriginMessageEvent.origin !== crossOriginMessageEvent.data.origin)
      return;
    const iframeSourceWindow = message.source;
    if (!iframeSourceWindow)
      return;
    const iframeEl = this.crossOriginIframeMap.get(message.source);
    if (!iframeEl)
      return;
    const transformedEvent = this.transformCrossOriginEvent(
      iframeEl,
      crossOriginMessageEvent.data.event
    );
    if (transformedEvent)
      this.wrappedEmit(
        transformedEvent,
        crossOriginMessageEvent.data.isCheckout
      );
  }
  transformCrossOriginEvent(iframeEl, e2) {
    var _a2;
    switch (e2.type) {
      case EventType.FullSnapshot: {
        this.crossOriginIframeMirror.reset(iframeEl);
        this.crossOriginIframeStyleMirror.reset(iframeEl);
        this.replaceIdOnNode(e2.data.node, iframeEl);
        const rootId = e2.data.node.id;
        this.crossOriginIframeRootIdMap.set(iframeEl, rootId);
        this.patchRootIdOnNode(e2.data.node, rootId);
        return {
          timestamp: e2.timestamp,
          type: EventType.IncrementalSnapshot,
          data: {
            source: IncrementalSource.Mutation,
            adds: [
              {
                parentId: this.mirror.getId(iframeEl),
                nextId: null,
                node: e2.data.node
              }
            ],
            removes: [],
            texts: [],
            attributes: [],
            isAttachIframe: true
          }
        };
      }
      case EventType.Meta:
      case EventType.Load:
      case EventType.DomContentLoaded: {
        return false;
      }
      case EventType.Plugin: {
        return e2;
      }
      case EventType.Custom: {
        this.replaceIds(
          e2.data.payload,
          iframeEl,
          ["id", "parentId", "previousId", "nextId"]
        );
        return e2;
      }
      case EventType.IncrementalSnapshot: {
        switch (e2.data.source) {
          case IncrementalSource.Mutation: {
            e2.data.adds.forEach((n2) => {
              this.replaceIds(n2, iframeEl, [
                "parentId",
                "nextId",
                "previousId"
              ]);
              this.replaceIdOnNode(n2.node, iframeEl);
              const rootId = this.crossOriginIframeRootIdMap.get(iframeEl);
              rootId && this.patchRootIdOnNode(n2.node, rootId);
            });
            e2.data.removes.forEach((n2) => {
              this.replaceIds(n2, iframeEl, ["parentId", "id"]);
            });
            e2.data.attributes.forEach((n2) => {
              this.replaceIds(n2, iframeEl, ["id"]);
            });
            e2.data.texts.forEach((n2) => {
              this.replaceIds(n2, iframeEl, ["id"]);
            });
            return e2;
          }
          case IncrementalSource.Drag:
          case IncrementalSource.TouchMove:
          case IncrementalSource.MouseMove: {
            e2.data.positions.forEach((p) => {
              this.replaceIds(p, iframeEl, ["id"]);
            });
            return e2;
          }
          case IncrementalSource.ViewportResize: {
            return false;
          }
          case IncrementalSource.MediaInteraction:
          case IncrementalSource.MouseInteraction:
          case IncrementalSource.Scroll:
          case IncrementalSource.CanvasMutation:
          case IncrementalSource.Input: {
            this.replaceIds(e2.data, iframeEl, ["id"]);
            return e2;
          }
          case IncrementalSource.StyleSheetRule:
          case IncrementalSource.StyleDeclaration: {
            this.replaceIds(e2.data, iframeEl, ["id"]);
            this.replaceStyleIds(e2.data, iframeEl, ["styleId"]);
            return e2;
          }
          case IncrementalSource.Font: {
            return e2;
          }
          case IncrementalSource.Selection: {
            e2.data.ranges.forEach((range) => {
              this.replaceIds(range, iframeEl, ["start", "end"]);
            });
            return e2;
          }
          case IncrementalSource.AdoptedStyleSheet: {
            this.replaceIds(e2.data, iframeEl, ["id"]);
            this.replaceStyleIds(e2.data, iframeEl, ["styleIds"]);
            (_a2 = e2.data.styles) == null ? void 0 : _a2.forEach((style) => {
              this.replaceStyleIds(style, iframeEl, ["styleId"]);
            });
            return e2;
          }
        }
      }
    }
    return false;
  }
  replace(iframeMirror, obj, iframeEl, keys) {
    for (const key of keys) {
      if (!Array.isArray(obj[key]) && typeof obj[key] !== "number")
        continue;
      if (Array.isArray(obj[key])) {
        obj[key] = iframeMirror.getIds(
          iframeEl,
          obj[key]
        );
      } else {
        obj[key] = iframeMirror.getId(iframeEl, obj[key]);
      }
    }
    return obj;
  }
  replaceIds(obj, iframeEl, keys) {
    return this.replace(this.crossOriginIframeMirror, obj, iframeEl, keys);
  }
  replaceStyleIds(obj, iframeEl, keys) {
    return this.replace(this.crossOriginIframeStyleMirror, obj, iframeEl, keys);
  }
  replaceIdOnNode(node, iframeEl) {
    this.replaceIds(node, iframeEl, ["id", "rootId"]);
    if ("childNodes" in node) {
      node.childNodes.forEach((child) => {
        this.replaceIdOnNode(child, iframeEl);
      });
    }
  }
  patchRootIdOnNode(node, rootId) {
    if (node.type !== NodeType$2.Document && !node.rootId)
      node.rootId = rootId;
    if ("childNodes" in node) {
      node.childNodes.forEach((child) => {
        this.patchRootIdOnNode(child, rootId);
      });
    }
  }
}
class ShadowDomManager {
  constructor(options) {
    __publicField(this, "shadowDoms", /* @__PURE__ */ new WeakSet());
    __publicField(this, "mutationCb");
    __publicField(this, "scrollCb");
    __publicField(this, "bypassOptions");
    __publicField(this, "mirror");
    __publicField(this, "restoreHandlers", []);
    this.mutationCb = options.mutationCb;
    this.scrollCb = options.scrollCb;
    this.bypassOptions = options.bypassOptions;
    this.mirror = options.mirror;
    this.init();
  }
  init() {
    this.reset();
    this.patchAttachShadow(Element, document);
  }
  addShadowRoot(shadowRoot, doc) {
    if (!isNativeShadowDom(shadowRoot))
      return;
    if (this.shadowDoms.has(shadowRoot))
      return;
    this.shadowDoms.add(shadowRoot);
    const observer = initMutationObserver(
      {
        ...this.bypassOptions,
        doc,
        mutationCb: this.mutationCb,
        mirror: this.mirror,
        shadowDomManager: this
      },
      shadowRoot
    );
    this.restoreHandlers.push(() => observer.disconnect());
    this.restoreHandlers.push(
      initScrollObserver({
        ...this.bypassOptions,
        scrollCb: this.scrollCb,
        // https://gist.github.com/praveenpuglia/0832da687ed5a5d7a0907046c9ef1813
        // scroll is not allowed to pass the boundary, so we need to listen the shadow document
        doc: shadowRoot,
        mirror: this.mirror
      })
    );
    setTimeout(() => {
      if (shadowRoot.adoptedStyleSheets && shadowRoot.adoptedStyleSheets.length > 0)
        this.bypassOptions.stylesheetManager.adoptStyleSheets(
          shadowRoot.adoptedStyleSheets,
          this.mirror.getId(shadowRoot.host)
        );
      this.restoreHandlers.push(
        initAdoptedStyleSheetObserver(
          {
            mirror: this.mirror,
            stylesheetManager: this.bypassOptions.stylesheetManager
          },
          shadowRoot
        )
      );
    }, 0);
  }
  /**
   * Monkey patch 'attachShadow' of an IFrameElement to observe newly added shadow doms.
   */
  observeAttachShadow(iframeElement) {
    if (!iframeElement.contentWindow || !iframeElement.contentDocument)
      return;
    this.patchAttachShadow(
      iframeElement.contentWindow.Element,
      iframeElement.contentDocument
    );
  }
  /**
   * Patch 'attachShadow' to observe newly added shadow doms.
   */
  patchAttachShadow(element, doc) {
    const manager = this;
    this.restoreHandlers.push(
      patch(
        element.prototype,
        "attachShadow",
        function(original) {
          return function(option) {
            const shadowRoot = original.call(this, option);
            if (this.shadowRoot && inDom(this))
              manager.addShadowRoot(this.shadowRoot, doc);
            return shadowRoot;
          };
        }
      )
    );
  }
  reset() {
    this.restoreHandlers.forEach((handler) => {
      try {
        handler();
      } catch (e2) {
      }
    });
    this.restoreHandlers = [];
    this.shadowDoms = /* @__PURE__ */ new WeakSet();
  }
}
var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
for (var i$1 = 0; i$1 < chars.length; i$1++) {
  lookup[chars.charCodeAt(i$1)] = i$1;
}
var encode = function(arraybuffer) {
  var bytes = new Uint8Array(arraybuffer), i2, len = bytes.length, base64 = "";
  for (i2 = 0; i2 < len; i2 += 3) {
    base64 += chars[bytes[i2] >> 2];
    base64 += chars[(bytes[i2] & 3) << 4 | bytes[i2 + 1] >> 4];
    base64 += chars[(bytes[i2 + 1] & 15) << 2 | bytes[i2 + 2] >> 6];
    base64 += chars[bytes[i2 + 2] & 63];
  }
  if (len % 3 === 2) {
    base64 = base64.substring(0, base64.length - 1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.substring(0, base64.length - 2) + "==";
  }
  return base64;
};
var decode = function(base64) {
  var bufferLength = base64.length * 0.75, len = base64.length, i2, p = 0, encoded1, encoded2, encoded3, encoded4;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }
  var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
  for (i2 = 0; i2 < len; i2 += 4) {
    encoded1 = lookup[base64.charCodeAt(i2)];
    encoded2 = lookup[base64.charCodeAt(i2 + 1)];
    encoded3 = lookup[base64.charCodeAt(i2 + 2)];
    encoded4 = lookup[base64.charCodeAt(i2 + 3)];
    bytes[p++] = encoded1 << 2 | encoded2 >> 4;
    bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
    bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
  }
  return arraybuffer;
};
const canvasVarMap = /* @__PURE__ */ new Map();
function variableListFor$1(ctx, ctor) {
  let contextMap = canvasVarMap.get(ctx);
  if (!contextMap) {
    contextMap = /* @__PURE__ */ new Map();
    canvasVarMap.set(ctx, contextMap);
  }
  if (!contextMap.has(ctor)) {
    contextMap.set(ctor, []);
  }
  return contextMap.get(ctor);
}
const saveWebGLVar = (value, win, ctx) => {
  if (!value || !(isInstanceOfWebGLObject(value, win) || typeof value === "object"))
    return;
  const name = value.constructor.name;
  const list = variableListFor$1(ctx, name);
  let index = list.indexOf(value);
  if (index === -1) {
    index = list.length;
    list.push(value);
  }
  return index;
};
function serializeArg(value, win, ctx) {
  if (value instanceof Array) {
    return value.map((arg) => serializeArg(arg, win, ctx));
  } else if (value === null) {
    return value;
  } else if (value instanceof Float32Array || value instanceof Float64Array || value instanceof Int32Array || value instanceof Uint32Array || value instanceof Uint8Array || value instanceof Uint16Array || value instanceof Int16Array || value instanceof Int8Array || value instanceof Uint8ClampedArray) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [Object.values(value)]
    };
  } else if (
    // SharedArrayBuffer disabled on most browsers due to spectre.
    // More info: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer/SharedArrayBuffer
    // value instanceof SharedArrayBuffer ||
    value instanceof ArrayBuffer
  ) {
    const name = value.constructor.name;
    const base64 = encode(value);
    return {
      rr_type: name,
      base64
    };
  } else if (value instanceof DataView) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [
        serializeArg(value.buffer, win, ctx),
        value.byteOffset,
        value.byteLength
      ]
    };
  } else if (value instanceof HTMLImageElement) {
    const name = value.constructor.name;
    const { src } = value;
    return {
      rr_type: name,
      src
    };
  } else if (value instanceof HTMLCanvasElement) {
    const name = "HTMLImageElement";
    const src = value.toDataURL();
    return {
      rr_type: name,
      src
    };
  } else if (value instanceof ImageData) {
    const name = value.constructor.name;
    return {
      rr_type: name,
      args: [serializeArg(value.data, win, ctx), value.width, value.height]
    };
  } else if (isInstanceOfWebGLObject(value, win) || typeof value === "object") {
    const name = value.constructor.name;
    const index = saveWebGLVar(value, win, ctx);
    return {
      rr_type: name,
      index
    };
  }
  return value;
}
const serializeArgs = (args, win, ctx) => {
  return args.map((arg) => serializeArg(arg, win, ctx));
};
const isInstanceOfWebGLObject = (value, win) => {
  const webGLConstructorNames = [
    "WebGLActiveInfo",
    "WebGLBuffer",
    "WebGLFramebuffer",
    "WebGLProgram",
    "WebGLRenderbuffer",
    "WebGLShader",
    "WebGLShaderPrecisionFormat",
    "WebGLTexture",
    "WebGLUniformLocation",
    "WebGLVertexArrayObject",
    // In old Chrome versions, value won't be an instanceof WebGLVertexArrayObject.
    "WebGLVertexArrayObjectOES"
  ];
  const supportedWebGLConstructorNames = webGLConstructorNames.filter(
    (name) => typeof win[name] === "function"
  );
  return Boolean(
    supportedWebGLConstructorNames.find(
      (name) => value instanceof win[name]
    )
  );
};
function initCanvas2DMutationObserver(cb, win, blockClass2, blockSelector) {
  const handlers = [];
  const props2D = Object.getOwnPropertyNames(
    win.CanvasRenderingContext2D.prototype
  );
  for (const prop of props2D) {
    try {
      if (typeof win.CanvasRenderingContext2D.prototype[prop] !== "function") {
        continue;
      }
      const restoreHandler = patch(
        win.CanvasRenderingContext2D.prototype,
        prop,
        function(original) {
          return function(...args) {
            if (!isBlocked(this.canvas, blockClass2, blockSelector, true)) {
              setTimeout(() => {
                const recordArgs = serializeArgs(args, win, this);
                cb(this.canvas, {
                  type: CanvasContext["2D"],
                  property: prop,
                  args: recordArgs
                });
              }, 0);
            }
            return original.apply(this, args);
          };
        }
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter(
        win.CanvasRenderingContext2D.prototype,
        prop,
        {
          set(v2) {
            cb(this.canvas, {
              type: CanvasContext["2D"],
              property: prop,
              args: [v2],
              setter: true
            });
          }
        }
      );
      handlers.push(hookHandler);
    }
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
function getNormalizedContextName(contextType) {
  return contextType === "experimental-webgl" ? "webgl" : contextType;
}
function initCanvasContextObserver(win, blockClass, blockSelector, setPreserveDrawingBufferToTrue) {
  const handlers = [];
  try {
    const restoreHandler = patch(
      win.HTMLCanvasElement.prototype,
      "getContext",
      function(original) {
        return function(contextType, ...args) {
          if (!isBlocked(this, blockClass, blockSelector, true)) {
            const ctxName = getNormalizedContextName(contextType);
            if (!("__context" in this))
              this.__context = ctxName;
            if (setPreserveDrawingBufferToTrue && ["webgl", "webgl2"].includes(ctxName)) {
              if (args[0] && typeof args[0] === "object") {
                const contextAttributes = args[0];
                if (!contextAttributes.preserveDrawingBuffer) {
                  contextAttributes.preserveDrawingBuffer = true;
                }
              } else {
                args.splice(0, 1, {
                  preserveDrawingBuffer: true
                });
              }
            }
          }
          return original.apply(this, [contextType, ...args]);
        };
      }
    );
    handlers.push(restoreHandler);
  } catch {
    console.error("failed to patch HTMLCanvasElement.prototype.getContext");
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
function patchGLPrototype(prototype, type, cb, blockClass2, blockSelector, _mirror2, win) {
  const handlers = [];
  const props = Object.getOwnPropertyNames(prototype);
  for (const prop of props) {
    if (
      //prop.startsWith('get') ||  // e.g. getProgramParameter, but too risky
      [
        "isContextLost",
        "canvas",
        "drawingBufferWidth",
        "drawingBufferHeight"
      ].includes(prop)
    ) {
      continue;
    }
    try {
      if (typeof prototype[prop] !== "function") {
        continue;
      }
      const restoreHandler = patch(
        prototype,
        prop,
        function(original) {
          return function(...args) {
            const result = original.apply(this, args);
            saveWebGLVar(result, win, this);
            if ("tagName" in this.canvas && !isBlocked(this.canvas, blockClass2, blockSelector, true)) {
              const recordArgs = serializeArgs(args, win, this);
              const mutation = {
                type,
                property: prop,
                args: recordArgs
              };
              cb(this.canvas, mutation);
            }
            return result;
          };
        }
      );
      handlers.push(restoreHandler);
    } catch {
      const hookHandler = hookSetter(prototype, prop, {
        set(v2) {
          cb(this.canvas, {
            type,
            property: prop,
            args: [v2],
            setter: true
          });
        }
      });
      handlers.push(hookHandler);
    }
  }
  return handlers;
}
function initCanvasWebGLMutationObserver(cb, win, blockClass2, blockSelector, mirror2) {
  const handlers = [];
  handlers.push(
    ...patchGLPrototype(
      win.WebGLRenderingContext.prototype,
      CanvasContext.WebGL,
      cb,
      blockClass2,
      blockSelector,
      mirror2,
      win
    )
  );
  if (typeof win.WebGL2RenderingContext !== "undefined") {
    handlers.push(
      ...patchGLPrototype(
        win.WebGL2RenderingContext.prototype,
        CanvasContext.WebGL2,
        cb,
        blockClass2,
        blockSelector,
        mirror2,
        win
      )
    );
  }
  return () => {
    handlers.forEach((h) => h());
  };
}
const encodedJs = "KGZ1bmN0aW9uKCkgewogICJ1c2Ugc3RyaWN0IjsKICB2YXIgY2hhcnMgPSAiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLyI7CiAgdmFyIGxvb2t1cCA9IHR5cGVvZiBVaW50OEFycmF5ID09PSAidW5kZWZpbmVkIiA/IFtdIDogbmV3IFVpbnQ4QXJyYXkoMjU2KTsKICBmb3IgKHZhciBpID0gMDsgaSA8IGNoYXJzLmxlbmd0aDsgaSsrKSB7CiAgICBsb29rdXBbY2hhcnMuY2hhckNvZGVBdChpKV0gPSBpOwogIH0KICB2YXIgZW5jb2RlID0gZnVuY3Rpb24oYXJyYXlidWZmZXIpIHsKICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KGFycmF5YnVmZmVyKSwgaTIsIGxlbiA9IGJ5dGVzLmxlbmd0aCwgYmFzZTY0ID0gIiI7CiAgICBmb3IgKGkyID0gMDsgaTIgPCBsZW47IGkyICs9IDMpIHsKICAgICAgYmFzZTY0ICs9IGNoYXJzW2J5dGVzW2kyXSA+PiAyXTsKICAgICAgYmFzZTY0ICs9IGNoYXJzWyhieXRlc1tpMl0gJiAzKSA8PCA0IHwgYnl0ZXNbaTIgKyAxXSA+PiA0XTsKICAgICAgYmFzZTY0ICs9IGNoYXJzWyhieXRlc1tpMiArIDFdICYgMTUpIDw8IDIgfCBieXRlc1tpMiArIDJdID4+IDZdOwogICAgICBiYXNlNjQgKz0gY2hhcnNbYnl0ZXNbaTIgKyAyXSAmIDYzXTsKICAgIH0KICAgIGlmIChsZW4gJSAzID09PSAyKSB7CiAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDEpICsgIj0iOwogICAgfSBlbHNlIGlmIChsZW4gJSAzID09PSAxKSB7CiAgICAgIGJhc2U2NCA9IGJhc2U2NC5zdWJzdHJpbmcoMCwgYmFzZTY0Lmxlbmd0aCAtIDIpICsgIj09IjsKICAgIH0KICAgIHJldHVybiBiYXNlNjQ7CiAgfTsKICBjb25zdCBsYXN0QmxvYk1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCk7CiAgY29uc3QgdHJhbnNwYXJlbnRCbG9iTWFwID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKTsKICBhc3luYyBmdW5jdGlvbiBnZXRUcmFuc3BhcmVudEJsb2JGb3Iod2lkdGgsIGhlaWdodCwgZGF0YVVSTE9wdGlvbnMpIHsKICAgIGNvbnN0IGlkID0gYCR7d2lkdGh9LSR7aGVpZ2h0fWA7CiAgICBpZiAoIk9mZnNjcmVlbkNhbnZhcyIgaW4gZ2xvYmFsVGhpcykgewogICAgICBpZiAodHJhbnNwYXJlbnRCbG9iTWFwLmhhcyhpZCkpCiAgICAgICAgcmV0dXJuIHRyYW5zcGFyZW50QmxvYk1hcC5nZXQoaWQpOwogICAgICBjb25zdCBvZmZzY3JlZW4gPSBuZXcgT2Zmc2NyZWVuQ2FudmFzKHdpZHRoLCBoZWlnaHQpOwogICAgICBvZmZzY3JlZW4uZ2V0Q29udGV4dCgiMmQiKTsKICAgICAgY29uc3QgYmxvYiA9IGF3YWl0IG9mZnNjcmVlbi5jb252ZXJ0VG9CbG9iKGRhdGFVUkxPcHRpb25zKTsKICAgICAgY29uc3QgYXJyYXlCdWZmZXIgPSBhd2FpdCBibG9iLmFycmF5QnVmZmVyKCk7CiAgICAgIGNvbnN0IGJhc2U2NCA9IGVuY29kZShhcnJheUJ1ZmZlcik7CiAgICAgIHRyYW5zcGFyZW50QmxvYk1hcC5zZXQoaWQsIGJhc2U2NCk7CiAgICAgIHJldHVybiBiYXNlNjQ7CiAgICB9IGVsc2UgewogICAgICByZXR1cm4gIiI7CiAgICB9CiAgfQogIGNvbnN0IHdvcmtlciA9IHNlbGY7CiAgd29ya2VyLm9ubWVzc2FnZSA9IGFzeW5jIGZ1bmN0aW9uKGUpIHsKICAgIGlmICgiT2Zmc2NyZWVuQ2FudmFzIiBpbiBnbG9iYWxUaGlzKSB7CiAgICAgIGNvbnN0IHsgaWQsIGJpdG1hcCwgd2lkdGgsIGhlaWdodCwgZGF0YVVSTE9wdGlvbnMgfSA9IGUuZGF0YTsKICAgICAgY29uc3QgdHJhbnNwYXJlbnRCYXNlNjQgPSBnZXRUcmFuc3BhcmVudEJsb2JGb3IoCiAgICAgICAgd2lkdGgsCiAgICAgICAgaGVpZ2h0LAogICAgICAgIGRhdGFVUkxPcHRpb25zCiAgICAgICk7CiAgICAgIGNvbnN0IG9mZnNjcmVlbiA9IG5ldyBPZmZzY3JlZW5DYW52YXMod2lkdGgsIGhlaWdodCk7CiAgICAgIGNvbnN0IGN0eCA9IG9mZnNjcmVlbi5nZXRDb250ZXh0KCIyZCIpOwogICAgICBjdHguZHJhd0ltYWdlKGJpdG1hcCwgMCwgMCk7CiAgICAgIGJpdG1hcC5jbG9zZSgpOwogICAgICBjb25zdCBibG9iID0gYXdhaXQgb2Zmc2NyZWVuLmNvbnZlcnRUb0Jsb2IoZGF0YVVSTE9wdGlvbnMpOwogICAgICBjb25zdCB0eXBlID0gYmxvYi50eXBlOwogICAgICBjb25zdCBhcnJheUJ1ZmZlciA9IGF3YWl0IGJsb2IuYXJyYXlCdWZmZXIoKTsKICAgICAgY29uc3QgYmFzZTY0ID0gZW5jb2RlKGFycmF5QnVmZmVyKTsKICAgICAgaWYgKCFsYXN0QmxvYk1hcC5oYXMoaWQpICYmIGF3YWl0IHRyYW5zcGFyZW50QmFzZTY0ID09PSBiYXNlNjQpIHsKICAgICAgICBsYXN0QmxvYk1hcC5zZXQoaWQsIGJhc2U2NCk7CiAgICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkIH0pOwogICAgICB9CiAgICAgIGlmIChsYXN0QmxvYk1hcC5nZXQoaWQpID09PSBiYXNlNjQpCiAgICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkIH0pOwogICAgICB3b3JrZXIucG9zdE1lc3NhZ2UoewogICAgICAgIGlkLAogICAgICAgIHR5cGUsCiAgICAgICAgYmFzZTY0LAogICAgICAgIHdpZHRoLAogICAgICAgIGhlaWdodAogICAgICB9KTsKICAgICAgbGFzdEJsb2JNYXAuc2V0KGlkLCBiYXNlNjQpOwogICAgfSBlbHNlIHsKICAgICAgcmV0dXJuIHdvcmtlci5wb3N0TWVzc2FnZSh7IGlkOiBlLmRhdGEuaWQgfSk7CiAgICB9CiAgfTsKfSkoKTsKLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW1hZ2UtYml0bWFwLWRhdGEtdXJsLXdvcmtlci1CWjFyN1JKRC5qcy5tYXAK";
const decodeBase64 = (base64) => Uint8Array.from(atob(base64), (c2) => c2.charCodeAt(0));
const blob = typeof window !== "undefined" && window.Blob && new Blob([decodeBase64(encodedJs)], { type: "text/javascript;charset=utf-8" });
function WorkerWrapper(options) {
  let objURL;
  try {
    objURL = blob && (window.URL || window.webkitURL).createObjectURL(blob);
    if (!objURL)
      throw "";
    const worker = new Worker(objURL, {
      name: options == null ? void 0 : options.name
    });
    worker.addEventListener("error", () => {
      (window.URL || window.webkitURL).revokeObjectURL(objURL);
    });
    return worker;
  } catch (e2) {
    return new Worker(
      "data:text/javascript;base64," + encodedJs,
      {
        name: options == null ? void 0 : options.name
      }
    );
  } finally {
    objURL && (window.URL || window.webkitURL).revokeObjectURL(objURL);
  }
}
class CanvasManager {
  constructor(options) {
    __publicField(this, "pendingCanvasMutations", /* @__PURE__ */ new Map());
    __publicField(this, "rafStamps", { latestId: 0, invokeId: null });
    __publicField(this, "mirror");
    __publicField(this, "mutationCb");
    __publicField(this, "resetObservers");
    __publicField(this, "frozen", false);
    __publicField(this, "locked", false);
    __publicField(this, "processMutation", (target, mutation) => {
      const newFrame = this.rafStamps.invokeId && this.rafStamps.latestId !== this.rafStamps.invokeId;
      if (newFrame || !this.rafStamps.invokeId)
        this.rafStamps.invokeId = this.rafStamps.latestId;
      if (!this.pendingCanvasMutations.has(target)) {
        this.pendingCanvasMutations.set(target, []);
      }
      this.pendingCanvasMutations.get(target).push(mutation);
    });
    const {
      sampling = "all",
      win,
      blockClass,
      blockSelector,
      recordCanvas,
      dataURLOptions
    } = options;
    this.mutationCb = options.mutationCb;
    this.mirror = options.mirror;
    if (recordCanvas && sampling === "all")
      this.initCanvasMutationObserver(win, blockClass, blockSelector);
    if (recordCanvas && typeof sampling === "number")
      this.initCanvasFPSObserver(sampling, win, blockClass, blockSelector, {
        dataURLOptions
      });
  }
  reset() {
    this.pendingCanvasMutations.clear();
    this.resetObservers && this.resetObservers();
  }
  freeze() {
    this.frozen = true;
  }
  unfreeze() {
    this.frozen = false;
  }
  lock() {
    this.locked = true;
  }
  unlock() {
    this.locked = false;
  }
  initCanvasFPSObserver(fps, win, blockClass, blockSelector, options) {
    const canvasContextReset = initCanvasContextObserver(
      win,
      blockClass,
      blockSelector,
      true
    );
    const snapshotInProgressMap = /* @__PURE__ */ new Map();
    const worker = new WorkerWrapper();
    worker.onmessage = (e2) => {
      const { id } = e2.data;
      snapshotInProgressMap.set(id, false);
      if (!("base64" in e2.data))
        return;
      const { base64, type, width, height } = e2.data;
      this.mutationCb({
        id,
        type: CanvasContext["2D"],
        commands: [
          {
            property: "clearRect",
            // wipe canvas
            args: [0, 0, width, height]
          },
          {
            property: "drawImage",
            // draws (semi-transparent) image
            args: [
              {
                rr_type: "ImageBitmap",
                args: [
                  {
                    rr_type: "Blob",
                    data: [{ rr_type: "ArrayBuffer", base64 }],
                    type
                  }
                ]
              },
              0,
              0
            ]
          }
        ]
      });
    };
    const timeBetweenSnapshots = 1e3 / fps;
    let lastSnapshotTime = 0;
    let rafId;
    const getCanvas = () => {
      const matchedCanvas = [];
      win.document.querySelectorAll("canvas").forEach((canvas) => {
        if (!isBlocked(canvas, blockClass, blockSelector, true)) {
          matchedCanvas.push(canvas);
        }
      });
      return matchedCanvas;
    };
    const takeCanvasSnapshots = (timestamp) => {
      if (lastSnapshotTime && timestamp - lastSnapshotTime < timeBetweenSnapshots) {
        rafId = requestAnimationFrame(takeCanvasSnapshots);
        return;
      }
      lastSnapshotTime = timestamp;
      getCanvas().forEach(async (canvas) => {
        var _a2;
        const id = this.mirror.getId(canvas);
        if (snapshotInProgressMap.get(id))
          return;
        if (canvas.width === 0 || canvas.height === 0)
          return;
        snapshotInProgressMap.set(id, true);
        if (["webgl", "webgl2"].includes(canvas.__context)) {
          const context = canvas.getContext(canvas.__context);
          if (((_a2 = context == null ? void 0 : context.getContextAttributes()) == null ? void 0 : _a2.preserveDrawingBuffer) === false) {
            context.clear(context.COLOR_BUFFER_BIT);
          }
        }
        const bitmap = await createImageBitmap(canvas);
        worker.postMessage(
          {
            id,
            bitmap,
            width: canvas.width,
            height: canvas.height,
            dataURLOptions: options.dataURLOptions
          },
          [bitmap]
        );
      });
      rafId = requestAnimationFrame(takeCanvasSnapshots);
    };
    rafId = requestAnimationFrame(takeCanvasSnapshots);
    this.resetObservers = () => {
      canvasContextReset();
      cancelAnimationFrame(rafId);
    };
  }
  initCanvasMutationObserver(win, blockClass, blockSelector) {
    this.startRAFTimestamping();
    this.startPendingCanvasMutationFlusher();
    const canvasContextReset = initCanvasContextObserver(
      win,
      blockClass,
      blockSelector,
      false
    );
    const canvas2DReset = initCanvas2DMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector
    );
    const canvasWebGL1and2Reset = initCanvasWebGLMutationObserver(
      this.processMutation.bind(this),
      win,
      blockClass,
      blockSelector,
      this.mirror
    );
    this.resetObservers = () => {
      canvasContextReset();
      canvas2DReset();
      canvasWebGL1and2Reset();
    };
  }
  startPendingCanvasMutationFlusher() {
    requestAnimationFrame(() => this.flushPendingCanvasMutations());
  }
  startRAFTimestamping() {
    const setLatestRAFTimestamp = (timestamp) => {
      this.rafStamps.latestId = timestamp;
      requestAnimationFrame(setLatestRAFTimestamp);
    };
    requestAnimationFrame(setLatestRAFTimestamp);
  }
  flushPendingCanvasMutations() {
    this.pendingCanvasMutations.forEach(
      (_values, canvas) => {
        const id = this.mirror.getId(canvas);
        this.flushPendingCanvasMutationFor(canvas, id);
      }
    );
    requestAnimationFrame(() => this.flushPendingCanvasMutations());
  }
  flushPendingCanvasMutationFor(canvas, id) {
    if (this.frozen || this.locked) {
      return;
    }
    const valuesWithType = this.pendingCanvasMutations.get(canvas);
    if (!valuesWithType || id === -1)
      return;
    const values = valuesWithType.map((value) => {
      const { type: type2, ...rest } = value;
      return rest;
    });
    const { type } = valuesWithType[0];
    this.mutationCb({ id, type, commands: values });
    this.pendingCanvasMutations.delete(canvas);
  }
}
class StylesheetManager {
  constructor(options) {
    __publicField(this, "trackedLinkElements", /* @__PURE__ */ new WeakSet());
    __publicField(this, "mutationCb");
    __publicField(this, "adoptedStyleSheetCb");
    __publicField(this, "styleMirror", new StyleSheetMirror());
    this.mutationCb = options.mutationCb;
    this.adoptedStyleSheetCb = options.adoptedStyleSheetCb;
  }
  attachLinkElement(linkEl, childSn) {
    if ("_cssText" in childSn.attributes)
      this.mutationCb({
        adds: [],
        removes: [],
        texts: [],
        attributes: [
          {
            id: childSn.id,
            attributes: childSn.attributes
          }
        ]
      });
    this.trackLinkElement(linkEl);
  }
  trackLinkElement(linkEl) {
    if (this.trackedLinkElements.has(linkEl))
      return;
    this.trackedLinkElements.add(linkEl);
    this.trackStylesheetInLinkElement(linkEl);
  }
  adoptStyleSheets(sheets, hostId) {
    if (sheets.length === 0)
      return;
    const adoptedStyleSheetData = {
      id: hostId,
      styleIds: []
    };
    const styles = [];
    for (const sheet of sheets) {
      let styleId;
      if (!this.styleMirror.has(sheet)) {
        styleId = this.styleMirror.add(sheet);
        styles.push({
          styleId,
          rules: Array.from(sheet.rules || CSSRule, (r2, index) => ({
            rule: stringifyRule(r2),
            index
          }))
        });
      } else
        styleId = this.styleMirror.getId(sheet);
      adoptedStyleSheetData.styleIds.push(styleId);
    }
    if (styles.length > 0)
      adoptedStyleSheetData.styles = styles;
    this.adoptedStyleSheetCb(adoptedStyleSheetData);
  }
  reset() {
    this.styleMirror.reset();
    this.trackedLinkElements = /* @__PURE__ */ new WeakSet();
  }
  // TODO: take snapshot on stylesheet reload by applying event listener
  trackStylesheetInLinkElement(_linkEl) {
  }
}
class ProcessedNodeManager {
  constructor() {
    __publicField(this, "nodeMap", /* @__PURE__ */ new WeakMap());
    __publicField(this, "active", false);
  }
  inOtherBuffer(node, thisBuffer) {
    const buffers = this.nodeMap.get(node);
    return buffers && Array.from(buffers).some((buffer) => buffer !== thisBuffer);
  }
  add(node, buffer) {
    if (!this.active) {
      this.active = true;
      requestAnimationFrame(() => {
        this.nodeMap = /* @__PURE__ */ new WeakMap();
        this.active = false;
      });
    }
    this.nodeMap.set(node, (this.nodeMap.get(node) || /* @__PURE__ */ new Set()).add(buffer));
  }
  destroy() {
  }
}
let wrappedEmit;
let takeFullSnapshot;
let canvasManager;
let recording = false;
try {
  if (Array.from([1], (x) => x * 2)[0] !== 2) {
    const cleanFrame = document.createElement("iframe");
    document.body.appendChild(cleanFrame);
    Array.from = ((_a = cleanFrame.contentWindow) == null ? void 0 : _a.Array.from) || Array.from;
    document.body.removeChild(cleanFrame);
  }
} catch (err) {
  console.debug("Unable to override Array.from", err);
}
const mirror = createMirror$2();
function record(options = {}) {
  const {
    emit,
    checkoutEveryNms,
    checkoutEveryNth,
    blockClass = "rr-block",
    blockSelector = null,
    ignoreClass = "rr-ignore",
    ignoreSelector = null,
    maskTextClass = "rr-mask",
    maskTextSelector = null,
    inlineStylesheet = true,
    maskAllInputs,
    maskInputOptions: _maskInputOptions,
    slimDOMOptions: _slimDOMOptions,
    maskInputFn,
    maskTextFn,
    hooks,
    packFn,
    sampling = {},
    dataURLOptions = {},
    mousemoveWait,
    recordDOM = true,
    recordCanvas = false,
    recordCrossOriginIframes = false,
    recordAfter = options.recordAfter === "DOMContentLoaded" ? options.recordAfter : "load",
    userTriggeredOnInput = false,
    collectFonts = false,
    inlineImages = false,
    plugins,
    keepIframeSrcFn = () => false,
    ignoreCSSAttributes = /* @__PURE__ */ new Set([]),
    errorHandler: errorHandler2
  } = options;
  registerErrorHandler(errorHandler2);
  const inEmittingFrame = recordCrossOriginIframes ? window.parent === window : true;
  let passEmitsToParent = false;
  if (!inEmittingFrame) {
    try {
      if (window.parent.document) {
        passEmitsToParent = false;
      }
    } catch (e2) {
      passEmitsToParent = true;
    }
  }
  if (inEmittingFrame && !emit) {
    throw new Error("emit function is required");
  }
  if (!inEmittingFrame && !passEmitsToParent) {
    return () => {
    };
  }
  if (mousemoveWait !== void 0 && sampling.mousemove === void 0) {
    sampling.mousemove = mousemoveWait;
  }
  mirror.reset();
  const maskInputOptions = maskAllInputs === true ? {
    color: true,
    date: true,
    "datetime-local": true,
    email: true,
    month: true,
    number: true,
    range: true,
    search: true,
    tel: true,
    text: true,
    time: true,
    url: true,
    week: true,
    textarea: true,
    select: true,
    password: true
  } : _maskInputOptions !== void 0 ? _maskInputOptions : { password: true };
  const slimDOMOptions = _slimDOMOptions === true || _slimDOMOptions === "all" ? {
    script: true,
    comment: true,
    headFavicon: true,
    headWhitespace: true,
    headMetaSocial: true,
    headMetaRobots: true,
    headMetaHttpEquiv: true,
    headMetaVerification: true,
    // the following are off for slimDOMOptions === true,
    // as they destroy some (hidden) info:
    headMetaAuthorship: _slimDOMOptions === "all",
    headMetaDescKeywords: _slimDOMOptions === "all",
    headTitleMutations: _slimDOMOptions === "all"
  } : _slimDOMOptions ? _slimDOMOptions : {};
  polyfill$1();
  let lastFullSnapshotEvent;
  let incrementalSnapshotCount = 0;
  const eventProcessor = (e2) => {
    for (const plugin of plugins || []) {
      if (plugin.eventProcessor) {
        e2 = plugin.eventProcessor(e2);
      }
    }
    if (packFn && // Disable packing events which will be emitted to parent frames.
    !passEmitsToParent) {
      e2 = packFn(e2);
    }
    return e2;
  };
  wrappedEmit = (r2, isCheckout) => {
    var _a2;
    const e2 = r2;
    e2.timestamp = nowTimestamp();
    if (((_a2 = mutationBuffers[0]) == null ? void 0 : _a2.isFrozen()) && e2.type !== EventType.FullSnapshot && !(e2.type === EventType.IncrementalSnapshot && e2.data.source === IncrementalSource.Mutation)) {
      mutationBuffers.forEach((buf) => buf.unfreeze());
    }
    if (inEmittingFrame) {
      emit == null ? void 0 : emit(eventProcessor(e2), isCheckout);
    } else if (passEmitsToParent) {
      const message = {
        type: "rrweb",
        event: eventProcessor(e2),
        origin: window.location.origin,
        isCheckout
      };
      window.parent.postMessage(message, "*");
    }
    if (e2.type === EventType.FullSnapshot) {
      lastFullSnapshotEvent = e2;
      incrementalSnapshotCount = 0;
    } else if (e2.type === EventType.IncrementalSnapshot) {
      if (e2.data.source === IncrementalSource.Mutation && e2.data.isAttachIframe) {
        return;
      }
      incrementalSnapshotCount++;
      const exceedCount = checkoutEveryNth && incrementalSnapshotCount >= checkoutEveryNth;
      const exceedTime = checkoutEveryNms && e2.timestamp - lastFullSnapshotEvent.timestamp > checkoutEveryNms;
      if (exceedCount || exceedTime) {
        takeFullSnapshot(true);
      }
    }
  };
  const wrappedMutationEmit = (m) => {
    wrappedEmit({
      type: EventType.IncrementalSnapshot,
      data: {
        source: IncrementalSource.Mutation,
        ...m
      }
    });
  };
  const wrappedScrollEmit = (p) => wrappedEmit({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.Scroll,
      ...p
    }
  });
  const wrappedCanvasMutationEmit = (p) => wrappedEmit({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.CanvasMutation,
      ...p
    }
  });
  const wrappedAdoptedStyleSheetEmit = (a2) => wrappedEmit({
    type: EventType.IncrementalSnapshot,
    data: {
      source: IncrementalSource.AdoptedStyleSheet,
      ...a2
    }
  });
  const stylesheetManager = new StylesheetManager({
    mutationCb: wrappedMutationEmit,
    adoptedStyleSheetCb: wrappedAdoptedStyleSheetEmit
  });
  const iframeManager = new IframeManager({
    mirror,
    mutationCb: wrappedMutationEmit,
    stylesheetManager,
    recordCrossOriginIframes,
    wrappedEmit
  });
  for (const plugin of plugins || []) {
    if (plugin.getMirror)
      plugin.getMirror({
        nodeMirror: mirror,
        crossOriginIframeMirror: iframeManager.crossOriginIframeMirror,
        crossOriginIframeStyleMirror: iframeManager.crossOriginIframeStyleMirror
      });
  }
  const processedNodeManager = new ProcessedNodeManager();
  canvasManager = new CanvasManager({
    recordCanvas,
    mutationCb: wrappedCanvasMutationEmit,
    win: window,
    blockClass,
    blockSelector,
    mirror,
    sampling: sampling.canvas,
    dataURLOptions
  });
  const shadowDomManager = new ShadowDomManager({
    mutationCb: wrappedMutationEmit,
    scrollCb: wrappedScrollEmit,
    bypassOptions: {
      blockClass,
      blockSelector,
      maskTextClass,
      maskTextSelector,
      inlineStylesheet,
      maskInputOptions,
      dataURLOptions,
      maskTextFn,
      maskInputFn,
      recordCanvas,
      inlineImages,
      sampling,
      slimDOMOptions,
      iframeManager,
      stylesheetManager,
      canvasManager,
      keepIframeSrcFn,
      processedNodeManager
    },
    mirror
  });
  takeFullSnapshot = (isCheckout = false) => {
    if (!recordDOM) {
      return;
    }
    wrappedEmit(
      {
        type: EventType.Meta,
        data: {
          href: window.location.href,
          width: getWindowWidth(),
          height: getWindowHeight()
        }
      },
      isCheckout
    );
    stylesheetManager.reset();
    shadowDomManager.init();
    mutationBuffers.forEach((buf) => buf.lock());
    const node = snapshot(document, {
      mirror,
      blockClass,
      blockSelector,
      maskTextClass,
      maskTextSelector,
      inlineStylesheet,
      maskAllInputs: maskInputOptions,
      maskTextFn,
      slimDOM: slimDOMOptions,
      dataURLOptions,
      recordCanvas,
      inlineImages,
      onSerialize: (n2) => {
        if (isSerializedIframe(n2, mirror)) {
          iframeManager.addIframe(n2);
        }
        if (isSerializedStylesheet(n2, mirror)) {
          stylesheetManager.trackLinkElement(n2);
        }
        if (hasShadowRoot(n2)) {
          shadowDomManager.addShadowRoot(n2.shadowRoot, document);
        }
      },
      onIframeLoad: (iframe, childSn) => {
        iframeManager.attachIframe(iframe, childSn);
        shadowDomManager.observeAttachShadow(iframe);
      },
      onStylesheetLoad: (linkEl, childSn) => {
        stylesheetManager.attachLinkElement(linkEl, childSn);
      },
      keepIframeSrcFn
    });
    if (!node) {
      return console.warn("Failed to snapshot the document");
    }
    wrappedEmit(
      {
        type: EventType.FullSnapshot,
        data: {
          node,
          initialOffset: getWindowScroll(window)
        }
      },
      isCheckout
    );
    mutationBuffers.forEach((buf) => buf.unlock());
    if (document.adoptedStyleSheets && document.adoptedStyleSheets.length > 0)
      stylesheetManager.adoptStyleSheets(
        document.adoptedStyleSheets,
        mirror.getId(document)
      );
  };
  try {
    const handlers = [];
    const observe = (doc) => {
      var _a2;
      return callbackWrapper(initObservers)(
        {
          mutationCb: wrappedMutationEmit,
          mousemoveCb: (positions, source) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source,
              positions
            }
          }),
          mouseInteractionCb: (d) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.MouseInteraction,
              ...d
            }
          }),
          scrollCb: wrappedScrollEmit,
          viewportResizeCb: (d) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.ViewportResize,
              ...d
            }
          }),
          inputCb: (v2) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.Input,
              ...v2
            }
          }),
          mediaInteractionCb: (p) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.MediaInteraction,
              ...p
            }
          }),
          styleSheetRuleCb: (r2) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.StyleSheetRule,
              ...r2
            }
          }),
          styleDeclarationCb: (r2) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.StyleDeclaration,
              ...r2
            }
          }),
          canvasMutationCb: wrappedCanvasMutationEmit,
          fontCb: (p) => wrappedEmit({
            type: EventType.IncrementalSnapshot,
            data: {
              source: IncrementalSource.Font,
              ...p
            }
          }),
          selectionCb: (p) => {
            wrappedEmit({
              type: EventType.IncrementalSnapshot,
              data: {
                source: IncrementalSource.Selection,
                ...p
              }
            });
          },
          customElementCb: (c2) => {
            wrappedEmit({
              type: EventType.IncrementalSnapshot,
              data: {
                source: IncrementalSource.CustomElement,
                ...c2
              }
            });
          },
          blockClass,
          ignoreClass,
          ignoreSelector,
          maskTextClass,
          maskTextSelector,
          maskInputOptions,
          inlineStylesheet,
          sampling,
          recordDOM,
          recordCanvas,
          inlineImages,
          userTriggeredOnInput,
          collectFonts,
          doc,
          maskInputFn,
          maskTextFn,
          keepIframeSrcFn,
          blockSelector,
          slimDOMOptions,
          dataURLOptions,
          mirror,
          iframeManager,
          stylesheetManager,
          shadowDomManager,
          processedNodeManager,
          canvasManager,
          ignoreCSSAttributes,
          plugins: ((_a2 = plugins == null ? void 0 : plugins.filter((p) => p.observer)) == null ? void 0 : _a2.map((p) => ({
            observer: p.observer,
            options: p.options,
            callback: (payload) => wrappedEmit({
              type: EventType.Plugin,
              data: {
                plugin: p.name,
                payload
              }
            })
          }))) || []
        },
        hooks
      );
    };
    iframeManager.addLoadListener((iframeEl) => {
      try {
        handlers.push(observe(iframeEl.contentDocument));
      } catch (error) {
        console.warn(error);
      }
    });
    const init = () => {
      takeFullSnapshot();
      handlers.push(observe(document));
      recording = true;
    };
    if (document.readyState === "interactive" || document.readyState === "complete") {
      init();
    } else {
      handlers.push(
        on("DOMContentLoaded", () => {
          wrappedEmit({
            type: EventType.DomContentLoaded,
            data: {}
          });
          if (recordAfter === "DOMContentLoaded")
            init();
        })
      );
      handlers.push(
        on(
          "load",
          () => {
            wrappedEmit({
              type: EventType.Load,
              data: {}
            });
            if (recordAfter === "load")
              init();
          },
          window
        )
      );
    }
    return () => {
      handlers.forEach((h) => h());
      processedNodeManager.destroy();
      recording = false;
      unregisterErrorHandler();
    };
  } catch (error) {
    console.warn(error);
  }
}
record.addCustomEvent = (tag, payload) => {
  if (!recording) {
    throw new Error("please add custom event after start recording");
  }
  wrappedEmit({
    type: EventType.Custom,
    data: {
      tag,
      payload
    }
  });
};
record.freezePage = () => {
  mutationBuffers.forEach((buf) => buf.freeze());
};
record.takeFullSnapshot = (isCheckout) => {
  if (!recording) {
    throw new Error("please take full snapshot after start recording");
  }
  takeFullSnapshot(isCheckout);
};
record.mirror = mirror;
var __defProp2 = Object.defineProperty;
var __defNormalProp2 = (obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField2 = (obj, key, value) => {
  __defNormalProp2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var __defProp22 = Object.defineProperty;
var __defNormalProp22 = (obj, key, value) => key in obj ? __defProp22(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField22 = (obj, key, value) => {
  __defNormalProp22(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var NodeType$1 = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["Document"] = 0] = "Document";
  NodeType2[NodeType2["DocumentType"] = 1] = "DocumentType";
  NodeType2[NodeType2["Element"] = 2] = "Element";
  NodeType2[NodeType2["Text"] = 3] = "Text";
  NodeType2[NodeType2["CDATA"] = 4] = "CDATA";
  NodeType2[NodeType2["Comment"] = 5] = "Comment";
  return NodeType2;
})(NodeType$1 || {});
let Mirror$1 = class Mirror2 {
  constructor() {
    __publicField22(this, "idNodeMap", /* @__PURE__ */ new Map());
    __publicField22(this, "nodeMetaMap", /* @__PURE__ */ new WeakMap());
  }
  getId(n2) {
    var _a2;
    if (!n2)
      return -1;
    const id = (_a2 = this.getMeta(n2)) == null ? void 0 : _a2.id;
    return id ?? -1;
  }
  getNode(id) {
    return this.idNodeMap.get(id) || null;
  }
  getIds() {
    return Array.from(this.idNodeMap.keys());
  }
  getMeta(n2) {
    return this.nodeMetaMap.get(n2) || null;
  }
  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n2) {
    const id = this.getId(n2);
    this.idNodeMap.delete(id);
    if (n2.childNodes) {
      n2.childNodes.forEach(
        (childNode) => this.removeNodeFromMap(childNode)
      );
    }
  }
  has(id) {
    return this.idNodeMap.has(id);
  }
  hasNode(node) {
    return this.nodeMetaMap.has(node);
  }
  add(n2, meta) {
    const id = meta.id;
    this.idNodeMap.set(id, n2);
    this.nodeMetaMap.set(n2, meta);
  }
  replace(id, n2) {
    const oldNode = this.getNode(id);
    if (oldNode) {
      const meta = this.nodeMetaMap.get(oldNode);
      if (meta)
        this.nodeMetaMap.set(n2, meta);
    }
    this.idNodeMap.set(id, n2);
  }
  reset() {
    this.idNodeMap = /* @__PURE__ */ new Map();
    this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
  }
};
function createMirror$1() {
  return new Mirror$1();
}
function parseCSSText(cssText) {
  const res = {};
  const listDelimiter = /;(?![^(]*\))/g;
  const propertyDelimiter = /:(.+)/;
  const comment = /\/\*.*?\*\//g;
  cssText.replace(comment, "").split(listDelimiter).forEach(function(item) {
    if (item) {
      const tmp = item.split(propertyDelimiter);
      tmp.length > 1 && (res[camelize(tmp[0].trim())] = tmp[1].trim());
    }
  });
  return res;
}
function toCSSText(style) {
  const properties = [];
  for (const name in style) {
    const value = style[name];
    if (typeof value !== "string")
      continue;
    const normalizedName = hyphenate(name);
    properties.push(`${normalizedName}: ${value};`);
  }
  return properties.join(" ");
}
const camelizeRE = /-([a-z])/g;
const CUSTOM_PROPERTY_REGEX = /^--[a-zA-Z0-9-]+$/;
const camelize = (str) => {
  if (CUSTOM_PROPERTY_REGEX.test(str))
    return str;
  return str.replace(camelizeRE, (_, c2) => c2 ? c2.toUpperCase() : "");
};
const hyphenateRE = /\B([A-Z])/g;
const hyphenate = (str) => {
  return str.replace(hyphenateRE, "-$1").toLowerCase();
};
class BaseRRNode {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  constructor(..._args) {
    __publicField2(this, "parentElement", null);
    __publicField2(this, "parentNode", null);
    __publicField2(this, "ownerDocument");
    __publicField2(this, "firstChild", null);
    __publicField2(this, "lastChild", null);
    __publicField2(this, "previousSibling", null);
    __publicField2(this, "nextSibling", null);
    __publicField2(this, "ELEMENT_NODE", 1);
    __publicField2(this, "TEXT_NODE", 3);
    __publicField2(this, "nodeType");
    __publicField2(this, "nodeName");
    __publicField2(this, "RRNodeType");
  }
  get childNodes() {
    const childNodes = [];
    let childIterator = this.firstChild;
    while (childIterator) {
      childNodes.push(childIterator);
      childIterator = childIterator.nextSibling;
    }
    return childNodes;
  }
  contains(node) {
    if (!(node instanceof BaseRRNode))
      return false;
    else if (node.ownerDocument !== this.ownerDocument)
      return false;
    else if (node === this)
      return true;
    while (node.parentNode) {
      if (node.parentNode === this)
        return true;
      node = node.parentNode;
    }
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  appendChild(_newChild) {
    throw new Error(
      `RRDomException: Failed to execute 'appendChild' on 'RRNode': This RRNode type does not support this method.`
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  insertBefore(_newChild, _refChild) {
    throw new Error(
      `RRDomException: Failed to execute 'insertBefore' on 'RRNode': This RRNode type does not support this method.`
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  removeChild(_node) {
    throw new Error(
      `RRDomException: Failed to execute 'removeChild' on 'RRNode': This RRNode type does not support this method.`
    );
  }
  toString() {
    return "RRNode";
  }
}
class BaseRRDocument extends BaseRRNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(...args) {
    super(args);
    __publicField2(this, "nodeType", 9);
    __publicField2(this, "nodeName", "#document");
    __publicField2(this, "compatMode", "CSS1Compat");
    __publicField2(this, "RRNodeType", NodeType$1.Document);
    __publicField2(this, "textContent", null);
    this.ownerDocument = this;
  }
  get documentElement() {
    return this.childNodes.find(
      (node) => node.RRNodeType === NodeType$1.Element && node.tagName === "HTML"
    ) || null;
  }
  get body() {
    var _a2;
    return ((_a2 = this.documentElement) == null ? void 0 : _a2.childNodes.find(
      (node) => node.RRNodeType === NodeType$1.Element && node.tagName === "BODY"
    )) || null;
  }
  get head() {
    var _a2;
    return ((_a2 = this.documentElement) == null ? void 0 : _a2.childNodes.find(
      (node) => node.RRNodeType === NodeType$1.Element && node.tagName === "HEAD"
    )) || null;
  }
  get implementation() {
    return this;
  }
  get firstElementChild() {
    return this.documentElement;
  }
  appendChild(newChild) {
    const nodeType = newChild.RRNodeType;
    if (nodeType === NodeType$1.Element || nodeType === NodeType$1.DocumentType) {
      if (this.childNodes.some((s2) => s2.RRNodeType === nodeType)) {
        throw new Error(
          `RRDomException: Failed to execute 'appendChild' on 'RRNode': Only one ${nodeType === NodeType$1.Element ? "RRElement" : "RRDoctype"} on RRDocument allowed.`
        );
      }
    }
    const child = appendChild(this, newChild);
    child.parentElement = null;
    return child;
  }
  insertBefore(newChild, refChild) {
    const nodeType = newChild.RRNodeType;
    if (nodeType === NodeType$1.Element || nodeType === NodeType$1.DocumentType) {
      if (this.childNodes.some((s2) => s2.RRNodeType === nodeType)) {
        throw new Error(
          `RRDomException: Failed to execute 'insertBefore' on 'RRNode': Only one ${nodeType === NodeType$1.Element ? "RRElement" : "RRDoctype"} on RRDocument allowed.`
        );
      }
    }
    const child = insertBefore(this, newChild, refChild);
    child.parentElement = null;
    return child;
  }
  removeChild(node) {
    return removeChild(this, node);
  }
  open() {
    this.firstChild = null;
    this.lastChild = null;
  }
  close() {
  }
  /**
   * Adhoc implementation for setting xhtml namespace in rebuilt.ts (rrweb-snapshot).
   * There are two lines used this function:
   * 1. doc.write('\<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" ""\>')
   * 2. doc.write('\<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" ""\>')
   */
  write(content) {
    let publicId;
    if (content === '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "">')
      publicId = "-//W3C//DTD XHTML 1.0 Transitional//EN";
    else if (content === '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" "">')
      publicId = "-//W3C//DTD HTML 4.0 Transitional//EN";
    if (publicId) {
      const doctype = this.createDocumentType("html", publicId, "");
      this.open();
      this.appendChild(doctype);
    }
  }
  createDocument(_namespace, _qualifiedName, _doctype) {
    return new BaseRRDocument();
  }
  createDocumentType(qualifiedName, publicId, systemId) {
    const doctype = new BaseRRDocumentType(qualifiedName, publicId, systemId);
    doctype.ownerDocument = this;
    return doctype;
  }
  createElement(tagName) {
    const element = new BaseRRElement(tagName);
    element.ownerDocument = this;
    return element;
  }
  createElementNS(_namespaceURI, qualifiedName) {
    return this.createElement(qualifiedName);
  }
  createTextNode(data) {
    const text = new BaseRRText(data);
    text.ownerDocument = this;
    return text;
  }
  createComment(data) {
    const comment = new BaseRRComment(data);
    comment.ownerDocument = this;
    return comment;
  }
  createCDATASection(data) {
    const CDATASection = new BaseRRCDATASection(data);
    CDATASection.ownerDocument = this;
    return CDATASection;
  }
  toString() {
    return "RRDocument";
  }
}
class BaseRRDocumentType extends BaseRRNode {
  constructor(qualifiedName, publicId, systemId) {
    super();
    __publicField2(this, "nodeType", 10);
    __publicField2(this, "RRNodeType", NodeType$1.DocumentType);
    __publicField2(this, "name");
    __publicField2(this, "publicId");
    __publicField2(this, "systemId");
    __publicField2(this, "textContent", null);
    this.name = qualifiedName;
    this.publicId = publicId;
    this.systemId = systemId;
    this.nodeName = qualifiedName;
  }
  toString() {
    return "RRDocumentType";
  }
}
class BaseRRElement extends BaseRRNode {
  constructor(tagName) {
    super();
    __publicField2(this, "nodeType", 1);
    __publicField2(this, "RRNodeType", NodeType$1.Element);
    __publicField2(this, "tagName");
    __publicField2(this, "attributes", {});
    __publicField2(this, "shadowRoot", null);
    __publicField2(this, "scrollLeft");
    __publicField2(this, "scrollTop");
    this.tagName = tagName.toUpperCase();
    this.nodeName = tagName.toUpperCase();
  }
  get textContent() {
    let result = "";
    this.childNodes.forEach((node) => result += node.textContent);
    return result;
  }
  set textContent(textContent) {
    this.firstChild = null;
    this.lastChild = null;
    this.appendChild(this.ownerDocument.createTextNode(textContent));
  }
  get classList() {
    return new ClassList(
      this.attributes.class,
      (newClassName) => {
        this.attributes.class = newClassName;
      }
    );
  }
  get id() {
    return this.attributes.id || "";
  }
  get className() {
    return this.attributes.class || "";
  }
  get style() {
    const style = this.attributes.style ? parseCSSText(this.attributes.style) : {};
    const hyphenateRE2 = /\B([A-Z])/g;
    style.setProperty = (name, value, priority) => {
      if (hyphenateRE2.test(name))
        return;
      const normalizedName = camelize(name);
      if (!value)
        delete style[normalizedName];
      else
        style[normalizedName] = value;
      if (priority === "important")
        style[normalizedName] += " !important";
      this.attributes.style = toCSSText(style);
    };
    style.removeProperty = (name) => {
      if (hyphenateRE2.test(name))
        return "";
      const normalizedName = camelize(name);
      const value = style[normalizedName] || "";
      delete style[normalizedName];
      this.attributes.style = toCSSText(style);
      return value;
    };
    return style;
  }
  getAttribute(name) {
    return this.attributes[name] || null;
  }
  setAttribute(name, attribute) {
    this.attributes[name] = attribute;
  }
  setAttributeNS(_namespace, qualifiedName, value) {
    this.setAttribute(qualifiedName, value);
  }
  removeAttribute(name) {
    delete this.attributes[name];
  }
  appendChild(newChild) {
    return appendChild(this, newChild);
  }
  insertBefore(newChild, refChild) {
    return insertBefore(this, newChild, refChild);
  }
  removeChild(node) {
    return removeChild(this, node);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachShadow(_init) {
    const shadowRoot = this.ownerDocument.createElement("SHADOWROOT");
    this.shadowRoot = shadowRoot;
    return shadowRoot;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dispatchEvent(_event) {
    return true;
  }
  toString() {
    let attributeString = "";
    for (const attribute in this.attributes) {
      attributeString += `${attribute}="${this.attributes[attribute]}" `;
    }
    return `${this.tagName} ${attributeString}`;
  }
}
class BaseRRMediaElement extends BaseRRElement {
  constructor() {
    super(...arguments);
    __publicField2(this, "currentTime");
    __publicField2(this, "volume");
    __publicField2(this, "paused");
    __publicField2(this, "muted");
    __publicField2(this, "playbackRate");
    __publicField2(this, "loop");
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  attachShadow(_init) {
    throw new Error(
      `RRDomException: Failed to execute 'attachShadow' on 'RRElement': This RRElement does not support attachShadow`
    );
  }
  play() {
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
}
class BaseRRText extends BaseRRNode {
  constructor(data) {
    super();
    __publicField2(this, "nodeType", 3);
    __publicField2(this, "nodeName", "#text");
    __publicField2(this, "RRNodeType", NodeType$1.Text);
    __publicField2(this, "data");
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
  set textContent(textContent) {
    this.data = textContent;
  }
  toString() {
    return `RRText text=${JSON.stringify(this.data)}`;
  }
}
class BaseRRComment extends BaseRRNode {
  constructor(data) {
    super();
    __publicField2(this, "nodeType", 8);
    __publicField2(this, "nodeName", "#comment");
    __publicField2(this, "RRNodeType", NodeType$1.Comment);
    __publicField2(this, "data");
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
  set textContent(textContent) {
    this.data = textContent;
  }
  toString() {
    return `RRComment text=${JSON.stringify(this.data)}`;
  }
}
class BaseRRCDATASection extends BaseRRNode {
  constructor(data) {
    super();
    __publicField2(this, "nodeName", "#cdata-section");
    __publicField2(this, "nodeType", 4);
    __publicField2(this, "RRNodeType", NodeType$1.CDATA);
    __publicField2(this, "data");
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
  set textContent(textContent) {
    this.data = textContent;
  }
  toString() {
    return `RRCDATASection data=${JSON.stringify(this.data)}`;
  }
}
class ClassList {
  constructor(classText, onChange) {
    __publicField2(this, "onChange");
    __publicField2(this, "classes", []);
    __publicField2(this, "add", (...classNames) => {
      for (const item of classNames) {
        const className = String(item);
        if (this.classes.indexOf(className) >= 0)
          continue;
        this.classes.push(className);
      }
      this.onChange && this.onChange(this.classes.join(" "));
    });
    __publicField2(this, "remove", (...classNames) => {
      this.classes = this.classes.filter(
        (item) => classNames.indexOf(item) === -1
      );
      this.onChange && this.onChange(this.classes.join(" "));
    });
    if (classText) {
      const classes = classText.trim().split(/\s+/);
      this.classes.push(...classes);
    }
    this.onChange = onChange;
  }
}
function appendChild(parent, newChild) {
  if (newChild.parentNode)
    newChild.parentNode.removeChild(newChild);
  if (parent.lastChild) {
    parent.lastChild.nextSibling = newChild;
    newChild.previousSibling = parent.lastChild;
  } else {
    parent.firstChild = newChild;
    newChild.previousSibling = null;
  }
  parent.lastChild = newChild;
  newChild.nextSibling = null;
  newChild.parentNode = parent;
  newChild.parentElement = parent;
  newChild.ownerDocument = parent.ownerDocument;
  return newChild;
}
function insertBefore(parent, newChild, refChild) {
  if (!refChild)
    return appendChild(parent, newChild);
  if (refChild.parentNode !== parent)
    throw new Error(
      "Failed to execute 'insertBefore' on 'RRNode': The RRNode before which the new node is to be inserted is not a child of this RRNode."
    );
  if (newChild === refChild)
    return newChild;
  if (newChild.parentNode)
    newChild.parentNode.removeChild(newChild);
  newChild.previousSibling = refChild.previousSibling;
  refChild.previousSibling = newChild;
  newChild.nextSibling = refChild;
  if (newChild.previousSibling)
    newChild.previousSibling.nextSibling = newChild;
  else
    parent.firstChild = newChild;
  newChild.parentElement = parent;
  newChild.parentNode = parent;
  newChild.ownerDocument = parent.ownerDocument;
  return newChild;
}
function removeChild(parent, child) {
  if (child.parentNode !== parent)
    throw new Error(
      "Failed to execute 'removeChild' on 'RRNode': The RRNode to be removed is not a child of this RRNode."
    );
  if (child.previousSibling)
    child.previousSibling.nextSibling = child.nextSibling;
  else
    parent.firstChild = child.nextSibling;
  if (child.nextSibling)
    child.nextSibling.previousSibling = child.previousSibling;
  else
    parent.lastChild = child.previousSibling;
  child.previousSibling = null;
  child.nextSibling = null;
  child.parentElement = null;
  child.parentNode = null;
  return child;
}
var NodeType = /* @__PURE__ */ ((NodeType2) => {
  NodeType2[NodeType2["PLACEHOLDER"] = 0] = "PLACEHOLDER";
  NodeType2[NodeType2["ELEMENT_NODE"] = 1] = "ELEMENT_NODE";
  NodeType2[NodeType2["ATTRIBUTE_NODE"] = 2] = "ATTRIBUTE_NODE";
  NodeType2[NodeType2["TEXT_NODE"] = 3] = "TEXT_NODE";
  NodeType2[NodeType2["CDATA_SECTION_NODE"] = 4] = "CDATA_SECTION_NODE";
  NodeType2[NodeType2["ENTITY_REFERENCE_NODE"] = 5] = "ENTITY_REFERENCE_NODE";
  NodeType2[NodeType2["ENTITY_NODE"] = 6] = "ENTITY_NODE";
  NodeType2[NodeType2["PROCESSING_INSTRUCTION_NODE"] = 7] = "PROCESSING_INSTRUCTION_NODE";
  NodeType2[NodeType2["COMMENT_NODE"] = 8] = "COMMENT_NODE";
  NodeType2[NodeType2["DOCUMENT_NODE"] = 9] = "DOCUMENT_NODE";
  NodeType2[NodeType2["DOCUMENT_TYPE_NODE"] = 10] = "DOCUMENT_TYPE_NODE";
  NodeType2[NodeType2["DOCUMENT_FRAGMENT_NODE"] = 11] = "DOCUMENT_FRAGMENT_NODE";
  return NodeType2;
})(NodeType || {});
const NAMESPACES = {
  svg: "http://www.w3.org/2000/svg",
  "xlink:href": "http://www.w3.org/1999/xlink",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
const SVGTagMap = {
  altglyph: "altGlyph",
  altglyphdef: "altGlyphDef",
  altglyphitem: "altGlyphItem",
  animatecolor: "animateColor",
  animatemotion: "animateMotion",
  animatetransform: "animateTransform",
  clippath: "clipPath",
  feblend: "feBlend",
  fecolormatrix: "feColorMatrix",
  fecomponenttransfer: "feComponentTransfer",
  fecomposite: "feComposite",
  feconvolvematrix: "feConvolveMatrix",
  fediffuselighting: "feDiffuseLighting",
  fedisplacementmap: "feDisplacementMap",
  fedistantlight: "feDistantLight",
  fedropshadow: "feDropShadow",
  feflood: "feFlood",
  fefunca: "feFuncA",
  fefuncb: "feFuncB",
  fefuncg: "feFuncG",
  fefuncr: "feFuncR",
  fegaussianblur: "feGaussianBlur",
  feimage: "feImage",
  femerge: "feMerge",
  femergenode: "feMergeNode",
  femorphology: "feMorphology",
  feoffset: "feOffset",
  fepointlight: "fePointLight",
  fespecularlighting: "feSpecularLighting",
  fespotlight: "feSpotLight",
  fetile: "feTile",
  feturbulence: "feTurbulence",
  foreignobject: "foreignObject",
  glyphref: "glyphRef",
  lineargradient: "linearGradient",
  radialgradient: "radialGradient"
};
let createdNodeSet = null;
function diff(oldTree, newTree, replayer, rrnodeMirror = newTree.mirror || newTree.ownerDocument.mirror) {
  oldTree = diffBeforeUpdatingChildren(
    oldTree,
    newTree,
    replayer,
    rrnodeMirror
  );
  diffChildren(oldTree, newTree, replayer, rrnodeMirror);
  diffAfterUpdatingChildren(oldTree, newTree, replayer);
}
function diffBeforeUpdatingChildren(oldTree, newTree, replayer, rrnodeMirror) {
  var _a2;
  if (replayer.afterAppend && !createdNodeSet) {
    createdNodeSet = /* @__PURE__ */ new WeakSet();
    setTimeout(() => {
      createdNodeSet = null;
    }, 0);
  }
  if (!sameNodeType(oldTree, newTree)) {
    const calibratedOldTree = createOrGetNode(
      newTree,
      replayer.mirror,
      rrnodeMirror
    );
    (_a2 = oldTree.parentNode) == null ? void 0 : _a2.replaceChild(calibratedOldTree, oldTree);
    oldTree = calibratedOldTree;
  }
  switch (newTree.RRNodeType) {
    case NodeType$1.Document: {
      if (!nodeMatching(oldTree, newTree, replayer.mirror, rrnodeMirror)) {
        const newMeta = rrnodeMirror.getMeta(newTree);
        if (newMeta) {
          replayer.mirror.removeNodeFromMap(oldTree);
          oldTree.close();
          oldTree.open();
          replayer.mirror.add(oldTree, newMeta);
          createdNodeSet == null ? void 0 : createdNodeSet.add(oldTree);
        }
      }
      break;
    }
    case NodeType$1.Element: {
      const oldElement = oldTree;
      const newRRElement = newTree;
      switch (newRRElement.tagName) {
        case "IFRAME": {
          const oldContentDocument = oldTree.contentDocument;
          if (!oldContentDocument)
            break;
          diff(
            oldContentDocument,
            newTree.contentDocument,
            replayer,
            rrnodeMirror
          );
          break;
        }
      }
      if (newRRElement.shadowRoot) {
        if (!oldElement.shadowRoot)
          oldElement.attachShadow({ mode: "open" });
        diffChildren(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          oldElement.shadowRoot,
          newRRElement.shadowRoot,
          replayer,
          rrnodeMirror
        );
      }
      diffProps(oldElement, newRRElement, rrnodeMirror);
      break;
    }
  }
  return oldTree;
}
function diffAfterUpdatingChildren(oldTree, newTree, replayer) {
  var _a2;
  switch (newTree.RRNodeType) {
    case NodeType$1.Document: {
      const scrollData = newTree.scrollData;
      scrollData && replayer.applyScroll(scrollData, true);
      break;
    }
    case NodeType$1.Element: {
      const oldElement = oldTree;
      const newRRElement = newTree;
      newRRElement.scrollData && replayer.applyScroll(newRRElement.scrollData, true);
      newRRElement.inputData && replayer.applyInput(newRRElement.inputData);
      switch (newRRElement.tagName) {
        case "AUDIO":
        case "VIDEO": {
          const oldMediaElement = oldTree;
          const newMediaRRElement = newRRElement;
          if (newMediaRRElement.paused !== void 0)
            newMediaRRElement.paused ? void oldMediaElement.pause() : void oldMediaElement.play();
          if (newMediaRRElement.muted !== void 0)
            oldMediaElement.muted = newMediaRRElement.muted;
          if (newMediaRRElement.volume !== void 0)
            oldMediaElement.volume = newMediaRRElement.volume;
          if (newMediaRRElement.currentTime !== void 0)
            oldMediaElement.currentTime = newMediaRRElement.currentTime;
          if (newMediaRRElement.playbackRate !== void 0)
            oldMediaElement.playbackRate = newMediaRRElement.playbackRate;
          if (newMediaRRElement.loop !== void 0)
            oldMediaElement.loop = newMediaRRElement.loop;
          break;
        }
        case "CANVAS": {
          const rrCanvasElement = newTree;
          if (rrCanvasElement.rr_dataURL !== null) {
            const image = document.createElement("img");
            image.onload = () => {
              const ctx = oldElement.getContext("2d");
              if (ctx) {
                ctx.drawImage(image, 0, 0, image.width, image.height);
              }
            };
            image.src = rrCanvasElement.rr_dataURL;
          }
          rrCanvasElement.canvasMutations.forEach(
            (canvasMutation2) => replayer.applyCanvas(
              canvasMutation2.event,
              canvasMutation2.mutation,
              oldTree
            )
          );
          break;
        }
        case "STYLE": {
          const styleSheet = oldElement.sheet;
          styleSheet && newTree.rules.forEach(
            (data) => replayer.applyStyleSheetMutation(data, styleSheet)
          );
          break;
        }
      }
      break;
    }
    case NodeType$1.Text:
    case NodeType$1.Comment:
    case NodeType$1.CDATA: {
      if (oldTree.textContent !== newTree.data)
        oldTree.textContent = newTree.data;
      break;
    }
  }
  if (createdNodeSet == null ? void 0 : createdNodeSet.has(oldTree)) {
    createdNodeSet.delete(oldTree);
    (_a2 = replayer.afterAppend) == null ? void 0 : _a2.call(replayer, oldTree, replayer.mirror.getId(oldTree));
  }
}
function diffProps(oldTree, newTree, rrnodeMirror) {
  const oldAttributes = oldTree.attributes;
  const newAttributes = newTree.attributes;
  for (const name in newAttributes) {
    const newValue = newAttributes[name];
    const sn = rrnodeMirror.getMeta(newTree);
    if ((sn == null ? void 0 : sn.isSVG) && NAMESPACES[name])
      oldTree.setAttributeNS(NAMESPACES[name], name, newValue);
    else if (newTree.tagName === "CANVAS" && name === "rr_dataURL") {
      const image = document.createElement("img");
      image.src = newValue;
      image.onload = () => {
        const ctx = oldTree.getContext("2d");
        if (ctx) {
          ctx.drawImage(image, 0, 0, image.width, image.height);
        }
      };
    } else if (newTree.tagName === "IFRAME" && name === "srcdoc")
      continue;
    else
      oldTree.setAttribute(name, newValue);
  }
  for (const { name } of Array.from(oldAttributes))
    if (!(name in newAttributes))
      oldTree.removeAttribute(name);
  newTree.scrollLeft && (oldTree.scrollLeft = newTree.scrollLeft);
  newTree.scrollTop && (oldTree.scrollTop = newTree.scrollTop);
}
function diffChildren(oldTree, newTree, replayer, rrnodeMirror) {
  const oldChildren = Array.from(oldTree.childNodes);
  const newChildren = newTree.childNodes;
  if (oldChildren.length === 0 && newChildren.length === 0)
    return;
  let oldStartIndex = 0, oldEndIndex = oldChildren.length - 1, newStartIndex = 0, newEndIndex = newChildren.length - 1;
  let oldStartNode = oldChildren[oldStartIndex], oldEndNode = oldChildren[oldEndIndex], newStartNode = newChildren[newStartIndex], newEndNode = newChildren[newEndIndex];
  let oldIdToIndex = void 0, indexInOld = void 0;
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (oldStartNode === void 0) {
      oldStartNode = oldChildren[++oldStartIndex];
    } else if (oldEndNode === void 0) {
      oldEndNode = oldChildren[--oldEndIndex];
    } else if (
      // same first node?
      nodeMatching(oldStartNode, newStartNode, replayer.mirror, rrnodeMirror)
    ) {
      oldStartNode = oldChildren[++oldStartIndex];
      newStartNode = newChildren[++newStartIndex];
    } else if (
      // same last node?
      nodeMatching(oldEndNode, newEndNode, replayer.mirror, rrnodeMirror)
    ) {
      oldEndNode = oldChildren[--oldEndIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      // is the first old node the same as the last new node?
      nodeMatching(oldStartNode, newEndNode, replayer.mirror, rrnodeMirror)
    ) {
      try {
        oldTree.insertBefore(oldStartNode, oldEndNode.nextSibling);
      } catch (e2) {
        console.warn(e2);
      }
      oldStartNode = oldChildren[++oldStartIndex];
      newEndNode = newChildren[--newEndIndex];
    } else if (
      // is the last old node the same as the first new node?
      nodeMatching(oldEndNode, newStartNode, replayer.mirror, rrnodeMirror)
    ) {
      try {
        oldTree.insertBefore(oldEndNode, oldStartNode);
      } catch (e2) {
        console.warn(e2);
      }
      oldEndNode = oldChildren[--oldEndIndex];
      newStartNode = newChildren[++newStartIndex];
    } else {
      if (!oldIdToIndex) {
        oldIdToIndex = {};
        for (let i2 = oldStartIndex; i2 <= oldEndIndex; i2++) {
          const oldChild2 = oldChildren[i2];
          if (oldChild2 && replayer.mirror.hasNode(oldChild2))
            oldIdToIndex[replayer.mirror.getId(oldChild2)] = i2;
        }
      }
      indexInOld = oldIdToIndex[rrnodeMirror.getId(newStartNode)];
      const nodeToMove = oldChildren[indexInOld];
      if (indexInOld !== void 0 && nodeToMove && nodeMatching(nodeToMove, newStartNode, replayer.mirror, rrnodeMirror)) {
        try {
          oldTree.insertBefore(nodeToMove, oldStartNode);
        } catch (e2) {
          console.warn(e2);
        }
        oldChildren[indexInOld] = void 0;
      } else {
        const newNode = createOrGetNode(
          newStartNode,
          replayer.mirror,
          rrnodeMirror
        );
        if (oldTree.nodeName === "#document" && oldStartNode && /**
        * Special case 1: one document isn't allowed to have two doctype nodes at the same time, so we need to remove the old one first before inserting the new one.
        * How this case happens: A parent document in the old tree already has a doctype node with an id e.g. #1. A new full snapshot rebuilds the replayer with a new doctype node with another id #2. According to the algorithm, the new doctype node will be inserted before the old one, which is not allowed by the Document standard.
        */
        (newNode.nodeType === newNode.DOCUMENT_TYPE_NODE && oldStartNode.nodeType === oldStartNode.DOCUMENT_TYPE_NODE || /**
        * Special case 2: one document isn't allowed to have two HTMLElements at the same time, so we need to remove the old one first before inserting the new one.
        * How this case happens: A mounted iframe element has an automatically created HTML element. We should delete it before inserting a serialized one. Otherwise, an error 'Only one element on document allowed' will be thrown.
        */
        newNode.nodeType === newNode.ELEMENT_NODE && oldStartNode.nodeType === oldStartNode.ELEMENT_NODE)) {
          oldTree.removeChild(oldStartNode);
          replayer.mirror.removeNodeFromMap(oldStartNode);
          oldStartNode = oldChildren[++oldStartIndex];
        }
        try {
          oldTree.insertBefore(newNode, oldStartNode || null);
        } catch (e2) {
          console.warn(e2);
        }
      }
      newStartNode = newChildren[++newStartIndex];
    }
  }
  if (oldStartIndex > oldEndIndex) {
    const referenceRRNode = newChildren[newEndIndex + 1];
    let referenceNode = null;
    if (referenceRRNode)
      referenceNode = replayer.mirror.getNode(
        rrnodeMirror.getId(referenceRRNode)
      );
    for (; newStartIndex <= newEndIndex; ++newStartIndex) {
      const newNode = createOrGetNode(
        newChildren[newStartIndex],
        replayer.mirror,
        rrnodeMirror
      );
      try {
        oldTree.insertBefore(newNode, referenceNode);
      } catch (e2) {
        console.warn(e2);
      }
    }
  } else if (newStartIndex > newEndIndex) {
    for (; oldStartIndex <= oldEndIndex; oldStartIndex++) {
      const node = oldChildren[oldStartIndex];
      if (!node || node.parentNode !== oldTree)
        continue;
      try {
        oldTree.removeChild(node);
        replayer.mirror.removeNodeFromMap(node);
      } catch (e2) {
        console.warn(e2);
      }
    }
  }
  let oldChild = oldTree.firstChild;
  let newChild = newTree.firstChild;
  while (oldChild !== null && newChild !== null) {
    diff(oldChild, newChild, replayer, rrnodeMirror);
    oldChild = oldChild.nextSibling;
    newChild = newChild.nextSibling;
  }
}
function createOrGetNode(rrNode, domMirror, rrnodeMirror) {
  const nodeId = rrnodeMirror.getId(rrNode);
  const sn = rrnodeMirror.getMeta(rrNode);
  let node = null;
  if (nodeId > -1)
    node = domMirror.getNode(nodeId);
  if (node !== null && sameNodeType(node, rrNode))
    return node;
  switch (rrNode.RRNodeType) {
    case NodeType$1.Document:
      node = new Document();
      break;
    case NodeType$1.DocumentType:
      node = document.implementation.createDocumentType(
        rrNode.name,
        rrNode.publicId,
        rrNode.systemId
      );
      break;
    case NodeType$1.Element: {
      let tagName = rrNode.tagName.toLowerCase();
      tagName = SVGTagMap[tagName] || tagName;
      if (sn && "isSVG" in sn && (sn == null ? void 0 : sn.isSVG)) {
        node = document.createElementNS(NAMESPACES["svg"], tagName);
      } else
        node = document.createElement(rrNode.tagName);
      break;
    }
    case NodeType$1.Text:
      node = document.createTextNode(rrNode.data);
      break;
    case NodeType$1.Comment:
      node = document.createComment(rrNode.data);
      break;
    case NodeType$1.CDATA:
      node = document.createCDATASection(rrNode.data);
      break;
  }
  if (sn)
    domMirror.add(node, { ...sn });
  try {
    createdNodeSet == null ? void 0 : createdNodeSet.add(node);
  } catch (e2) {
  }
  return node;
}
function sameNodeType(node1, node2) {
  if (node1.nodeType !== node2.nodeType)
    return false;
  return node1.nodeType !== node1.ELEMENT_NODE || node1.tagName.toUpperCase() === node2.tagName;
}
function nodeMatching(node1, node2, domMirror, rrdomMirror) {
  const node1Id = domMirror.getId(node1);
  const node2Id = rrdomMirror.getId(node2);
  if (node1Id === -1 || node1Id !== node2Id)
    return false;
  return sameNodeType(node1, node2);
}
class RRDocument extends BaseRRDocument {
  constructor(mirror2) {
    super();
    __publicField2(this, "UNSERIALIZED_STARTING_ID", -2);
    __publicField2(this, "_unserializedId", this.UNSERIALIZED_STARTING_ID);
    __publicField2(this, "mirror", createMirror());
    __publicField2(this, "scrollData", null);
    if (mirror2) {
      this.mirror = mirror2;
    }
  }
  /**
   * Every time the id is used, it will minus 1 automatically to avoid collisions.
   */
  get unserializedId() {
    return this._unserializedId--;
  }
  createDocument(_namespace, _qualifiedName, _doctype) {
    return new RRDocument();
  }
  createDocumentType(qualifiedName, publicId, systemId) {
    const documentTypeNode = new RRDocumentType(
      qualifiedName,
      publicId,
      systemId
    );
    documentTypeNode.ownerDocument = this;
    return documentTypeNode;
  }
  createElement(tagName) {
    const upperTagName = tagName.toUpperCase();
    let element;
    switch (upperTagName) {
      case "AUDIO":
      case "VIDEO":
        element = new RRMediaElement(upperTagName);
        break;
      case "IFRAME":
        element = new RRIFrameElement(upperTagName, this.mirror);
        break;
      case "CANVAS":
        element = new RRCanvasElement(upperTagName);
        break;
      case "STYLE":
        element = new RRStyleElement(upperTagName);
        break;
      default:
        element = new RRElement(upperTagName);
        break;
    }
    element.ownerDocument = this;
    return element;
  }
  createComment(data) {
    const commentNode = new RRComment(data);
    commentNode.ownerDocument = this;
    return commentNode;
  }
  createCDATASection(data) {
    const sectionNode = new RRCDATASection(data);
    sectionNode.ownerDocument = this;
    return sectionNode;
  }
  createTextNode(data) {
    const textNode = new RRText(data);
    textNode.ownerDocument = this;
    return textNode;
  }
  destroyTree() {
    this.firstChild = null;
    this.lastChild = null;
    this.mirror.reset();
  }
  open() {
    super.open();
    this._unserializedId = this.UNSERIALIZED_STARTING_ID;
  }
}
const RRDocumentType = BaseRRDocumentType;
class RRElement extends BaseRRElement {
  constructor() {
    super(...arguments);
    __publicField2(this, "inputData", null);
    __publicField2(this, "scrollData", null);
  }
}
class RRMediaElement extends BaseRRMediaElement {
}
class RRCanvasElement extends RRElement {
  constructor() {
    super(...arguments);
    __publicField2(this, "rr_dataURL", null);
    __publicField2(this, "canvasMutations", []);
  }
  /**
   * This is a dummy implementation to distinguish RRCanvasElement from real HTMLCanvasElement.
   */
  getContext() {
    return null;
  }
}
class RRStyleElement extends RRElement {
  constructor() {
    super(...arguments);
    __publicField2(this, "rules", []);
  }
}
class RRIFrameElement extends RRElement {
  constructor(upperTagName, mirror2) {
    super(upperTagName);
    __publicField2(this, "contentDocument", new RRDocument());
    this.contentDocument.mirror = mirror2;
  }
}
const RRText = BaseRRText;
const RRComment = BaseRRComment;
const RRCDATASection = BaseRRCDATASection;
function getValidTagName(element) {
  if (element instanceof HTMLFormElement) {
    return "FORM";
  }
  return element.tagName.toUpperCase();
}
function buildFromNode(node, rrdom, domMirror, parentRRNode) {
  let rrNode;
  switch (node.nodeType) {
    case NodeType.DOCUMENT_NODE:
      if (parentRRNode && parentRRNode.nodeName === "IFRAME")
        rrNode = parentRRNode.contentDocument;
      else {
        rrNode = rrdom;
        rrNode.compatMode = node.compatMode;
      }
      break;
    case NodeType.DOCUMENT_TYPE_NODE: {
      const documentType = node;
      rrNode = rrdom.createDocumentType(
        documentType.name,
        documentType.publicId,
        documentType.systemId
      );
      break;
    }
    case NodeType.ELEMENT_NODE: {
      const elementNode = node;
      const tagName = getValidTagName(elementNode);
      rrNode = rrdom.createElement(tagName);
      const rrElement = rrNode;
      for (const { name, value } of Array.from(elementNode.attributes)) {
        rrElement.attributes[name] = value;
      }
      elementNode.scrollLeft && (rrElement.scrollLeft = elementNode.scrollLeft);
      elementNode.scrollTop && (rrElement.scrollTop = elementNode.scrollTop);
      break;
    }
    case NodeType.TEXT_NODE:
      rrNode = rrdom.createTextNode(node.textContent || "");
      break;
    case NodeType.CDATA_SECTION_NODE:
      rrNode = rrdom.createCDATASection(node.data);
      break;
    case NodeType.COMMENT_NODE:
      rrNode = rrdom.createComment(node.textContent || "");
      break;
    case NodeType.DOCUMENT_FRAGMENT_NODE:
      rrNode = parentRRNode.attachShadow({ mode: "open" });
      break;
    default:
      return null;
  }
  let sn = domMirror.getMeta(node);
  if (rrdom instanceof RRDocument) {
    if (!sn) {
      sn = getDefaultSN(rrNode, rrdom.unserializedId);
      domMirror.add(node, sn);
    }
    rrdom.mirror.add(rrNode, { ...sn });
  }
  return rrNode;
}
function buildFromDom(dom, domMirror = createMirror$1(), rrdom = new RRDocument()) {
  function walk2(node, parentRRNode) {
    const rrNode = buildFromNode(node, rrdom, domMirror, parentRRNode);
    if (rrNode === null)
      return;
    if (
      // if the parentRRNode isn't a RRIFrameElement
      (parentRRNode == null ? void 0 : parentRRNode.nodeName) !== "IFRAME" && // if node isn't a shadow root
      node.nodeType !== NodeType.DOCUMENT_FRAGMENT_NODE
    ) {
      parentRRNode == null ? void 0 : parentRRNode.appendChild(rrNode);
      rrNode.parentNode = parentRRNode;
      rrNode.parentElement = parentRRNode;
    }
    if (node.nodeName === "IFRAME") {
      const iframeDoc = node.contentDocument;
      iframeDoc && walk2(iframeDoc, rrNode);
    } else if (node.nodeType === NodeType.DOCUMENT_NODE || node.nodeType === NodeType.ELEMENT_NODE || node.nodeType === NodeType.DOCUMENT_FRAGMENT_NODE) {
      if (node.nodeType === NodeType.ELEMENT_NODE && node.shadowRoot)
        walk2(node.shadowRoot, rrNode);
      node.childNodes.forEach((childNode) => walk2(childNode, rrNode));
    }
  }
  walk2(dom, null);
  return rrdom;
}
function createMirror() {
  return new Mirror22();
}
class Mirror22 {
  constructor() {
    __publicField2(this, "idNodeMap", /* @__PURE__ */ new Map());
    __publicField2(this, "nodeMetaMap", /* @__PURE__ */ new WeakMap());
  }
  getId(n2) {
    var _a2;
    if (!n2)
      return -1;
    const id = (_a2 = this.getMeta(n2)) == null ? void 0 : _a2.id;
    return id ?? -1;
  }
  getNode(id) {
    return this.idNodeMap.get(id) || null;
  }
  getIds() {
    return Array.from(this.idNodeMap.keys());
  }
  getMeta(n2) {
    return this.nodeMetaMap.get(n2) || null;
  }
  // removes the node from idNodeMap
  // doesn't remove the node from nodeMetaMap
  removeNodeFromMap(n2) {
    const id = this.getId(n2);
    this.idNodeMap.delete(id);
    if (n2.childNodes) {
      n2.childNodes.forEach((childNode) => this.removeNodeFromMap(childNode));
    }
  }
  has(id) {
    return this.idNodeMap.has(id);
  }
  hasNode(node) {
    return this.nodeMetaMap.has(node);
  }
  add(n2, meta) {
    const id = meta.id;
    this.idNodeMap.set(id, n2);
    this.nodeMetaMap.set(n2, meta);
  }
  replace(id, n2) {
    const oldNode = this.getNode(id);
    if (oldNode) {
      const meta = this.nodeMetaMap.get(oldNode);
      if (meta)
        this.nodeMetaMap.set(n2, meta);
    }
    this.idNodeMap.set(id, n2);
  }
  reset() {
    this.idNodeMap = /* @__PURE__ */ new Map();
    this.nodeMetaMap = /* @__PURE__ */ new WeakMap();
  }
}
function getDefaultSN(node, id) {
  switch (node.RRNodeType) {
    case NodeType$1.Document:
      return {
        id,
        type: node.RRNodeType,
        childNodes: []
      };
    case NodeType$1.DocumentType: {
      const doctype = node;
      return {
        id,
        type: node.RRNodeType,
        name: doctype.name,
        publicId: doctype.publicId,
        systemId: doctype.systemId
      };
    }
    case NodeType$1.Element:
      return {
        id,
        type: node.RRNodeType,
        tagName: node.tagName.toLowerCase(),
        // In rrweb data, all tagNames are lowercase.
        attributes: {},
        childNodes: []
      };
    case NodeType$1.Text:
      return {
        id,
        type: node.RRNodeType,
        textContent: node.textContent || ""
      };
    case NodeType$1.Comment:
      return {
        id,
        type: node.RRNodeType,
        textContent: node.textContent || ""
      };
    case NodeType$1.CDATA:
      return {
        id,
        type: node.RRNodeType,
        textContent: ""
      };
  }
}
function mitt$1(n2) {
  return { all: n2 = n2 || /* @__PURE__ */ new Map(), on: function(t2, e2) {
    var i2 = n2.get(t2);
    i2 ? i2.push(e2) : n2.set(t2, [e2]);
  }, off: function(t2, e2) {
    var i2 = n2.get(t2);
    i2 && (e2 ? i2.splice(i2.indexOf(e2) >>> 0, 1) : n2.set(t2, []));
  }, emit: function(t2, e2) {
    var i2 = n2.get(t2);
    i2 && i2.slice().map(function(n3) {
      n3(e2);
    }), (i2 = n2.get("*")) && i2.slice().map(function(n3) {
      n3(t2, e2);
    });
  } };
}
const mittProxy = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: mitt$1
}, Symbol.toStringTag, { value: "Module" }));
function polyfill(w = window, d = document) {
  if ("scrollBehavior" in d.documentElement.style && w.__forceSmoothScrollPolyfill__ !== true) {
    return;
  }
  const Element2 = w.HTMLElement || w.Element;
  const SCROLL_TIME = 468;
  const original = {
    scroll: w.scroll || w.scrollTo,
    scrollBy: w.scrollBy,
    elementScroll: Element2.prototype.scroll || scrollElement,
    scrollIntoView: Element2.prototype.scrollIntoView
  };
  const now = w.performance && w.performance.now ? w.performance.now.bind(w.performance) : Date.now;
  function isMicrosoftBrowser(userAgent) {
    const userAgentPatterns = ["MSIE ", "Trident/", "Edge/"];
    return new RegExp(userAgentPatterns.join("|")).test(userAgent);
  }
  const ROUNDING_TOLERANCE = isMicrosoftBrowser(w.navigator.userAgent) ? 1 : 0;
  function scrollElement(x, y) {
    this.scrollLeft = x;
    this.scrollTop = y;
  }
  function ease(k) {
    return 0.5 * (1 - Math.cos(Math.PI * k));
  }
  function shouldBailOut(firstArg) {
    if (firstArg === null || typeof firstArg !== "object" || firstArg.behavior === void 0 || firstArg.behavior === "auto" || firstArg.behavior === "instant") {
      return true;
    }
    if (typeof firstArg === "object" && firstArg.behavior === "smooth") {
      return false;
    }
    throw new TypeError(
      "behavior member of ScrollOptions " + firstArg.behavior + " is not a valid value for enumeration ScrollBehavior."
    );
  }
  function hasScrollableSpace(el, axis) {
    if (axis === "Y") {
      return el.clientHeight + ROUNDING_TOLERANCE < el.scrollHeight;
    }
    if (axis === "X") {
      return el.clientWidth + ROUNDING_TOLERANCE < el.scrollWidth;
    }
  }
  function canOverflow(el, axis) {
    const overflowValue = w.getComputedStyle(el, null)["overflow" + axis];
    return overflowValue === "auto" || overflowValue === "scroll";
  }
  function isScrollable(el) {
    const isScrollableY = hasScrollableSpace(el, "Y") && canOverflow(el, "Y");
    const isScrollableX = hasScrollableSpace(el, "X") && canOverflow(el, "X");
    return isScrollableY || isScrollableX;
  }
  function findScrollableParent(el) {
    while (el !== d.body && isScrollable(el) === false) {
      el = el.parentNode || el.host;
    }
    return el;
  }
  function step(context) {
    const time = now();
    let value;
    let currentX;
    let currentY;
    let elapsed = (time - context.startTime) / SCROLL_TIME;
    elapsed = elapsed > 1 ? 1 : elapsed;
    value = ease(elapsed);
    currentX = context.startX + (context.x - context.startX) * value;
    currentY = context.startY + (context.y - context.startY) * value;
    context.method.call(context.scrollable, currentX, currentY);
    if (currentX !== context.x || currentY !== context.y) {
      w.requestAnimationFrame(step.bind(w, context));
    }
  }
  function smoothScroll(el, x, y) {
    let scrollable;
    let startX;
    let startY;
    let method;
    const startTime = now();
    if (el === d.body) {
      scrollable = w;
      startX = w.scrollX || w.pageXOffset;
      startY = w.scrollY || w.pageYOffset;
      method = original.scroll;
    } else {
      scrollable = el;
      startX = el.scrollLeft;
      startY = el.scrollTop;
      method = scrollElement;
    }
    step({
      scrollable,
      method,
      startTime,
      startX,
      startY,
      x,
      y
    });
  }
  w.scroll = w.scrollTo = function() {
    if (arguments[0] === void 0) {
      return;
    }
    if (shouldBailOut(arguments[0]) === true) {
      original.scroll.call(
        w,
        arguments[0].left !== void 0 ? arguments[0].left : typeof arguments[0] !== "object" ? arguments[0] : w.scrollX || w.pageXOffset,
        // use top prop, second argument if present or fallback to scrollY
        arguments[0].top !== void 0 ? arguments[0].top : arguments[1] !== void 0 ? arguments[1] : w.scrollY || w.pageYOffset
      );
      return;
    }
    smoothScroll.call(
      w,
      d.body,
      arguments[0].left !== void 0 ? ~~arguments[0].left : w.scrollX || w.pageXOffset,
      arguments[0].top !== void 0 ? ~~arguments[0].top : w.scrollY || w.pageYOffset
    );
  };
  w.scrollBy = function() {
    if (arguments[0] === void 0) {
      return;
    }
    if (shouldBailOut(arguments[0])) {
      original.scrollBy.call(
        w,
        arguments[0].left !== void 0 ? arguments[0].left : typeof arguments[0] !== "object" ? arguments[0] : 0,
        arguments[0].top !== void 0 ? arguments[0].top : arguments[1] !== void 0 ? arguments[1] : 0
      );
      return;
    }
    smoothScroll.call(
      w,
      d.body,
      ~~arguments[0].left + (w.scrollX || w.pageXOffset),
      ~~arguments[0].top + (w.scrollY || w.pageYOffset)
    );
  };
  Element2.prototype.scroll = Element2.prototype.scrollTo = function() {
    if (arguments[0] === void 0) {
      return;
    }
    if (shouldBailOut(arguments[0]) === true) {
      if (typeof arguments[0] === "number" && arguments[1] === void 0) {
        throw new SyntaxError("Value could not be converted");
      }
      original.elementScroll.call(
        this,
        // use left prop, first number argument or fallback to scrollLeft
        arguments[0].left !== void 0 ? ~~arguments[0].left : typeof arguments[0] !== "object" ? ~~arguments[0] : this.scrollLeft,
        // use top prop, second argument or fallback to scrollTop
        arguments[0].top !== void 0 ? ~~arguments[0].top : arguments[1] !== void 0 ? ~~arguments[1] : this.scrollTop
      );
      return;
    }
    const left = arguments[0].left;
    const top = arguments[0].top;
    smoothScroll.call(
      this,
      this,
      typeof left === "undefined" ? this.scrollLeft : ~~left,
      typeof top === "undefined" ? this.scrollTop : ~~top
    );
  };
  Element2.prototype.scrollBy = function() {
    if (arguments[0] === void 0) {
      return;
    }
    if (shouldBailOut(arguments[0]) === true) {
      original.elementScroll.call(
        this,
        arguments[0].left !== void 0 ? ~~arguments[0].left + this.scrollLeft : ~~arguments[0] + this.scrollLeft,
        arguments[0].top !== void 0 ? ~~arguments[0].top + this.scrollTop : ~~arguments[1] + this.scrollTop
      );
      return;
    }
    this.scroll({
      left: ~~arguments[0].left + this.scrollLeft,
      top: ~~arguments[0].top + this.scrollTop,
      behavior: arguments[0].behavior
    });
  };
  Element2.prototype.scrollIntoView = function() {
    if (shouldBailOut(arguments[0]) === true) {
      original.scrollIntoView.call(
        this,
        arguments[0] === void 0 ? true : arguments[0]
      );
      return;
    }
    const scrollableParent = findScrollableParent(this);
    const parentRects = scrollableParent.getBoundingClientRect();
    const clientRects = this.getBoundingClientRect();
    if (scrollableParent !== d.body) {
      smoothScroll.call(
        this,
        scrollableParent,
        scrollableParent.scrollLeft + clientRects.left - parentRects.left,
        scrollableParent.scrollTop + clientRects.top - parentRects.top
      );
      if (w.getComputedStyle(scrollableParent).position !== "fixed") {
        w.scrollBy({
          left: parentRects.left,
          top: parentRects.top,
          behavior: "smooth"
        });
      }
    } else {
      w.scrollBy({
        left: clientRects.left,
        top: clientRects.top,
        behavior: "smooth"
      });
    }
  };
}
class Timer {
  constructor(actions = [], config) {
    __publicField(this, "timeOffset", 0);
    __publicField(this, "speed");
    __publicField(this, "actions");
    __publicField(this, "raf", null);
    __publicField(this, "lastTimestamp");
    this.actions = actions;
    this.speed = config.speed;
  }
  /**
   * Add an action, possibly after the timer starts.
   */
  addAction(action) {
    const rafWasActive = this.raf === true;
    if (!this.actions.length || this.actions[this.actions.length - 1].delay <= action.delay) {
      this.actions.push(action);
    } else {
      const index = this.findActionIndex(action);
      this.actions.splice(index, 0, action);
    }
    if (rafWasActive) {
      this.raf = requestAnimationFrame(this.rafCheck.bind(this));
    }
  }
  start() {
    this.timeOffset = 0;
    this.lastTimestamp = performance.now();
    this.raf = requestAnimationFrame(this.rafCheck.bind(this));
  }
  rafCheck() {
    const time = performance.now();
    this.timeOffset += (time - this.lastTimestamp) * this.speed;
    this.lastTimestamp = time;
    while (this.actions.length) {
      const action = this.actions[0];
      if (this.timeOffset >= action.delay) {
        this.actions.shift();
        action.doAction();
      } else {
        break;
      }
    }
    if (this.actions.length > 0) {
      this.raf = requestAnimationFrame(this.rafCheck.bind(this));
    } else {
      this.raf = true;
    }
  }
  clear() {
    if (this.raf) {
      if (this.raf !== true) {
        cancelAnimationFrame(this.raf);
      }
      this.raf = null;
    }
    this.actions.length = 0;
  }
  setSpeed(speed) {
    this.speed = speed;
  }
  isActive() {
    return this.raf !== null;
  }
  findActionIndex(action) {
    let start = 0;
    let end = this.actions.length - 1;
    while (start <= end) {
      const mid = Math.floor((start + end) / 2);
      if (this.actions[mid].delay < action.delay) {
        start = mid + 1;
      } else if (this.actions[mid].delay > action.delay) {
        end = mid - 1;
      } else {
        return mid + 1;
      }
    }
    return start;
  }
}
function addDelay(event, baselineTime) {
  if (event.type === EventType.IncrementalSnapshot && event.data.source === IncrementalSource.MouseMove && event.data.positions && event.data.positions.length) {
    const firstOffset = event.data.positions[0].timeOffset;
    const firstTimestamp = event.timestamp + firstOffset;
    event.delay = firstTimestamp - baselineTime;
    return firstTimestamp - baselineTime;
  }
  event.delay = event.timestamp - baselineTime;
  return event.delay;
}
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
function t(t2, n2) {
  var e2 = "function" == typeof Symbol && t2[Symbol.iterator];
  if (!e2)
    return t2;
  var r2, o2, i2 = e2.call(t2), a2 = [];
  try {
    for (; (void 0 === n2 || n2-- > 0) && !(r2 = i2.next()).done; )
      a2.push(r2.value);
  } catch (t3) {
    o2 = { error: t3 };
  } finally {
    try {
      r2 && !r2.done && (e2 = i2.return) && e2.call(i2);
    } finally {
      if (o2)
        throw o2.error;
    }
  }
  return a2;
}
var n;
!function(t2) {
  t2[t2.NotStarted = 0] = "NotStarted", t2[t2.Running = 1] = "Running", t2[t2.Stopped = 2] = "Stopped";
}(n || (n = {}));
var e = { type: "xstate.init" };
function r(t2) {
  return void 0 === t2 ? [] : [].concat(t2);
}
function o(t2) {
  return { type: "xstate.assign", assignment: t2 };
}
function i(t2, n2) {
  return "string" == typeof (t2 = "string" == typeof t2 && n2 && n2[t2] ? n2[t2] : t2) ? { type: t2 } : "function" == typeof t2 ? { type: t2.name, exec: t2 } : t2;
}
function a(t2) {
  return function(n2) {
    return t2 === n2;
  };
}
function u(t2) {
  return "string" == typeof t2 ? { type: t2 } : t2;
}
function c(t2, n2) {
  return { value: t2, context: n2, actions: [], changed: false, matches: a(t2) };
}
function f(t2, n2, e2) {
  var r2 = n2, o2 = false;
  return [t2.filter(function(t3) {
    if ("xstate.assign" === t3.type) {
      o2 = true;
      var n3 = Object.assign({}, r2);
      return "function" == typeof t3.assignment ? n3 = t3.assignment(r2, e2) : Object.keys(t3.assignment).forEach(function(o3) {
        n3[o3] = "function" == typeof t3.assignment[o3] ? t3.assignment[o3](r2, e2) : t3.assignment[o3];
      }), r2 = n3, false;
    }
    return true;
  }), r2, o2];
}
function s(n2, o2) {
  void 0 === o2 && (o2 = {});
  var s2 = t(f(r(n2.states[n2.initial].entry).map(function(t2) {
    return i(t2, o2.actions);
  }), n2.context, e), 2), l2 = s2[0], v2 = s2[1], y = { config: n2, _options: o2, initialState: { value: n2.initial, actions: l2, context: v2, matches: a(n2.initial) }, transition: function(e2, o3) {
    var s3, l3, v3 = "string" == typeof e2 ? { value: e2, context: n2.context } : e2, p = v3.value, g = v3.context, d = u(o3), x = n2.states[p];
    if (x.on) {
      var m = r(x.on[d.type]);
      try {
        for (var h = function(t2) {
          var n3 = "function" == typeof Symbol && Symbol.iterator, e3 = n3 && t2[n3], r2 = 0;
          if (e3)
            return e3.call(t2);
          if (t2 && "number" == typeof t2.length)
            return { next: function() {
              return t2 && r2 >= t2.length && (t2 = void 0), { value: t2 && t2[r2++], done: !t2 };
            } };
          throw new TypeError(n3 ? "Object is not iterable." : "Symbol.iterator is not defined.");
        }(m), b = h.next(); !b.done; b = h.next()) {
          var S = b.value;
          if (void 0 === S)
            return c(p, g);
          var w = "string" == typeof S ? { target: S } : S, j = w.target, E = w.actions, R = void 0 === E ? [] : E, N = w.cond, O = void 0 === N ? function() {
            return true;
          } : N, _ = void 0 === j, k = null != j ? j : p, T = n2.states[k];
          if (O(g, d)) {
            var q = t(f((_ ? r(R) : [].concat(x.exit, R, T.entry).filter(function(t2) {
              return t2;
            })).map(function(t2) {
              return i(t2, y._options.actions);
            }), g, d), 3), z = q[0], A = q[1], B = q[2], C = null != j ? j : p;
            return { value: C, context: A, actions: z, changed: j !== p || z.length > 0 || B, matches: a(C) };
          }
        }
      } catch (t2) {
        s3 = { error: t2 };
      } finally {
        try {
          b && !b.done && (l3 = h.return) && l3.call(h);
        } finally {
          if (s3)
            throw s3.error;
        }
      }
    }
    return c(p, g);
  } };
  return y;
}
var l = function(t2, n2) {
  return t2.actions.forEach(function(e2) {
    var r2 = e2.exec;
    return r2 && r2(t2.context, n2);
  });
};
function v(t2) {
  var r2 = t2.initialState, o2 = n.NotStarted, i2 = /* @__PURE__ */ new Set(), c2 = { _machine: t2, send: function(e2) {
    o2 === n.Running && (r2 = t2.transition(r2, e2), l(r2, u(e2)), i2.forEach(function(t3) {
      return t3(r2);
    }));
  }, subscribe: function(t3) {
    return i2.add(t3), t3(r2), { unsubscribe: function() {
      return i2.delete(t3);
    } };
  }, start: function(i3) {
    if (i3) {
      var u2 = "object" == typeof i3 ? i3 : { context: t2.config.context, value: i3 };
      r2 = { value: u2.value, actions: [], context: u2.context, matches: a(u2.value) };
    }
    return o2 = n.Running, l(r2, e), c2;
  }, stop: function() {
    return o2 = n.Stopped, i2.clear(), c2;
  }, get state() {
    return r2;
  }, get status() {
    return o2;
  } };
  return c2;
}
function discardPriorSnapshots(events, baselineTime) {
  for (let idx = events.length - 1; idx >= 0; idx--) {
    const event = events[idx];
    if (event.type === EventType.Meta) {
      if (event.timestamp <= baselineTime) {
        return events.slice(idx);
      }
    }
  }
  return events;
}
function createPlayerService(context, { getCastFn, applyEventsSynchronously, emitter }) {
  const playerMachine = s(
    {
      id: "player",
      context,
      initial: "paused",
      states: {
        playing: {
          on: {
            PAUSE: {
              target: "paused",
              actions: ["pause"]
            },
            CAST_EVENT: {
              target: "playing",
              actions: "castEvent"
            },
            END: {
              target: "paused",
              actions: ["resetLastPlayedEvent", "pause"]
            },
            ADD_EVENT: {
              target: "playing",
              actions: ["addEvent"]
            }
          }
        },
        paused: {
          on: {
            PLAY: {
              target: "playing",
              actions: ["recordTimeOffset", "play"]
            },
            CAST_EVENT: {
              target: "paused",
              actions: "castEvent"
            },
            TO_LIVE: {
              target: "live",
              actions: ["startLive"]
            },
            ADD_EVENT: {
              target: "paused",
              actions: ["addEvent"]
            }
          }
        },
        live: {
          on: {
            ADD_EVENT: {
              target: "live",
              actions: ["addEvent"]
            },
            CAST_EVENT: {
              target: "live",
              actions: ["castEvent"]
            }
          }
        }
      }
    },
    {
      actions: {
        castEvent: o({
          lastPlayedEvent: (ctx, event) => {
            if (event.type === "CAST_EVENT") {
              return event.payload.event;
            }
            return ctx.lastPlayedEvent;
          }
        }),
        recordTimeOffset: o((ctx, event) => {
          let timeOffset = ctx.timeOffset;
          if ("payload" in event && "timeOffset" in event.payload) {
            timeOffset = event.payload.timeOffset;
          }
          return {
            ...ctx,
            timeOffset,
            baselineTime: ctx.events[0].timestamp + timeOffset
          };
        }),
        play(ctx) {
          var _a2;
          const { timer, events, baselineTime, lastPlayedEvent } = ctx;
          timer.clear();
          for (const event of events) {
            addDelay(event, baselineTime);
          }
          const neededEvents = discardPriorSnapshots(events, baselineTime);
          let lastPlayedTimestamp = lastPlayedEvent == null ? void 0 : lastPlayedEvent.timestamp;
          if ((lastPlayedEvent == null ? void 0 : lastPlayedEvent.type) === EventType.IncrementalSnapshot && lastPlayedEvent.data.source === IncrementalSource.MouseMove) {
            lastPlayedTimestamp = lastPlayedEvent.timestamp + ((_a2 = lastPlayedEvent.data.positions[0]) == null ? void 0 : _a2.timeOffset);
          }
          if (baselineTime < (lastPlayedTimestamp || 0)) {
            emitter.emit(ReplayerEvents.PlayBack);
          }
          const syncEvents = new Array();
          for (const event of neededEvents) {
            if (lastPlayedTimestamp && lastPlayedTimestamp < baselineTime && (event.timestamp <= lastPlayedTimestamp || event === lastPlayedEvent)) {
              continue;
            }
            if (event.timestamp < baselineTime) {
              syncEvents.push(event);
            } else {
              const castFn = getCastFn(event, false);
              timer.addAction({
                doAction: () => {
                  castFn();
                },
                delay: event.delay
              });
            }
          }
          applyEventsSynchronously(syncEvents);
          emitter.emit(ReplayerEvents.Flush);
          timer.start();
        },
        pause(ctx) {
          ctx.timer.clear();
        },
        resetLastPlayedEvent: o((ctx) => {
          return {
            ...ctx,
            lastPlayedEvent: null
          };
        }),
        startLive: o({
          baselineTime: (ctx, event) => {
            ctx.timer.start();
            if (event.type === "TO_LIVE" && event.payload.baselineTime) {
              return event.payload.baselineTime;
            }
            return Date.now();
          }
        }),
        addEvent: o((ctx, machineEvent) => {
          const { baselineTime, timer, events } = ctx;
          if (machineEvent.type === "ADD_EVENT") {
            const { event } = machineEvent.payload;
            addDelay(event, baselineTime);
            let end = events.length - 1;
            if (!events[end] || events[end].timestamp <= event.timestamp) {
              events.push(event);
            } else {
              let insertionIndex = -1;
              let start = 0;
              while (start <= end) {
                const mid = Math.floor((start + end) / 2);
                if (events[mid].timestamp <= event.timestamp) {
                  start = mid + 1;
                } else {
                  end = mid - 1;
                }
              }
              if (insertionIndex === -1) {
                insertionIndex = start;
              }
              events.splice(insertionIndex, 0, event);
            }
            const isSync = event.timestamp < baselineTime;
            const castFn = getCastFn(event, isSync);
            if (isSync) {
              castFn();
            } else if (timer.isActive()) {
              timer.addAction({
                doAction: () => {
                  castFn();
                },
                delay: event.delay
              });
            }
          }
          return { ...ctx, events };
        })
      }
    }
  );
  return v(playerMachine);
}
function createSpeedService(context) {
  const speedMachine = s(
    {
      id: "speed",
      context,
      initial: "normal",
      states: {
        normal: {
          on: {
            FAST_FORWARD: {
              target: "skipping",
              actions: ["recordSpeed", "setSpeed"]
            },
            SET_SPEED: {
              target: "normal",
              actions: ["setSpeed"]
            }
          }
        },
        skipping: {
          on: {
            BACK_TO_NORMAL: {
              target: "normal",
              actions: ["restoreSpeed"]
            },
            SET_SPEED: {
              target: "normal",
              actions: ["setSpeed"]
            }
          }
        }
      }
    },
    {
      actions: {
        setSpeed: (ctx, event) => {
          if ("payload" in event) {
            ctx.timer.setSpeed(event.payload.speed);
          }
        },
        recordSpeed: o({
          normalSpeed: (ctx) => ctx.timer.speed
        }),
        restoreSpeed: (ctx) => {
          ctx.timer.setSpeed(ctx.normalSpeed);
        }
      }
    }
  );
  return v(speedMachine);
}
const rules = (blockClass) => [
  `.${blockClass} { background: currentColor }`,
  "noscript { display: none !important; }"
];
const webGLVarMap = /* @__PURE__ */ new Map();
function variableListFor(ctx, ctor) {
  let contextMap = webGLVarMap.get(ctx);
  if (!contextMap) {
    contextMap = /* @__PURE__ */ new Map();
    webGLVarMap.set(ctx, contextMap);
  }
  if (!contextMap.has(ctor)) {
    contextMap.set(ctor, []);
  }
  return contextMap.get(ctor);
}
function deserializeArg(imageMap, ctx, preload) {
  return async (arg) => {
    if (arg && typeof arg === "object" && "rr_type" in arg) {
      if (preload)
        preload.isUnchanged = false;
      if (arg.rr_type === "ImageBitmap" && "args" in arg) {
        const args = await deserializeArg(imageMap, ctx, preload)(arg.args);
        return await createImageBitmap.apply(null, args);
      } else if ("index" in arg) {
        if (preload || ctx === null)
          return arg;
        const { rr_type: name, index } = arg;
        return variableListFor(ctx, name)[index];
      } else if ("args" in arg) {
        const { rr_type: name, args } = arg;
        const ctor = window[name];
        return new ctor(
          ...await Promise.all(
            args.map(deserializeArg(imageMap, ctx, preload))
          )
        );
      } else if ("base64" in arg) {
        return decode(arg.base64);
      } else if ("src" in arg) {
        const image = imageMap.get(arg.src);
        if (image) {
          return image;
        } else {
          const image2 = new Image();
          image2.src = arg.src;
          imageMap.set(arg.src, image2);
          return image2;
        }
      } else if ("data" in arg && arg.rr_type === "Blob") {
        const blobContents = await Promise.all(
          arg.data.map(deserializeArg(imageMap, ctx, preload))
        );
        const blob2 = new Blob(blobContents, {
          type: arg.type
        });
        return blob2;
      }
    } else if (Array.isArray(arg)) {
      const result = await Promise.all(
        arg.map(deserializeArg(imageMap, ctx, preload))
      );
      return result;
    }
    return arg;
  };
}
function getContext(target, type) {
  try {
    if (type === CanvasContext.WebGL) {
      return target.getContext("webgl") || target.getContext("experimental-webgl");
    }
    return target.getContext("webgl2");
  } catch (e2) {
    return null;
  }
}
const WebGLVariableConstructorsNames = (/* unused pure expression or super */ null && ([
  "WebGLActiveInfo",
  "WebGLBuffer",
  "WebGLFramebuffer",
  "WebGLProgram",
  "WebGLRenderbuffer",
  "WebGLShader",
  "WebGLShaderPrecisionFormat",
  "WebGLTexture",
  "WebGLUniformLocation",
  "WebGLVertexArrayObject"
]));
function saveToWebGLVarMap(ctx, result) {
  if (!(result == null ? void 0 : result.constructor))
    return;
  const { name } = result.constructor;
  if (!WebGLVariableConstructorsNames.includes(name))
    return;
  const variables = variableListFor(ctx, name);
  if (!variables.includes(result))
    variables.push(result);
}
async function webglMutation({
  mutation,
  target,
  type,
  imageMap,
  errorHandler: errorHandler2
}) {
  try {
    const ctx = getContext(target, type);
    if (!ctx)
      return;
    if (mutation.setter) {
      ctx[mutation.property] = mutation.args[0];
      return;
    }
    const original = ctx[mutation.property];
    const args = await Promise.all(
      mutation.args.map(deserializeArg(imageMap, ctx))
    );
    const result = original.apply(ctx, args);
    saveToWebGLVarMap(ctx, result);
    const debugMode = false;
    if (debugMode)
      ;
  } catch (error) {
    errorHandler2(mutation, error);
  }
}
async function canvasMutation$1({
  event,
  mutations,
  target,
  imageMap,
  errorHandler: errorHandler2
}) {
  const ctx = target.getContext("2d");
  if (!ctx) {
    errorHandler2(mutations[0], new Error("Canvas context is null"));
    return;
  }
  const mutationArgsPromises = mutations.map(
    async (mutation) => {
      return Promise.all(mutation.args.map(deserializeArg(imageMap, ctx)));
    }
  );
  const args = await Promise.all(mutationArgsPromises);
  args.forEach((args2, index) => {
    const mutation = mutations[index];
    try {
      if (mutation.setter) {
        ctx[mutation.property] = mutation.args[0];
        return;
      }
      const original = ctx[mutation.property];
      if (mutation.property === "drawImage" && typeof mutation.args[0] === "string") {
        imageMap.get(event);
        original.apply(ctx, mutation.args);
      } else {
        original.apply(ctx, args2);
      }
    } catch (error) {
      errorHandler2(mutation, error);
    }
    return;
  });
}
async function canvasMutation({
  event,
  mutation,
  target,
  imageMap,
  canvasEventMap,
  errorHandler: errorHandler2
}) {
  try {
    const precomputedMutation = canvasEventMap.get(event) || mutation;
    const commands = "commands" in precomputedMutation ? precomputedMutation.commands : [precomputedMutation];
    if ([CanvasContext.WebGL, CanvasContext.WebGL2].includes(mutation.type)) {
      for (let i2 = 0; i2 < commands.length; i2++) {
        const command = commands[i2];
        await webglMutation({
          mutation: command,
          type: mutation.type,
          target,
          imageMap,
          errorHandler: errorHandler2
        });
      }
      return;
    }
    await canvasMutation$1({
      event,
      mutations: commands,
      target,
      imageMap,
      errorHandler: errorHandler2
    });
  } catch (error) {
    errorHandler2(mutation, error);
  }
}
class MediaManager {
  constructor(options) {
    __publicField(this, "mediaMap", /* @__PURE__ */ new Map());
    __publicField(this, "warn");
    __publicField(this, "service");
    __publicField(this, "speedService");
    __publicField(this, "emitter");
    __publicField(this, "getCurrentTime");
    __publicField(this, "metadataCallbackMap", /* @__PURE__ */ new Map());
    this.warn = options.warn;
    this.service = options.service;
    this.speedService = options.speedService;
    this.emitter = options.emitter;
    this.getCurrentTime = options.getCurrentTime;
    this.emitter.on(ReplayerEvents.Start, this.start.bind(this));
    this.emitter.on(ReplayerEvents.SkipStart, this.start.bind(this));
    this.emitter.on(ReplayerEvents.Pause, this.pause.bind(this));
    this.emitter.on(ReplayerEvents.Finish, this.pause.bind(this));
    this.speedService.subscribe(() => {
      this.syncAllMediaElements();
    });
  }
  syncAllMediaElements(options = { pause: false }) {
    this.mediaMap.forEach((_mediaState, target) => {
      this.syncTargetWithState(target);
      if (options.pause) {
        target.pause();
      }
    });
  }
  start() {
    this.syncAllMediaElements();
  }
  pause() {
    this.syncAllMediaElements({ pause: true });
  }
  seekTo({
    time,
    target,
    mediaState
  }) {
    if (mediaState.isPlaying) {
      const differenceBetweenCurrentTimeAndMediaMutationTimestamp = time - mediaState.lastInteractionTimeOffset;
      const mediaPlaybackOffset = differenceBetweenCurrentTimeAndMediaMutationTimestamp / 1e3 * mediaState.playbackRate;
      const duration = "duration" in target && target.duration;
      if (Number.isNaN(duration)) {
        this.waitForMetadata(target);
        return;
      }
      let seekToTime = mediaState.currentTimeAtLastInteraction + mediaPlaybackOffset;
      if (target.loop && // RRMediaElement doesn't have a duration property
      duration !== false) {
        seekToTime = seekToTime % duration;
      }
      target.currentTime = seekToTime;
    } else {
      target.pause();
      target.currentTime = mediaState.currentTimeAtLastInteraction;
    }
  }
  waitForMetadata(target) {
    if (this.metadataCallbackMap.has(target))
      return;
    if (!("addEventListener" in target))
      return;
    const onLoadedMetadata = () => {
      this.metadataCallbackMap.delete(target);
      const mediaState = this.mediaMap.get(target);
      if (!mediaState)
        return;
      this.seekTo({
        time: this.getCurrentTime(),
        target,
        mediaState
      });
    };
    this.metadataCallbackMap.set(target, onLoadedMetadata);
    target.addEventListener("loadedmetadata", onLoadedMetadata, {
      once: true
    });
  }
  getMediaStateFromMutation({
    target,
    timeOffset,
    mutation
  }) {
    const lastState = this.mediaMap.get(target);
    const { type, playbackRate, currentTime, muted, volume, loop } = mutation;
    const isPlaying = type === MediaInteractions.Play || type !== MediaInteractions.Pause && ((lastState == null ? void 0 : lastState.isPlaying) || target.getAttribute("autoplay") !== null);
    const mediaState = {
      isPlaying,
      currentTimeAtLastInteraction: currentTime ?? (lastState == null ? void 0 : lastState.currentTimeAtLastInteraction) ?? 0,
      lastInteractionTimeOffset: timeOffset,
      playbackRate: playbackRate ?? (lastState == null ? void 0 : lastState.playbackRate) ?? 1,
      volume: volume ?? (lastState == null ? void 0 : lastState.volume) ?? 1,
      muted: muted ?? (lastState == null ? void 0 : lastState.muted) ?? target.getAttribute("muted") === null,
      loop: loop ?? (lastState == null ? void 0 : lastState.loop) ?? target.getAttribute("loop") === null
    };
    return mediaState;
  }
  syncTargetWithState(target) {
    const mediaState = this.mediaMap.get(target);
    if (!mediaState)
      return;
    const { muted, loop, volume, isPlaying } = mediaState;
    const playerIsPaused = this.service.state.matches("paused");
    const playbackRate = mediaState.playbackRate * this.speedService.state.context.timer.speed;
    try {
      this.seekTo({
        time: this.getCurrentTime(),
        target,
        mediaState
      });
      if (target.volume !== volume) {
        target.volume = volume;
      }
      target.muted = muted;
      target.loop = loop;
      if (target.playbackRate !== playbackRate) {
        target.playbackRate = playbackRate;
      }
      if (isPlaying && !playerIsPaused) {
        void target.play();
      } else {
        target.pause();
      }
    } catch (error) {
      this.warn(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
        `Failed to replay media interactions: ${error.message || error}`
      );
    }
  }
  addMediaElements(node, timeOffset, mirror2) {
    if (!["AUDIO", "VIDEO"].includes(node.nodeName))
      return;
    const target = node;
    const serializedNode = mirror2.getMeta(target);
    if (!serializedNode || !("attributes" in serializedNode))
      return;
    const playerIsPaused = this.service.state.matches("paused");
    const mediaAttributes = serializedNode.attributes;
    let isPlaying = false;
    if (mediaAttributes.rr_mediaState) {
      isPlaying = mediaAttributes.rr_mediaState === "played";
    } else {
      isPlaying = target.getAttribute("autoplay") !== null;
    }
    if (isPlaying && playerIsPaused)
      target.pause();
    let playbackRate = 1;
    if (typeof mediaAttributes.rr_mediaPlaybackRate === "number") {
      playbackRate = mediaAttributes.rr_mediaPlaybackRate;
    }
    let muted = false;
    if (typeof mediaAttributes.rr_mediaMuted === "boolean") {
      muted = mediaAttributes.rr_mediaMuted;
    } else {
      muted = target.getAttribute("muted") !== null;
    }
    let loop = false;
    if (typeof mediaAttributes.rr_mediaLoop === "boolean") {
      loop = mediaAttributes.rr_mediaLoop;
    } else {
      loop = target.getAttribute("loop") !== null;
    }
    let volume = 1;
    if (typeof mediaAttributes.rr_mediaVolume === "number") {
      volume = mediaAttributes.rr_mediaVolume;
    }
    let currentTimeAtLastInteraction = 0;
    if (typeof mediaAttributes.rr_mediaCurrentTime === "number") {
      currentTimeAtLastInteraction = mediaAttributes.rr_mediaCurrentTime;
    }
    this.mediaMap.set(target, {
      isPlaying,
      currentTimeAtLastInteraction,
      lastInteractionTimeOffset: timeOffset,
      playbackRate,
      volume,
      muted,
      loop
    });
    this.syncTargetWithState(target);
  }
  mediaMutation({
    target,
    timeOffset,
    mutation
  }) {
    this.mediaMap.set(
      target,
      this.getMediaStateFromMutation({
        target,
        timeOffset,
        mutation
      })
    );
    this.syncTargetWithState(target);
  }
  isSupportedMediaElement(node) {
    return ["AUDIO", "VIDEO"].includes(node.nodeName);
  }
  reset() {
    this.mediaMap.clear();
  }
}
const SKIP_TIME_INTERVAL = (/* unused pure expression or super */ null && (5 * 1e3));
const mitt = (/* unused pure expression or super */ null && (mitt$1 || mittProxy));
const REPLAY_CONSOLE_PREFIX = "[replayer]";
const defaultMouseTailConfig = {
  duration: 500,
  lineCap: "round",
  lineWidth: 3,
  strokeStyle: "red"
};
function indicatesTouchDevice(e2) {
  return e2.type == EventType.IncrementalSnapshot && (e2.data.source == IncrementalSource.TouchMove || e2.data.source == IncrementalSource.MouseInteraction && e2.data.type == MouseInteractions.TouchStart);
}
class Replayer {
  constructor(events, config) {
    __publicField(this, "wrapper");
    __publicField(this, "iframe");
    __publicField(this, "service");
    __publicField(this, "speedService");
    __publicField(this, "config");
    // In the fast-forward process, if the virtual-dom optimization is used, this flag value is true.
    __publicField(this, "usingVirtualDom", false);
    __publicField(this, "virtualDom", new RRDocument());
    __publicField(this, "mouse");
    __publicField(this, "mouseTail", null);
    __publicField(this, "tailPositions", []);
    __publicField(this, "emitter", mitt());
    __publicField(this, "nextUserInteractionEvent");
    __publicField(this, "legacy_missingNodeRetryMap", {});
    // The replayer uses the cache to speed up replay and scrubbing.
    __publicField(this, "cache", createCache());
    __publicField(this, "imageMap", /* @__PURE__ */ new Map());
    __publicField(this, "canvasEventMap", /* @__PURE__ */ new Map());
    __publicField(this, "mirror", createMirror$2());
    // Used to track StyleSheetObjects adopted on multiple document hosts.
    __publicField(this, "styleMirror", new StyleSheetMirror());
    // Used to track video & audio elements, and keep them in sync with general playback.
    __publicField(this, "mediaManager");
    __publicField(this, "firstFullSnapshot", null);
    __publicField(this, "newDocumentQueue", []);
    __publicField(this, "mousePos", null);
    __publicField(this, "touchActive", null);
    __publicField(this, "lastMouseDownEvent", null);
    // Keep the rootNode of the last hovered element. So  when hovering a new element, we can remove the last hovered element's :hover style.
    __publicField(this, "lastHoveredRootNode");
    // In the fast-forward mode, only the last selection data needs to be applied.
    __publicField(this, "lastSelectionData", null);
    // In the fast-forward mode using VirtualDom optimization, all stylesheetRule, and styleDeclaration events on constructed StyleSheets will be delayed to get applied until the flush stage.
    __publicField(this, "constructedStyleMutations", []);
    // Similar to the reason for constructedStyleMutations.
    __publicField(this, "adoptedStyleSheets", []);
    __publicField(this, "handleResize", (dimension) => {
      this.iframe.style.display = "inherit";
      for (const el of [this.mouseTail, this.iframe]) {
        if (!el) {
          continue;
        }
        el.setAttribute("width", String(dimension.width));
        el.setAttribute("height", String(dimension.height));
      }
    });
    __publicField(this, "applyEventsSynchronously", (events) => {
      for (const event of events) {
        switch (event.type) {
          case EventType.DomContentLoaded:
          case EventType.Load:
          case EventType.Custom:
            continue;
          case EventType.FullSnapshot:
          case EventType.Meta:
          case EventType.Plugin:
          case EventType.IncrementalSnapshot:
            break;
        }
        const castFn = this.getCastFn(event, true);
        castFn();
      }
    });
    __publicField(this, "getCastFn", (event, isSync = false) => {
      let castFn;
      switch (event.type) {
        case EventType.DomContentLoaded:
        case EventType.Load:
          break;
        case EventType.Custom:
          castFn = () => {
            this.emitter.emit(ReplayerEvents.CustomEvent, event);
          };
          break;
        case EventType.Meta:
          castFn = () => this.emitter.emit(ReplayerEvents.Resize, {
            width: event.data.width,
            height: event.data.height
          });
          break;
        case EventType.FullSnapshot:
          castFn = () => {
            var _a2;
            if (this.firstFullSnapshot) {
              if (this.firstFullSnapshot === event) {
                this.firstFullSnapshot = true;
                return;
              }
            } else {
              this.firstFullSnapshot = true;
            }
            this.mediaManager.reset();
            this.styleMirror.reset();
            this.rebuildFullSnapshot(event, isSync);
            (_a2 = this.iframe.contentWindow) == null ? void 0 : _a2.scrollTo(event.data.initialOffset);
          };
          break;
        case EventType.IncrementalSnapshot:
          castFn = () => {
            this.applyIncremental(event, isSync);
            if (isSync) {
              return;
            }
            if (event === this.nextUserInteractionEvent) {
              this.nextUserInteractionEvent = null;
              this.backToNormal();
            }
            if (this.config.skipInactive && !this.nextUserInteractionEvent) {
              for (const _event of this.service.state.context.events) {
                if (_event.timestamp <= event.timestamp) {
                  continue;
                }
                if (this.isUserInteraction(_event)) {
                  if (
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    _event.delay - event.delay > this.config.inactivePeriodThreshold * this.speedService.state.context.timer.speed
                  ) {
                    this.nextUserInteractionEvent = _event;
                  }
                  break;
                }
              }
              if (this.nextUserInteractionEvent) {
                const skipTime = (
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  this.nextUserInteractionEvent.delay - event.delay
                );
                const payload = {
                  speed: Math.min(
                    Math.round(skipTime / SKIP_TIME_INTERVAL),
                    this.config.maxSpeed
                  )
                };
                this.speedService.send({ type: "FAST_FORWARD", payload });
                this.emitter.emit(ReplayerEvents.SkipStart, payload);
              }
            }
          };
          break;
      }
      const wrappedCastFn = () => {
        if (castFn) {
          castFn();
        }
        for (const plugin of this.config.plugins || []) {
          if (plugin.handler)
            plugin.handler(event, isSync, { replayer: this });
        }
        this.service.send({ type: "CAST_EVENT", payload: { event } });
        const last_index = this.service.state.context.events.length - 1;
        if (!this.config.liveMode && event === this.service.state.context.events[last_index]) {
          const finish = () => {
            if (last_index < this.service.state.context.events.length - 1) {
              return;
            }
            this.backToNormal();
            this.service.send("END");
            this.emitter.emit(ReplayerEvents.Finish);
          };
          let finish_buffer = 50;
          if (event.type === EventType.IncrementalSnapshot && event.data.source === IncrementalSource.MouseMove && event.data.positions.length) {
            finish_buffer += Math.max(0, -event.data.positions[0].timeOffset);
          }
          setTimeout(finish, finish_buffer);
        }
        this.emitter.emit(ReplayerEvents.EventCast, event);
      };
      return wrappedCastFn;
    });
    if (!(config == null ? void 0 : config.liveMode) && events.length < 2) {
      throw new Error("Replayer need at least 2 events.");
    }
    const defaultConfig = {
      speed: 1,
      maxSpeed: 360,
      root: document.body,
      loadTimeout: 0,
      skipInactive: false,
      inactivePeriodThreshold: 10 * 1e3,
      showWarning: true,
      showDebug: false,
      blockClass: "rr-block",
      liveMode: false,
      insertStyleRules: [],
      triggerFocus: true,
      UNSAFE_replayCanvas: false,
      pauseAnimation: true,
      mouseTail: defaultMouseTailConfig,
      useVirtualDom: true,
      // Virtual-dom optimization is enabled by default.
      logger: console
    };
    this.config = Object.assign({}, defaultConfig, config);
    this.handleResize = this.handleResize.bind(this);
    this.getCastFn = this.getCastFn.bind(this);
    this.applyEventsSynchronously = this.applyEventsSynchronously.bind(this);
    this.emitter.on(ReplayerEvents.Resize, this.handleResize);
    this.setupDom();
    for (const plugin of this.config.plugins || []) {
      if (plugin.getMirror)
        plugin.getMirror({ nodeMirror: this.mirror });
    }
    this.emitter.on(ReplayerEvents.Flush, () => {
      if (this.usingVirtualDom) {
        const replayerHandler = {
          mirror: this.mirror,
          applyCanvas: (canvasEvent, canvasMutationData2, target) => {
            void canvasMutation({
              event: canvasEvent,
              mutation: canvasMutationData2,
              target,
              imageMap: this.imageMap,
              canvasEventMap: this.canvasEventMap,
              errorHandler: this.warnCanvasMutationFailed.bind(this)
            });
          },
          applyInput: this.applyInput.bind(this),
          applyScroll: this.applyScroll.bind(this),
          applyStyleSheetMutation: (data, styleSheet) => {
            if (data.source === IncrementalSource.StyleSheetRule)
              this.applyStyleSheetRule(data, styleSheet);
            else if (data.source === IncrementalSource.StyleDeclaration)
              this.applyStyleDeclaration(data, styleSheet);
          },
          afterAppend: (node, id) => {
            for (const plugin of this.config.plugins || []) {
              if (plugin.onBuild)
                plugin.onBuild(node, { id, replayer: this });
            }
          }
        };
        if (this.iframe.contentDocument)
          try {
            diff(
              this.iframe.contentDocument,
              this.virtualDom,
              replayerHandler,
              this.virtualDom.mirror
            );
          } catch (e2) {
            console.warn(e2);
          }
        this.virtualDom.destroyTree();
        this.usingVirtualDom = false;
        if (Object.keys(this.legacy_missingNodeRetryMap).length) {
          for (const key in this.legacy_missingNodeRetryMap) {
            try {
              const value = this.legacy_missingNodeRetryMap[key];
              const realNode = createOrGetNode(
                value.node,
                this.mirror,
                this.virtualDom.mirror
              );
              diff(
                realNode,
                value.node,
                replayerHandler,
                this.virtualDom.mirror
              );
              value.node = realNode;
            } catch (error) {
              this.warn(error);
            }
          }
        }
        this.constructedStyleMutations.forEach((data) => {
          this.applyStyleSheetMutation(data);
        });
        this.constructedStyleMutations = [];
        this.adoptedStyleSheets.forEach((data) => {
          this.applyAdoptedStyleSheet(data);
        });
        this.adoptedStyleSheets = [];
      }
      if (this.mousePos) {
        this.moveAndHover(
          this.mousePos.x,
          this.mousePos.y,
          this.mousePos.id,
          true,
          this.mousePos.debugData
        );
        this.mousePos = null;
      }
      if (this.touchActive === true) {
        this.mouse.classList.add("touch-active");
      } else if (this.touchActive === false) {
        this.mouse.classList.remove("touch-active");
      }
      this.touchActive = null;
      if (this.lastMouseDownEvent) {
        const [target, event] = this.lastMouseDownEvent;
        target.dispatchEvent(event);
      }
      this.lastMouseDownEvent = null;
      if (this.lastSelectionData) {
        this.applySelection(this.lastSelectionData);
        this.lastSelectionData = null;
      }
    });
    this.emitter.on(ReplayerEvents.PlayBack, () => {
      this.firstFullSnapshot = null;
      this.mirror.reset();
      this.styleMirror.reset();
      this.mediaManager.reset();
    });
    const timer = new Timer([], {
      speed: this.config.speed
    });
    this.service = createPlayerService(
      {
        events: events.map((e2) => {
          if (config && config.unpackFn) {
            return config.unpackFn(e2);
          }
          return e2;
        }).sort((a1, a2) => a1.timestamp - a2.timestamp),
        timer,
        timeOffset: 0,
        baselineTime: 0,
        lastPlayedEvent: null
      },
      {
        getCastFn: this.getCastFn,
        applyEventsSynchronously: this.applyEventsSynchronously,
        emitter: this.emitter
      }
    );
    this.service.start();
    this.service.subscribe((state) => {
      this.emitter.emit(ReplayerEvents.StateChange, {
        player: state
      });
    });
    this.speedService = createSpeedService({
      normalSpeed: -1,
      timer
    });
    this.speedService.start();
    this.speedService.subscribe((state) => {
      this.emitter.emit(ReplayerEvents.StateChange, {
        speed: state
      });
    });
    this.mediaManager = new MediaManager({
      warn: this.warn.bind(this),
      service: this.service,
      speedService: this.speedService,
      emitter: this.emitter,
      getCurrentTime: this.getCurrentTime.bind(this)
    });
    const firstMeta = this.service.state.context.events.find(
      (e2) => e2.type === EventType.Meta
    );
    const firstFullsnapshot = this.service.state.context.events.find(
      (e2) => e2.type === EventType.FullSnapshot
    );
    if (firstMeta) {
      const { width, height } = firstMeta.data;
      setTimeout(() => {
        this.emitter.emit(ReplayerEvents.Resize, {
          width,
          height
        });
      }, 0);
    }
    if (firstFullsnapshot) {
      setTimeout(() => {
        var _a2;
        if (this.firstFullSnapshot) {
          return;
        }
        this.firstFullSnapshot = firstFullsnapshot;
        this.rebuildFullSnapshot(
          firstFullsnapshot
        );
        (_a2 = this.iframe.contentWindow) == null ? void 0 : _a2.scrollTo(
          firstFullsnapshot.data.initialOffset
        );
      }, 1);
    }
    if (this.service.state.context.events.find(indicatesTouchDevice)) {
      this.mouse.classList.add("touch-device");
    }
  }
  get timer() {
    return this.service.state.context.timer;
  }
  on(event, handler) {
    this.emitter.on(event, handler);
    return this;
  }
  off(event, handler) {
    this.emitter.off(event, handler);
    return this;
  }
  setConfig(config) {
    Object.keys(config).forEach((key) => {
      config[key];
      this.config[key] = config[key];
    });
    if (!this.config.skipInactive) {
      this.backToNormal();
    }
    if (typeof config.speed !== "undefined") {
      this.speedService.send({
        type: "SET_SPEED",
        payload: {
          speed: config.speed
        }
      });
    }
    if (typeof config.mouseTail !== "undefined") {
      if (config.mouseTail === false) {
        if (this.mouseTail) {
          this.mouseTail.style.display = "none";
        }
      } else {
        if (!this.mouseTail) {
          this.mouseTail = document.createElement("canvas");
          this.mouseTail.width = Number.parseFloat(this.iframe.width);
          this.mouseTail.height = Number.parseFloat(this.iframe.height);
          this.mouseTail.classList.add("replayer-mouse-tail");
          this.wrapper.insertBefore(this.mouseTail, this.iframe);
        }
        this.mouseTail.style.display = "inherit";
      }
    }
  }
  getMetaData() {
    const firstEvent = this.service.state.context.events[0];
    const lastEvent = this.service.state.context.events[this.service.state.context.events.length - 1];
    return {
      startTime: firstEvent.timestamp,
      endTime: lastEvent.timestamp,
      totalTime: lastEvent.timestamp - firstEvent.timestamp
    };
  }
  /**
   * Get the actual time offset the player is at now compared to the first event.
   */
  getCurrentTime() {
    return this.timer.timeOffset + this.getTimeOffset();
  }
  /**
   * Get the time offset the player is at now compared to the first event, but without regard for the timer.
   */
  getTimeOffset() {
    const { baselineTime, events } = this.service.state.context;
    return baselineTime - events[0].timestamp;
  }
  getMirror() {
    return this.mirror;
  }
  /**
   * This API was designed to be used as play at any time offset.
   * Since we minimized the data collected from recorder, we do not
   * have the ability of undo an event.
   * So the implementation of play at any time offset will always iterate
   * all of the events, cast event before the offset synchronously
   * and cast event after the offset asynchronously with timer.
   * @param timeOffset - number
   */
  play(timeOffset = 0) {
    var _a2, _b;
    if (this.service.state.matches("paused")) {
      this.service.send({ type: "PLAY", payload: { timeOffset } });
    } else {
      this.service.send({ type: "PAUSE" });
      this.service.send({ type: "PLAY", payload: { timeOffset } });
    }
    (_b = (_a2 = this.iframe.contentDocument) == null ? void 0 : _a2.getElementsByTagName("html")[0]) == null ? void 0 : _b.classList.remove("rrweb-paused");
    this.emitter.emit(ReplayerEvents.Start);
  }
  pause(timeOffset) {
    var _a2, _b;
    if (timeOffset === void 0 && this.service.state.matches("playing")) {
      this.service.send({ type: "PAUSE" });
    }
    if (typeof timeOffset === "number") {
      this.play(timeOffset);
      this.service.send({ type: "PAUSE" });
    }
    (_b = (_a2 = this.iframe.contentDocument) == null ? void 0 : _a2.getElementsByTagName("html")[0]) == null ? void 0 : _b.classList.add("rrweb-paused");
    this.emitter.emit(ReplayerEvents.Pause);
  }
  resume(timeOffset = 0) {
    this.warn(
      `The 'resume' was deprecated in 1.0. Please use 'play' method which has the same interface.`
    );
    this.play(timeOffset);
    this.emitter.emit(ReplayerEvents.Resume);
  }
  /**
   * Totally destroy this replayer and please be careful that this operation is irreversible.
   * Memory occupation can be released by removing all references to this replayer.
   */
  destroy() {
    this.pause();
    this.mirror.reset();
    this.styleMirror.reset();
    this.mediaManager.reset();
    this.config.root.removeChild(this.wrapper);
    this.emitter.emit(ReplayerEvents.Destroy);
  }
  startLive(baselineTime) {
    this.service.send({ type: "TO_LIVE", payload: { baselineTime } });
  }
  addEvent(rawEvent) {
    const event = this.config.unpackFn ? this.config.unpackFn(rawEvent) : rawEvent;
    if (indicatesTouchDevice(event)) {
      this.mouse.classList.add("touch-device");
    }
    void Promise.resolve().then(
      () => this.service.send({ type: "ADD_EVENT", payload: { event } })
    );
  }
  enableInteract() {
    this.iframe.setAttribute("scrolling", "auto");
    this.iframe.style.pointerEvents = "auto";
  }
  disableInteract() {
    this.iframe.setAttribute("scrolling", "no");
    this.iframe.style.pointerEvents = "none";
  }
  /**
   * Empties the replayer's cache and reclaims memory.
   * The replayer will use this cache to speed up the playback.
   */
  resetCache() {
    this.cache = createCache();
  }
  setupDom() {
    this.wrapper = document.createElement("div");
    this.wrapper.classList.add("replayer-wrapper");
    this.config.root.appendChild(this.wrapper);
    this.mouse = document.createElement("div");
    this.mouse.classList.add("replayer-mouse");
    this.wrapper.appendChild(this.mouse);
    if (this.config.mouseTail !== false) {
      this.mouseTail = document.createElement("canvas");
      this.mouseTail.classList.add("replayer-mouse-tail");
      this.mouseTail.style.display = "inherit";
      this.wrapper.appendChild(this.mouseTail);
    }
    this.iframe = document.createElement("iframe");
    const attributes2 = ["allow-same-origin"];
    if (this.config.UNSAFE_replayCanvas) {
      attributes2.push("allow-scripts");
    }
    this.iframe.style.display = "none";
    this.iframe.setAttribute("sandbox", attributes2.join(" "));
    this.disableInteract();
    this.wrapper.appendChild(this.iframe);
    if (this.iframe.contentWindow && this.iframe.contentDocument) {
      polyfill(
        this.iframe.contentWindow,
        this.iframe.contentDocument
      );
      polyfill$1(this.iframe.contentWindow);
    }
  }
  rebuildFullSnapshot(event, isSync = false) {
    if (!this.iframe.contentDocument) {
      return this.warn("Looks like your replayer has been destroyed.");
    }
    if (Object.keys(this.legacy_missingNodeRetryMap).length) {
      this.warn(
        "Found unresolved missing node map",
        this.legacy_missingNodeRetryMap
      );
    }
    this.legacy_missingNodeRetryMap = {};
    const collected = [];
    const afterAppend = (builtNode, id) => {
      this.collectIframeAndAttachDocument(collected, builtNode);
      if (this.mediaManager.isSupportedMediaElement(builtNode)) {
        const { events } = this.service.state.context;
        this.mediaManager.addMediaElements(
          builtNode,
          event.timestamp - events[0].timestamp,
          this.mirror
        );
      }
      for (const plugin of this.config.plugins || []) {
        if (plugin.onBuild)
          plugin.onBuild(builtNode, {
            id,
            replayer: this
          });
      }
    };
    if (this.usingVirtualDom) {
      this.virtualDom.destroyTree();
      this.usingVirtualDom = false;
    }
    this.mirror.reset();
    rebuild(event.data.node, {
      doc: this.iframe.contentDocument,
      afterAppend,
      cache: this.cache,
      mirror: this.mirror
    });
    afterAppend(this.iframe.contentDocument, event.data.node.id);
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue
      );
    }
    const { documentElement, head } = this.iframe.contentDocument;
    this.insertStyleRules(documentElement, head);
    if (!this.service.state.matches("playing")) {
      this.iframe.contentDocument.getElementsByTagName("html")[0].classList.add("rrweb-paused");
    }
    this.emitter.emit(ReplayerEvents.FullsnapshotRebuilded, event);
    if (!isSync) {
      this.waitForStylesheetLoad();
    }
    if (this.config.UNSAFE_replayCanvas) {
      void this.preloadAllImages();
    }
  }
  insertStyleRules(documentElement, head) {
    var _a2;
    const injectStylesRules = rules(
      this.config.blockClass
    ).concat(this.config.insertStyleRules);
    if (this.config.pauseAnimation) {
      injectStylesRules.push(
        "html.rrweb-paused *, html.rrweb-paused *:before, html.rrweb-paused *:after { animation-play-state: paused !important; }"
      );
    }
    if (this.usingVirtualDom) {
      const styleEl = this.virtualDom.createElement("style");
      this.virtualDom.mirror.add(
        styleEl,
        getDefaultSN(styleEl, this.virtualDom.unserializedId)
      );
      documentElement.insertBefore(styleEl, head);
      styleEl.rules.push({
        source: IncrementalSource.StyleSheetRule,
        adds: injectStylesRules.map((cssText, index) => ({
          rule: cssText,
          index
        }))
      });
    } else {
      const styleEl = document.createElement("style");
      documentElement.insertBefore(
        styleEl,
        head
      );
      for (let idx = 0; idx < injectStylesRules.length; idx++) {
        (_a2 = styleEl.sheet) == null ? void 0 : _a2.insertRule(injectStylesRules[idx], idx);
      }
    }
  }
  attachDocumentToIframe(mutation, iframeEl) {
    const mirror2 = this.usingVirtualDom ? this.virtualDom.mirror : this.mirror;
    const collected = [];
    const afterAppend = (builtNode, id) => {
      this.collectIframeAndAttachDocument(collected, builtNode);
      const sn = mirror2.getMeta(builtNode);
      if ((sn == null ? void 0 : sn.type) === NodeType$2.Element && (sn == null ? void 0 : sn.tagName.toUpperCase()) === "HTML") {
        const { documentElement, head } = iframeEl.contentDocument;
        this.insertStyleRules(
          documentElement,
          head
        );
      }
      if (this.usingVirtualDom)
        return;
      for (const plugin of this.config.plugins || []) {
        if (plugin.onBuild)
          plugin.onBuild(builtNode, {
            id,
            replayer: this
          });
      }
    };
    buildNodeWithSN(mutation.node, {
      doc: iframeEl.contentDocument,
      mirror: mirror2,
      hackCss: true,
      skipChild: false,
      afterAppend,
      cache: this.cache
    });
    afterAppend(iframeEl.contentDocument, mutation.node.id);
    for (const { mutationInQueue, builtNode } of collected) {
      this.attachDocumentToIframe(mutationInQueue, builtNode);
      this.newDocumentQueue = this.newDocumentQueue.filter(
        (m) => m !== mutationInQueue
      );
    }
  }
  collectIframeAndAttachDocument(collected, builtNode) {
    if (isSerializedIframe(builtNode, this.mirror)) {
      const mutationInQueue = this.newDocumentQueue.find(
        (m) => m.parentId === this.mirror.getId(builtNode)
      );
      if (mutationInQueue) {
        collected.push({
          mutationInQueue,
          builtNode
        });
      }
    }
  }
  /**
   * pause when loading style sheet, resume when loaded all timeout exceed
   */
  waitForStylesheetLoad() {
    var _a2;
    const head = (_a2 = this.iframe.contentDocument) == null ? void 0 : _a2.head;
    if (head) {
      const unloadSheets = /* @__PURE__ */ new Set();
      let timer;
      let beforeLoadState = this.service.state;
      const stateHandler = () => {
        beforeLoadState = this.service.state;
      };
      this.emitter.on(ReplayerEvents.Start, stateHandler);
      this.emitter.on(ReplayerEvents.Pause, stateHandler);
      const unsubscribe = () => {
        this.emitter.off(ReplayerEvents.Start, stateHandler);
        this.emitter.off(ReplayerEvents.Pause, stateHandler);
      };
      head.querySelectorAll('link[rel="stylesheet"]').forEach((css) => {
        if (!css.sheet) {
          unloadSheets.add(css);
          css.addEventListener("load", () => {
            unloadSheets.delete(css);
            if (unloadSheets.size === 0 && timer !== -1) {
              if (beforeLoadState.matches("playing")) {
                this.play(this.getCurrentTime());
              }
              this.emitter.emit(ReplayerEvents.LoadStylesheetEnd);
              if (timer) {
                clearTimeout(timer);
              }
              unsubscribe();
            }
          });
        }
      });
      if (unloadSheets.size > 0) {
        this.service.send({ type: "PAUSE" });
        this.emitter.emit(ReplayerEvents.LoadStylesheetStart);
        timer = setTimeout(() => {
          if (beforeLoadState.matches("playing")) {
            this.play(this.getCurrentTime());
          }
          timer = -1;
          unsubscribe();
        }, this.config.loadTimeout);
      }
    }
  }
  /**
   * pause when there are some canvas drawImage args need to be loaded
   */
  async preloadAllImages() {
    const promises = [];
    for (const event of this.service.state.context.events) {
      if (event.type === EventType.IncrementalSnapshot && event.data.source === IncrementalSource.CanvasMutation) {
        promises.push(
          this.deserializeAndPreloadCanvasEvents(event.data, event)
        );
        const commands = "commands" in event.data ? event.data.commands : [event.data];
        commands.forEach((c2) => {
          this.preloadImages(c2, event);
        });
      }
    }
    return Promise.all(promises);
  }
  preloadImages(data, event) {
    if (data.property === "drawImage" && typeof data.args[0] === "string" && !this.imageMap.has(event)) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const imgd = ctx == null ? void 0 : ctx.createImageData(canvas.width, canvas.height);
      ctx == null ? void 0 : ctx.putImageData(imgd, 0, 0);
    }
  }
  async deserializeAndPreloadCanvasEvents(data, event) {
    if (!this.canvasEventMap.has(event)) {
      const status = {
        isUnchanged: true
      };
      if ("commands" in data) {
        const commands = await Promise.all(
          data.commands.map(async (c2) => {
            const args = await Promise.all(
              c2.args.map(deserializeArg(this.imageMap, null, status))
            );
            return { ...c2, args };
          })
        );
        if (status.isUnchanged === false)
          this.canvasEventMap.set(event, { ...data, commands });
      } else {
        const args = await Promise.all(
          data.args.map(deserializeArg(this.imageMap, null, status))
        );
        if (status.isUnchanged === false)
          this.canvasEventMap.set(event, { ...data, args });
      }
    }
  }
  applyIncremental(e2, isSync) {
    var _a2, _b, _c;
    const { data: d } = e2;
    switch (d.source) {
      case IncrementalSource.Mutation: {
        try {
          this.applyMutation(d, isSync);
        } catch (error) {
          this.warn(`Exception in mutation ${error.message || error}`, d);
        }
        break;
      }
      case IncrementalSource.Drag:
      case IncrementalSource.TouchMove:
      case IncrementalSource.MouseMove:
        if (isSync) {
          const lastPosition = d.positions[d.positions.length - 1];
          this.mousePos = {
            x: lastPosition.x,
            y: lastPosition.y,
            id: lastPosition.id,
            debugData: d
          };
        } else {
          d.positions.forEach((p) => {
            const action = {
              doAction: () => {
                this.moveAndHover(p.x, p.y, p.id, isSync, d);
              },
              delay: p.timeOffset + e2.timestamp - this.service.state.context.baselineTime
            };
            this.timer.addAction(action);
          });
          this.timer.addAction({
            doAction() {
            },
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            delay: e2.delay - ((_a2 = d.positions[0]) == null ? void 0 : _a2.timeOffset)
          });
        }
        break;
      case IncrementalSource.MouseInteraction: {
        if (d.id === -1) {
          break;
        }
        const event = new Event(toLowerCase(MouseInteractions[d.type]));
        const target = this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        this.emitter.emit(ReplayerEvents.MouseInteraction, {
          type: d.type,
          target
        });
        const { triggerFocus } = this.config;
        switch (d.type) {
          case MouseInteractions.Blur:
            if ("blur" in target) {
              target.blur();
            }
            break;
          case MouseInteractions.Focus:
            if (triggerFocus && target.focus) {
              target.focus({
                preventScroll: true
              });
            }
            break;
          case MouseInteractions.Click:
          case MouseInteractions.TouchStart:
          case MouseInteractions.TouchEnd:
          case MouseInteractions.MouseDown:
          case MouseInteractions.MouseUp:
            if (isSync) {
              if (d.type === MouseInteractions.TouchStart) {
                this.touchActive = true;
              } else if (d.type === MouseInteractions.TouchEnd) {
                this.touchActive = false;
              }
              if (d.type === MouseInteractions.MouseDown) {
                this.lastMouseDownEvent = [target, event];
              } else if (d.type === MouseInteractions.MouseUp) {
                this.lastMouseDownEvent = null;
              }
              this.mousePos = {
                x: d.x || 0,
                y: d.y || 0,
                id: d.id,
                debugData: d
              };
            } else {
              if (d.type === MouseInteractions.TouchStart) {
                this.tailPositions.length = 0;
              }
              this.moveAndHover(d.x || 0, d.y || 0, d.id, isSync, d);
              if (d.type === MouseInteractions.Click) {
                this.mouse.classList.remove("active");
                void this.mouse.offsetWidth;
                this.mouse.classList.add("active");
              } else if (d.type === MouseInteractions.TouchStart) {
                void this.mouse.offsetWidth;
                this.mouse.classList.add("touch-active");
              } else if (d.type === MouseInteractions.TouchEnd) {
                this.mouse.classList.remove("touch-active");
              } else {
                target.dispatchEvent(event);
              }
            }
            break;
          case MouseInteractions.TouchCancel:
            if (isSync) {
              this.touchActive = false;
            } else {
              this.mouse.classList.remove("touch-active");
            }
            break;
          default:
            target.dispatchEvent(event);
        }
        break;
      }
      case IncrementalSource.Scroll: {
        if (d.id === -1) {
          break;
        }
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(d.id);
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          target.scrollData = d;
          break;
        }
        this.applyScroll(d, isSync);
        break;
      }
      case IncrementalSource.ViewportResize:
        this.emitter.emit(ReplayerEvents.Resize, {
          width: d.width,
          height: d.height
        });
        break;
      case IncrementalSource.Input: {
        if (d.id === -1) {
          break;
        }
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(d.id);
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          target.inputData = d;
          break;
        }
        this.applyInput(d);
        break;
      }
      case IncrementalSource.MediaInteraction: {
        const target = this.usingVirtualDom ? this.virtualDom.mirror.getNode(d.id) : this.mirror.getNode(d.id);
        if (!target) {
          return this.debugNodeNotFound(d, d.id);
        }
        const mediaEl = target;
        const { events } = this.service.state.context;
        this.mediaManager.mediaMutation({
          target: mediaEl,
          timeOffset: e2.timestamp - events[0].timestamp,
          mutation: d
        });
        break;
      }
      case IncrementalSource.StyleSheetRule:
      case IncrementalSource.StyleDeclaration: {
        if (this.usingVirtualDom) {
          if (d.styleId)
            this.constructedStyleMutations.push(d);
          else if (d.id)
            (_b = this.virtualDom.mirror.getNode(d.id)) == null ? void 0 : _b.rules.push(d);
        } else
          this.applyStyleSheetMutation(d);
        break;
      }
      case IncrementalSource.CanvasMutation: {
        if (!this.config.UNSAFE_replayCanvas) {
          return;
        }
        if (this.usingVirtualDom) {
          const target = this.virtualDom.mirror.getNode(
            d.id
          );
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          target.canvasMutations.push({
            event: e2,
            mutation: d
          });
        } else {
          const target = this.mirror.getNode(d.id);
          if (!target) {
            return this.debugNodeNotFound(d, d.id);
          }
          void canvasMutation({
            event: e2,
            mutation: d,
            target,
            imageMap: this.imageMap,
            canvasEventMap: this.canvasEventMap,
            errorHandler: this.warnCanvasMutationFailed.bind(this)
          });
        }
        break;
      }
      case IncrementalSource.Font: {
        try {
          const fontFace = new FontFace(
            d.family,
            d.buffer ? new Uint8Array(JSON.parse(d.fontSource)) : d.fontSource,
            d.descriptors
          );
          (_c = this.iframe.contentDocument) == null ? void 0 : _c.fonts.add(fontFace);
        } catch (error) {
          this.warn(error);
        }
        break;
      }
      case IncrementalSource.Selection: {
        if (isSync) {
          this.lastSelectionData = d;
          break;
        }
        this.applySelection(d);
        break;
      }
      case IncrementalSource.AdoptedStyleSheet: {
        if (this.usingVirtualDom)
          this.adoptedStyleSheets.push(d);
        else
          this.applyAdoptedStyleSheet(d);
        break;
      }
    }
  }
  /**
   * Apply the mutation to the virtual dom or the real dom.
   * @param d - The mutation data.
   * @param isSync - Whether the mutation should be applied synchronously (while fast-forwarding).
   */
  applyMutation(d, isSync) {
    if (this.config.useVirtualDom && !this.usingVirtualDom && isSync) {
      this.usingVirtualDom = true;
      buildFromDom(this.iframe.contentDocument, this.mirror, this.virtualDom);
      if (Object.keys(this.legacy_missingNodeRetryMap).length) {
        for (const key in this.legacy_missingNodeRetryMap) {
          try {
            const value = this.legacy_missingNodeRetryMap[key];
            const virtualNode = buildFromNode(
              value.node,
              this.virtualDom,
              this.mirror
            );
            if (virtualNode)
              value.node = virtualNode;
          } catch (error) {
            this.warn(error);
          }
        }
      }
    }
    const mirror2 = this.usingVirtualDom ? this.virtualDom.mirror : this.mirror;
    d.removes = d.removes.filter((mutation) => {
      if (!mirror2.getNode(mutation.id)) {
        this.warnNodeNotFound(d, mutation.id);
        return false;
      }
      return true;
    });
    d.removes.forEach((mutation) => {
      var _a2;
      const target = mirror2.getNode(mutation.id);
      if (!target) {
        return;
      }
      let parent = mirror2.getNode(
        mutation.parentId
      );
      if (!parent) {
        return this.warnNodeNotFound(d, mutation.parentId);
      }
      if (mutation.isShadow && hasShadowRoot(parent)) {
        parent = parent.shadowRoot;
      }
      mirror2.removeNodeFromMap(target);
      if (parent)
        try {
          parent.removeChild(target);
          if (this.usingVirtualDom && target.nodeName === "#text" && parent.nodeName === "STYLE" && ((_a2 = parent.rules) == null ? void 0 : _a2.length) > 0)
            parent.rules = [];
        } catch (error) {
          if (error instanceof DOMException) {
            this.warn(
              "parent could not remove child in mutation",
              parent,
              target,
              d
            );
          } else {
            throw error;
          }
        }
    });
    const legacy_missingNodeMap = {
      ...this.legacy_missingNodeRetryMap
    };
    const queue = [];
    const nextNotInDOM = (mutation) => {
      let next = null;
      if (mutation.nextId) {
        next = mirror2.getNode(mutation.nextId);
      }
      if (mutation.nextId !== null && mutation.nextId !== void 0 && mutation.nextId !== -1 && !next) {
        return true;
      }
      return false;
    };
    const appendNode = (mutation) => {
      var _a2, _b;
      if (!this.iframe.contentDocument) {
        return this.warn("Looks like your replayer has been destroyed.");
      }
      let parent = mirror2.getNode(
        mutation.parentId
      );
      if (!parent) {
        if (mutation.node.type === NodeType$2.Document) {
          return this.newDocumentQueue.push(mutation);
        }
        return queue.push(mutation);
      }
      if (mutation.node.isShadow) {
        if (!hasShadowRoot(parent)) {
          parent.attachShadow({ mode: "open" });
          parent = parent.shadowRoot;
        } else
          parent = parent.shadowRoot;
      }
      let previous = null;
      let next = null;
      if (mutation.previousId) {
        previous = mirror2.getNode(mutation.previousId);
      }
      if (mutation.nextId) {
        next = mirror2.getNode(mutation.nextId);
      }
      if (nextNotInDOM(mutation)) {
        return queue.push(mutation);
      }
      if (mutation.node.rootId && !mirror2.getNode(mutation.node.rootId)) {
        return;
      }
      const targetDoc = mutation.node.rootId ? mirror2.getNode(mutation.node.rootId) : this.usingVirtualDom ? this.virtualDom : this.iframe.contentDocument;
      if (isSerializedIframe(parent, mirror2)) {
        this.attachDocumentToIframe(
          mutation,
          parent
        );
        return;
      }
      const afterAppend = (node, id) => {
        if (this.usingVirtualDom)
          return;
        for (const plugin of this.config.plugins || []) {
          if (plugin.onBuild)
            plugin.onBuild(node, { id, replayer: this });
        }
      };
      const target = buildNodeWithSN(mutation.node, {
        doc: targetDoc,
        // can be Document or RRDocument
        mirror: mirror2,
        // can be this.mirror or virtualDom.mirror
        skipChild: true,
        hackCss: true,
        cache: this.cache,
        /**
         * caveat: `afterAppend` only gets called on child nodes of target
         * we have to call it again below when this target was added to the DOM
         */
        afterAppend
      });
      if (mutation.previousId === -1 || mutation.nextId === -1) {
        legacy_missingNodeMap[mutation.node.id] = {
          node: target,
          mutation
        };
        return;
      }
      const parentSn = mirror2.getMeta(parent);
      if (parentSn && parentSn.type === NodeType$2.Element && parentSn.tagName === "textarea" && mutation.node.type === NodeType$2.Text) {
        const childNodeArray = Array.isArray(parent.childNodes) ? parent.childNodes : Array.from(parent.childNodes);
        for (const c2 of childNodeArray) {
          if (c2.nodeType === parent.TEXT_NODE) {
            parent.removeChild(c2);
          }
        }
      } else if ((parentSn == null ? void 0 : parentSn.type) === NodeType$2.Document) {
        const parentDoc = parent;
        if (mutation.node.type === NodeType$2.DocumentType && ((_a2 = parentDoc.childNodes[0]) == null ? void 0 : _a2.nodeType) === Node.DOCUMENT_TYPE_NODE)
          parentDoc.removeChild(parentDoc.childNodes[0]);
        if (target.nodeName === "HTML" && parentDoc.documentElement)
          parentDoc.removeChild(
            parentDoc.documentElement
          );
      }
      if (previous && previous.nextSibling && previous.nextSibling.parentNode) {
        parent.insertBefore(
          target,
          previous.nextSibling
        );
      } else if (next && next.parentNode) {
        parent.contains(next) ? parent.insertBefore(target, next) : parent.insertBefore(target, null);
      } else {
        parent.appendChild(target);
      }
      afterAppend(target, mutation.node.id);
      if (this.usingVirtualDom && target.nodeName === "#text" && parent.nodeName === "STYLE" && ((_b = parent.rules) == null ? void 0 : _b.length) > 0)
        parent.rules = [];
      if (isSerializedIframe(target, this.mirror)) {
        const targetId = this.mirror.getId(target);
        const mutationInQueue = this.newDocumentQueue.find(
          (m) => m.parentId === targetId
        );
        if (mutationInQueue) {
          this.attachDocumentToIframe(
            mutationInQueue,
            target
          );
          this.newDocumentQueue = this.newDocumentQueue.filter(
            (m) => m !== mutationInQueue
          );
        }
      }
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(
          legacy_missingNodeMap,
          parent,
          target,
          mutation
        );
      }
    };
    d.adds.forEach((mutation) => {
      appendNode(mutation);
    });
    const startTime = Date.now();
    while (queue.length) {
      const resolveTrees = queueToResolveTrees(queue);
      queue.length = 0;
      if (Date.now() - startTime > 500) {
        this.warn(
          "Timeout in the loop, please check the resolve tree data:",
          resolveTrees
        );
        break;
      }
      for (const tree of resolveTrees) {
        const parent = mirror2.getNode(tree.value.parentId);
        if (!parent) {
          this.debug(
            "Drop resolve tree since there is no parent for the root node.",
            tree
          );
        } else {
          iterateResolveTree(tree, (mutation) => {
            appendNode(mutation);
          });
        }
      }
    }
    if (Object.keys(legacy_missingNodeMap).length) {
      Object.assign(this.legacy_missingNodeRetryMap, legacy_missingNodeMap);
    }
    uniqueTextMutations(d.texts).forEach((mutation) => {
      var _a2;
      const target = mirror2.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r2) => r2.id === mutation.id)) {
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      target.textContent = mutation.value;
      if (this.usingVirtualDom) {
        const parent = target.parentNode;
        if (((_a2 = parent == null ? void 0 : parent.rules) == null ? void 0 : _a2.length) > 0)
          parent.rules = [];
      }
    });
    d.attributes.forEach((mutation) => {
      var _a2;
      const target = mirror2.getNode(mutation.id);
      if (!target) {
        if (d.removes.find((r2) => r2.id === mutation.id)) {
          return;
        }
        return this.warnNodeNotFound(d, mutation.id);
      }
      for (const attributeName in mutation.attributes) {
        if (typeof attributeName === "string") {
          const value = mutation.attributes[attributeName];
          if (value === null) {
            target.removeAttribute(attributeName);
          } else if (typeof value === "string") {
            try {
              if (attributeName === "_cssText" && (target.nodeName === "LINK" || target.nodeName === "STYLE")) {
                try {
                  const newSn = mirror2.getMeta(
                    target
                  );
                  Object.assign(
                    newSn.attributes,
                    mutation.attributes
                  );
                  const newNode = buildNodeWithSN(newSn, {
                    doc: target.ownerDocument,
                    // can be Document or RRDocument
                    mirror: mirror2,
                    skipChild: true,
                    hackCss: true,
                    cache: this.cache
                  });
                  const siblingNode = target.nextSibling;
                  const parentNode = target.parentNode;
                  if (newNode && parentNode) {
                    parentNode.removeChild(target);
                    parentNode.insertBefore(
                      newNode,
                      siblingNode
                    );
                    mirror2.replace(mutation.id, newNode);
                    break;
                  }
                } catch (e2) {
                }
              }
              if (attributeName === "value" && target.nodeName === "TEXTAREA") {
                const textarea = target;
                textarea.childNodes.forEach(
                  (c2) => textarea.removeChild(c2)
                );
                const tn = (_a2 = target.ownerDocument) == null ? void 0 : _a2.createTextNode(value);
                if (tn) {
                  textarea.appendChild(tn);
                }
              } else {
                target.setAttribute(
                  attributeName,
                  value
                );
              }
            } catch (error) {
              this.warn(
                "An error occurred may due to the checkout feature.",
                error
              );
            }
          } else if (attributeName === "style") {
            const styleValues = value;
            const targetEl = target;
            for (const s2 in styleValues) {
              if (styleValues[s2] === false) {
                targetEl.style.removeProperty(s2);
              } else if (styleValues[s2] instanceof Array) {
                const svp = styleValues[s2];
                targetEl.style.setProperty(s2, svp[0], svp[1]);
              } else {
                const svs = styleValues[s2];
                targetEl.style.setProperty(s2, svs);
              }
            }
          }
        }
      }
    });
  }
  /**
   * Apply the scroll data on real elements.
   * If the replayer is in sync mode, smooth scroll behavior should be disabled.
   * @param d - the scroll data
   * @param isSync - whether the replayer is in sync mode(fast-forward)
   */
  applyScroll(d, isSync) {
    var _a2, _b;
    const target = this.mirror.getNode(d.id);
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    const sn = this.mirror.getMeta(target);
    if (target === this.iframe.contentDocument) {
      (_a2 = this.iframe.contentWindow) == null ? void 0 : _a2.scrollTo({
        top: d.y,
        left: d.x,
        behavior: isSync ? "auto" : "smooth"
      });
    } else if ((sn == null ? void 0 : sn.type) === NodeType$2.Document) {
      (_b = target.defaultView) == null ? void 0 : _b.scrollTo({
        top: d.y,
        left: d.x,
        behavior: isSync ? "auto" : "smooth"
      });
    } else {
      try {
        target.scrollTo({
          top: d.y,
          left: d.x,
          behavior: isSync ? "auto" : "smooth"
        });
      } catch (error) {
      }
    }
  }
  applyInput(d) {
    const target = this.mirror.getNode(d.id);
    if (!target) {
      return this.debugNodeNotFound(d, d.id);
    }
    try {
      target.checked = d.isChecked;
      target.value = d.text;
    } catch (error) {
    }
  }
  applySelection(d) {
    try {
      const selectionSet = /* @__PURE__ */ new Set();
      const ranges = d.ranges.map(({ start, startOffset, end, endOffset }) => {
        const startContainer = this.mirror.getNode(start);
        const endContainer = this.mirror.getNode(end);
        if (!startContainer || !endContainer)
          return;
        const result = new Range();
        result.setStart(startContainer, startOffset);
        result.setEnd(endContainer, endOffset);
        const doc = startContainer.ownerDocument;
        const selection = doc == null ? void 0 : doc.getSelection();
        selection && selectionSet.add(selection);
        return {
          range: result,
          selection
        };
      });
      selectionSet.forEach((s2) => s2.removeAllRanges());
      ranges.forEach((r2) => {
        var _a2;
        return r2 && ((_a2 = r2.selection) == null ? void 0 : _a2.addRange(r2.range));
      });
    } catch (error) {
    }
  }
  applyStyleSheetMutation(data) {
    var _a2;
    let styleSheet = null;
    if (data.styleId)
      styleSheet = this.styleMirror.getStyle(data.styleId);
    else if (data.id)
      styleSheet = ((_a2 = this.mirror.getNode(data.id)) == null ? void 0 : _a2.sheet) || null;
    if (!styleSheet)
      return;
    if (data.source === IncrementalSource.StyleSheetRule)
      this.applyStyleSheetRule(data, styleSheet);
    else if (data.source === IncrementalSource.StyleDeclaration)
      this.applyStyleDeclaration(data, styleSheet);
  }
  applyStyleSheetRule(data, styleSheet) {
    var _a2, _b, _c, _d;
    (_a2 = data.adds) == null ? void 0 : _a2.forEach(({ rule, index: nestedIndex }) => {
      try {
        if (Array.isArray(nestedIndex)) {
          const { positions, index } = getPositionsAndIndex(nestedIndex);
          const nestedRule = getNestedRule(styleSheet.cssRules, positions);
          nestedRule.insertRule(rule, index);
        } else {
          const index = nestedIndex === void 0 ? void 0 : Math.min(nestedIndex, styleSheet.cssRules.length);
          styleSheet == null ? void 0 : styleSheet.insertRule(rule, index);
        }
      } catch (e2) {
      }
    });
    (_b = data.removes) == null ? void 0 : _b.forEach(({ index: nestedIndex }) => {
      try {
        if (Array.isArray(nestedIndex)) {
          const { positions, index } = getPositionsAndIndex(nestedIndex);
          const nestedRule = getNestedRule(styleSheet.cssRules, positions);
          nestedRule.deleteRule(index || 0);
        } else {
          styleSheet == null ? void 0 : styleSheet.deleteRule(nestedIndex);
        }
      } catch (e2) {
      }
    });
    if (data.replace)
      try {
        void ((_c = styleSheet.replace) == null ? void 0 : _c.call(styleSheet, data.replace));
      } catch (e2) {
      }
    if (data.replaceSync)
      try {
        (_d = styleSheet.replaceSync) == null ? void 0 : _d.call(styleSheet, data.replaceSync);
      } catch (e2) {
      }
  }
  applyStyleDeclaration(data, styleSheet) {
    if (data.set) {
      const rule = getNestedRule(
        styleSheet.rules,
        data.index
      );
      rule.style.setProperty(
        data.set.property,
        data.set.value,
        data.set.priority
      );
    }
    if (data.remove) {
      const rule = getNestedRule(
        styleSheet.rules,
        data.index
      );
      rule.style.removeProperty(data.remove.property);
    }
  }
  applyAdoptedStyleSheet(data) {
    var _a2;
    const targetHost = this.mirror.getNode(data.id);
    if (!targetHost)
      return;
    (_a2 = data.styles) == null ? void 0 : _a2.forEach((style) => {
      var _a3;
      let newStyleSheet = null;
      let hostWindow = null;
      if (hasShadowRoot(targetHost))
        hostWindow = ((_a3 = targetHost.ownerDocument) == null ? void 0 : _a3.defaultView) || null;
      else if (targetHost.nodeName === "#document")
        hostWindow = targetHost.defaultView;
      if (!hostWindow)
        return;
      try {
        newStyleSheet = new hostWindow.CSSStyleSheet();
        this.styleMirror.add(newStyleSheet, style.styleId);
        this.applyStyleSheetRule(
          {
            source: IncrementalSource.StyleSheetRule,
            adds: style.rules
          },
          newStyleSheet
        );
      } catch (e2) {
      }
    });
    const MAX_RETRY_TIME = 10;
    let count = 0;
    const adoptStyleSheets = (targetHost2, styleIds) => {
      const stylesToAdopt = styleIds.map((styleId) => this.styleMirror.getStyle(styleId)).filter((style) => style !== null);
      if (hasShadowRoot(targetHost2))
        targetHost2.shadowRoot.adoptedStyleSheets = stylesToAdopt;
      else if (targetHost2.nodeName === "#document")
        targetHost2.adoptedStyleSheets = stylesToAdopt;
      if (stylesToAdopt.length !== styleIds.length && count < MAX_RETRY_TIME) {
        setTimeout(
          () => adoptStyleSheets(targetHost2, styleIds),
          0 + 100 * count
        );
        count++;
      }
    };
    adoptStyleSheets(targetHost, data.styleIds);
  }
  legacy_resolveMissingNode(map, parent, target, targetMutation) {
    const { previousId, nextId } = targetMutation;
    const previousInMap = previousId && map[previousId];
    const nextInMap = nextId && map[nextId];
    if (previousInMap) {
      const { node, mutation } = previousInMap;
      parent.insertBefore(node, target);
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
    if (nextInMap) {
      const { node, mutation } = nextInMap;
      parent.insertBefore(
        node,
        target.nextSibling
      );
      delete map[mutation.node.id];
      delete this.legacy_missingNodeRetryMap[mutation.node.id];
      if (mutation.previousId || mutation.nextId) {
        this.legacy_resolveMissingNode(map, parent, node, mutation);
      }
    }
  }
  moveAndHover(x, y, id, isSync, debugData) {
    const target = this.mirror.getNode(id);
    if (!target) {
      return this.debugNodeNotFound(debugData, id);
    }
    const base = getBaseDimension(target, this.iframe);
    const _x = x * base.absoluteScale + base.x;
    const _y = y * base.absoluteScale + base.y;
    this.mouse.style.left = `${_x}px`;
    this.mouse.style.top = `${_y}px`;
    if (!isSync) {
      this.drawMouseTail({ x: _x, y: _y });
    }
    this.hoverElements(target);
  }
  drawMouseTail(position) {
    if (!this.mouseTail) {
      return;
    }
    const { lineCap, lineWidth, strokeStyle, duration } = this.config.mouseTail === true ? defaultMouseTailConfig : Object.assign({}, defaultMouseTailConfig, this.config.mouseTail);
    const draw = () => {
      if (!this.mouseTail) {
        return;
      }
      const ctx = this.mouseTail.getContext("2d");
      if (!ctx || !this.tailPositions.length) {
        return;
      }
      ctx.clearRect(0, 0, this.mouseTail.width, this.mouseTail.height);
      ctx.beginPath();
      ctx.lineWidth = lineWidth;
      ctx.lineCap = lineCap;
      ctx.strokeStyle = strokeStyle;
      ctx.moveTo(this.tailPositions[0].x, this.tailPositions[0].y);
      this.tailPositions.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    };
    this.tailPositions.push(position);
    draw();
    setTimeout(() => {
      this.tailPositions = this.tailPositions.filter((p) => p !== position);
      draw();
    }, duration / this.speedService.state.context.timer.speed);
  }
  hoverElements(el) {
    var _a2;
    (_a2 = this.lastHoveredRootNode || this.iframe.contentDocument) == null ? void 0 : _a2.querySelectorAll(".\\:hover").forEach((hoveredEl) => {
      hoveredEl.classList.remove(":hover");
    });
    this.lastHoveredRootNode = el.getRootNode();
    let currentEl = el;
    while (currentEl) {
      if (currentEl.classList) {
        currentEl.classList.add(":hover");
      }
      currentEl = currentEl.parentElement;
    }
  }
  isUserInteraction(event) {
    if (event.type !== EventType.IncrementalSnapshot) {
      return false;
    }
    return event.data.source > IncrementalSource.Mutation && event.data.source <= IncrementalSource.Input;
  }
  backToNormal() {
    this.nextUserInteractionEvent = null;
    if (this.speedService.state.matches("normal")) {
      return;
    }
    this.speedService.send({ type: "BACK_TO_NORMAL" });
    this.emitter.emit(ReplayerEvents.SkipEnd, {
      speed: this.speedService.state.context.normalSpeed
    });
  }
  warnNodeNotFound(d, id) {
    this.warn(`Node with id '${id}' not found. `, d);
  }
  warnCanvasMutationFailed(d, error) {
    this.warn(`Has error on canvas update`, error, "canvas mutation:", d);
  }
  debugNodeNotFound(d, id) {
    this.debug(`Node with id '${id}' not found. `, d);
  }
  warn(...args) {
    if (!this.config.showWarning) {
      return;
    }
    this.config.logger.warn(REPLAY_CONSOLE_PREFIX, ...args);
  }
  debug(...args) {
    if (!this.config.showDebug) {
      return;
    }
    this.config.logger.log(REPLAY_CONSOLE_PREFIX, ...args);
  }
}
const { addCustomEvent } = record;
const { freezePage } = record;

//# sourceMappingURL=rrweb.js.map

;// CONCATENATED MODULE: ./index-ext.mjs
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _regeneratorRuntime() { "use strict"; /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */ _regeneratorRuntime = function _regeneratorRuntime() { return e; }; var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function (t, e, r) { t[e] = r.value; }, i = "function" == typeof Symbol ? Symbol : {}, a = i.iterator || "@@iterator", c = i.asyncIterator || "@@asyncIterator", u = i.toStringTag || "@@toStringTag"; function define(t, e, r) { return Object.defineProperty(t, e, { value: r, enumerable: !0, configurable: !0, writable: !0 }), t[e]; } try { define({}, ""); } catch (t) { define = function define(t, e, r) { return t[e] = r; }; } function wrap(t, e, r, n) { var i = e && e.prototype instanceof Generator ? e : Generator, a = Object.create(i.prototype), c = new Context(n || []); return o(a, "_invoke", { value: makeInvokeMethod(t, r, c) }), a; } function tryCatch(t, e, r) { try { return { type: "normal", arg: t.call(e, r) }; } catch (t) { return { type: "throw", arg: t }; } } e.wrap = wrap; var h = "suspendedStart", l = "suspendedYield", f = "executing", s = "completed", y = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} var p = {}; define(p, a, function () { return this; }); var d = Object.getPrototypeOf, v = d && d(d(values([]))); v && v !== r && n.call(v, a) && (p = v); var g = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(p); function defineIteratorMethods(t) { ["next", "throw", "return"].forEach(function (e) { define(t, e, function (t) { return this._invoke(e, t); }); }); } function AsyncIterator(t, e) { function invoke(r, o, i, a) { var c = tryCatch(t[r], t, o); if ("throw" !== c.type) { var u = c.arg, h = u.value; return h && "object" == _typeof(h) && n.call(h, "__await") ? e.resolve(h.__await).then(function (t) { invoke("next", t, i, a); }, function (t) { invoke("throw", t, i, a); }) : e.resolve(h).then(function (t) { u.value = t, i(u); }, function (t) { return invoke("throw", t, i, a); }); } a(c.arg); } var r; o(this, "_invoke", { value: function value(t, n) { function callInvokeWithMethodAndArg() { return new e(function (e, r) { invoke(t, n, e, r); }); } return r = r ? r.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg(); } }); } function makeInvokeMethod(e, r, n) { var o = h; return function (i, a) { if (o === f) throw Error("Generator is already running"); if (o === s) { if ("throw" === i) throw a; return { value: t, done: !0 }; } for (n.method = i, n.arg = a;;) { var c = n.delegate; if (c) { var u = maybeInvokeDelegate(c, n); if (u) { if (u === y) continue; return u; } } if ("next" === n.method) n.sent = n._sent = n.arg;else if ("throw" === n.method) { if (o === h) throw o = s, n.arg; n.dispatchException(n.arg); } else "return" === n.method && n.abrupt("return", n.arg); o = f; var p = tryCatch(e, r, n); if ("normal" === p.type) { if (o = n.done ? s : l, p.arg === y) continue; return { value: p.arg, done: n.done }; } "throw" === p.type && (o = s, n.method = "throw", n.arg = p.arg); } }; } function maybeInvokeDelegate(e, r) { var n = r.method, o = e.iterator[n]; if (o === t) return r.delegate = null, "throw" === n && e.iterator["return"] && (r.method = "return", r.arg = t, maybeInvokeDelegate(e, r), "throw" === r.method) || "return" !== n && (r.method = "throw", r.arg = new TypeError("The iterator does not provide a '" + n + "' method")), y; var i = tryCatch(o, e.iterator, r.arg); if ("throw" === i.type) return r.method = "throw", r.arg = i.arg, r.delegate = null, y; var a = i.arg; return a ? a.done ? (r[e.resultName] = a.value, r.next = e.nextLoc, "return" !== r.method && (r.method = "next", r.arg = t), r.delegate = null, y) : a : (r.method = "throw", r.arg = new TypeError("iterator result is not an object"), r.delegate = null, y); } function pushTryEntry(t) { var e = { tryLoc: t[0] }; 1 in t && (e.catchLoc = t[1]), 2 in t && (e.finallyLoc = t[2], e.afterLoc = t[3]), this.tryEntries.push(e); } function resetTryEntry(t) { var e = t.completion || {}; e.type = "normal", delete e.arg, t.completion = e; } function Context(t) { this.tryEntries = [{ tryLoc: "root" }], t.forEach(pushTryEntry, this), this.reset(!0); } function values(e) { if (e || "" === e) { var r = e[a]; if (r) return r.call(e); if ("function" == typeof e.next) return e; if (!isNaN(e.length)) { var o = -1, i = function next() { for (; ++o < e.length;) if (n.call(e, o)) return next.value = e[o], next.done = !1, next; return next.value = t, next.done = !0, next; }; return i.next = i; } } throw new TypeError(_typeof(e) + " is not iterable"); } return GeneratorFunction.prototype = GeneratorFunctionPrototype, o(g, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), o(GeneratorFunctionPrototype, "constructor", { value: GeneratorFunction, configurable: !0 }), GeneratorFunction.displayName = define(GeneratorFunctionPrototype, u, "GeneratorFunction"), e.isGeneratorFunction = function (t) { var e = "function" == typeof t && t.constructor; return !!e && (e === GeneratorFunction || "GeneratorFunction" === (e.displayName || e.name)); }, e.mark = function (t) { return Object.setPrototypeOf ? Object.setPrototypeOf(t, GeneratorFunctionPrototype) : (t.__proto__ = GeneratorFunctionPrototype, define(t, u, "GeneratorFunction")), t.prototype = Object.create(g), t; }, e.awrap = function (t) { return { __await: t }; }, defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, c, function () { return this; }), e.AsyncIterator = AsyncIterator, e.async = function (t, r, n, o, i) { void 0 === i && (i = Promise); var a = new AsyncIterator(wrap(t, r, n, o), i); return e.isGeneratorFunction(r) ? a : a.next().then(function (t) { return t.done ? t.value : a.next(); }); }, defineIteratorMethods(g), define(g, u, "Generator"), define(g, a, function () { return this; }), define(g, "toString", function () { return "[object Generator]"; }), e.keys = function (t) { var e = Object(t), r = []; for (var n in e) r.push(n); return r.reverse(), function next() { for (; r.length;) { var t = r.pop(); if (t in e) return next.value = t, next.done = !1, next; } return next.done = !0, next; }; }, e.values = values, Context.prototype = { constructor: Context, reset: function reset(e) { if (this.prev = 0, this.next = 0, this.sent = this._sent = t, this.done = !1, this.delegate = null, this.method = "next", this.arg = t, this.tryEntries.forEach(resetTryEntry), !e) for (var r in this) "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t); }, stop: function stop() { this.done = !0; var t = this.tryEntries[0].completion; if ("throw" === t.type) throw t.arg; return this.rval; }, dispatchException: function dispatchException(e) { if (this.done) throw e; var r = this; function handle(n, o) { return a.type = "throw", a.arg = e, r.next = n, o && (r.method = "next", r.arg = t), !!o; } for (var o = this.tryEntries.length - 1; o >= 0; --o) { var i = this.tryEntries[o], a = i.completion; if ("root" === i.tryLoc) return handle("end"); if (i.tryLoc <= this.prev) { var c = n.call(i, "catchLoc"), u = n.call(i, "finallyLoc"); if (c && u) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } else if (c) { if (this.prev < i.catchLoc) return handle(i.catchLoc, !0); } else { if (!u) throw Error("try statement without catch or finally"); if (this.prev < i.finallyLoc) return handle(i.finallyLoc); } } } }, abrupt: function abrupt(t, e) { for (var r = this.tryEntries.length - 1; r >= 0; --r) { var o = this.tryEntries[r]; if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) { var i = o; break; } } i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null); var a = i ? i.completion : {}; return a.type = t, a.arg = e, i ? (this.method = "next", this.next = i.finallyLoc, y) : this.complete(a); }, complete: function complete(t, e) { if ("throw" === t.type) throw t.arg; return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg, this.method = "return", this.next = "end") : "normal" === t.type && e && (this.next = e), y; }, finish: function finish(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.finallyLoc === t) return this.complete(r.completion, r.afterLoc), resetTryEntry(r), y; } }, "catch": function _catch(t) { for (var e = this.tryEntries.length - 1; e >= 0; --e) { var r = this.tryEntries[e]; if (r.tryLoc === t) { var n = r.completion; if ("throw" === n.type) { var o = n.arg; resetTryEntry(r); } return o; } } throw Error("illegal catch attempt"); }, delegateYield: function delegateYield(e, r, n) { return this.delegate = { iterator: values(e), resultName: r, nextLoc: n }, "next" === this.method && (this.arg = t), y; } }, e; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
// Inject the external script only once
if (!window.__scriptInjected) {
  window.__scriptInjected = true;
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('injectScript.js');
  script.onload = function () {
    this.remove();
  };
  document.documentElement.appendChild(script);
}


// Buffer to store events for continuous send (when normal recording is enabled)
var eventBuffer = [];
var stopFn;
var sessionManager;
var sessionStartTime;
var shouldRecordSession = false;
var shouldRecordSessionOnError = false;
var samplingConfig = {
  // do not record mouse movement
  mousemove: false,
  // do not record mouse interaction
  mouseInteraction: true,
  // set the interval of scrolling event
  scroll: 150,
  // do not emit twice in 150ms
  // set the interval of media interaction event
  media: 800,
  // set the timing of record input
  input: 'last' // When input multiple characters, only record the final input
};

// Function to generate a unique session ID
function generateSessionId() {
  // Custom UUID generation logic
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
  return 'session_' + uuid;
}
function log(config, log) {
  if (config.enableLogging) {
    console.log(log);
  }
}
function setTrackingIdCookie(sessionId) {
  return new Promise(function (resolve, reject) {
    // Check if a value already exists
    chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function (data) {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError));
      }
      if (!data["testchimp.ext-session-record-tracking-id"]) {
        // Set the tracking ID only if it doesn't exist
        chrome.storage.local.set({
          "testchimp.ext-session-record-tracking-id": sessionId,
          "recordingInProgress":true
        }, function () {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError));
          }
          console.log("Setting testchimp tracking id to " + sessionId);
          resolve(); // Resolve the promise when setting is complete
        });
      } else {
        // If it already exists, resolve immediately
        resolve();
      }
    });
  });
}
function getTrackingIdCookie() {
  return new Promise(function (resolve, reject) {
    chrome.storage.local.get("testchimp.ext-session-record-tracking-id", function (data) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError));
      } else {
        resolve(data["testchimp.ext-session-record-tracking-id"] || "");
      }
    });
  });
}
function sendPayloadToEndpoint(payload, endpoint) {
  var body = JSON.stringify(payload);
  fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'no-cors',
    body: body
  })["catch"](function (error) {
    console.error('Error sending payload:', error);
  });
}

// Function to send events to the backend and reset the events array
function sendEvents(endpoint, config, sessionId, events) {
  if (events.length === 0 || !config.projectId || !config.sessionRecordingApiKey) return;
  var sessionRecordEvents = events.map(function (event) {
    return {
      payload: JSON.stringify(event)
    };
  });

  // Clear the event buffer. While sendEvents is used in both onError and normal recording, the eventBuffer is utilized only in normal recording.
  eventBuffer = [];
  var body = {
    tracking_id: sessionId,
    aware_project_id: config.projectId,
    aware_session_tracking_api_key: config.sessionRecordingApiKey,
    session_record_source: "EXTENSION",
    current_user_id: config.currentUserId,
    environment: config.environment,
    event_list: {
      events: sessionRecordEvents
    }
  };
  var sessionSendEnabled = true;
  var sessionRecordEndpoint = endpoint + "/session_records";
  if (sessionSendEnabled) {
    sendPayloadToEndpoint(body, sessionRecordEndpoint);
  }
}

// Function to start sending events in batches every 5 seconds
function startSendingEvents(endpoint, config, sessionId) {
  var recordOptions = {
    emit: function emit(event) {
      // Process the event before adding it to the buffer
      var processedEvent = processEvent(event);
      if (processedEvent) {
        eventBuffer.push(processedEvent);
      }
    },
    sampling: samplingConfig,
    ignore: function ignore(node) {
      return node.tagName === 'VIDEO' || node.tagName === 'CANVAS' || node.hasAttribute && node.hasAttribute('data-rrweb-ignore');
    },
    recordCanvas: false
  };
  function processEvent(event) {
    // Always keep snapshot events unchanged
    if (event.type === 2) {
      return event;
    }

    // For DOM mutations with attribute changes
    if (event.type === 3 && event.data.source === 0 && event.data.attributes && event.data.attributes.length > 0) {
      // Create a filtered array of attributes without transform changes
      var filteredAttributes = event.data.attributes.filter(function (attr) {
        // Check if this is a transform attribute
        var isTransformChange = attr.attributes.style && attr.attributes.style.transform || attr.attributes.transform;

        // Keep attributes that are not transform-related
        return !isTransformChange;
      });

      // If all attributes were transform-related, filter out the entire event
      if (filteredAttributes.length === 0) {
        return null;
      }

      // Otherwise create a modified event with transforms removed
      var modifiedEvent = JSON.parse(JSON.stringify(event));
      modifiedEvent.data.attributes = filteredAttributes;
      return modifiedEvent;
    }

    // Pass through all other event types unchanged
    return event;
  }
  stopFn = record(recordOptions);

  // Save events every 5 seconds
  var intervalId = setInterval(function () {
    var sessionDuration = (new Date().getTime() - sessionStartTime) / 1000;
    if (!config.maxSessionDurationSecs || config.maxSessionDurationSecs && sessionDuration < config.maxSessionDurationSecs) {
      sendEvents(endpoint, config, sessionId, eventBuffer);
    } else {
      clearInterval(intervalId); // Stop periodic sending
      stopSendingEvents(endpoint, config, sessionId); // Stop and flush
    }
  }, 5000);
  return {
    stop: function stop() {
      clearInterval(intervalId); // Stop periodic sending
      stopSendingEvents(endpoint, config, sessionId); // Stop and flush
    }
  };
}

// Function to stop sending events
function stopSendingEvents(endpoint, config, sessionId) {
  try {
    if (stopFn) {
      stopFn(); // Stop recording events
      stopFn = null;
    }
    // Flush remaining events in the buffer
    if (eventBuffer.length > 0) {
      console.log("Sending remaining events of size: ", eventBuffer.length);
      sendEvents(endpoint, config, sessionId, eventBuffer);
    }
  } catch (error) {
    console.log("Error stopping session:", error);
  }
}
function clearTrackingIdCookie() {
  try {
    chrome.storage.local.set({
      "testchimp.ext-session-record-tracking-id": ''
    }, function () {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError);
        return;
      }
      console.log("TestChimp tracking id cleared");
    });
  } catch (error) {
    console.error("Security error caught:", error);
  }
}
function endTrackedSession() {
  return _endTrackedSession.apply(this, arguments);
} // Function to start recording user sessions
function _endTrackedSession() {
  _endTrackedSession = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee() {
    return _regeneratorRuntime().wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          console.log("Ending current tracking session");
          if (sessionManager) {
            sessionManager.stop();
          }
          clearTrackingIdCookie();
        case 3:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _endTrackedSession.apply(this, arguments);
}
function startRecording(_x) {
  return _startRecording.apply(this, arguments);
}
function _startRecording() {
  _startRecording = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee2(config) {
    var endpoint, sessionId, defaultMaxSessionDurationSecs, defaultEventWindowToSaveOnError, defaultUrlRegexToAddTracking, defaultUntracedUrisToTrackRegex, defaultSamplingProbability, defaultSamplingProbabilityOnError, defaultEnvironment, defaultCurrentUserId;
    return _regeneratorRuntime().wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          console.log("Initializing recording for TestChimp Project: " + config.projectId);
          // Default endpoint if not provided
          endpoint = config.endpoint || 'https://ingress.testchimp.io';
          sessionId = generateSessionId();
          _context2.next = 5;
          return setTrackingIdCookie(sessionId);
        case 5:
          _context2.next = 7;
          return getTrackingIdCookie();
        case 7:
          sessionId = _context2.sent;
          console.log("Session id for TC", sessionId);
          // Record the session start time
          sessionStartTime = new Date().getTime();
          defaultMaxSessionDurationSecs = 600; // 10 mins
          defaultEventWindowToSaveOnError = 200;
          defaultUrlRegexToAddTracking = ["/^$/"]; // Match no URLs
          defaultUntracedUrisToTrackRegex = ["/^$/"]; // Match no URLs
          defaultSamplingProbability = 0.0;
          defaultSamplingProbabilityOnError = 0.0;
          defaultEnvironment = "QA";
          defaultCurrentUserId = "default_tester";
          if (config.projectId) {
            _context2.next = 21;
            break;
          }
          console.error("No project id specified for session capture");
          return _context2.abrupt("return");
        case 21:
          if (config.sessionRecordingApiKey) {
            _context2.next = 24;
            break;
          }
          console.error("No session recording api key specified for session capture");
          return _context2.abrupt("return");
        case 24:
          config = {
            enableRecording: config.enableRecording || true,
            endpoint: endpoint,
            projectId: config.projectId,
            sessionRecordingApiKey: config.sessionRecordingApiKey,
            samplingProbability: config.samplingProbability || defaultSamplingProbability,
            maxSessionDurationSecs: config.maxSessionDurationSecs || defaultMaxSessionDurationSecs,
            samplingProbabilityOnError: config.samplingProbabilityOnError || defaultSamplingProbabilityOnError,
            eventWindowToSaveOnError: config.eventWindowToSaveOnError || defaultEventWindowToSaveOnError,
            tracedUriRegexListToTrack: config.tracedUriRegexListToTrack || defaultUrlRegexToAddTracking,
            untracedUriRegexListToTrack: config.untracedUriRegexListToTrack || defaultUntracedUrisToTrackRegex,
            excludedUriRegexList: config.excludedUriRegexList || [],
            environment: config.environment || defaultEnvironment,
            enableLogging: config.enableLogging || true,
            enableOptionsCallTracking: config.enableOptionsCallTracking || false,
            currentUserId: config.currentUserId || defaultCurrentUserId
          };
          console.log("config used for session recording: ", config);

          // Determine whether to record the session based on samplingProbability
          shouldRecordSession = config.samplingProbability && Math.random() <= config.samplingProbability;

          // Determine the sampling decision for error scenarios
          shouldRecordSessionOnError = config.samplingProbabilityOnError && Math.random() <= config.samplingProbabilityOnError;
          if (shouldRecordSession) {
            sessionManager = startSendingEvents(endpoint, config, sessionId);
          }
        case 29:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _startRecording.apply(this, arguments);
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === 'startTCRecording') {
    startRecording(message.data);
  }
  if (message.action === 'endTCRecording') {
    endTrackedSession();
  }
  if (message.action === "open_extension_popup") {
    chrome.runtime.sendMessage({
      type: "trigger_popup"
    });
  }
});
window.addEventListener("message", function (event) {
  // Ensure the message is from the correct source
  if (event.source !== window) {
    return;
  }
  if (event.data.type === "interceptedResponse") {
    var _chrome$runtime;
    var _event$data$detail = event.data.detail,
      responseHeaders = _event$data$detail.responseHeaders,
      responseBody = _event$data$detail.responseBody,
      statusCode = _event$data$detail.statusCode,
      url = _event$data$detail.url,
      requestId = _event$data$detail.requestId;
    (_chrome$runtime = chrome.runtime) === null || _chrome$runtime === void 0 || _chrome$runtime.sendMessage({
      type: 'capturedResponse',
      requestId: requestId,
      responseHeaders: responseHeaders,
      responseBody: responseBody,
      statusCode: statusCode,
      url: (url === null || url === void 0 ? void 0 : url.toString()) || ''
    });
    return;
  }
  if (event.data.type === "checkUrl") {
    chrome.runtime.sendMessage({
      type: "checkUrl",
      url: event.data.url
    }, function (response) {
      window.postMessage({
        type: "checkUrlResponse",
        shouldIntercept: (response === null || response === void 0 ? void 0 : response.shouldIntercept) || false
      }, "*");
    });
  }
  if (event.data.type === "fallbackRequestBody") {
    var _chrome$runtime2;
    var _event$data$detail2 = event.data.detail,
      _url = _event$data$detail2.url,
      method = _event$data$detail2.method,
      _responseHeaders = _event$data$detail2.responseHeaders,
      _requestId = _event$data$detail2.requestId,
      requestHeaders = _event$data$detail2.requestHeaders,
      requestBody = _event$data$detail2.requestBody;
    (_chrome$runtime2 = chrome.runtime) === null || _chrome$runtime2 === void 0 || _chrome$runtime2.sendMessage({
      type: 'interceptedRequest',
      url: _url,
      method: method,
      responseHeaders: _responseHeaders,
      requestId: _requestId,
      requestHeaders: requestHeaders,
      requestBody: requestBody
    });
    return;
  }

  // Check for specific message types
  if (event.data.type === "check_extension" || event.data.type === "run_tests_request" || event.data.type === "update_tc_ext_config" || event.data.type === "tc_open_options_page" || event.data.type === "show_testchimp_ext_popup" || event.data.type === "get_latest_session") {
    // Forward messages to the background script
    if (event.data.type === "update_tc_ext_config") {
      console.log("Received extension configuration message:", event.data.payload);
      // Extract the data to be stored from the message
      var dataToStore = event.data.payload; // Assuming payload contains the key-value pairs

      // Store the data in chrome.storage.sync
      chrome.storage.sync.set(dataToStore, function () {
        if (chrome.runtime.lastError) {
          console.error("Error storing data:", chrome.runtime.lastError.message);
          window.postMessage({
            type: "update_tc_ext_config_response",
            success: false,
            error: chrome.runtime.lastError.message
          }, "*");
        } else {
          window.postMessage({
            type: "update_tc_ext_config_response",
            success: true
          }, "*");
        }
      });
    } else if (event.data.type === "tc_open_options_page") {
      console.log("Received message tc_open_options_page");
      // Open the options page
      chrome.runtime.sendMessage({
        type: "tc_open_options_page_in_bg"
      });
    } else if (event.data.type === "show_testchimp_ext_popup") {
      chrome.runtime.sendMessage({
        type: "trigger_popup"
      });
    } else if (event.data.type === "get_latest_session") {
      // Request the latest session from the extension
      chrome.runtime.sendMessage({
        type: "get_latest_session"
      }, function (response) {
        // Handle the response from the extension
        if (response && response.latestSession) {
          window.postMessage({
            type: "latest_session_response",
            // New type for response
            latestSession: response.latestSession
          }, "*");
          // You can also send this data to the webpage or store it in a variable for later use
        } else {
          window.postMessage({
            type: "latest_session_response",
            latestSession: null
          }, "*");
        }
      });
    } else {
      // Handle check_extension and run_tests_request
      chrome.runtime.sendMessage(event.data, function (response) {
        if (chrome.runtime.lastError) {
          // Error communicating with the background script
          console.error("Error communicating with background script:", chrome.runtime.lastError.message);
          if (event.data.type === "check_extension") {
            window.postMessage({
              type: "check_extension_response",
              success: false
            }, "*");
          } else if (event.data.type === "run_tests_request") {
            window.postMessage({
              type: "run_tests_response",
              error: "Extension error: " + chrome.runtime.lastError.message
            }, "*");
          }
        } else if (response.error) {
          // Background script returned an error
          if (event.data.type === "check_extension") {
            window.postMessage({
              type: "check_extension_response",
              success: false
            }, "*");
          } else if (event.data.type === "run_tests_request") {
            window.postMessage({
              type: "run_tests_response",
              error: response.error
            }, "*");
          }
        } else {
          // Successful responses
          if (event.data.type === "check_extension") {
            window.postMessage({
              type: "check_extension_response",
              success: response.success
            }, "*");
          } else if (event.data.type === "run_tests_request") {
            window.postMessage({
              type: "run_tests_response",
              response: response.data
            }, "*");
          }
        }
      });
    }
  }
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Forward the message back to the webpage
  window.postMessage(message, "*");
});
function checkAndStartRecording() {
  return _checkAndStartRecording.apply(this, arguments);
} // Check for the cookie when the page is loaded
function _checkAndStartRecording() {
  _checkAndStartRecording = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee3() {
    var cookie;
    return _regeneratorRuntime().wrap(function _callee3$(_context3) {
      while (1) switch (_context3.prev = _context3.next) {
        case 0:
          console.log("Content script is loaded.");
          _context3.next = 3;
          return getTrackingIdCookie();
        case 3:
          cookie = _context3.sent;
          if (cookie && cookie.trim() !== '') {
            // Cookie is set, retrieve settings and start recording
            chrome.storage.sync.get(['projectId', 'sessionRecordingApiKey', 'endpoint', 'maxSessionDurationSecs', 'eventWindowToSaveOnError', 'uriRegexToIntercept', 'currentUserId'], function (items) {
              if (chrome.runtime.lastError) {
                console.error('Error retrieving settings from storage:', chrome.runtime.lastError);
                return;
              }
              console.log("ITEMS FROM CHROME: ", items);
              startRecording({
                projectId: items.projectId,
                sessionRecordingApiKey: items.sessionRecordingApiKey,
                endpoint: items.endpoint,
                samplingProbabilityOnError: 0.0,
                samplingProbability: 1.0,
                maxSessionDurationSecs: items.maxSessionDurationSecs || 500,
                eventWindowToSaveOnError: 200,
                currentUserId: items.currentUserId,
                untracedUriRegexListToTrack: items.uriRegexToIntercept || '.*'
              });
            });
          }
        case 5:
        case "end":
          return _context3.stop();
      }
    }, _callee3);
  }));
  return _checkAndStartRecording.apply(this, arguments);
}
document.addEventListener('DOMContentLoaded', checkAndStartRecording);
/******/ 	return __webpack_exports__;
/******/ })()
;
});