// independent functions
const Global = {
  // wait for all promises to resolve
  // promiseReject default is to silently catch promise rejections
  allPromises: (promises, allThen, allError, promiseReject = undefined) => {
    let catchFn = function(err) {console.error(err);};
    if (promiseReject !== undefined) {
      catchFn = promiseReject;
    }
    // map catch blocks to all promises, so that all promises are run
    return Promise.all(promises.map((p) => p.catch(catchFn)))
      .then(allThen)
      .catch(allError);
  },

  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // callback will be called after each chunk of sleep
  // sleep will return early if callback returns true
  sleepCallback: async (ms, callback = undefined) => {
    let chunk = 500;
    if (ms < chunk) {
      chunk = ms;
    }
    for (let remain = ms; remain > 0; remain -= chunk) {
      await Global.sleep(chunk);
      if (callback !== undefined) {
        if (callback(ms, remain)) {
          return false;
        }
      }
    }
    return true;
  },

  // string contains varnames in curly braces
  // optional pipe to define 'or'
  // optional #'s to define zero padding
  // vars defined in obj
  // {var1|var2} => var1 || var2
  // {###index} => 000
  template: (string, obj) => {
    let s = string;
    const r = /<([^>]+)>/g;
    s = s.replace(r, (match, p) => {
      const vars = p.split("|");
      for (const v of vars) {
        const rx = /^([#]*)(.*)/;
        const m = v.match(rx);
        const pad = m[1];
        const key = m[2];
        const lkey = key.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(obj, lkey)) {
          if (obj[lkey].length > 0) {
            const ret = obj[lkey].padStart(pad.length, "0");
            return ret;
          }
        } else {
          // treat as string
          return key;
        }
      }
      // return empty string if vars are defined in obj but are empty
      return "";
    });
    return s;
  },

  // returned values may be URI encoded
  parseURL: (url) => {
    let parser = document.createElement("a");
    let searchObject = {};
    let queries;
    let split;
    let i;
    // Let the browser do the work
    parser.href = url;
    // Convert query string to object
    queries = parser.search.replace(/^\?/, "").split("&");
    for (i = 0; i < queries.length; i++) {
      split = queries[i].split("=");
      searchObject[split[0]] = split[1];
    }
    return {
      protocol: parser.protocol,
      host: parser.host,
      hostname: parser.hostname,
      port: parser.port,
      pathname: parser.pathname,
      search: parser.search,
      searchObject,
      hash: parser.hash
    };
  },

  // return filename from path, use getFilename for sanitized filename
  getBasename: (path) => path.replace(/^.*\//, ""), // strip everything before last slash

  // sanitized filename
  getFilename: (path) => Global.getBasename(path)
    .replace(/:.*$/, ""), // strip twitter-style tags ":large"

  // sanitize filename, remove extension
  getFilePart: (path) => Global.getFilename(path)
    .replace(/.[^.]+$/, ""), // strip extension

  getFileExt: (path) => {
    const m = Global.getFilename(path).match(/\.[^./]+$/);
    if (m && m.length > 0) {
      return m[0];
    }
    return "";
  },

  getDirname: (path) => path.replace(/\/[^/]*$/g, "") // strip everything after last slash
    .replace(/^\/*/, ""), // strip leading slashes

  // replace all invalid characters and slashes
  sanitizeFilename: (filename, str = "_") => filename.replace(/[*"/\\:<>|?]/g, str),

  // replace invalid characters and strip leading/trailing slashes
  sanitizePath: (path, str = "_") =>
    path.replace(/[*":<>|?]/g, str) // remove invalid characters
      .replace(/[/\\]+/g, "/") // replace backslash with forward slash
      .replace(/^[/]/, "") // strip leading slash
      .replace(/[/]$/, ""), // strip trailing slash

  pathJoin: (parts, sep) => {
    const separator = sep || "/";
    const replace = new RegExp(`${separator}{1,}`, "g");
    return parts.join(separator).replace(replace, separator);
  },

  isValidPath: (path) => typeof path === "string" &&
    (path.length > 0) &&
    (!/^[.]/.test(path)) && // does not begin with period
    (!/[./]$/.test(path)) && // does not end with period or slash
    (!/[*":<>|?]/.test(path)), // does not contain invalid characters

  isValidFilename: (path) => Global.isValidPath(path) &&
    Global.getFilePart(path).length > 0 && // filename part
    Global.getFileExt(path).length > 0, // file extension

  // use XHR:HEAD to get headers
  // keys is array of headers to return as Promise
  getHeaders: (url, keys) => new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("HEAD", url);
    // catches events for: load, error, abort
    xhr.onload = function() {
      const headers = keys.reduce(
        (acc, val) => Object.assign(acc, {[val]: this.getResponseHeader(val)}),
        {}
      );
      return resolve(headers);
    };
    xhr.onerror = function() {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  }),

  // try to get filename from XHR request
  // returns {filename: filename} or {ext: ext}
  getHeaderFilename: async (url) => {
    let obj = {};
    const headers = await Global.getHeaders(url, ["Content-Disposition", "Content-Type"]);
    const mime = headers["Content-Type"];
    if (mime && mime.indexOf("image/") === 0) {
      let ext = mime.substr(6);
      switch (ext) {
        case "jpeg": {
          ext = "jpg";
          break;
        }
        case "svg+xml": {
          ext = "svg";
          break;
        }
      }
      obj.mimeExt = `.${ext}`;
    }
    const disposition = headers["Content-Disposition"];
    if (disposition && disposition.indexOf("filename") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      let matches = filenameRegex.exec(disposition);
      if (matches !== null && matches[1]) {
        obj.filename = decodeURI(matches[1].replace(/['"]/g, ""));
      }
    }
    return obj;
  }
};

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {Global};
}
