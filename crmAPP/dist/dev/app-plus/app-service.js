var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  const ON_SHOW = "onShow";
  const ON_HIDE = "onHide";
  const ON_LAUNCH = "onLaunch";
  const ON_LOAD = "onLoad";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  const createHook = (lifecycle) => (hook, target = vue.getCurrentInstance()) => {
    !vue.isInSSRComponentSetup && vue.injectHook(lifecycle, hook, target);
  };
  const onShow = /* @__PURE__ */ createHook(ON_SHOW);
  const onHide = /* @__PURE__ */ createHook(ON_HIDE);
  const onLaunch = /* @__PURE__ */ createHook(ON_LAUNCH);
  const onLoad = /* @__PURE__ */ createHook(ON_LOAD);
  function set(target, key, val) {
    if (Array.isArray(target)) {
      target.length = Math.max(target.length, key);
      target.splice(key, 1, val);
      return val;
    }
    target[key] = val;
    return val;
  }
  function del(target, key) {
    if (Array.isArray(target)) {
      target.splice(key, 1);
      return;
    }
    delete target[key];
  }
  function getDevtoolsGlobalHook() {
    return getTarget().__VUE_DEVTOOLS_GLOBAL_HOOK__;
  }
  function getTarget() {
    return typeof navigator !== "undefined" && typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : {};
  }
  const isProxyAvailable = typeof Proxy === "function";
  const HOOK_SETUP = "devtools-plugin:setup";
  const HOOK_PLUGIN_SETTINGS_SET = "plugin:settings:set";
  let supported;
  let perf;
  function isPerformanceSupported() {
    var _a;
    if (supported !== void 0) {
      return supported;
    }
    if (typeof window !== "undefined" && window.performance) {
      supported = true;
      perf = window.performance;
    } else if (typeof globalThis !== "undefined" && ((_a = globalThis.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
      supported = true;
      perf = globalThis.perf_hooks.performance;
    } else {
      supported = false;
    }
    return supported;
  }
  function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
  }
  class ApiProxy {
    constructor(plugin, hook) {
      this.target = null;
      this.targetQueue = [];
      this.onQueue = [];
      this.plugin = plugin;
      this.hook = hook;
      const defaultSettings = {};
      if (plugin.settings) {
        for (const id in plugin.settings) {
          const item = plugin.settings[id];
          defaultSettings[id] = item.defaultValue;
        }
      }
      const localSettingsSaveId = `__vue-devtools-plugin-settings__${plugin.id}`;
      let currentSettings = Object.assign({}, defaultSettings);
      try {
        const raw = localStorage.getItem(localSettingsSaveId);
        const data = JSON.parse(raw);
        Object.assign(currentSettings, data);
      } catch (e) {
      }
      this.fallbacks = {
        getSettings() {
          return currentSettings;
        },
        setSettings(value) {
          try {
            localStorage.setItem(localSettingsSaveId, JSON.stringify(value));
          } catch (e) {
          }
          currentSettings = value;
        },
        now() {
          return now();
        }
      };
      if (hook) {
        hook.on(HOOK_PLUGIN_SETTINGS_SET, (pluginId, value) => {
          if (pluginId === this.plugin.id) {
            this.fallbacks.setSettings(value);
          }
        });
      }
      this.proxiedOn = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target.on[prop];
          } else {
            return (...args) => {
              this.onQueue.push({
                method: prop,
                args
              });
            };
          }
        }
      });
      this.proxiedTarget = new Proxy({}, {
        get: (_target, prop) => {
          if (this.target) {
            return this.target[prop];
          } else if (prop === "on") {
            return this.proxiedOn;
          } else if (Object.keys(this.fallbacks).includes(prop)) {
            return (...args) => {
              this.targetQueue.push({
                method: prop,
                args,
                resolve: () => {
                }
              });
              return this.fallbacks[prop](...args);
            };
          } else {
            return (...args) => {
              return new Promise((resolve) => {
                this.targetQueue.push({
                  method: prop,
                  args,
                  resolve
                });
              });
            };
          }
        }
      });
    }
    async setRealTarget(target) {
      this.target = target;
      for (const item of this.onQueue) {
        this.target.on[item.method](...item.args);
      }
      for (const item of this.targetQueue) {
        item.resolve(await this.target[item.method](...item.args));
      }
    }
  }
  function setupDevtoolsPlugin(pluginDescriptor, setupFn) {
    const descriptor = pluginDescriptor;
    const target = getTarget();
    const hook = getDevtoolsGlobalHook();
    const enableProxy = isProxyAvailable && descriptor.enableEarlyProxy;
    if (hook && (target.__VUE_DEVTOOLS_PLUGIN_API_AVAILABLE__ || !enableProxy)) {
      hook.emit(HOOK_SETUP, pluginDescriptor, setupFn);
    } else {
      const proxy = enableProxy ? new ApiProxy(descriptor, hook) : null;
      const list = target.__VUE_DEVTOOLS_PLUGINS__ = target.__VUE_DEVTOOLS_PLUGINS__ || [];
      list.push({
        pluginDescriptor: descriptor,
        setupFn,
        proxy
      });
      if (proxy) {
        setupFn(proxy.proxiedTarget);
      }
    }
  }
  /*!
   * pinia v2.3.1
   * (c) 2025 Eduardo San Martin Morote
   * @license MIT
   */
  let activePinia;
  const setActivePinia = (pinia) => activePinia = pinia;
  const piniaSymbol = Symbol("pinia");
  function isPlainObject(o) {
    return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
  }
  var MutationType;
  (function(MutationType2) {
    MutationType2["direct"] = "direct";
    MutationType2["patchObject"] = "patch object";
    MutationType2["patchFunction"] = "patch function";
  })(MutationType || (MutationType = {}));
  const IS_CLIENT = typeof window !== "undefined";
  const _global = /* @__PURE__ */ (() => typeof window === "object" && window.window === window ? window : typeof self === "object" && self.self === self ? self : typeof global === "object" && global.global === global ? global : typeof globalThis === "object" ? globalThis : { HTMLElement: null })();
  function bom(blob, { autoBom = false } = {}) {
    if (autoBom && /^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
      return new Blob([String.fromCharCode(65279), blob], { type: blob.type });
    }
    return blob;
  }
  function download(url, name, opts) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "blob";
    xhr.onload = function() {
      saveAs(xhr.response, name, opts);
    };
    xhr.onerror = function() {
      console.error("could not download file");
    };
    xhr.send();
  }
  function corsEnabled(url) {
    const xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, false);
    try {
      xhr.send();
    } catch (e) {
    }
    return xhr.status >= 200 && xhr.status <= 299;
  }
  function click(node) {
    try {
      node.dispatchEvent(new MouseEvent("click"));
    } catch (e) {
      const evt = document.createEvent("MouseEvents");
      evt.initMouseEvent("click", true, true, window, 0, 0, 0, 80, 20, false, false, false, false, 0, null);
      node.dispatchEvent(evt);
    }
  }
  const _navigator = typeof navigator === "object" ? navigator : { userAgent: "" };
  const isMacOSWebView = /* @__PURE__ */ (() => /Macintosh/.test(_navigator.userAgent) && /AppleWebKit/.test(_navigator.userAgent) && !/Safari/.test(_navigator.userAgent))();
  const saveAs = !IS_CLIENT ? () => {
  } : (
    // Use download attribute first if possible (#193 Lumia mobile) unless this is a macOS WebView or mini program
    typeof HTMLAnchorElement !== "undefined" && "download" in HTMLAnchorElement.prototype && !isMacOSWebView ? downloadSaveAs : (
      // Use msSaveOrOpenBlob as a second approach
      "msSaveOrOpenBlob" in _navigator ? msSaveAs : (
        // Fallback to using FileReader and a popup
        fileSaverSaveAs
      )
    )
  );
  function downloadSaveAs(blob, name = "download", opts) {
    const a = document.createElement("a");
    a.download = name;
    a.rel = "noopener";
    if (typeof blob === "string") {
      a.href = blob;
      if (a.origin !== location.origin) {
        if (corsEnabled(a.href)) {
          download(blob, name, opts);
        } else {
          a.target = "_blank";
          click(a);
        }
      } else {
        click(a);
      }
    } else {
      a.href = URL.createObjectURL(blob);
      setTimeout(function() {
        URL.revokeObjectURL(a.href);
      }, 4e4);
      setTimeout(function() {
        click(a);
      }, 0);
    }
  }
  function msSaveAs(blob, name = "download", opts) {
    if (typeof blob === "string") {
      if (corsEnabled(blob)) {
        download(blob, name, opts);
      } else {
        const a = document.createElement("a");
        a.href = blob;
        a.target = "_blank";
        setTimeout(function() {
          click(a);
        });
      }
    } else {
      navigator.msSaveOrOpenBlob(bom(blob, opts), name);
    }
  }
  function fileSaverSaveAs(blob, name, opts, popup) {
    popup = popup || open("", "_blank");
    if (popup) {
      popup.document.title = popup.document.body.innerText = "downloading...";
    }
    if (typeof blob === "string")
      return download(blob, name, opts);
    const force = blob.type === "application/octet-stream";
    const isSafari = /constructor/i.test(String(_global.HTMLElement)) || "safari" in _global;
    const isChromeIOS = /CriOS\/[\d]+/.test(navigator.userAgent);
    if ((isChromeIOS || force && isSafari || isMacOSWebView) && typeof FileReader !== "undefined") {
      const reader = new FileReader();
      reader.onloadend = function() {
        let url = reader.result;
        if (typeof url !== "string") {
          popup = null;
          throw new Error("Wrong reader.result type");
        }
        url = isChromeIOS ? url : url.replace(/^data:[^;]*;/, "data:attachment/file;");
        if (popup) {
          popup.location.href = url;
        } else {
          location.assign(url);
        }
        popup = null;
      };
      reader.readAsDataURL(blob);
    } else {
      const url = URL.createObjectURL(blob);
      if (popup)
        popup.location.assign(url);
      else
        location.href = url;
      popup = null;
      setTimeout(function() {
        URL.revokeObjectURL(url);
      }, 4e4);
    }
  }
  function toastMessage(message, type) {
    const piniaMessage = "🍍 " + message;
    if (typeof __VUE_DEVTOOLS_TOAST__ === "function") {
      __VUE_DEVTOOLS_TOAST__(piniaMessage, type);
    } else if (type === "error") {
      console.error(piniaMessage);
    } else if (type === "warn") {
      console.warn(piniaMessage);
    } else {
      console.log(piniaMessage);
    }
  }
  function isPinia(o) {
    return "_a" in o && "install" in o;
  }
  function checkClipboardAccess() {
    if (!("clipboard" in navigator)) {
      toastMessage(`Your browser doesn't support the Clipboard API`, "error");
      return true;
    }
  }
  function checkNotFocusedError(error) {
    if (error instanceof Error && error.message.toLowerCase().includes("document is not focused")) {
      toastMessage('You need to activate the "Emulate a focused page" setting in the "Rendering" panel of devtools.', "warn");
      return true;
    }
    return false;
  }
  async function actionGlobalCopyState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(pinia.state.value));
      toastMessage("Global state copied to clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to serialize the state. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalPasteState(pinia) {
    if (checkClipboardAccess())
      return;
    try {
      loadStoresState(pinia, JSON.parse(await navigator.clipboard.readText()));
      toastMessage("Global state pasted from clipboard.");
    } catch (error) {
      if (checkNotFocusedError(error))
        return;
      toastMessage(`Failed to deserialize the state from clipboard. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  async function actionGlobalSaveState(pinia) {
    try {
      saveAs(new Blob([JSON.stringify(pinia.state.value)], {
        type: "text/plain;charset=utf-8"
      }), "pinia-state.json");
    } catch (error) {
      toastMessage(`Failed to export the state as JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  let fileInput;
  function getFileOpener() {
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json";
    }
    function openFile() {
      return new Promise((resolve, reject) => {
        fileInput.onchange = async () => {
          const files = fileInput.files;
          if (!files)
            return resolve(null);
          const file = files.item(0);
          if (!file)
            return resolve(null);
          return resolve({ text: await file.text(), file });
        };
        fileInput.oncancel = () => resolve(null);
        fileInput.onerror = reject;
        fileInput.click();
      });
    }
    return openFile;
  }
  async function actionGlobalOpenStateFile(pinia) {
    try {
      const open2 = getFileOpener();
      const result = await open2();
      if (!result)
        return;
      const { text, file } = result;
      loadStoresState(pinia, JSON.parse(text));
      toastMessage(`Global state imported from "${file.name}".`);
    } catch (error) {
      toastMessage(`Failed to import the state from JSON. Check the console for more details.`, "error");
      console.error(error);
    }
  }
  function loadStoresState(pinia, state) {
    for (const key in state) {
      const storeState = pinia.state.value[key];
      if (storeState) {
        Object.assign(storeState, state[key]);
      } else {
        pinia.state.value[key] = state[key];
      }
    }
  }
  function formatDisplay(display) {
    return {
      _custom: {
        display
      }
    };
  }
  const PINIA_ROOT_LABEL = "🍍 Pinia (root)";
  const PINIA_ROOT_ID = "_root";
  function formatStoreForInspectorTree(store) {
    return isPinia(store) ? {
      id: PINIA_ROOT_ID,
      label: PINIA_ROOT_LABEL
    } : {
      id: store.$id,
      label: store.$id
    };
  }
  function formatStoreForInspectorState(store) {
    if (isPinia(store)) {
      const storeNames = Array.from(store._s.keys());
      const storeMap = store._s;
      const state2 = {
        state: storeNames.map((storeId) => ({
          editable: true,
          key: storeId,
          value: store.state.value[storeId]
        })),
        getters: storeNames.filter((id) => storeMap.get(id)._getters).map((id) => {
          const store2 = storeMap.get(id);
          return {
            editable: false,
            key: id,
            value: store2._getters.reduce((getters, key) => {
              getters[key] = store2[key];
              return getters;
            }, {})
          };
        })
      };
      return state2;
    }
    const state = {
      state: Object.keys(store.$state).map((key) => ({
        editable: true,
        key,
        value: store.$state[key]
      }))
    };
    if (store._getters && store._getters.length) {
      state.getters = store._getters.map((getterName) => ({
        editable: false,
        key: getterName,
        value: store[getterName]
      }));
    }
    if (store._customProperties.size) {
      state.customProperties = Array.from(store._customProperties).map((key) => ({
        editable: true,
        key,
        value: store[key]
      }));
    }
    return state;
  }
  function formatEventData(events) {
    if (!events)
      return {};
    if (Array.isArray(events)) {
      return events.reduce((data, event) => {
        data.keys.push(event.key);
        data.operations.push(event.type);
        data.oldValue[event.key] = event.oldValue;
        data.newValue[event.key] = event.newValue;
        return data;
      }, {
        oldValue: {},
        keys: [],
        operations: [],
        newValue: {}
      });
    } else {
      return {
        operation: formatDisplay(events.type),
        key: formatDisplay(events.key),
        oldValue: events.oldValue,
        newValue: events.newValue
      };
    }
  }
  function formatMutationType(type) {
    switch (type) {
      case MutationType.direct:
        return "mutation";
      case MutationType.patchFunction:
        return "$patch";
      case MutationType.patchObject:
        return "$patch";
      default:
        return "unknown";
    }
  }
  let isTimelineActive = true;
  const componentStateTypes = [];
  const MUTATIONS_LAYER_ID = "pinia:mutations";
  const INSPECTOR_ID = "pinia";
  const { assign: assign$1 } = Object;
  const getStoreType = (id) => "🍍 " + id;
  function registerPiniaDevtools(app, pinia) {
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app
    }, (api) => {
      if (typeof api.now !== "function") {
        toastMessage("You seem to be using an outdated version of Vue Devtools. Are you still using the Beta release instead of the stable one? You can find the links at https://devtools.vuejs.org/guide/installation.html.");
      }
      api.addTimelineLayer({
        id: MUTATIONS_LAYER_ID,
        label: `Pinia 🍍`,
        color: 15064968
      });
      api.addInspector({
        id: INSPECTOR_ID,
        label: "Pinia 🍍",
        icon: "storage",
        treeFilterPlaceholder: "Search stores",
        actions: [
          {
            icon: "content_copy",
            action: () => {
              actionGlobalCopyState(pinia);
            },
            tooltip: "Serialize and copy the state"
          },
          {
            icon: "content_paste",
            action: async () => {
              await actionGlobalPasteState(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Replace the state with the content of your clipboard"
          },
          {
            icon: "save",
            action: () => {
              actionGlobalSaveState(pinia);
            },
            tooltip: "Save the state as a JSON file"
          },
          {
            icon: "folder_open",
            action: async () => {
              await actionGlobalOpenStateFile(pinia);
              api.sendInspectorTree(INSPECTOR_ID);
              api.sendInspectorState(INSPECTOR_ID);
            },
            tooltip: "Import the state from a JSON file"
          }
        ],
        nodeActions: [
          {
            icon: "restore",
            tooltip: 'Reset the state (with "$reset")',
            action: (nodeId) => {
              const store = pinia._s.get(nodeId);
              if (!store) {
                toastMessage(`Cannot reset "${nodeId}" store because it wasn't found.`, "warn");
              } else if (typeof store.$reset !== "function") {
                toastMessage(`Cannot reset "${nodeId}" store because it doesn't have a "$reset" method implemented.`, "warn");
              } else {
                store.$reset();
                toastMessage(`Store "${nodeId}" reset.`);
              }
            }
          }
        ]
      });
      api.on.inspectComponent((payload, ctx) => {
        const proxy = payload.componentInstance && payload.componentInstance.proxy;
        if (proxy && proxy._pStores) {
          const piniaStores = payload.componentInstance.proxy._pStores;
          Object.values(piniaStores).forEach((store) => {
            payload.instanceData.state.push({
              type: getStoreType(store.$id),
              key: "state",
              editable: true,
              value: store._isOptionsAPI ? {
                _custom: {
                  value: vue.toRaw(store.$state),
                  actions: [
                    {
                      icon: "restore",
                      tooltip: "Reset the state of this store",
                      action: () => store.$reset()
                    }
                  ]
                }
              } : (
                // NOTE: workaround to unwrap transferred refs
                Object.keys(store.$state).reduce((state, key) => {
                  state[key] = store.$state[key];
                  return state;
                }, {})
              )
            });
            if (store._getters && store._getters.length) {
              payload.instanceData.state.push({
                type: getStoreType(store.$id),
                key: "getters",
                editable: false,
                value: store._getters.reduce((getters, key) => {
                  try {
                    getters[key] = store[key];
                  } catch (error) {
                    getters[key] = error;
                  }
                  return getters;
                }, {})
              });
            }
          });
        }
      });
      api.on.getInspectorTree((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          let stores = [pinia];
          stores = stores.concat(Array.from(pinia._s.values()));
          payload.rootNodes = (payload.filter ? stores.filter((store) => "$id" in store ? store.$id.toLowerCase().includes(payload.filter.toLowerCase()) : PINIA_ROOT_LABEL.toLowerCase().includes(payload.filter.toLowerCase())) : stores).map(formatStoreForInspectorTree);
        }
      });
      globalThis.$pinia = pinia;
      api.on.getInspectorState((payload) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return;
          }
          if (inspectedStore) {
            if (payload.nodeId !== PINIA_ROOT_ID)
              globalThis.$store = vue.toRaw(inspectedStore);
            payload.state = formatStoreForInspectorState(inspectedStore);
          }
        }
      });
      api.on.editInspectorState((payload, ctx) => {
        if (payload.app === app && payload.inspectorId === INSPECTOR_ID) {
          const inspectedStore = payload.nodeId === PINIA_ROOT_ID ? pinia : pinia._s.get(payload.nodeId);
          if (!inspectedStore) {
            return toastMessage(`store "${payload.nodeId}" not found`, "error");
          }
          const { path } = payload;
          if (!isPinia(inspectedStore)) {
            if (path.length !== 1 || !inspectedStore._customProperties.has(path[0]) || path[0] in inspectedStore.$state) {
              path.unshift("$state");
            }
          } else {
            path.unshift("state");
          }
          isTimelineActive = false;
          payload.set(inspectedStore, path, payload.state.value);
          isTimelineActive = true;
        }
      });
      api.on.editComponentState((payload) => {
        if (payload.type.startsWith("🍍")) {
          const storeId = payload.type.replace(/^🍍\s*/, "");
          const store = pinia._s.get(storeId);
          if (!store) {
            return toastMessage(`store "${storeId}" not found`, "error");
          }
          const { path } = payload;
          if (path[0] !== "state") {
            return toastMessage(`Invalid path for store "${storeId}":
${path}
Only state can be modified.`);
          }
          path[0] = "$state";
          isTimelineActive = false;
          payload.set(store, path, payload.state.value);
          isTimelineActive = true;
        }
      });
    });
  }
  function addStoreToDevtools(app, store) {
    if (!componentStateTypes.includes(getStoreType(store.$id))) {
      componentStateTypes.push(getStoreType(store.$id));
    }
    setupDevtoolsPlugin({
      id: "dev.esm.pinia",
      label: "Pinia 🍍",
      logo: "https://pinia.vuejs.org/logo.svg",
      packageName: "pinia",
      homepage: "https://pinia.vuejs.org",
      componentStateTypes,
      app,
      settings: {
        logStoreChanges: {
          label: "Notify about new/deleted stores",
          type: "boolean",
          defaultValue: true
        }
        // useEmojis: {
        //   label: 'Use emojis in messages ⚡️',
        //   type: 'boolean',
        //   defaultValue: true,
        // },
      }
    }, (api) => {
      const now2 = typeof api.now === "function" ? api.now.bind(api) : Date.now;
      store.$onAction(({ after, onError, name, args }) => {
        const groupId = runningActionId++;
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🛫 " + name,
            subtitle: "start",
            data: {
              store: formatDisplay(store.$id),
              action: formatDisplay(name),
              args
            },
            groupId
          }
        });
        after((result) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              title: "🛬 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                result
              },
              groupId
            }
          });
        });
        onError((error) => {
          activeAction = void 0;
          api.addTimelineEvent({
            layerId: MUTATIONS_LAYER_ID,
            event: {
              time: now2(),
              logType: "error",
              title: "💥 " + name,
              subtitle: "end",
              data: {
                store: formatDisplay(store.$id),
                action: formatDisplay(name),
                args,
                error
              },
              groupId
            }
          });
        });
      }, true);
      store._customProperties.forEach((name) => {
        vue.watch(() => vue.unref(store[name]), (newValue, oldValue) => {
          api.notifyComponentUpdate();
          api.sendInspectorState(INSPECTOR_ID);
          if (isTimelineActive) {
            api.addTimelineEvent({
              layerId: MUTATIONS_LAYER_ID,
              event: {
                time: now2(),
                title: "Change",
                subtitle: name,
                data: {
                  newValue,
                  oldValue
                },
                groupId: activeAction
              }
            });
          }
        }, { deep: true });
      });
      store.$subscribe(({ events, type }, state) => {
        api.notifyComponentUpdate();
        api.sendInspectorState(INSPECTOR_ID);
        if (!isTimelineActive)
          return;
        const eventData = {
          time: now2(),
          title: formatMutationType(type),
          data: assign$1({ store: formatDisplay(store.$id) }, formatEventData(events)),
          groupId: activeAction
        };
        if (type === MutationType.patchFunction) {
          eventData.subtitle = "⤵️";
        } else if (type === MutationType.patchObject) {
          eventData.subtitle = "🧩";
        } else if (events && !Array.isArray(events)) {
          eventData.subtitle = events.type;
        }
        if (events) {
          eventData.data["rawEvent(s)"] = {
            _custom: {
              display: "DebuggerEvent",
              type: "object",
              tooltip: "raw DebuggerEvent[]",
              value: events
            }
          };
        }
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: eventData
        });
      }, { detached: true, flush: "sync" });
      const hotUpdate = store._hotUpdate;
      store._hotUpdate = vue.markRaw((newStore) => {
        hotUpdate(newStore);
        api.addTimelineEvent({
          layerId: MUTATIONS_LAYER_ID,
          event: {
            time: now2(),
            title: "🔥 " + store.$id,
            subtitle: "HMR update",
            data: {
              store: formatDisplay(store.$id),
              info: formatDisplay(`HMR update`)
            }
          }
        });
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
      });
      const { $dispose } = store;
      store.$dispose = () => {
        $dispose();
        api.notifyComponentUpdate();
        api.sendInspectorTree(INSPECTOR_ID);
        api.sendInspectorState(INSPECTOR_ID);
        api.getSettings().logStoreChanges && toastMessage(`Disposed "${store.$id}" store 🗑`);
      };
      api.notifyComponentUpdate();
      api.sendInspectorTree(INSPECTOR_ID);
      api.sendInspectorState(INSPECTOR_ID);
      api.getSettings().logStoreChanges && toastMessage(`"${store.$id}" store installed 🆕`);
    });
  }
  let runningActionId = 0;
  let activeAction;
  function patchActionForGrouping(store, actionNames, wrapWithProxy) {
    const actions = actionNames.reduce((storeActions, actionName) => {
      storeActions[actionName] = vue.toRaw(store)[actionName];
      return storeActions;
    }, {});
    for (const actionName in actions) {
      store[actionName] = function() {
        const _actionId = runningActionId;
        const trackedStore = wrapWithProxy ? new Proxy(store, {
          get(...args) {
            activeAction = _actionId;
            return Reflect.get(...args);
          },
          set(...args) {
            activeAction = _actionId;
            return Reflect.set(...args);
          }
        }) : store;
        activeAction = _actionId;
        const retValue = actions[actionName].apply(trackedStore, arguments);
        activeAction = void 0;
        return retValue;
      };
    }
  }
  function devtoolsPlugin({ app, store, options }) {
    if (store.$id.startsWith("__hot:")) {
      return;
    }
    store._isOptionsAPI = !!options.state;
    if (!store._p._testing) {
      patchActionForGrouping(store, Object.keys(options.actions), store._isOptionsAPI);
      const originalHotUpdate = store._hotUpdate;
      vue.toRaw(store)._hotUpdate = function(newStore) {
        originalHotUpdate.apply(this, arguments);
        patchActionForGrouping(store, Object.keys(newStore._hmrPayload.actions), !!store._isOptionsAPI);
      };
    }
    addStoreToDevtools(
      app,
      // FIXME: is there a way to allow the assignment from Store<Id, S, G, A> to StoreGeneric?
      store
    );
  }
  function createPinia() {
    const scope = vue.effectScope(true);
    const state = scope.run(() => vue.ref({}));
    let _p = [];
    let toBeInstalled = [];
    const pinia = vue.markRaw({
      install(app) {
        setActivePinia(pinia);
        {
          pinia._a = app;
          app.provide(piniaSymbol, pinia);
          app.config.globalProperties.$pinia = pinia;
          if (IS_CLIENT) {
            registerPiniaDevtools(app, pinia);
          }
          toBeInstalled.forEach((plugin) => _p.push(plugin));
          toBeInstalled = [];
        }
      },
      use(plugin) {
        if (!this._a && true) {
          toBeInstalled.push(plugin);
        } else {
          _p.push(plugin);
        }
        return this;
      },
      _p,
      // it's actually undefined here
      // @ts-expect-error
      _a: null,
      _e: scope,
      _s: /* @__PURE__ */ new Map(),
      state
    });
    if (IS_CLIENT && typeof Proxy !== "undefined") {
      pinia.use(devtoolsPlugin);
    }
    return pinia;
  }
  function patchObject(newState, oldState) {
    for (const key in oldState) {
      const subPatch = oldState[key];
      if (!(key in newState)) {
        continue;
      }
      const targetValue = newState[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        newState[key] = patchObject(targetValue, subPatch);
      } else {
        {
          newState[key] = subPatch;
        }
      }
    }
    return newState;
  }
  const noop = () => {
  };
  function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
      const idx = subscriptions.indexOf(callback);
      if (idx > -1) {
        subscriptions.splice(idx, 1);
        onCleanup();
      }
    };
    if (!detached && vue.getCurrentScope()) {
      vue.onScopeDispose(removeSubscription);
    }
    return removeSubscription;
  }
  function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
      callback(...args);
    });
  }
  const fallbackRunWithContext = (fn) => fn();
  const ACTION_MARKER = Symbol();
  const ACTION_NAME = Symbol();
  function mergeReactiveObjects(target, patchToApply) {
    if (target instanceof Map && patchToApply instanceof Map) {
      patchToApply.forEach((value, key) => target.set(key, value));
    } else if (target instanceof Set && patchToApply instanceof Set) {
      patchToApply.forEach(target.add, target);
    }
    for (const key in patchToApply) {
      if (!patchToApply.hasOwnProperty(key))
        continue;
      const subPatch = patchToApply[key];
      const targetValue = target[key];
      if (isPlainObject(targetValue) && isPlainObject(subPatch) && target.hasOwnProperty(key) && !vue.isRef(subPatch) && !vue.isReactive(subPatch)) {
        target[key] = mergeReactiveObjects(targetValue, subPatch);
      } else {
        target[key] = subPatch;
      }
    }
    return target;
  }
  const skipHydrateSymbol = Symbol("pinia:skipHydration");
  function shouldHydrate(obj) {
    return !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
  }
  const { assign } = Object;
  function isComputed(o) {
    return !!(vue.isRef(o) && o.effect);
  }
  function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
      if (!initialState && !hot) {
        {
          pinia.state.value[id] = state ? state() : {};
        }
      }
      const localState = hot ? (
        // use ref() to unwrap refs inside state TODO: check if this is still necessary
        vue.toRefs(vue.ref(state ? state() : {}).value)
      ) : vue.toRefs(pinia.state.value[id]);
      return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
        if (name in localState) {
          console.warn(`[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`);
        }
        computedGetters[name] = vue.markRaw(vue.computed(() => {
          setActivePinia(pinia);
          const store2 = pinia._s.get(id);
          return getters[name].call(store2, store2);
        }));
        return computedGetters;
      }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
  }
  function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    if (!pinia._e.active) {
      throw new Error("Pinia destroyed");
    }
    const $subscribeOptions = { deep: true };
    {
      $subscribeOptions.onTrigger = (event) => {
        if (isListening) {
          debuggerEvents = event;
        } else if (isListening == false && !store._hotUpdating) {
          if (Array.isArray(debuggerEvents)) {
            debuggerEvents.push(event);
          } else {
            console.error("🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug.");
          }
        }
      };
    }
    let isListening;
    let isSyncListening;
    let subscriptions = [];
    let actionSubscriptions = [];
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    if (!isOptionsStore && !initialState && !hot) {
      {
        pinia.state.value[$id] = {};
      }
    }
    const hotState = vue.ref({});
    let activeListener;
    function $patch(partialStateOrMutator) {
      let subscriptionMutation;
      isListening = isSyncListening = false;
      {
        debuggerEvents = [];
      }
      if (typeof partialStateOrMutator === "function") {
        partialStateOrMutator(pinia.state.value[$id]);
        subscriptionMutation = {
          type: MutationType.patchFunction,
          storeId: $id,
          events: debuggerEvents
        };
      } else {
        mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
        subscriptionMutation = {
          type: MutationType.patchObject,
          payload: partialStateOrMutator,
          storeId: $id,
          events: debuggerEvents
        };
      }
      const myListenerId = activeListener = Symbol();
      vue.nextTick().then(() => {
        if (activeListener === myListenerId) {
          isListening = true;
        }
      });
      isSyncListening = true;
      triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore ? function $reset2() {
      const { state } = options;
      const newState = state ? state() : {};
      this.$patch(($state) => {
        assign($state, newState);
      });
    } : (
      /* istanbul ignore next */
      () => {
        throw new Error(`🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`);
      }
    );
    function $dispose() {
      scope.stop();
      subscriptions = [];
      actionSubscriptions = [];
      pinia._s.delete($id);
    }
    const action = (fn, name = "") => {
      if (ACTION_MARKER in fn) {
        fn[ACTION_NAME] = name;
        return fn;
      }
      const wrappedAction = function() {
        setActivePinia(pinia);
        const args = Array.from(arguments);
        const afterCallbackList = [];
        const onErrorCallbackList = [];
        function after(callback) {
          afterCallbackList.push(callback);
        }
        function onError(callback) {
          onErrorCallbackList.push(callback);
        }
        triggerSubscriptions(actionSubscriptions, {
          args,
          name: wrappedAction[ACTION_NAME],
          store,
          after,
          onError
        });
        let ret;
        try {
          ret = fn.apply(this && this.$id === $id ? this : store, args);
        } catch (error) {
          triggerSubscriptions(onErrorCallbackList, error);
          throw error;
        }
        if (ret instanceof Promise) {
          return ret.then((value) => {
            triggerSubscriptions(afterCallbackList, value);
            return value;
          }).catch((error) => {
            triggerSubscriptions(onErrorCallbackList, error);
            return Promise.reject(error);
          });
        }
        triggerSubscriptions(afterCallbackList, ret);
        return ret;
      };
      wrappedAction[ACTION_MARKER] = true;
      wrappedAction[ACTION_NAME] = name;
      return wrappedAction;
    };
    const _hmrPayload = /* @__PURE__ */ vue.markRaw({
      actions: {},
      getters: {},
      state: [],
      hotState
    });
    const partialStore = {
      _p: pinia,
      // _s: scope,
      $id,
      $onAction: addSubscription.bind(null, actionSubscriptions),
      $patch,
      $reset,
      $subscribe(callback, options2 = {}) {
        const removeSubscription = addSubscription(subscriptions, callback, options2.detached, () => stopWatcher());
        const stopWatcher = scope.run(() => vue.watch(() => pinia.state.value[$id], (state) => {
          if (options2.flush === "sync" ? isSyncListening : isListening) {
            callback({
              storeId: $id,
              type: MutationType.direct,
              events: debuggerEvents
            }, state);
          }
        }, assign({}, $subscribeOptions, options2)));
        return removeSubscription;
      },
      $dispose
    };
    const store = vue.reactive(assign(
      {
        _hmrPayload,
        _customProperties: vue.markRaw(/* @__PURE__ */ new Set())
        // devtools custom properties
      },
      partialStore
      // must be added later
      // setupStore
    ));
    pinia._s.set($id, store);
    const runWithContext = pinia._a && pinia._a.runWithContext || fallbackRunWithContext;
    const setupStore = runWithContext(() => pinia._e.run(() => (scope = vue.effectScope()).run(() => setup({ action }))));
    for (const key in setupStore) {
      const prop = setupStore[key];
      if (vue.isRef(prop) && !isComputed(prop) || vue.isReactive(prop)) {
        if (hot) {
          set(hotState.value, key, vue.toRef(setupStore, key));
        } else if (!isOptionsStore) {
          if (initialState && shouldHydrate(prop)) {
            if (vue.isRef(prop)) {
              prop.value = initialState[key];
            } else {
              mergeReactiveObjects(prop, initialState[key]);
            }
          }
          {
            pinia.state.value[$id][key] = prop;
          }
        }
        {
          _hmrPayload.state.push(key);
        }
      } else if (typeof prop === "function") {
        const actionValue = hot ? prop : action(prop, key);
        {
          setupStore[key] = actionValue;
        }
        {
          _hmrPayload.actions[key] = prop;
        }
        optionsForPlugin.actions[key] = prop;
      } else {
        if (isComputed(prop)) {
          _hmrPayload.getters[key] = isOptionsStore ? (
            // @ts-expect-error
            options.getters[key]
          ) : prop;
          if (IS_CLIENT) {
            const getters = setupStore._getters || // @ts-expect-error: same
            (setupStore._getters = vue.markRaw([]));
            getters.push(key);
          }
        }
      }
    }
    {
      assign(store, setupStore);
      assign(vue.toRaw(store), setupStore);
    }
    Object.defineProperty(store, "$state", {
      get: () => hot ? hotState.value : pinia.state.value[$id],
      set: (state) => {
        if (hot) {
          throw new Error("cannot set hotState");
        }
        $patch(($state) => {
          assign($state, state);
        });
      }
    });
    {
      store._hotUpdate = vue.markRaw((newStore) => {
        store._hotUpdating = true;
        newStore._hmrPayload.state.forEach((stateKey) => {
          if (stateKey in store.$state) {
            const newStateTarget = newStore.$state[stateKey];
            const oldStateSource = store.$state[stateKey];
            if (typeof newStateTarget === "object" && isPlainObject(newStateTarget) && isPlainObject(oldStateSource)) {
              patchObject(newStateTarget, oldStateSource);
            } else {
              newStore.$state[stateKey] = oldStateSource;
            }
          }
          set(store, stateKey, vue.toRef(newStore.$state, stateKey));
        });
        Object.keys(store.$state).forEach((stateKey) => {
          if (!(stateKey in newStore.$state)) {
            del(store, stateKey);
          }
        });
        isListening = false;
        isSyncListening = false;
        pinia.state.value[$id] = vue.toRef(newStore._hmrPayload, "hotState");
        isSyncListening = true;
        vue.nextTick().then(() => {
          isListening = true;
        });
        for (const actionName in newStore._hmrPayload.actions) {
          const actionFn = newStore[actionName];
          set(store, actionName, action(actionFn, actionName));
        }
        for (const getterName in newStore._hmrPayload.getters) {
          const getter = newStore._hmrPayload.getters[getterName];
          const getterValue = isOptionsStore ? (
            // special handling of options api
            vue.computed(() => {
              setActivePinia(pinia);
              return getter.call(store, store);
            })
          ) : getter;
          set(store, getterName, getterValue);
        }
        Object.keys(store._hmrPayload.getters).forEach((key) => {
          if (!(key in newStore._hmrPayload.getters)) {
            del(store, key);
          }
        });
        Object.keys(store._hmrPayload.actions).forEach((key) => {
          if (!(key in newStore._hmrPayload.actions)) {
            del(store, key);
          }
        });
        store._hmrPayload = newStore._hmrPayload;
        store._getters = newStore._getters;
        store._hotUpdating = false;
      });
    }
    if (IS_CLIENT) {
      const nonEnumerable = {
        writable: true,
        configurable: true,
        // avoid warning on devtools trying to display this property
        enumerable: false
      };
      ["_p", "_hmrPayload", "_getters", "_customProperties"].forEach((p) => {
        Object.defineProperty(store, p, assign({ value: store[p] }, nonEnumerable));
      });
    }
    pinia._p.forEach((extender) => {
      if (IS_CLIENT) {
        const extensions = scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        }));
        Object.keys(extensions || {}).forEach((key) => store._customProperties.add(key));
        assign(store, extensions);
      } else {
        assign(store, scope.run(() => extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin
        })));
      }
    });
    if (store.$state && typeof store.$state === "object" && typeof store.$state.constructor === "function" && !store.$state.constructor.toString().includes("[native code]")) {
      console.warn(`[🍍]: The "state" must be a plain object. It cannot be
	state: () => new MyClass()
Found in store "${store.$id}".`);
    }
    if (initialState && isOptionsStore && options.hydrate) {
      options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
  }
  /*! #__NO_SIDE_EFFECTS__ */
  // @__NO_SIDE_EFFECTS__
  function defineStore(idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === "function";
    if (typeof idOrOptions === "string") {
      id = idOrOptions;
      options = isSetupStore ? setupOptions : setup;
    } else {
      options = idOrOptions;
      id = idOrOptions.id;
      if (typeof id !== "string") {
        throw new Error(`[🍍]: "defineStore()" must be passed a store id as its first argument.`);
      }
    }
    function useStore(pinia, hot) {
      const hasContext = vue.hasInjectionContext();
      pinia = // in test mode, ignore the argument provided as we can always retrieve a
      // pinia instance with getActivePinia()
      pinia || (hasContext ? vue.inject(piniaSymbol, null) : null);
      if (pinia)
        setActivePinia(pinia);
      if (!activePinia) {
        throw new Error(`[🍍]: "getActivePinia()" was called but there was no active Pinia. Are you trying to use a store before calling "app.use(pinia)"?
See https://pinia.vuejs.org/core-concepts/outside-component-usage.html for help.
This will fail in production.`);
      }
      pinia = activePinia;
      if (!pinia._s.has(id)) {
        if (isSetupStore) {
          createSetupStore(id, setup, options, pinia);
        } else {
          createOptionsStore(id, options, pinia);
        }
        {
          useStore._pinia = pinia;
        }
      }
      const store = pinia._s.get(id);
      if (hot) {
        const hotId = "__hot:" + id;
        const newStore = isSetupStore ? createSetupStore(hotId, setup, options, pinia, true) : createOptionsStore(hotId, assign({}, options), pinia, true);
        hot._hotUpdate(newStore);
        delete pinia.state.value[hotId];
        pinia._s.delete(hotId);
      }
      if (IS_CLIENT) {
        const currentInstance = vue.getCurrentInstance();
        if (currentInstance && currentInstance.proxy && // avoid adding stores that are just built for hot module replacement
        !hot) {
          const vm = currentInstance.proxy;
          const cache = "_pStores" in vm ? vm._pStores : vm._pStores = {};
          cache[id] = store;
        }
      }
      return store;
    }
    useStore.$id = id;
    return useStore;
  }
  const useServerStore = /* @__PURE__ */ defineStore("server", {
    state: () => ({
      currentServer: null,
      serverHistory: [],
      isConnected: false,
      isChecking: false
    }),
    getters: {
      // 获取API基础地址
      apiBaseUrl() {
        if (!this.currentServer) return "";
        const { protocol, host, port } = this.currentServer;
        const portStr = port ? `:${port}` : "";
        return `${protocol}://${host}${portStr}/api/v1`;
      },
      // 获取WebSocket地址
      wsUrl() {
        if (!this.currentServer) return "";
        const { protocol, host, port } = this.currentServer;
        const wsProtocol = protocol === "https" ? "wss" : "ws";
        const portStr = port ? `:${port}` : "";
        return `${wsProtocol}://${host}${portStr}`;
      },
      // 显示用的服务器地址
      displayUrl() {
        if (!this.currentServer) return "未配置";
        const { host, port } = this.currentServer;
        return port ? `${host}:${port}` : host;
      }
    },
    actions: {
      // 解析用户输入的服务器地址
      parseServerInput(input) {
        let host = input.trim();
        let protocol = "https";
        let port;
        if (host.startsWith("https://")) {
          host = host.replace("https://", "");
          protocol = "https";
        } else if (host.startsWith("http://")) {
          host = host.replace("http://", "");
          protocol = "http";
        }
        host = host.split("/")[0];
        if (host.includes(":")) {
          const parts = host.split(":");
          host = parts[0];
          port = parseInt(parts[1]);
        }
        if (host.startsWith("192.168.") || host.startsWith("10.") || host === "localhost" || host.startsWith("172.")) {
          protocol = "http";
        }
        return {
          host,
          protocol,
          port,
          lastUsed: (/* @__PURE__ */ new Date()).toISOString()
        };
      },
      // 测试服务器连接
      async testConnection(serverInfo) {
        this.isChecking = true;
        const { protocol, host, port } = serverInfo;
        const portStr = port ? `:${port}` : "";
        const url = `${protocol}://${host}${portStr}/api/v1/mobile/ping`;
        try {
          const res = await new Promise((resolve, reject) => {
            uni.request({
              url,
              method: "GET",
              timeout: 5e3,
              success: resolve,
              fail: reject
            });
          });
          this.isChecking = false;
          return res.statusCode === 200;
        } catch (e) {
          this.isChecking = false;
          return false;
        }
      },
      // 设置当前服务器
      async setServer(input) {
        const serverInfo = this.parseServerInput(input);
        const connected = await this.testConnection(serverInfo);
        if (!connected) {
          return { success: false, message: "无法连接到服务器，请检查地址是否正确" };
        }
        this.currentServer = serverInfo;
        this.isConnected = true;
        this.addToHistory(serverInfo);
        this.saveToStorage();
        return { success: true, message: "服务器配置成功" };
      },
      // 添加到历史记录
      addToHistory(serverInfo) {
        this.serverHistory = this.serverHistory.filter(
          (s) => s.host !== serverInfo.host || s.port !== serverInfo.port
        );
        this.serverHistory.unshift(serverInfo);
        if (this.serverHistory.length > 5) {
          this.serverHistory = this.serverHistory.slice(0, 5);
        }
      },
      // 从历史记录选择
      async selectFromHistory(serverInfo) {
        const connected = await this.testConnection(serverInfo);
        if (connected) {
          serverInfo.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
          this.currentServer = serverInfo;
          this.isConnected = true;
          this.addToHistory(serverInfo);
          this.saveToStorage();
          return true;
        }
        return false;
      },
      // 保存到本地存储
      saveToStorage() {
        if (this.currentServer) {
          uni.setStorageSync("currentServer", JSON.stringify(this.currentServer));
        }
        uni.setStorageSync("serverHistory", JSON.stringify(this.serverHistory));
      },
      // 从本地存储恢复
      restoreFromStorage() {
        try {
          const current = uni.getStorageSync("currentServer");
          const history = uni.getStorageSync("serverHistory");
          if (current) {
            this.currentServer = JSON.parse(current);
          }
          if (history) {
            this.serverHistory = JSON.parse(history);
          }
        } catch (e) {
          formatAppLog("error", "at stores/server.ts:195", "恢复服务器配置失败:", e);
        }
      },
      // 清除服务器配置
      clearServer() {
        this.currentServer = null;
        this.isConnected = false;
        uni.removeStorageSync("currentServer");
      }
    }
  });
  const useUserStore = /* @__PURE__ */ defineStore("user", {
    state: () => ({
      token: "",
      wsToken: "",
      wsUrl: "",
      userInfo: null,
      deviceInfo: null,
      isLoggedIn: false,
      isBound: false
    }),
    actions: {
      // 设置登录信息
      setLoginInfo(data) {
        this.token = data.token;
        this.userInfo = data.user;
        this.isLoggedIn = true;
        uni.setStorageSync("token", data.token);
        uni.setStorageSync("userInfo", JSON.stringify(data.user));
      },
      // 设置WebSocket信息
      setWsInfo(wsToken, wsUrl) {
        this.wsToken = wsToken;
        this.wsUrl = wsUrl;
        uni.setStorageSync("wsToken", wsToken);
        uni.setStorageSync("wsUrl", wsUrl);
      },
      // 设置设备绑定信息
      setDeviceInfo(deviceInfo) {
        this.deviceInfo = deviceInfo;
        this.isBound = true;
        uni.setStorageSync("deviceInfo", JSON.stringify(deviceInfo));
      },
      // 清除设备绑定
      clearDeviceInfo() {
        this.deviceInfo = null;
        this.isBound = false;
        this.wsToken = "";
        this.wsUrl = "";
        uni.removeStorageSync("deviceInfo");
        uni.removeStorageSync("wsToken");
        uni.removeStorageSync("wsUrl");
      },
      // 退出登录
      logout() {
        this.token = "";
        this.wsToken = "";
        this.wsUrl = "";
        this.userInfo = null;
        this.deviceInfo = null;
        this.isLoggedIn = false;
        this.isBound = false;
        uni.removeStorageSync("token");
        uni.removeStorageSync("userInfo");
        uni.removeStorageSync("wsToken");
        uni.removeStorageSync("wsUrl");
        uni.removeStorageSync("deviceInfo");
      },
      // 从本地存储恢复
      restore() {
        try {
          const token = uni.getStorageSync("token");
          const userInfo = uni.getStorageSync("userInfo");
          const wsToken = uni.getStorageSync("wsToken");
          const wsUrl = uni.getStorageSync("wsUrl");
          const deviceInfo = uni.getStorageSync("deviceInfo");
          if (token) {
            this.token = token;
            this.isLoggedIn = true;
          }
          if (userInfo) {
            this.userInfo = JSON.parse(userInfo);
          }
          if (wsToken) {
            this.wsToken = wsToken;
          }
          if (wsUrl) {
            this.wsUrl = wsUrl;
          }
          if (deviceInfo) {
            this.deviceInfo = JSON.parse(deviceInfo);
            this.isBound = true;
          }
        } catch (e) {
          formatAppLog("error", "at stores/user.ts:124", "恢复用户信息失败:", e);
        }
      }
    }
  });
  const _sfc_main$f = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const loadingText = vue.ref("正在启动...");
      const serverStore = useServerStore();
      const userStore = useUserStore();
      vue.onMounted(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        loadingText.value = "检查配置...";
        if (!serverStore.currentServer) {
          loadingText.value = "请配置服务器";
          setTimeout(() => {
            uni.reLaunch({ url: "/pages/server-config/index" });
          }, 500);
          return;
        }
        loadingText.value = "连接服务器...";
        const connected = await serverStore.testConnection(serverStore.currentServer);
        if (!connected) {
          loadingText.value = "服务器连接失败";
          uni.showToast({ title: "服务器连接失败", icon: "none" });
          setTimeout(() => {
            uni.reLaunch({ url: "/pages/server-config/index" });
          }, 1500);
          return;
        }
        serverStore.isConnected = true;
        if (userStore.isLoggedIn && userStore.token) {
          loadingText.value = "正在进入...";
          setTimeout(() => {
            uni.switchTab({ url: "/pages/index/index" });
          }, 500);
        } else {
          loadingText.value = "请登录";
          setTimeout(() => {
            uni.reLaunch({ url: "/pages/login/index" });
          }, 500);
        }
      });
      const __returned__ = { loadingText, serverStore, userStore };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  const _imports_0 = "/assets/logo.46719607.png";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  function _sfc_render$e(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "splash-page" }, [
      vue.createElementVNode("view", { class: "content" }, [
        vue.createElementVNode("image", {
          class: "logo",
          src: _imports_0,
          mode: "aspectFit"
        }),
        vue.createElementVNode("text", { class: "title" }, "CRM外呼助手"),
        vue.createElementVNode("text", { class: "subtitle" }, "高效外呼 · 智能管理")
      ]),
      vue.createElementVNode("view", { class: "loading" }, [
        vue.createElementVNode("view", { class: "loading-dots" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList(3, (i) => {
              return vue.createElementVNode("view", {
                class: "dot",
                key: i
              });
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ]),
        vue.createElementVNode(
          "text",
          { class: "loading-text" },
          vue.toDisplayString($setup.loadingText),
          1
          /* TEXT */
        )
      ]),
      vue.createElementVNode("text", { class: "version" }, "v1.0.0")
    ]);
  }
  const PagesSplashIndex = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["render", _sfc_render$e], ["__scopeId", "data-v-cf5f955c"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/splash/index.vue"]]);
  const _sfc_main$e = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const serverStore = useServerStore();
      const serverInput = vue.ref("");
      const isLoading = vue.ref(false);
      const handleTestConnection = async () => {
        if (!serverInput.value.trim()) return;
        isLoading.value = true;
        const result = await serverStore.setServer(serverInput.value);
        isLoading.value = false;
        if (result.success) {
          uni.showToast({ title: "连接成功", icon: "success" });
          serverInput.value = "";
          setTimeout(() => {
            uni.reLaunch({ url: "/pages/login/index" });
          }, 1e3);
        } else {
          uni.showToast({ title: result.message, icon: "none" });
        }
      };
      const handleScanConfig = () => {
        uni.scanCode({
          scanType: ["qrCode"],
          success: async (res) => {
            try {
              const config = JSON.parse(res.result);
              if (config.server || config.serverUrl) {
                serverInput.value = config.server || config.serverUrl;
                await handleTestConnection();
              }
            } catch (e) {
              serverInput.value = res.result;
              await handleTestConnection();
            }
          },
          fail: () => {
            uni.showToast({ title: "扫码失败", icon: "none" });
          }
        });
      };
      const handleSelectHistory = async (server) => {
        isLoading.value = true;
        const success = await serverStore.selectFromHistory(server);
        isLoading.value = false;
        if (success) {
          uni.showToast({ title: "切换成功", icon: "success" });
          setTimeout(() => {
            uni.reLaunch({ url: "/pages/login/index" });
          }, 1e3);
        } else {
          uni.showToast({ title: "连接失败", icon: "none" });
        }
      };
      const isCurrentServer = (server) => {
        const current = serverStore.currentServer;
        if (!current) return false;
        return current.host === server.host && current.port === server.port;
      };
      const formatServerHost = (server) => {
        return server.port ? `${server.host}:${server.port}` : server.host;
      };
      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}-${date.getDate()}`;
      };
      const __returned__ = { serverStore, serverInput, isLoading, handleTestConnection, handleScanConfig, handleSelectHistory, isCurrentServer, formatServerHost, formatDate };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$d(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "server-config" }, [
      vue.createCommentVNode(" 当前服务器状态 "),
      $setup.serverStore.currentServer ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "当前服务器"),
        vue.createElementVNode("view", { class: "server-card active" }, [
          vue.createElementVNode("view", { class: "server-icon" }, "🌐"),
          vue.createElementVNode("view", { class: "server-info" }, [
            vue.createElementVNode(
              "text",
              { class: "server-host" },
              vue.toDisplayString($setup.serverStore.displayUrl),
              1
              /* TEXT */
            ),
            vue.createElementVNode(
              "text",
              {
                class: vue.normalizeClass(["server-status", { connected: $setup.serverStore.isConnected }])
              },
              vue.toDisplayString($setup.serverStore.isConnected ? "✅ 已连接" : "❌ 未连接"),
              3
              /* TEXT, CLASS */
            )
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 输入服务器地址 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "输入服务器地址"),
        vue.createElementVNode("view", { class: "input-wrapper" }, [
          vue.withDirectives(vue.createElementVNode("input", {
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.serverInput = $event),
            placeholder: "请输入域名或IP地址",
            "placeholder-class": "placeholder",
            disabled: $setup.isLoading
          }, null, 8, ["disabled"]), [
            [vue.vModelText, $setup.serverInput]
          ])
        ]),
        vue.createElementVNode("text", { class: "hint" }, "支持格式：abc789.cn、192.168.1.100:3000")
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "actions" }, [
        vue.createElementVNode("button", {
          class: "btn-primary",
          onClick: $setup.handleTestConnection,
          loading: $setup.isLoading,
          disabled: !$setup.serverInput.trim()
        }, " 测试并保存 ", 8, ["loading", "disabled"]),
        vue.createElementVNode("button", {
          class: "btn-secondary",
          onClick: $setup.handleScanConfig
        }, " 📷 扫码配置服务器 ")
      ]),
      vue.createCommentVNode(" 历史服务器 "),
      $setup.serverStore.serverHistory.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "历史服务器"),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.serverStore.serverHistory, (server, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              class: vue.normalizeClass(["server-card", { active: $setup.isCurrentServer(server) }]),
              key: index,
              onClick: ($event) => $setup.handleSelectHistory(server)
            }, [
              vue.createElementVNode("view", { class: "server-icon" }, "🌐"),
              vue.createElementVNode("view", { class: "server-info" }, [
                vue.createElementVNode(
                  "text",
                  { class: "server-host" },
                  vue.toDisplayString($setup.formatServerHost(server)),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode(
                  "text",
                  { class: "server-time" },
                  "最近: " + vue.toDisplayString($setup.formatDate(server.lastUsed)),
                  1
                  /* TEXT */
                )
              ]),
              $setup.isCurrentServer(server) ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "server-check"
              }, "✓")) : vue.createCommentVNode("v-if", true)
            ], 10, ["onClick"]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 提示信息 "),
      vue.createElementVNode("view", { class: "tips" }, [
        vue.createElementVNode("text", null, "💡 提示：请向管理员获取服务器地址，或扫描配置二维码")
      ])
    ]);
  }
  const PagesServerConfigIndex = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["render", _sfc_render$d], ["__scopeId", "data-v-dacb39f7"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/server-config/index.vue"]]);
  const request = (options) => {
    const serverStore = useServerStore();
    const userStore = useUserStore();
    if (!serverStore.apiBaseUrl) {
      return Promise.reject(new Error("服务器未配置"));
    }
    const savedToken = uni.getStorageSync("token");
    if (savedToken && !userStore.token) {
      userStore.token = savedToken;
      userStore.isLoggedIn = true;
    }
    if (options.showLoading !== false) {
      uni.showLoading({
        title: options.loadingText || "加载中...",
        mask: true
      });
    }
    const token = savedToken || userStore.token || "";
    formatAppLog("log", "at utils/request.ts:47", "API请求:", options.url, "token:", token ? "有" : "无");
    return new Promise((resolve, reject) => {
      uni.request({
        url: serverStore.apiBaseUrl + options.url,
        method: options.method || "GET",
        data: options.data,
        header: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "",
          ...options.header
        },
        timeout: 15e3,
        success: (res) => {
          uni.hideLoading();
          formatAppLog("log", "at utils/request.ts:63", "API响应:", options.url, res.statusCode, JSON.stringify(res.data).substring(0, 200));
          const data = res.data;
          if (res.statusCode === 200 && (data.success || data.code === 200)) {
            formatAppLog("log", "at utils/request.ts:68", "API成功，返回data:", JSON.stringify(data.data).substring(0, 100));
            resolve(data.data);
            return;
          }
          if (res.statusCode === 401) {
            const pages = getCurrentPages();
            const currentPage = pages[pages.length - 1];
            const currentPath = (currentPage == null ? void 0 : currentPage.route) || "";
            formatAppLog("log", "at utils/request.ts:80", "401错误，当前页面:", currentPath);
            if (currentPath.includes("login")) {
              reject(new Error("登录已过期"));
              return;
            }
            setTimeout(() => {
              if (!userStore.token) {
                userStore.logout();
                uni.reLaunch({ url: "/pages/login/index" });
              }
            }, 500);
            reject(new Error("登录已过期，请重新登录"));
            return;
          }
          const errorMsg = data.message || "请求失败";
          uni.showToast({
            title: errorMsg,
            icon: "none",
            duration: 2e3
          });
          reject(new Error(errorMsg));
        },
        fail: (err) => {
          uni.hideLoading();
          const errorMsg = err.errMsg || "网络错误";
          uni.showToast({
            title: "网络连接失败",
            icon: "none",
            duration: 2e3
          });
          reject(new Error(errorMsg));
        }
      });
    });
  };
  const uploadFile = (options) => {
    const serverStore = useServerStore();
    const userStore = useUserStore();
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: serverStore.apiBaseUrl + options.url,
        filePath: options.filePath,
        name: options.name,
        formData: options.formData,
        header: {
          "Authorization": userStore.token ? `Bearer ${userStore.token}` : ""
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.success || data.code === 200) {
              resolve(data.data);
            } else {
              reject(new Error(data.message || "上传失败"));
            }
          } catch (e) {
            reject(new Error("解析响应失败"));
          }
        },
        fail: (err) => {
          reject(new Error(err.errMsg || "上传失败"));
        }
      });
    });
  };
  const login = (data) => {
    return request({
      url: "/mobile/login",
      method: "POST",
      data,
      showLoading: true,
      loadingText: "登录中..."
    });
  };
  const bindDevice = (data) => {
    return request({
      url: "/mobile/bind",
      method: "POST",
      data,
      showLoading: true,
      loadingText: "绑定中..."
    });
  };
  const unbindDevice = (deviceId) => {
    return request({
      url: "/mobile/unbind",
      method: "DELETE",
      data: { deviceId },
      showLoading: true,
      loadingText: "解绑中..."
    });
  };
  const _sfc_main$d = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const serverStore = useServerStore();
      const userStore = useUserStore();
      const username = vue.ref("");
      const password = vue.ref("");
      const rememberPassword = vue.ref(true);
      const agreedToTerms = vue.ref(false);
      const isLoading = vue.ref(false);
      const canLogin = vue.computed(() => {
        return username.value.trim() && password.value.trim() && agreedToTerms.value && !isLoading.value;
      });
      vue.onMounted(() => {
        const savedUsername = uni.getStorageSync("savedUsername");
        const savedPassword = uni.getStorageSync("savedPassword");
        const savedAgreement = uni.getStorageSync("agreedToTerms");
        if (savedUsername) {
          username.value = savedUsername;
        }
        if (savedPassword) {
          password.value = savedPassword;
        }
        if (savedAgreement) {
          agreedToTerms.value = true;
        }
      });
      const toggleAgreement = () => {
        agreedToTerms.value = !agreedToTerms.value;
      };
      const openUserAgreement = () => {
        uni.navigateTo({ url: "/pages/agreement/user-agreement" });
      };
      const openPrivacyPolicy = () => {
        uni.navigateTo({ url: "/pages/agreement/privacy-policy" });
      };
      const handleLogin = async () => {
        if (!agreedToTerms.value) {
          uni.showToast({
            title: "请先阅读并同意用户协议和隐私政策",
            icon: "none",
            duration: 2e3
          });
          return;
        }
        if (!canLogin.value) return;
        isLoading.value = true;
        try {
          const systemInfo = uni.getSystemInfoSync();
          const result = await login({
            username: username.value,
            password: password.value,
            deviceInfo: {
              deviceId: systemInfo.deviceId || "",
              deviceName: systemInfo.deviceModel || "未知设备",
              deviceModel: systemInfo.deviceModel || "",
              osType: systemInfo.platform === "ios" ? "ios" : "android",
              osVersion: systemInfo.system || "",
              appVersion: "1.0.0"
            }
          });
          userStore.setLoginInfo(result);
          formatAppLog("log", "at pages/login/index.vue:170", "登录成功，token已保存:", userStore.token ? "有" : "无");
          if (rememberPassword.value) {
            uni.setStorageSync("savedUsername", username.value);
            uni.setStorageSync("savedPassword", password.value);
          } else {
            uni.removeStorageSync("savedUsername");
            uni.removeStorageSync("savedPassword");
          }
          uni.setStorageSync("agreedToTerms", true);
          uni.showToast({ title: "登录成功", icon: "success" });
          setTimeout(() => {
            formatAppLog("log", "at pages/login/index.vue:188", "跳转首页，当前token:", userStore.token ? "有" : "无");
            uni.switchTab({ url: "/pages/index/index" });
          }, 1200);
        } catch (e) {
          uni.showToast({
            title: e.message || "登录失败",
            icon: "none"
          });
        } finally {
          isLoading.value = false;
        }
      };
      const goToServerConfig = () => {
        uni.navigateTo({ url: "/pages/server-config/index" });
      };
      const __returned__ = { serverStore, userStore, username, password, rememberPassword, agreedToTerms, isLoading, canLogin, toggleAgreement, openUserAgreement, openPrivacyPolicy, handleLogin, goToServerConfig };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$c(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "login-page" }, [
      vue.createCommentVNode(" 顶部装饰 "),
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("view", { class: "header-bg" })
      ]),
      vue.createCommentVNode(" Logo区域 "),
      vue.createElementVNode("view", { class: "logo-section" }, [
        vue.createElementVNode("image", {
          class: "logo",
          src: _imports_0,
          mode: "aspectFit"
        }),
        vue.createElementVNode("text", { class: "title" }, "CRM外呼助手")
      ]),
      vue.createCommentVNode(" 登录表单 "),
      vue.createElementVNode("view", { class: "form-section" }, [
        vue.createElementVNode("view", { class: "input-group" }, [
          vue.createElementVNode("view", { class: "input-item" }, [
            vue.createElementVNode("text", { class: "icon" }, "👤"),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.username = $event),
              placeholder: "请输入用户名",
              "placeholder-class": "placeholder",
              disabled: $setup.isLoading
            }, null, 8, ["disabled"]), [
              [vue.vModelText, $setup.username]
            ])
          ]),
          vue.createElementVNode("view", { class: "input-item" }, [
            vue.createElementVNode("text", { class: "icon" }, "🔒"),
            vue.withDirectives(vue.createElementVNode("input", {
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $setup.password = $event),
              type: "password",
              placeholder: "请输入密码",
              "placeholder-class": "placeholder",
              disabled: $setup.isLoading,
              onConfirm: $setup.handleLogin
            }, null, 40, ["disabled"]), [
              [vue.vModelText, $setup.password]
            ])
          ])
        ]),
        vue.createCommentVNode(" 记住密码和协议勾选 "),
        vue.createElementVNode("view", { class: "checkbox-section" }, [
          vue.createElementVNode("view", {
            class: "checkbox-row",
            onClick: _cache[2] || (_cache[2] = ($event) => $setup.rememberPassword = !$setup.rememberPassword)
          }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["checkbox-box", { checked: $setup.rememberPassword }])
              },
              [
                $setup.rememberPassword ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 0,
                  class: "check-icon"
                }, "✓")) : vue.createCommentVNode("v-if", true)
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode("text", { class: "checkbox-label" }, "记住密码")
          ]),
          vue.createElementVNode("view", { class: "checkbox-row agreement-row" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["checkbox-box", { checked: $setup.agreedToTerms }]),
                onClick: $setup.toggleAgreement
              },
              [
                $setup.agreedToTerms ? (vue.openBlock(), vue.createElementBlock("text", {
                  key: 0,
                  class: "check-icon"
                }, "✓")) : vue.createCommentVNode("v-if", true)
              ],
              2
              /* CLASS */
            ),
            vue.createElementVNode("view", { class: "agreement-text" }, [
              vue.createElementVNode("text", { class: "checkbox-label" }, "我已阅读并同意"),
              vue.createElementVNode("text", {
                class: "link-text",
                onClick: vue.withModifiers($setup.openUserAgreement, ["stop"])
              }, "《用户协议》"),
              vue.createElementVNode("text", { class: "checkbox-label" }, "和"),
              vue.createElementVNode("text", {
                class: "link-text",
                onClick: vue.withModifiers($setup.openPrivacyPolicy, ["stop"])
              }, "《隐私政策》")
            ])
          ])
        ]),
        vue.createElementVNode("button", {
          class: "btn-login",
          onClick: $setup.handleLogin,
          loading: $setup.isLoading,
          disabled: !$setup.canLogin
        }, " 登 录 ", 8, ["loading", "disabled"])
      ]),
      vue.createCommentVNode(" 底部服务器信息 "),
      vue.createElementVNode("view", { class: "server-info" }, [
        vue.createElementVNode("text", { class: "server-label" }, "服务器: "),
        vue.createElementVNode(
          "text",
          { class: "server-url" },
          vue.toDisplayString($setup.serverStore.displayUrl),
          1
          /* TEXT */
        ),
        vue.createElementVNode("text", {
          class: "server-switch",
          onClick: $setup.goToServerConfig
        }, "切换")
      ])
    ]);
  }
  const PagesLoginIndex = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__scopeId", "data-v-45258083"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/login/index.vue"]]);
  const reportCallEnd = (data) => {
    return request({
      url: "/mobile/call/end",
      method: "POST",
      data,
      showLoading: false
    });
  };
  const uploadRecording = (callId, filePath) => {
    return uploadFile({
      url: "/mobile/recording/upload",
      filePath,
      name: "file",
      formData: { callId }
    });
  };
  const submitCallFollowup = (data) => {
    return request({
      url: "/mobile/call/followup",
      method: "POST",
      data,
      showLoading: true,
      loadingText: "保存中..."
    });
  };
  const getCallList = (params) => {
    return request({
      url: "/mobile/calls",
      method: "GET",
      data: params,
      showLoading: false
    });
  };
  const getCallDetail = (callId) => {
    return request({
      url: `/mobile/call/${callId}`,
      method: "GET",
      showLoading: true
    });
  };
  const getTodayStats = () => {
    return request({
      url: "/mobile/stats/today",
      method: "GET",
      showLoading: false
    });
  };
  const getStats = (period = "today") => {
    return request({
      url: "/mobile/stats",
      method: "GET",
      data: { period },
      showLoading: false
    });
  };
  const RECORDING_PATHS = [
    // 小米
    "/storage/emulated/0/MIUI/sound_recorder/call_rec/",
    "/storage/emulated/0/MIUI/sound_recorder/",
    // 华为
    "/storage/emulated/0/Sounds/CallRecord/",
    "/storage/emulated/0/record/",
    "/storage/emulated/0/Record/",
    // OPPO
    "/storage/emulated/0/Recordings/Call/",
    "/storage/emulated/0/Recordings/",
    // VIVO
    "/storage/emulated/0/Record/Call/",
    "/storage/emulated/0/Record/",
    // 三星
    "/storage/emulated/0/Call/",
    "/storage/emulated/0/Recordings/Call recordings/",
    // 一加
    "/storage/emulated/0/Record/PhoneRecord/",
    // 通用路径
    "/storage/emulated/0/Recordings/",
    "/storage/emulated/0/AudioRecorder/",
    "/storage/emulated/0/CallRecordings/",
    "/sdcard/MIUI/sound_recorder/call_rec/",
    "/sdcard/Recordings/"
  ];
  const AUDIO_EXTENSIONS = [".mp3", ".amr", ".wav", ".m4a", ".3gp", ".aac", ".ogg"];
  class RecordingService {
    constructor() {
      __publicField(this, "isScanning", false);
      __publicField(this, "lastScanTime", 0);
      __publicField(this, "knownRecordings", /* @__PURE__ */ new Set());
    }
    /**
     * 检查存储权限
     */
    async checkPermissions() {
      return new Promise((resolve) => {
        plus.android.requestPermissions(
          [
            "android.permission.READ_EXTERNAL_STORAGE",
            "android.permission.WRITE_EXTERNAL_STORAGE"
          ],
          (result) => {
            formatAppLog("log", "at services/recordingService.ts:83", "[RecordingService] 权限请求结果:", result);
            const granted = result.granted && result.granted.length >= 2;
            resolve(granted);
          },
          (error) => {
            formatAppLog("error", "at services/recordingService.ts:89", "[RecordingService] 权限请求失败:", error);
            resolve(false);
          }
        );
      });
    }
    /**
     * 获取设备品牌
     */
    getDeviceBrand() {
      try {
        const Build = plus.android.importClass("android.os.Build");
        const brand = Build.BRAND || "";
        formatAppLog("log", "at services/recordingService.ts:109", "[RecordingService] 设备品牌:", brand);
        return brand.toLowerCase();
      } catch (e) {
        formatAppLog("error", "at services/recordingService.ts:112", "[RecordingService] 获取设备品牌失败:", e);
      }
      return "";
    }
    /**
     * 获取优先扫描的录音路径（根据设备品牌）
     */
    getPriorityPaths() {
      const brand = this.getDeviceBrand();
      const paths = [...RECORDING_PATHS];
      if (brand.includes("xiaomi") || brand.includes("redmi")) {
        const xiaomiPaths = paths.filter((p) => p.includes("MIUI"));
        const otherPaths = paths.filter((p) => !p.includes("MIUI"));
        return [...xiaomiPaths, ...otherPaths];
      } else if (brand.includes("huawei") || brand.includes("honor")) {
        const huaweiPaths = paths.filter((p) => p.includes("Sounds") || p.includes("record"));
        const otherPaths = paths.filter((p) => !p.includes("Sounds") && !p.includes("record"));
        return [...huaweiPaths, ...otherPaths];
      } else if (brand.includes("oppo") || brand.includes("realme")) {
        const oppoPaths = paths.filter((p) => p.includes("Recordings"));
        const otherPaths = paths.filter((p) => !p.includes("Recordings"));
        return [...oppoPaths, ...otherPaths];
      } else if (brand.includes("vivo") || brand.includes("iqoo")) {
        const vivoPaths = paths.filter((p) => p.includes("Record"));
        const otherPaths = paths.filter((p) => !p.includes("Record"));
        return [...vivoPaths, ...otherPaths];
      }
      return paths;
    }
    /**
     * 扫描录音文件夹
     */
    async scanRecordingFolders() {
      const recordings = [];
      const paths = this.getPriorityPaths();
      for (const basePath of paths) {
        try {
          const files = await this.listFiles(basePath);
          for (const file of files) {
            const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
            if (AUDIO_EXTENSIONS.includes(ext)) {
              recordings.push(file);
            }
          }
        } catch (_e) {
        }
      }
      formatAppLog("log", "at services/recordingService.ts:174", "[RecordingService] 扫描到录音文件:", recordings.length);
      return recordings;
    }
    /**
     * 列出目录下的文件
     */
    listFiles(dirPath) {
      return new Promise((resolve) => {
        try {
          const File = plus.android.importClass("java.io.File");
          const dir = new File(dirPath);
          if (!dir.exists() || !dir.isDirectory()) {
            resolve([]);
            return;
          }
          const files = dir.listFiles();
          if (!files) {
            resolve([]);
            return;
          }
          const result = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.isFile()) {
              result.push({
                path: file.getAbsolutePath(),
                name: file.getName(),
                size: file.length(),
                lastModified: file.lastModified()
              });
            }
          }
          resolve(result);
        } catch (e) {
          formatAppLog("error", "at services/recordingService.ts:219", "[RecordingService] 列出文件失败:", dirPath, e);
          resolve([]);
        }
      });
    }
    /**
     * 查找匹配通话的录音文件
     */
    async findMatchingRecording(callInfo) {
      formatAppLog("log", "at services/recordingService.ts:234", "[RecordingService] 查找匹配录音:", callInfo);
      const recordings = await this.scanRecordingFolders();
      if (recordings.length === 0) {
        formatAppLog("log", "at services/recordingService.ts:238", "[RecordingService] 未找到任何录音文件");
        return null;
      }
      const startRange = callInfo.startTime - 3e4;
      const endRange = callInfo.endTime + 3e4;
      const phoneVariants = this.getPhoneVariants(callInfo.phoneNumber);
      let bestMatch = null;
      let bestScore = 0;
      for (const recording of recordings) {
        if (this.knownRecordings.has(recording.path)) {
          continue;
        }
        let score = 0;
        if (recording.lastModified >= startRange && recording.lastModified <= endRange) {
          score += 50;
          const timeDiff = Math.abs(recording.lastModified - callInfo.endTime);
          score += Math.max(0, 30 - timeDiff / 1e3);
        }
        for (const phone of phoneVariants) {
          if (recording.name.includes(phone)) {
            score += 40;
            break;
          }
        }
        const expectedSize = callInfo.duration * 10 * 1024;
        const sizeDiff = Math.abs(recording.size - expectedSize);
        if (sizeDiff < expectedSize * 0.5) {
          score += 20;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = recording;
        }
      }
      if (bestMatch && bestScore >= 50) {
        formatAppLog("log", "at services/recordingService.ts:291", "[RecordingService] 找到匹配录音:", bestMatch.name, "分数:", bestScore);
        return bestMatch;
      }
      formatAppLog("log", "at services/recordingService.ts:295", "[RecordingService] 未找到匹配的录音文件");
      return null;
    }
    /**
     * 获取电话号码的各种格式变体
     */
    getPhoneVariants(phone) {
      const cleaned = phone.replace(/\D/g, "");
      const variants = [cleaned];
      if (cleaned.startsWith("86")) {
        variants.push(cleaned.substring(2));
      }
      if (cleaned.startsWith("+86")) {
        variants.push(cleaned.substring(3));
      }
      if (cleaned.length === 11) {
        variants.push(`${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`);
        variants.push(`${cleaned.substring(0, 3)} ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`);
      }
      return variants;
    }
    /**
     * 上传录音文件
     */
    async uploadRecordingFile(callId, recording) {
      formatAppLog("log", "at services/recordingService.ts:329", "[RecordingService] 开始上传录音:", recording.path);
      try {
        const result = await uploadRecording(callId, recording.path);
        formatAppLog("log", "at services/recordingService.ts:333", "[RecordingService] 录音上传成功:", result);
        this.knownRecordings.add(recording.path);
        uni.$emit("recording:uploaded", callId);
        return true;
      } catch (e) {
        formatAppLog("error", "at services/recordingService.ts:343", "[RecordingService] 录音上传失败:", e);
        return false;
      }
    }
    /**
     * 通话结束后自动查找并上传录音
     */
    async processCallRecording(callInfo) {
      formatAppLog("log", "at services/recordingService.ts:356", "[RecordingService] 处理通话录音:", callInfo.callId);
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        formatAppLog("warn", "at services/recordingService.ts:361", "[RecordingService] 没有存储权限");
        return { found: false, uploaded: false };
      }
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      const recording = await this.findMatchingRecording(callInfo);
      if (!recording) {
        return { found: false, uploaded: false };
      }
      const uploaded = await this.uploadRecordingFile(callInfo.callId, recording);
      return {
        found: true,
        uploaded,
        recordingPath: recording.path
      };
    }
    /**
     * 尝试开启系统通话录音（部分手机支持）
     */
    async tryEnableSystemRecording() {
      try {
        const brand = this.getDeviceBrand();
        formatAppLog("log", "at services/recordingService.ts:391", "[RecordingService] 尝试开启系统录音, 品牌:", brand);
        if (brand.includes("xiaomi") || brand.includes("redmi")) {
          return this.enableXiaomiRecording();
        }
        if (brand.includes("huawei") || brand.includes("honor")) {
          return this.enableHuaweiRecording();
        }
        if (brand.includes("oppo") || brand.includes("realme")) {
          return this.enableOppoRecording();
        }
        if (brand.includes("vivo") || brand.includes("iqoo")) {
          return this.enableVivoRecording();
        }
        return this.enableGenericRecording();
      } catch (e) {
        formatAppLog("error", "at services/recordingService.ts:416", "[RecordingService] 开启系统录音失败:", e);
      }
      return false;
    }
    /**
     * 小米手机开启通话录音
     */
    enableXiaomiRecording() {
      const Intent = plus.android.importClass("android.content.Intent");
      const ComponentName = plus.android.importClass("android.content.ComponentName");
      const main = plus.android.runtimeMainActivity();
      const attempts = [
        // 方式1: 直接打开通话录音设置
        () => {
          const intent = new Intent();
          intent.setComponent(
            new ComponentName(
              "com.android.phone",
              "com.android.phone.settings.CallRecordingSettingsActivity"
            )
          );
          main.startActivity(intent);
        },
        // 方式2: MIUI 通话录音设置
        () => {
          const intent = new Intent();
          intent.setComponent(
            new ComponentName(
              "com.miui.securitycenter",
              "com.miui.permcenter.autostart.AutoStartManagementActivity"
            )
          );
          main.startActivity(intent);
        },
        // 方式3: 打开拨号应用设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.APPLICATION_DETAILS_SETTINGS");
          const Uri = plus.android.importClass("android.net.Uri");
          intent.setData(Uri.parse("package:com.android.phone"));
          main.startActivity(intent);
        },
        // 方式4: 通用通话设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.CALL_SETTINGS");
          main.startActivity(intent);
        }
      ];
      for (let i = 0; i < attempts.length; i++) {
        try {
          attempts[i]();
          formatAppLog("log", "at services/recordingService.ts:475", `[RecordingService] 小米录音设置打开成功，方式${i + 1}`);
          return true;
        } catch (_e) {
          formatAppLog("log", "at services/recordingService.ts:478", `[RecordingService] 小米录音设置方式${i + 1}失败，尝试下一种`);
        }
      }
      return false;
    }
    /**
     * 华为手机开启通话录音
     */
    enableHuaweiRecording() {
      const Intent = plus.android.importClass("android.content.Intent");
      const ComponentName = plus.android.importClass("android.content.ComponentName");
      const main = plus.android.runtimeMainActivity();
      const attempts = [
        // 方式1: 华为通话录音设置
        () => {
          const intent = new Intent();
          intent.setComponent(
            new ComponentName(
              "com.huawei.systemmanager",
              "com.huawei.systemmanager.optimize.process.ProtectActivity"
            )
          );
          main.startActivity(intent);
        },
        // 方式2: 打开拨号应用
        () => {
          const intent = new Intent();
          intent.setAction("android.intent.action.DIAL");
          main.startActivity(intent);
        },
        // 方式3: 通用通话设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.CALL_SETTINGS");
          main.startActivity(intent);
        }
      ];
      for (let i = 0; i < attempts.length; i++) {
        try {
          attempts[i]();
          formatAppLog("log", "at services/recordingService.ts:523", `[RecordingService] 华为录音设置打开成功，方式${i + 1}`);
          return true;
        } catch (_e) {
          formatAppLog("log", "at services/recordingService.ts:526", `[RecordingService] 华为录音设置方式${i + 1}失败，尝试下一种`);
        }
      }
      return false;
    }
    /**
     * OPPO/Realme手机开启通话录音
     */
    enableOppoRecording() {
      const Intent = plus.android.importClass("android.content.Intent");
      const ComponentName = plus.android.importClass("android.content.ComponentName");
      const main = plus.android.runtimeMainActivity();
      const attempts = [
        // 方式1: OPPO 通话录音设置
        () => {
          const intent = new Intent();
          intent.setComponent(
            new ComponentName(
              "com.coloros.phonemanager",
              "com.coloros.phonemanager.record.CallRecordSettingActivity"
            )
          );
          main.startActivity(intent);
        },
        // 方式2: 打开拨号应用设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.APPLICATION_DETAILS_SETTINGS");
          const Uri = plus.android.importClass("android.net.Uri");
          intent.setData(Uri.parse("package:com.android.dialer"));
          main.startActivity(intent);
        },
        // 方式3: 通用通话设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.CALL_SETTINGS");
          main.startActivity(intent);
        }
      ];
      for (let i = 0; i < attempts.length; i++) {
        try {
          attempts[i]();
          formatAppLog("log", "at services/recordingService.ts:573", `[RecordingService] OPPO录音设置打开成功，方式${i + 1}`);
          return true;
        } catch (_e) {
          formatAppLog("log", "at services/recordingService.ts:576", `[RecordingService] OPPO录音设置方式${i + 1}失败，尝试下一种`);
        }
      }
      return false;
    }
    /**
     * VIVO/iQOO手机开启通话录音
     */
    enableVivoRecording() {
      const Intent = plus.android.importClass("android.content.Intent");
      const ComponentName = plus.android.importClass("android.content.ComponentName");
      const main = plus.android.runtimeMainActivity();
      const attempts = [
        // 方式1: VIVO 通话录音设置
        () => {
          const intent = new Intent();
          intent.setComponent(
            new ComponentName(
              "com.vivo.permissionmanager",
              "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"
            )
          );
          main.startActivity(intent);
        },
        // 方式2: 打开拨号应用
        () => {
          const intent = new Intent();
          intent.setAction("android.intent.action.DIAL");
          main.startActivity(intent);
        },
        // 方式3: 通用通话设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.CALL_SETTINGS");
          main.startActivity(intent);
        }
      ];
      for (let i = 0; i < attempts.length; i++) {
        try {
          attempts[i]();
          formatAppLog("log", "at services/recordingService.ts:621", `[RecordingService] VIVO录音设置打开成功，方式${i + 1}`);
          return true;
        } catch (_e) {
          formatAppLog("log", "at services/recordingService.ts:624", `[RecordingService] VIVO录音设置方式${i + 1}失败，尝试下一种`);
        }
      }
      return false;
    }
    /**
     * 通用方法开启通话录音
     */
    enableGenericRecording() {
      const Intent = plus.android.importClass("android.content.Intent");
      const main = plus.android.runtimeMainActivity();
      const attempts = [
        // 方式1: 通话设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.CALL_SETTINGS");
          main.startActivity(intent);
        },
        // 方式2: 打开拨号应用
        () => {
          const intent = new Intent();
          intent.setAction("android.intent.action.DIAL");
          main.startActivity(intent);
        },
        // 方式3: 打开系统设置
        () => {
          const intent = new Intent();
          intent.setAction("android.settings.SETTINGS");
          main.startActivity(intent);
        }
      ];
      for (let i = 0; i < attempts.length; i++) {
        try {
          attempts[i]();
          formatAppLog("log", "at services/recordingService.ts:663", `[RecordingService] 通用录音设置打开成功，方式${i + 1}`);
          return true;
        } catch (_e) {
          formatAppLog("log", "at services/recordingService.ts:666", `[RecordingService] 通用录音设置方式${i + 1}失败，尝试下一种`);
        }
      }
      return false;
    }
    /**
     * 检查系统录音是否已开启
     * 通过多种方式检测：
     * 1. 检查录音文件夹是否存在
     * 2. 检查是否有录音文件
     * 3. 检查是否有最近的录音文件
     */
    async checkRecordingEnabled() {
      try {
        const paths = this.getPriorityPaths();
        const File = plus.android.importClass("java.io.File");
        let folderExists = false;
        for (const basePath of paths) {
          try {
            const dir = new File(basePath);
            if (dir.exists() && dir.isDirectory()) {
              folderExists = true;
              formatAppLog("log", "at services/recordingService.ts:693", "[RecordingService] 找到录音文件夹:", basePath);
              break;
            }
          } catch (_e) {
          }
        }
        if (!folderExists) {
          formatAppLog("log", "at services/recordingService.ts:702", "[RecordingService] 未找到任何录音文件夹");
          return false;
        }
        const recordings = await this.scanRecordingFolders();
        formatAppLog("log", "at services/recordingService.ts:708", "[RecordingService] 扫描到录音文件数量:", recordings.length);
        if (recordings.length === 0) {
          formatAppLog("log", "at services/recordingService.ts:713", "[RecordingService] 录音文件夹存在但无录音文件，可能已开启");
          return true;
        }
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1e3;
        const recentRecordings = recordings.filter((r) => r.lastModified > sevenDaysAgo);
        if (recentRecordings.length > 0) {
          formatAppLog("log", "at services/recordingService.ts:722", "[RecordingService] 有最近7天的录音文件:", recentRecordings.length);
          return true;
        }
        formatAppLog("log", "at services/recordingService.ts:727", "[RecordingService] 有录音文件但都是7天前的");
        return true;
      } catch (e) {
        formatAppLog("error", "at services/recordingService.ts:730", "[RecordingService] 检查录音状态失败:", e);
        return false;
      }
    }
    /**
     * 🔥 清理过期录音文件
     * @param retentionDays 保留天数，默认3天
     * @returns 清理结果
     */
    async cleanupExpiredRecordings(retentionDays = 3) {
      const result = {
        success: true,
        deletedCount: 0,
        freedSpace: 0,
        errors: []
      };
      try {
        const recordings = await this.scanRecordingFolders();
        const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1e3;
        const File = plus.android.importClass("java.io.File");
        formatAppLog("log", "at services/recordingService.ts:764", `[RecordingService] 开始清理 ${retentionDays} 天前的录音文件`);
        formatAppLog("log", "at services/recordingService.ts:765", `[RecordingService] 截止时间: ${new Date(cutoffTime).toLocaleString()}`);
        formatAppLog("log", "at services/recordingService.ts:766", `[RecordingService] 扫描到录音文件: ${recordings.length} 个`);
        for (const recording of recordings) {
          if (recording.lastModified > cutoffTime) {
            continue;
          }
          if (this.knownRecordings.has(recording.path)) {
          }
          try {
            const file = new File(recording.path);
            if (file.exists() && file.delete()) {
              result.deletedCount++;
              result.freedSpace += recording.size;
              formatAppLog("log", "at services/recordingService.ts:784", `[RecordingService] 已删除: ${recording.name}`);
            } else {
              result.errors.push(`无法删除: ${recording.name}`);
            }
          } catch (e) {
            result.errors.push(`删除失败: ${recording.name} - ${e.message || e}`);
          }
        }
        formatAppLog("log", "at services/recordingService.ts:793", `[RecordingService] 清理完成: 删除 ${result.deletedCount} 个文件，释放 ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB`);
      } catch (e) {
        formatAppLog("error", "at services/recordingService.ts:795", "[RecordingService] 清理录音失败:", e);
        result.success = false;
        result.errors.push(e.message || "清理失败");
      }
      return result;
    }
    /**
     * 🔥 获取录音文件统计信息
     */
    async getRecordingStats() {
      const stats = {
        totalCount: 0,
        totalSize: 0,
        oldestDate: null,
        newestDate: null
      };
      try {
        const recordings = await this.scanRecordingFolders();
        stats.totalCount = recordings.length;
        for (const recording of recordings) {
          stats.totalSize += recording.size;
          if (stats.oldestDate === null || recording.lastModified < stats.oldestDate) {
            stats.oldestDate = recording.lastModified;
          }
          if (stats.newestDate === null || recording.lastModified > stats.newestDate) {
            stats.newestDate = recording.lastModified;
          }
        }
      } catch (e) {
        formatAppLog("error", "at services/recordingService.ts:836", "[RecordingService] 获取录音统计失败:", e);
      }
      return stats;
    }
  }
  const recordingService = new RecordingService();
  class CallStateService {
    constructor() {
      __publicField(this, "currentCall", null);
      __publicField(this, "stateCheckTimer", null);
      __publicField(this, "lastPhoneState", 0);
      // 0=IDLE, 1=RINGING, 2=OFFHOOK
      __publicField(this, "isMonitoring", false);
      // 回调函数
      __publicField(this, "onStateChangeCallback", null);
      __publicField(this, "onCallEndCallback", null);
    }
    /**
     * 开始监听通话状态
     */
    startMonitoring(callInfo) {
      formatAppLog("log", "at services/callStateService.ts:48", "[CallStateService] 开始监听通话状态:", callInfo);
      this.currentCall = {
        ...callInfo,
        startTime: Date.now(),
        state: "dialing"
      };
      this.isMonitoring = true;
      this.lastPhoneState = 0;
      this.startStateCheck();
    }
    /**
     * 停止监听
     */
    stopMonitoring() {
      formatAppLog("log", "at services/callStateService.ts:67", "[CallStateService] 停止监听");
      this.isMonitoring = false;
      this.stopStateCheck();
      this.currentCall = null;
    }
    /**
     * 启动状态检测定时器
     */
    startStateCheck() {
      this.stopStateCheck();
      this.stateCheckTimer = setInterval(() => {
        this.checkPhoneState();
      }, 500);
    }
    /**
     * 停止状态检测
     */
    stopStateCheck() {
      if (this.stateCheckTimer) {
        clearInterval(this.stateCheckTimer);
        this.stateCheckTimer = null;
      }
    }
    /**
     * 检测系统通话状态
     */
    checkPhoneState() {
      if (!this.isMonitoring || !this.currentCall) return;
      try {
        const main = plus.android.runtimeMainActivity();
        const Context = plus.android.importClass("android.content.Context");
        plus.android.importClass("android.telephony.TelephonyManager");
        const telephonyManager = main.getSystemService(Context.TELEPHONY_SERVICE);
        const callState = telephonyManager.getCallState();
        if (callState !== this.lastPhoneState) {
          formatAppLog("log", "at services/callStateService.ts:113", "[CallStateService] 通话状态变化:", this.lastPhoneState, "->", callState);
          this.handleStateChange(callState);
          this.lastPhoneState = callState;
        }
      } catch (e) {
        formatAppLog("error", "at services/callStateService.ts:118", "[CallStateService] 获取通话状态失败:", e);
      }
    }
    /**
     * 处理状态变化
     */
    handleStateChange(newState) {
      if (!this.currentCall) return;
      const oldState = this.currentCall.state;
      switch (newState) {
        case 0:
          if (oldState !== "idle" && oldState !== "ended") {
            this.currentCall.state = "ended";
            this.onCallEnded();
          }
          break;
        case 1:
          if (oldState === "dialing") {
            this.currentCall.state = "ringing";
            this.notifyStateChange("ringing");
          }
          break;
        case 2:
          if (oldState !== "offhook") {
            this.currentCall.state = "offhook";
            this.currentCall.connectTime = Date.now();
            this.notifyStateChange("offhook");
            wsService.reportCallStatus(this.currentCall.callId, "connected");
          }
          break;
      }
    }
    /**
     * 通话结束处理
     */
    async onCallEnded() {
      if (!this.currentCall) return;
      formatAppLog("log", "at services/callStateService.ts:165", "[CallStateService] 通话结束");
      let duration = 0;
      if (this.currentCall.connectTime) {
        duration = Math.floor((Date.now() - this.currentCall.connectTime) / 1e3);
      }
      const callInfo = { ...this.currentCall };
      const endTime = Date.now();
      this.notifyStateChange("ended");
      wsService.reportCallEnd(callInfo.callId, {
        status: duration > 0 ? "connected" : "missed",
        startTime: new Date(callInfo.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration,
        hasRecording: false,
        // 先标记为无录音，后续找到再更新
        endReason: "system_hangup"
      });
      try {
        await reportCallEnd({
          callId: callInfo.callId,
          status: duration > 0 ? "connected" : "missed",
          startTime: new Date(callInfo.startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration,
          hasRecording: false
        });
      } catch (e) {
        formatAppLog("error", "at services/callStateService.ts:200", "[CallStateService] 上报通话结束失败:", e);
      }
      if (this.onCallEndCallback) {
        this.onCallEndCallback(callInfo, duration);
      }
      uni.setStorageSync("lastEndedCall", {
        callId: callInfo.callId,
        customerName: callInfo.customerName,
        customerId: callInfo.customerId,
        phoneNumber: callInfo.phoneNumber,
        duration,
        endTime: new Date(endTime).toISOString(),
        wasConnected: duration > 0,
        hasRecording: false
        // 先标记为无录音
      });
      this.stopMonitoring();
      setTimeout(() => {
        uni.navigateTo({
          url: `/pages/call-ended/index?callId=${callInfo.callId}&name=${encodeURIComponent(callInfo.customerName || "")}&customerId=${callInfo.customerId || ""}&duration=${duration}&hasRecording=false`
        });
      }, 300);
      this.processRecordingAsync(callInfo, duration, endTime);
    }
    /**
     * 异步处理录音文件
     */
    async processRecordingAsync(callInfo, duration, endTime) {
      if (duration <= 0) {
        formatAppLog("log", "at services/callStateService.ts:243", "[CallStateService] 通话未接通，跳过录音处理");
        return;
      }
      try {
        const callSettings = uni.getStorageSync("callSettings");
        if (callSettings) {
          const settings = JSON.parse(callSettings);
          if (!settings.autoUploadRecording) {
            formatAppLog("log", "at services/callStateService.ts:253", "[CallStateService] 自动上传已关闭，跳过录音处理");
            return;
          }
        }
      } catch (e) {
        formatAppLog("error", "at services/callStateService.ts:258", "[CallStateService] 读取设置失败:", e);
      }
      formatAppLog("log", "at services/callStateService.ts:261", "[CallStateService] 开始异步处理录音...");
      try {
        const result = await recordingService.processCallRecording({
          callId: callInfo.callId,
          phoneNumber: callInfo.phoneNumber,
          startTime: callInfo.startTime,
          endTime,
          duration
        });
        if (result.found && result.uploaded) {
          formatAppLog("log", "at services/callStateService.ts:274", "[CallStateService] 录音处理成功:", result.recordingPath);
          wsService.reportCallEnd(callInfo.callId, {
            status: "connected",
            startTime: new Date(callInfo.startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            duration,
            hasRecording: true,
            recordingPath: result.recordingPath,
            endReason: "recording_uploaded"
          });
          uni.showToast({
            title: "录音已上传",
            icon: "success",
            duration: 2e3
          });
        } else if (result.found) {
          formatAppLog("log", "at services/callStateService.ts:294", "[CallStateService] 找到录音但上传失败");
          uni.showToast({
            title: "录音上传失败",
            icon: "none",
            duration: 2e3
          });
        } else {
          formatAppLog("log", "at services/callStateService.ts:301", "[CallStateService] 未找到录音文件");
        }
      } catch (e) {
        formatAppLog("error", "at services/callStateService.ts:305", "[CallStateService] 录音处理失败:", e);
      }
    }
    /**
     * 通知状态变化
     */
    notifyStateChange(state) {
      if (this.onStateChangeCallback && this.currentCall) {
        this.onStateChangeCallback(state, this.currentCall);
      }
    }
    /**
     * 设置状态变化回调
     */
    onStateChange(callback) {
      this.onStateChangeCallback = callback;
    }
    /**
     * 设置通话结束回调
     */
    onCallEnd(callback) {
      this.onCallEndCallback = callback;
    }
    /**
     * 获取当前通话信息
     */
    getCurrentCall() {
      return this.currentCall;
    }
    /**
     * 获取当前通话时长（秒）
     */
    getCurrentDuration() {
      if (!this.currentCall || !this.currentCall.connectTime) return 0;
      return Math.floor((Date.now() - this.currentCall.connectTime) / 1e3);
    }
    /**
     * 是否正在通话中
     */
    isInCall() {
      return this.isMonitoring && this.currentCall !== null && (this.currentCall.state === "offhook" || this.currentCall.state === "ringing" || this.currentCall.state === "dialing");
    }
  }
  const callStateService = new CallStateService();
  class WebSocketService {
    constructor() {
      __publicField(this, "socket", null);
      __publicField(this, "reconnectAttempts", 0);
      __publicField(this, "maxReconnectAttempts", 10);
      __publicField(this, "reconnectDelay", 3e3);
      __publicField(this, "heartbeatTimer", null);
      __publicField(this, "heartbeatInterval", 3e4);
      // 30秒心跳
      // 连接状态
      __publicField(this, "isConnected", false);
      // 事件回调
      __publicField(this, "onDialRequestCallback", null);
      __publicField(this, "onDialCancelCallback", null);
      __publicField(this, "onDeviceUnbindCallback", null);
    }
    // 连接WebSocket
    connect() {
      const userStore = useUserStore();
      const serverStore = useServerStore();
      if (this.isConnected && this.socket) {
        formatAppLog("log", "at services/websocket.ts:51", "[WebSocket] 已连接，跳过重复连接");
        return;
      }
      if (!userStore.wsToken) {
        formatAppLog("log", "at services/websocket.ts:56", "[WebSocket] 缺少 wsToken，请重新扫码绑定");
        uni.$emit("ws:need_rebind", { reason: "missing_token" });
        return;
      }
      const baseWsUrl = userStore.wsUrl || serverStore.wsUrl;
      if (!baseWsUrl) {
        formatAppLog("log", "at services/websocket.ts:64", "[WebSocket] 缺少 WebSocket 地址，请重新扫码绑定");
        uni.$emit("ws:need_rebind", { reason: "missing_url" });
        return;
      }
      if (this.socket) {
        formatAppLog("log", "at services/websocket.ts:70", "[WebSocket] 已有连接，先关闭");
        this.disconnect();
      }
      let wsUrl = baseWsUrl;
      if (!wsUrl.includes("/ws/mobile")) {
        wsUrl = `${baseWsUrl}/ws/mobile`;
      }
      if (wsUrl.startsWith("http://")) {
        wsUrl = wsUrl.replace("http://", "ws://");
      } else if (wsUrl.startsWith("https://")) {
        wsUrl = wsUrl.replace("https://", "wss://");
      }
      wsUrl = wsUrl.replace("/api/v1/ws/mobile", "/ws/mobile");
      wsUrl = wsUrl.replace("/api/ws/mobile", "/ws/mobile");
      wsUrl = `${wsUrl}?token=${userStore.wsToken}`;
      formatAppLog("log", "at services/websocket.ts:94", "[WebSocket] 正在连接:", wsUrl);
      formatAppLog("log", "at services/websocket.ts:95", "[WebSocket] wsToken长度:", userStore.wsToken.length);
      formatAppLog("log", "at services/websocket.ts:96", "[WebSocket] 当前wsUrl:", userStore.wsUrl);
      formatAppLog("log", "at services/websocket.ts:97", "[WebSocket] serverStore.wsUrl:", serverStore.wsUrl);
      try {
        this.socket = uni.connectSocket({
          url: wsUrl,
          success: () => {
            formatAppLog("log", "at services/websocket.ts:103", "[WebSocket] 连接请求已发送");
          },
          fail: (err) => {
            formatAppLog("error", "at services/websocket.ts:106", "[WebSocket] 连接请求失败:", JSON.stringify(err));
            this.scheduleReconnect();
          }
        });
        this.setupListeners();
      } catch (e) {
        formatAppLog("error", "at services/websocket.ts:114", "[WebSocket] 创建连接异常:", e);
        this.scheduleReconnect();
      }
    }
    // 设置监听器
    setupListeners() {
      if (!this.socket) return;
      this.socket.onOpen(() => {
        formatAppLog("log", "at services/websocket.ts:125", "[WebSocket] 连接成功");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.sendDeviceOnline();
        this.startHeartbeat();
        uni.$emit("ws:connected");
      });
      this.socket.onMessage((res) => {
        try {
          const message = JSON.parse(res.data);
          this.handleMessage(message);
        } catch (e) {
          formatAppLog("error", "at services/websocket.ts:145", "[WebSocket] 解析消息失败:", e);
        }
      });
      this.socket.onClose((res) => {
        formatAppLog("log", "at services/websocket.ts:151", "[WebSocket] 连接关闭:", res);
        this.isConnected = false;
        this.stopHeartbeat();
        uni.$emit("ws:disconnected");
        this.scheduleReconnect();
      });
      this.socket.onError((err) => {
        formatAppLog("error", "at services/websocket.ts:164", "[WebSocket] 连接错误:", JSON.stringify(err));
        formatAppLog("error", "at services/websocket.ts:165", "[WebSocket] 当前连接URL:", this.getCurrentWsUrl());
        this.isConnected = false;
        uni.$emit("ws:error", err);
      });
    }
    // 处理消息
    handleMessage(message) {
      var _a;
      formatAppLog("log", "at services/websocket.ts:173", "[WebSocket] 收到消息:", message.type, message.data);
      switch (message.type) {
        case "DIAL_REQUEST":
        case "DIAL_COMMAND":
          if (this.onDialRequestCallback && message.data) {
            this.onDialRequestCallback(message.data);
          }
          this.executeDial(message.data);
          break;
        case "DIAL_CANCEL":
          if (this.onDialCancelCallback && message.data) {
            this.onDialCancelCallback(message.data);
          }
          break;
        case "CALL_END":
        case "END_CALL":
          formatAppLog("log", "at services/websocket.ts:197", "[WebSocket] 收到服务器结束通话指令:", message.data);
          uni.$emit("call:end", message.data);
          uni.$emit("ws:call_ended", message.data);
          const currentCall = uni.getStorageSync("currentCall");
          if (currentCall && currentCall.callId === ((_a = message.data) == null ? void 0 : _a.callId)) {
            const startTime = new Date(currentCall.startTime).getTime();
            const duration = Math.floor((Date.now() - startTime) / 1e3);
            uni.removeStorageSync("currentCall");
            uni.showModal({
              title: "通话已结束",
              content: "CRM系统已标记通话结束，请填写跟进记录",
              showCancel: false,
              confirmText: "去填写",
              success: () => {
                uni.navigateTo({
                  url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || "")}&customerId=${currentCall.customerId || ""}&duration=${duration}&hasRecording=false`
                });
              }
            });
          }
          break;
        case "DEVICE_UNBIND":
          if (this.onDeviceUnbindCallback) {
            this.onDeviceUnbindCallback();
          }
          this.handleDeviceUnbind();
          break;
        case "HEARTBEAT_ACK":
        case "pong":
          break;
        default:
          formatAppLog("log", "at services/websocket.ts:239", "[WebSocket] 未知消息类型:", message.type);
      }
    }
    // 执行拨号 - 直接调用系统拨号，使用callStateService监听通话状态
    executeDial(data) {
      if (!data || !data.phoneNumber) {
        formatAppLog("error", "at services/websocket.ts:246", "[WebSocket] 拨号数据无效:", data);
        return;
      }
      formatAppLog("log", "at services/websocket.ts:250", "[WebSocket] 执行拨号:", data.phoneNumber, "客户:", data.customerName);
      const callStartTime = (/* @__PURE__ */ new Date()).toISOString();
      uni.setStorageSync("currentCall", {
        callId: data.callId,
        phoneNumber: data.phoneNumber,
        customerName: data.customerName || "未知客户",
        customerId: data.customerId || "",
        startTime: callStartTime
      });
      this.reportCallStatus(data.callId, "dialing");
      callStateService.startMonitoring({
        callId: data.callId,
        phoneNumber: data.phoneNumber,
        customerName: data.customerName,
        customerId: data.customerId
      });
      callStateService.onStateChange((state, callInfo) => {
        formatAppLog("log", "at services/websocket.ts:275", "[WebSocket] 通话状态变化:", state, callInfo);
        if (state === "offhook") {
          uni.showToast({
            title: "通话已接通",
            icon: "success",
            duration: 1500
          });
        } else if (state === "ringing") {
          uni.showToast({
            title: "对方响铃中...",
            icon: "none",
            duration: 1500
          });
        }
      });
      callStateService.onCallEnd((callInfo, duration) => {
        formatAppLog("log", "at services/websocket.ts:296", "[WebSocket] 通话结束回调:", callInfo, duration);
        uni.removeStorageSync("currentCall");
      });
      plus.device.dial(data.phoneNumber, false);
      formatAppLog("log", "at services/websocket.ts:304", "[WebSocket] 系统拨号已发起");
      uni.showToast({
        title: "正在拨号...",
        icon: "none",
        duration: 2e3
      });
    }
    // 处理设备解绑
    handleDeviceUnbind() {
      const userStore = useUserStore();
      userStore.clearDeviceInfo();
      uni.showModal({
        title: "设备已解绑",
        content: "您的设备已被管理员解绑，请重新绑定",
        showCancel: false,
        success: () => {
          uni.reLaunch({ url: "/pages/index/index" });
        }
      });
    }
    // 发送消息
    send(type, data) {
      if (!this.socket || !this.isConnected) {
        formatAppLog("warn", "at services/websocket.ts:347", "[WebSocket] 未连接，无法发送消息");
        return;
      }
      const message = {
        type,
        messageId: `msg_${Date.now()}`,
        timestamp: Date.now(),
        data
      };
      this.socket.send({
        data: JSON.stringify(message),
        fail: (err) => {
          formatAppLog("error", "at services/websocket.ts:361", "[WebSocket] 发送消息失败:", err);
        }
      });
    }
    // 发送设备上线消息
    sendDeviceOnline() {
      var _a;
      const userStore = useUserStore();
      this.send("DEVICE_ONLINE", {
        deviceId: (_a = userStore.deviceInfo) == null ? void 0 : _a.deviceId,
        appVersion: "1.0.0"
      });
    }
    // 上报通话状态
    reportCallStatus(callId, status, extra) {
      this.send("CALL_STATUS", {
        callId,
        status,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ...extra
      });
    }
    // 上报通话结束
    reportCallEnd(callId, data) {
      this.send("CALL_ENDED", {
        callId,
        ...data
      });
    }
    // 启动心跳
    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected) {
          this.send("HEARTBEAT");
        }
      }, this.heartbeatInterval);
    }
    // 停止心跳
    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }
    // 重连调度
    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        formatAppLog("error", "at services/websocket.ts:415", "[WebSocket] 达到最大重连次数");
        uni.$emit("ws:max_reconnect");
        return;
      }
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
      formatAppLog("log", "at services/websocket.ts:423", `[WebSocket] ${delay}ms后重连，第${this.reconnectAttempts}次`);
      setTimeout(() => {
        this.connect();
      }, Math.min(delay, 3e4));
    }
    // 断开连接
    disconnect() {
      this.stopHeartbeat();
      if (this.socket) {
        this.socket.close({});
        this.socket = null;
      }
      this.isConnected = false;
    }
    // 设置拨号请求回调
    onDialRequest(callback) {
      this.onDialRequestCallback = callback;
    }
    // 设置取消拨号回调
    onDialCancel(callback) {
      this.onDialCancelCallback = callback;
    }
    // 设置设备解绑回调
    onDeviceUnbind(callback) {
      this.onDeviceUnbindCallback = callback;
    }
    // 获取当前WebSocket URL（用于调试）
    getCurrentWsUrl() {
      const userStore = useUserStore();
      const serverStore = useServerStore();
      const baseWsUrl = userStore.wsUrl || serverStore.wsUrl;
      if (!baseWsUrl) return "(无wsUrl)";
      let wsUrl = baseWsUrl;
      if (!wsUrl.includes("/ws/mobile")) {
        wsUrl = `${baseWsUrl}/ws/mobile`;
      }
      return wsUrl;
    }
  }
  const wsService = new WebSocketService();
  const websocket = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    wsService
  }, Symbol.toStringTag, { value: "Module" }));
  const _sfc_main$c = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const serverStore = useServerStore();
      const wsConnected = vue.ref(false);
      const todayStats = vue.ref({
        totalCalls: 0,
        connectedCalls: 0,
        missedCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        totalDuration: 0,
        avgDuration: 0,
        connectRate: 0
      });
      const connectionStatus = vue.computed(() => {
        if (wsConnected.value) return "connected";
        if (serverStore.isConnected) return "connecting";
        return "disconnected";
      });
      const connectionText = vue.computed(() => {
        if (wsConnected.value) return "已连接";
        if (serverStore.isConnected) return "连接中";
        return "未连接";
      });
      const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds}秒`;
        const min = Math.floor(seconds / 60);
        return `${min}分`;
      };
      const loadTodayStats = async () => {
        var _a;
        if (!userStore.token) return;
        try {
          const data = await getTodayStats();
          todayStats.value = data;
        } catch (e) {
          if (!((_a = e.message) == null ? void 0 : _a.includes("过期"))) {
            formatAppLog("error", "at pages/index/index.vue:177", "加载统计失败:", e);
          }
        }
      };
      const handleScanBind = () => {
        uni.navigateTo({ url: "/pages/scan/index" });
      };
      const handleDial = () => {
        uni.navigateTo({ url: "/pages/dialpad/index" });
      };
      const handleRefresh = () => {
        loadTodayStats();
        uni.showToast({ title: "已刷新", icon: "success" });
      };
      const handleReconnect = () => {
        if (userStore.wsToken) {
          uni.showToast({ title: "正在重连...", icon: "none" });
          wsService.disconnect();
          setTimeout(() => {
            wsService.connect();
          }, 500);
        } else {
          uni.showModal({
            title: "需要重新绑定",
            content: "连接凭证已失效，需要重新扫码绑定设备",
            confirmText: "去扫码",
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({ url: "/pages/scan/index" });
              }
            }
          });
        }
      };
      vue.onMounted(() => {
        uni.$on("ws:connected", () => {
          wsConnected.value = true;
        });
        uni.$on("ws:disconnected", () => {
          wsConnected.value = false;
        });
        uni.$on("call:completed", () => {
          formatAppLog("log", "at pages/index/index.vue:221", "[Index] 收到通话完成事件，刷新统计数据");
          loadTodayStats();
        });
        uni.$on("ws:need_rebind", (data) => {
          formatAppLog("log", "at pages/index/index.vue:226", "[Index] 收到需要重新绑定事件:", data);
          uni.showModal({
            title: "需要重新绑定",
            content: "连接凭证已失效或丢失，需要重新扫码绑定设备",
            confirmText: "去扫码",
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({ url: "/pages/scan/index" });
              }
            }
          });
        });
      });
      vue.onUnmounted(() => {
        uni.$off("ws:connected");
        uni.$off("ws:disconnected");
        uni.$off("call:completed");
        uni.$off("ws:need_rebind");
      });
      onShow(() => {
        userStore.restore();
        wsConnected.value = wsService.isConnected;
        if (!userStore.token) {
          uni.reLaunch({ url: "/pages/login/index" });
          return;
        }
        checkPendingCall();
        setTimeout(() => {
          loadTodayStats();
          if (userStore.isBound && userStore.wsToken && !wsService.isConnected) {
            wsService.connect();
          }
        }, 200);
      });
      const checkPendingCall = () => {
        const lastEndedCall = uni.getStorageSync("lastEndedCall");
        if (lastEndedCall && lastEndedCall.callId) {
          formatAppLog("log", "at pages/index/index.vue:273", "[Index] 发现未完成的通话记录:", lastEndedCall);
          uni.removeStorageSync("lastEndedCall");
          uni.showModal({
            title: "通话已结束",
            content: `与${lastEndedCall.customerName || "客户"}的通话已结束，是否填写跟进记录？`,
            confirmText: "去填写",
            cancelText: "稍后",
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({
                  url: `/pages/call-ended/index?callId=${lastEndedCall.callId}&name=${encodeURIComponent(lastEndedCall.customerName || "")}&customerId=${lastEndedCall.customerId || ""}&duration=${lastEndedCall.duration || 0}&hasRecording=${lastEndedCall.hasRecording || false}`
                });
              }
            }
          });
        }
        const currentCall = uni.getStorageSync("currentCall");
        if (currentCall && currentCall.callId) {
          if (!callStateService.isInCall()) {
            formatAppLog("log", "at pages/index/index.vue:299", "[Index] 发现未处理的通话记录，可能是APP被切到后台:", currentCall);
            const startTime = new Date(currentCall.startTime).getTime();
            const duration = Math.floor((Date.now() - startTime) / 1e3);
            if (duration > 300) {
              uni.removeStorageSync("currentCall");
              uni.showModal({
                title: "通话可能已结束",
                content: `与${currentCall.customerName || "客户"}的通话可能已结束，是否填写跟进记录？`,
                confirmText: "去填写",
                cancelText: "取消",
                success: (res) => {
                  if (res.confirm) {
                    uni.navigateTo({
                      url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || "")}&customerId=${currentCall.customerId || ""}&duration=${duration}&hasRecording=false`
                    });
                  }
                }
              });
            }
          }
        }
      };
      const __returned__ = { userStore, serverStore, wsConnected, todayStats, connectionStatus, connectionText, formatDuration, loadTodayStats, handleScanBind, handleDial, handleRefresh, handleReconnect, checkPendingCall };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    var _a, _b, _c, _d;
    return vue.openBlock(), vue.createElementBlock("view", { class: "home-page" }, [
      vue.createCommentVNode(" 用户信息卡片 "),
      vue.createElementVNode("view", { class: "user-card" }, [
        vue.createElementVNode("view", { class: "user-card-main" }, [
          vue.createElementVNode("view", { class: "user-left" }, [
            vue.createElementVNode(
              "view",
              { class: "avatar" },
              vue.toDisplayString(((_b = (_a = $setup.userStore.userInfo) == null ? void 0 : _a.realName) == null ? void 0 : _b.charAt(0)) || "?"),
              1
              /* TEXT */
            ),
            vue.createElementVNode("view", { class: "info" }, [
              vue.createElementVNode(
                "text",
                { class: "name" },
                vue.toDisplayString(((_c = $setup.userStore.userInfo) == null ? void 0 : _c.realName) || "未登录"),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "dept" },
                vue.toDisplayString(((_d = $setup.userStore.userInfo) == null ? void 0 : _d.department) || ""),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createCommentVNode(" 重连按钮在右侧 "),
          $setup.userStore.isBound && !$setup.wsConnected ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "user-right"
          }, [
            vue.createElementVNode("view", {
              class: "reconnect-btn",
              onClick: $setup.handleReconnect
            }, [
              vue.createElementVNode("view", { class: "reconnect-icon-wrap" }, [
                vue.createElementVNode("text", { class: "reconnect-svg" }, "↺")
              ])
            ])
          ])) : vue.createCommentVNode("v-if", true)
        ]),
        vue.createCommentVNode(" 状态信息在下方 "),
        vue.createElementVNode("view", { class: "user-card-footer" }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["status-tag", { active: $setup.userStore.isBound }])
            },
            [
              vue.createElementVNode("text", { class: "status-icon" }, "📱"),
              vue.createElementVNode(
                "text",
                { class: "status-label" },
                vue.toDisplayString($setup.userStore.isBound ? "已绑定" : "未绑定"),
                1
                /* TEXT */
              )
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["status-tag", $setup.connectionStatus])
            },
            [
              vue.createElementVNode("text", { class: "status-icon" }, "📡"),
              vue.createElementVNode(
                "text",
                { class: "status-label" },
                vue.toDisplayString($setup.connectionText),
                1
                /* TEXT */
              )
            ],
            2
            /* CLASS */
          )
        ])
      ]),
      vue.createCommentVNode(" 今日概览 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "今日概览"),
        vue.createElementVNode("view", { class: "stats-card" }, [
          vue.createElementVNode("view", { class: "stat-main" }, [
            vue.createElementVNode(
              "text",
              { class: "stat-number" },
              vue.toDisplayString($setup.todayStats.totalCalls),
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "stat-label" }, "总通话")
          ]),
          vue.createElementVNode("view", { class: "stat-divider" }),
          vue.createElementVNode("view", { class: "stat-grid" }, [
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode(
                "text",
                { class: "stat-value success" },
                vue.toDisplayString($setup.todayStats.connectedCalls),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stat-name" }, "已接通")
            ]),
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode(
                "text",
                { class: "stat-value danger" },
                vue.toDisplayString($setup.todayStats.missedCalls),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stat-name" }, "未接通")
            ]),
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode(
                "text",
                { class: "stat-value" },
                vue.toDisplayString($setup.formatDuration($setup.todayStats.totalDuration)),
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stat-name" }, "总时长")
            ]),
            vue.createElementVNode("view", { class: "stat-item" }, [
              vue.createElementVNode(
                "text",
                { class: "stat-value" },
                vue.toDisplayString($setup.todayStats.connectRate) + "%",
                1
                /* TEXT */
              ),
              vue.createElementVNode("text", { class: "stat-name" }, "接通率")
            ])
          ])
        ])
      ]),
      vue.createCommentVNode(" 快捷操作 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "快捷操作"),
        vue.createElementVNode("view", { class: "quick-actions" }, [
          !$setup.userStore.isBound ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "action-item",
            onClick: $setup.handleScanBind
          }, [
            vue.createElementVNode("view", { class: "action-icon scan" }, [
              vue.createElementVNode("view", { class: "icon-inner" }, [
                vue.createElementVNode("text", { class: "icon-svg" }, "⎔")
              ])
            ]),
            vue.createElementVNode("text", { class: "action-text" }, "扫码绑定")
          ])) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("view", {
            class: "action-item",
            onClick: $setup.handleDial
          }, [
            vue.createElementVNode("view", { class: "action-icon dial" }, [
              vue.createElementVNode("view", { class: "icon-inner" }, [
                vue.createElementVNode("text", { class: "icon-svg" }, "✆")
              ])
            ]),
            vue.createElementVNode("text", { class: "action-text" }, "手动拨号")
          ]),
          vue.createElementVNode("view", {
            class: "action-item",
            onClick: $setup.handleRefresh
          }, [
            vue.createElementVNode("view", { class: "action-icon refresh" }, [
              vue.createElementVNode("view", { class: "icon-inner" }, [
                vue.createElementVNode("text", { class: "icon-svg" }, "⟲")
              ])
            ]),
            vue.createElementVNode("text", { class: "action-text" }, "刷新数据")
          ])
        ])
      ]),
      vue.createCommentVNode(" 等待指令提示 "),
      $setup.userStore.isBound && $setup.wsConnected ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "waiting-card"
      }, [
        vue.createElementVNode("view", { class: "waiting-animation" }, [
          vue.createElementVNode("view", { class: "pulse-ring" }),
          vue.createElementVNode("view", { class: "pulse-ring delay" }),
          vue.createElementVNode("view", { class: "waiting-icon-inner" }, "📡")
        ]),
        vue.createElementVNode("text", { class: "waiting-text" }, "等待PC端拨号指令..."),
        vue.createElementVNode("text", { class: "waiting-sub" }, "保持APP在前台运行")
      ])) : !$setup.userStore.isBound ? (vue.openBlock(), vue.createElementBlock(
        vue.Fragment,
        { key: 1 },
        [
          vue.createCommentVNode(" 未绑定提示 "),
          vue.createElementVNode("view", { class: "bind-card" }, [
            vue.createElementVNode("view", { class: "bind-icon" }, "🔗"),
            vue.createElementVNode("text", { class: "bind-title" }, "设备未绑定"),
            vue.createElementVNode("text", { class: "bind-desc" }, "请在PC端生成二维码，然后扫码绑定设备"),
            vue.createElementVNode("button", {
              class: "btn-bind",
              onClick: $setup.handleScanBind
            }, "扫码绑定设备")
          ])
        ],
        2112
        /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
      )) : (vue.openBlock(), vue.createElementBlock(
        vue.Fragment,
        { key: 2 },
        [
          vue.createCommentVNode(" 已绑定但未连接 "),
          vue.createElementVNode("view", { class: "bind-card" }, [
            vue.createElementVNode("view", { class: "bind-icon" }, "⚠️"),
            vue.createElementVNode("text", { class: "bind-title" }, "连接已断开"),
            vue.createElementVNode("text", { class: "bind-desc" }, "请点击重新连接或重新扫码绑定"),
            vue.createElementVNode("view", { class: "bind-actions" }, [
              vue.createElementVNode("button", {
                class: "btn-action primary",
                onClick: $setup.handleReconnect
              }, "重新连接"),
              vue.createElementVNode("button", {
                class: "btn-action secondary",
                onClick: $setup.handleScanBind
              }, "重新扫码绑定")
            ])
          ])
        ],
        2112
        /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
      ))
    ]);
  }
  const PagesIndexIndex = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__scopeId", "data-v-83a5a03c"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/index/index.vue"]]);
  const makePhoneCall = (phoneNumber) => {
    return new Promise((resolve) => {
      plus.device.dial(phoneNumber, false);
      resolve(true);
    });
  };
  const vibrate = (type = "short") => {
    if (type === "short") {
      uni.vibrateShort({ type: "medium" });
    } else {
      uni.vibrateLong({});
    }
  };
  const pageSize = 20;
  const _sfc_main$b = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const currentTab = vue.ref("all");
      const searchText = vue.ref("");
      const callList = vue.ref([]);
      const page = vue.ref(1);
      const total = vue.ref(0);
      const isLoading = vue.ref(false);
      const isRefreshing = vue.ref(false);
      const hasMore = vue.computed(() => callList.value.length < total.value);
      onShow(() => {
        formatAppLog("log", "at pages/calls/index.vue:126", "[Calls] onShow, token:", userStore.token ? "有" : "无");
        if (!userStore.token) {
          userStore.restore();
        }
        if (userStore.token) {
          loadData(true);
        }
      });
      vue.onMounted(() => {
        uni.$on("call:completed", () => {
          formatAppLog("log", "at pages/calls/index.vue:141", "[Calls] 收到通话完成事件，刷新通话记录");
          loadData(true);
        });
        uni.$on("recording:uploaded", (callId) => {
          formatAppLog("log", "at pages/calls/index.vue:147", "[Calls] 录音上传成功，刷新记录:", callId);
          setTimeout(() => {
            loadData(true);
          }, 1e3);
        });
      });
      vue.onUnmounted(() => {
        uni.$off("call:completed");
        uni.$off("recording:uploaded");
      });
      const groupedCalls = vue.computed(() => {
        const groups = {};
        const filtered = searchText.value ? callList.value.filter(
          (c) => {
            var _a, _b;
            return ((_a = c.customerName) == null ? void 0 : _a.includes(searchText.value)) || ((_b = c.customerPhone) == null ? void 0 : _b.includes(searchText.value));
          }
        ) : callList.value;
        filtered.forEach((call) => {
          const date = formatDate(call.startTime);
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(call);
        });
        return groups;
      });
      const switchTab = (tab) => {
        currentTab.value = tab;
      };
      const loadData = async (refresh = false) => {
        if (isLoading.value) return;
        if (!userStore.token) {
          formatAppLog("log", "at pages/calls/index.vue:187", "[Calls] 无token，跳过加载");
          return;
        }
        if (refresh) {
          page.value = 1;
          callList.value = [];
        }
        isLoading.value = true;
        formatAppLog("log", "at pages/calls/index.vue:197", "[Calls] 开始加载数据, page:", page.value);
        try {
          const params = { page: page.value, pageSize };
          if (currentTab.value === "missed") {
            params.callStatus = "missed";
          }
          const result = await getCallList(params);
          formatAppLog("log", "at pages/calls/index.vue:208", "[Calls] 加载结果:", result);
          if (refresh) {
            callList.value = result.records || [];
          } else {
            callList.value.push(...result.records || []);
          }
          total.value = result.total || 0;
          page.value++;
        } catch (e) {
          formatAppLog("error", "at pages/calls/index.vue:219", "[Calls] 加载通话记录失败:", e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          isLoading.value = false;
          isRefreshing.value = false;
        }
      };
      const onRefresh = () => {
        isRefreshing.value = true;
        loadData(true);
      };
      const loadMore = () => {
        if (hasMore.value && !isLoading.value) {
          loadData();
        }
      };
      const handleSearch = () => {
      };
      vue.watch(currentTab, () => {
        loadData(true);
      });
      const formatDate = (dateStr) => {
        if (!dateStr) return "未知日期";
        const date = new Date(dateStr);
        const today = /* @__PURE__ */ new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) {
          return "今天";
        } else if (date.toDateString() === yesterday.toDateString()) {
          return "昨天";
        } else {
          return `${date.getMonth() + 1}月${date.getDate()}日`;
        }
      };
      const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      };
      const maskPhone = (phone) => {
        if (!phone || phone.length < 7) return phone || "";
        return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
      };
      const getInitial = (name) => {
        return (name == null ? void 0 : name.charAt(0)) || "?";
      };
      const isMissed = (call) => {
        return call.callStatus === "missed" || call.callStatus === "rejected";
      };
      const getCallTypeClass = (call) => {
        if (isMissed(call)) return "missed";
        return call.callType === "outbound" ? "outbound" : "inbound";
      };
      const getCallIcon = (call) => {
        if (call.callType === "outbound") {
          return "↗️";
        }
        return "↙️";
      };
      const getRecordingText = (call) => {
        if (call.hasRecording) {
          return "已上传录音";
        }
        if (call.callStatus === "connected" && call.duration > 0) {
          return "未录音";
        }
        return "";
      };
      const getRecordingClass = (call) => {
        if (call.hasRecording) {
          return "recording-success";
        }
        if (call.callStatus === "connected" && call.duration > 0) {
          return "recording-none";
        }
        return "";
      };
      const getStatusText = (status) => {
        const statusMap = {
          "connected": "已接通",
          "missed": "未接听",
          "rejected": "已拒绝",
          "busy": "忙线",
          "failed": "失败",
          "no_answer": "无人接听",
          "unreachable": "无法接通"
        };
        return statusMap[status] || status || "未知";
      };
      const getStatusClass = (status) => {
        const classMap = {
          "connected": "status-success",
          "missed": "status-danger",
          "rejected": "status-danger",
          "busy": "status-warning",
          "failed": "status-danger",
          "no_answer": "status-warning",
          "unreachable": "status-danger"
        };
        return classMap[status] || "status-default";
      };
      const goToDetail = (callId) => {
        uni.navigateTo({ url: `/pages/call-detail/index?id=${callId}` });
      };
      const handleCallback = async (call) => {
        uni.showModal({
          title: "确认拨打",
          content: `确定要拨打 ${call.customerName || "该客户"} 吗？`,
          success: async (res) => {
            if (res.confirm && call.customerPhone) {
              await makePhoneCall(call.customerPhone);
            }
          }
        });
      };
      const __returned__ = { userStore, currentTab, searchText, callList, page, pageSize, total, isLoading, isRefreshing, hasMore, groupedCalls, switchTab, loadData, onRefresh, loadMore, handleSearch, formatDate, formatTime, maskPhone, getInitial, isMissed, getCallTypeClass, getCallIcon, getRecordingText, getRecordingClass, getStatusText, getStatusClass, goToDetail, handleCallback };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "calls-page" }, [
      vue.createCommentVNode(" 顶部搜索栏 "),
      vue.createElementVNode("view", { class: "search-bar" }, [
        vue.createElementVNode("view", { class: "search-input-wrap" }, [
          vue.createElementVNode("text", { class: "search-icon" }, "🔍"),
          vue.withDirectives(vue.createElementVNode(
            "input",
            {
              class: "search-input",
              placeholder: "搜索客户名称或电话",
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $setup.searchText = $event),
              onInput: $setup.handleSearch
            },
            null,
            544
            /* NEED_HYDRATION, NEED_PATCH */
          ), [
            [vue.vModelText, $setup.searchText]
          ])
        ])
      ]),
      vue.createCommentVNode(" 筛选标签 "),
      vue.createElementVNode("view", { class: "filter-tabs" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", { active: $setup.currentTab === "all" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.switchTab("all"))
          },
          " 全部 ",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", { active: $setup.currentTab === "missed" }]),
            onClick: _cache[2] || (_cache[2] = ($event) => $setup.switchTab("missed"))
          },
          " 未接 ",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 通话记录列表 "),
      vue.createElementVNode("scroll-view", {
        class: "call-list",
        "scroll-y": "",
        onScrolltolower: $setup.loadMore,
        "refresher-enabled": "",
        "refresher-triggered": $setup.isRefreshing,
        onRefresherrefresh: $setup.onRefresh
      }, [
        vue.createCommentVNode(" 按日期分组 "),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.groupedCalls, (group, date) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: date,
              class: "date-group"
            }, [
              vue.createElementVNode(
                "view",
                { class: "date-header" },
                vue.toDisplayString(date),
                1
                /* TEXT */
              ),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList(group, (call) => {
                  return vue.openBlock(), vue.createElementBlock("view", {
                    key: call.id,
                    class: "call-item",
                    onClick: ($event) => $setup.goToDetail(call.id)
                  }, [
                    vue.createCommentVNode(" 左侧头像 "),
                    vue.createElementVNode(
                      "view",
                      {
                        class: vue.normalizeClass(["call-avatar", $setup.getCallTypeClass(call)])
                      },
                      [
                        vue.createElementVNode(
                          "text",
                          { class: "avatar-text" },
                          vue.toDisplayString($setup.getInitial(call.customerName || "")),
                          1
                          /* TEXT */
                        )
                      ],
                      2
                      /* CLASS */
                    ),
                    vue.createCommentVNode(" 中间信息 "),
                    vue.createElementVNode("view", { class: "call-info" }, [
                      vue.createElementVNode("view", { class: "call-main" }, [
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["customer-name", { missed: $setup.isMissed(call) }])
                          },
                          vue.toDisplayString(call.customerName || "未知"),
                          3
                          /* TEXT, CLASS */
                        ),
                        vue.createElementVNode(
                          "text",
                          { class: "call-type-icon" },
                          vue.toDisplayString($setup.getCallIcon(call)),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "call-sub" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "phone-masked" },
                          vue.toDisplayString($setup.maskPhone(call.customerPhone || "")),
                          1
                          /* TEXT */
                        ),
                        vue.createCommentVNode(" 录音状态标签 "),
                        vue.createElementVNode(
                          "text",
                          {
                            class: vue.normalizeClass(["recording-tag", $setup.getRecordingClass(call)])
                          },
                          vue.toDisplayString($setup.getRecordingText(call)),
                          3
                          /* TEXT, CLASS */
                        )
                      ])
                    ]),
                    vue.createCommentVNode(" 右侧时间和状态 "),
                    vue.createElementVNode("view", { class: "call-right" }, [
                      vue.createElementVNode(
                        "view",
                        {
                          class: vue.normalizeClass(["call-status-tag", $setup.getStatusClass(call.callStatus)])
                        },
                        vue.toDisplayString($setup.getStatusText(call.callStatus)),
                        3
                        /* TEXT, CLASS */
                      ),
                      vue.createElementVNode(
                        "text",
                        { class: "call-time" },
                        vue.toDisplayString($setup.formatTime(call.startTime)),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("view", {
                        class: "call-action",
                        onClick: vue.withModifiers(($event) => $setup.handleCallback(call), ["stop"])
                      }, [
                        vue.createElementVNode("text", { class: "action-icon" }, "📞")
                      ], 8, ["onClick"])
                    ])
                  ], 8, ["onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 空状态 "),
        $setup.callList.length === 0 && !$setup.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "empty"
        }, [
          vue.createElementVNode("text", { class: "empty-icon" }, "📞"),
          vue.createElementVNode("text", { class: "empty-text" }, "暂无通话记录"),
          vue.createElementVNode("text", { class: "empty-sub" }, "通话记录将在这里显示")
        ])) : vue.createCommentVNode("v-if", true),
        vue.createCommentVNode(" 加载更多 "),
        $setup.hasMore && $setup.callList.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "load-more"
        }, [
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString($setup.isLoading ? "加载中..." : "上拉加载更多"),
            1
            /* TEXT */
          )
        ])) : vue.createCommentVNode("v-if", true),
        vue.createCommentVNode(" 底部安全区 "),
        vue.createElementVNode("view", { class: "safe-bottom" })
      ], 40, ["refresher-triggered"])
    ]);
  }
  const PagesCallsIndex = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__scopeId", "data-v-171cc5c2"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/calls/index.vue"]]);
  const _sfc_main$a = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const currentPeriod = vue.ref("today");
      const stats = vue.ref({
        totalCalls: 0,
        connectedCalls: 0,
        missedCalls: 0,
        inboundCalls: 0,
        outboundCalls: 0,
        totalDuration: 0,
        avgDuration: 0,
        connectRate: 0
      });
      const outboundRatio = vue.computed(() => {
        if (stats.value.totalCalls === 0) return 0;
        return Math.round(stats.value.outboundCalls / stats.value.totalCalls * 100);
      });
      const inboundRatio = vue.computed(() => {
        if (stats.value.totalCalls === 0) return 0;
        return Math.round(stats.value.inboundCalls / stats.value.totalCalls * 100);
      });
      const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds}秒`;
        if (seconds < 3600) {
          const min2 = Math.floor(seconds / 60);
          const sec = seconds % 60;
          return `${min2}分${sec}秒`;
        }
        const hour = Math.floor(seconds / 3600);
        const min = Math.floor(seconds % 3600 / 60);
        return `${hour}小时${min}分`;
      };
      const loadStats = async () => {
        if (!userStore.token) return;
        try {
          const data = await getStats(currentPeriod.value);
          stats.value = data;
        } catch (e) {
          formatAppLog("error", "at pages/stats/index.vue:131", "加载统计失败:", e);
        }
      };
      vue.watch(currentPeriod, () => {
        loadStats();
      });
      onShow(() => {
        if (!userStore.token) {
          userStore.restore();
        }
        if (userStore.token) {
          loadStats();
        }
      });
      const __returned__ = { userStore, currentPeriod, stats, outboundRatio, inboundRatio, formatDuration, loadStats };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "stats-page" }, [
      vue.createCommentVNode(" 时间筛选 "),
      vue.createElementVNode("view", { class: "filter-tabs" }, [
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", { active: $setup.currentPeriod === "today" }]),
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.currentPeriod = "today")
          },
          "今日",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", { active: $setup.currentPeriod === "week" }]),
            onClick: _cache[1] || (_cache[1] = ($event) => $setup.currentPeriod = "week")
          },
          "本周",
          2
          /* CLASS */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["tab", { active: $setup.currentPeriod === "month" }]),
            onClick: _cache[2] || (_cache[2] = ($event) => $setup.currentPeriod = "month")
          },
          "本月",
          2
          /* CLASS */
        )
      ]),
      vue.createCommentVNode(" 通话概览 "),
      vue.createElementVNode("view", { class: "overview-card" }, [
        vue.createElementVNode("view", { class: "overview-main" }, [
          vue.createElementVNode(
            "text",
            { class: "overview-number" },
            vue.toDisplayString($setup.stats.totalCalls),
            1
            /* TEXT */
          ),
          vue.createElementVNode("text", { class: "overview-label" }, "总通话")
        ]),
        vue.createElementVNode("view", { class: "overview-rate" }, [
          vue.createElementVNode("view", { class: "rate-circle" }, [
            vue.createElementVNode(
              "text",
              { class: "rate-value" },
              vue.toDisplayString($setup.stats.connectRate) + "%",
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("text", { class: "rate-label" }, "接通率")
        ])
      ]),
      vue.createCommentVNode(" 通话分类 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "通话分类"),
        vue.createElementVNode("view", { class: "stat-cards" }, [
          vue.createElementVNode("view", { class: "stat-card success" }, [
            vue.createElementVNode("text", { class: "card-icon" }, "✅"),
            vue.createElementVNode(
              "text",
              { class: "card-value" },
              vue.toDisplayString($setup.stats.connectedCalls),
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "card-label" }, "已接通")
          ]),
          vue.createElementVNode("view", { class: "stat-card danger" }, [
            vue.createElementVNode("text", { class: "card-icon" }, "❌"),
            vue.createElementVNode(
              "text",
              { class: "card-value" },
              vue.toDisplayString($setup.stats.missedCalls),
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "card-label" }, "未接通")
          ])
        ])
      ]),
      vue.createCommentVNode(" 时长统计 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "时长统计"),
        vue.createElementVNode("view", { class: "info-card" }, [
          vue.createElementVNode("view", { class: "info-row" }, [
            vue.createElementVNode("text", { class: "info-label" }, "总通话时长"),
            vue.createElementVNode(
              "text",
              { class: "info-value" },
              vue.toDisplayString($setup.formatDuration($setup.stats.totalDuration)),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "info-row" }, [
            vue.createElementVNode("text", { class: "info-label" }, "平均通话时长"),
            vue.createElementVNode(
              "text",
              { class: "info-value" },
              vue.toDisplayString($setup.formatDuration($setup.stats.avgDuration)),
              1
              /* TEXT */
            )
          ])
        ])
      ]),
      vue.createCommentVNode(" 呼入呼出 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "呼入/呼出"),
        vue.createElementVNode("view", { class: "ratio-card" }, [
          vue.createElementVNode("view", { class: "ratio-item" }, [
            vue.createElementVNode("view", { class: "ratio-info" }, [
              vue.createElementVNode("text", { class: "ratio-label" }, "📤 呼出"),
              vue.createElementVNode(
                "text",
                { class: "ratio-value" },
                vue.toDisplayString($setup.stats.outboundCalls) + " (" + vue.toDisplayString($setup.outboundRatio) + "%)",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "ratio-bar" }, [
              vue.createElementVNode(
                "view",
                {
                  class: "ratio-fill outbound",
                  style: vue.normalizeStyle({ width: $setup.outboundRatio + "%" })
                },
                null,
                4
                /* STYLE */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "ratio-item" }, [
            vue.createElementVNode("view", { class: "ratio-info" }, [
              vue.createElementVNode("text", { class: "ratio-label" }, "📥 呼入"),
              vue.createElementVNode(
                "text",
                { class: "ratio-value" },
                vue.toDisplayString($setup.stats.inboundCalls) + " (" + vue.toDisplayString($setup.inboundRatio) + "%)",
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "ratio-bar" }, [
              vue.createElementVNode(
                "view",
                {
                  class: "ratio-fill inbound",
                  style: vue.normalizeStyle({ width: $setup.inboundRatio + "%" })
                },
                null,
                4
                /* STYLE */
              )
            ])
          ])
        ])
      ])
    ]);
  }
  const PagesStatsIndex = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-774cec60"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/stats/index.vue"]]);
  const _sfc_main$9 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const serverStore = useServerStore();
      const recordingEnabled = vue.ref(false);
      const checkingRecording = vue.ref(false);
      let autoCheckTimer = null;
      const callSettings = vue.ref({
        callNotify: true,
        vibrate: false,
        autoUploadRecording: false,
        autoCleanRecording: false,
        recordingRetentionDays: 3
      });
      const retentionDaysOptions = ["1", "2", "3", "5", "7", "14", "30"];
      const retentionDaysIndex = vue.computed(() => {
        const days = String(callSettings.value.recordingRetentionDays || 3);
        const index = retentionDaysOptions.indexOf(days);
        return index >= 0 ? index : 2;
      });
      const recordingStats = vue.ref({
        totalCount: 0,
        totalSize: 0,
        oldestDate: null,
        newestDate: null
      });
      const showPasswordModal = vue.ref(false);
      const passwordModalType = vue.ref("setup");
      const passwordModalTitle = vue.ref("");
      const newPassword = vue.ref("");
      const confirmPassword = vue.ref("");
      const inputPassword = vue.ref("");
      const securityAnswer = vue.ref("");
      const inputSecurityAnswer = vue.ref("");
      const storedPassword = vue.ref("");
      const storedSecurityAnswer = vue.ref("");
      const wsConnected = vue.ref(false);
      const connectionStatus = vue.computed(() => {
        if (!userStore.isBound) return "unbound";
        if (wsConnected.value) return "connected";
        return "disconnected";
      });
      const connectionText = vue.computed(() => {
        if (!userStore.isBound) return "未绑定";
        if (wsConnected.value) return "已连接";
        return "未连接";
      });
      const loadSettings = () => {
        try {
          const saved = uni.getStorageSync("callSettings");
          if (saved) {
            callSettings.value = { ...callSettings.value, ...JSON.parse(saved) };
          }
          const passwordData = uni.getStorageSync("uploadPasswordData");
          if (passwordData) {
            const data = JSON.parse(passwordData);
            storedPassword.value = data.password || "";
            storedSecurityAnswer.value = data.securityAnswer || "";
          }
        } catch (e) {
          formatAppLog("error", "at pages/settings/index.vue:351", "加载设置失败:", e);
        }
      };
      const saveSettings = () => {
        try {
          uni.setStorageSync("callSettings", JSON.stringify(callSettings.value));
        } catch (e) {
          formatAppLog("error", "at pages/settings/index.vue:360", "保存设置失败:", e);
        }
      };
      const savePasswordData = () => {
        try {
          uni.setStorageSync("uploadPasswordData", JSON.stringify({
            password: storedPassword.value,
            securityAnswer: storedSecurityAnswer.value
          }));
        } catch (e) {
          formatAppLog("error", "at pages/settings/index.vue:372", "保存密码失败:", e);
        }
      };
      const updateSetting = (key, event) => {
        callSettings.value[key] = event.detail.value;
        saveSettings();
      };
      const handleAutoUploadToggle = () => {
        if (callSettings.value.autoUploadRecording) {
          passwordModalType.value = "verify";
          passwordModalTitle.value = "关闭自动上传";
          inputPassword.value = "";
          showPasswordModal.value = true;
        } else {
          passwordModalType.value = "setup";
          passwordModalTitle.value = "开启自动上传";
          newPassword.value = "";
          confirmPassword.value = "";
          securityAnswer.value = "";
          showPasswordModal.value = true;
        }
      };
      const showChangePassword = () => {
        passwordModalType.value = "change";
        passwordModalTitle.value = "修改密码";
        inputPassword.value = "";
        newPassword.value = "";
        confirmPassword.value = "";
        showPasswordModal.value = true;
      };
      const showSecurityQuestion = () => {
        passwordModalType.value = "security";
        passwordModalTitle.value = "忘记密码";
        inputSecurityAnswer.value = "";
      };
      const closePasswordModal = () => {
        showPasswordModal.value = false;
        newPassword.value = "";
        confirmPassword.value = "";
        inputPassword.value = "";
        securityAnswer.value = "";
        inputSecurityAnswer.value = "";
      };
      const handlePasswordConfirm = () => {
        if (passwordModalType.value === "setup") {
          if (newPassword.value.length !== 4) {
            uni.showToast({ title: "请输入4位密码", icon: "none" });
            return;
          }
          if (newPassword.value !== confirmPassword.value) {
            uni.showToast({ title: "两次密码不一致", icon: "none" });
            return;
          }
          if (!securityAnswer.value.trim()) {
            uni.showToast({ title: "请输入安全问题答案", icon: "none" });
            return;
          }
          storedPassword.value = newPassword.value;
          storedSecurityAnswer.value = securityAnswer.value.trim();
          savePasswordData();
          callSettings.value.autoUploadRecording = true;
          saveSettings();
          closePasswordModal();
          uni.showToast({ title: "已开启自动上传", icon: "success" });
        } else if (passwordModalType.value === "verify") {
          if (inputPassword.value === storedPassword.value) {
            callSettings.value.autoUploadRecording = false;
            saveSettings();
            closePasswordModal();
            uni.showToast({ title: "已关闭自动上传", icon: "success" });
          } else {
            uni.showToast({ title: "密码错误", icon: "none" });
          }
        } else if (passwordModalType.value === "security") {
          if (inputSecurityAnswer.value.trim() === storedSecurityAnswer.value) {
            callSettings.value.autoUploadRecording = false;
            saveSettings();
            closePasswordModal();
            uni.showToast({ title: "验证成功，已关闭自动上传", icon: "success" });
          } else {
            uni.showToast({ title: "答案错误", icon: "none" });
          }
        } else if (passwordModalType.value === "change") {
          if (inputPassword.value !== storedPassword.value) {
            uni.showToast({ title: "当前密码错误", icon: "none" });
            return;
          }
          if (newPassword.value.length !== 4) {
            uni.showToast({ title: "请输入4位新密码", icon: "none" });
            return;
          }
          if (newPassword.value !== confirmPassword.value) {
            uni.showToast({ title: "两次密码不一致", icon: "none" });
            return;
          }
          storedPassword.value = newPassword.value;
          savePasswordData();
          closePasswordModal();
          uni.showToast({ title: "密码修改成功", icon: "success" });
        }
      };
      const autoCheckRecordingStatus = async () => {
        if (checkingRecording.value) return;
        checkingRecording.value = true;
        try {
          const hasPermission = await recordingService.checkPermissions();
          if (hasPermission) {
            const enabled = await recordingService.checkRecordingEnabled();
            recordingEnabled.value = enabled;
            const stats = await recordingService.getRecordingStats();
            recordingStats.value = stats;
          }
        } catch (e) {
          formatAppLog("error", "at pages/settings/index.vue:516", "自动检测录音状态失败:", e);
        } finally {
          checkingRecording.value = false;
        }
      };
      const handleRetentionDaysChange = (e) => {
        const days = parseInt(retentionDaysOptions[e.detail.value]);
        callSettings.value.recordingRetentionDays = days;
        saveSettings();
      };
      const handleManualCleanup = async () => {
        uni.showModal({
          title: "清理录音文件",
          content: `确定要清理 ${callSettings.value.recordingRetentionDays || 3} 天前的本地录音文件吗？

已上传到服务器的录音不受影响。`,
          confirmText: "确定清理",
          confirmColor: "#EF4444",
          success: async (res) => {
            if (res.confirm) {
              uni.showLoading({ title: "清理中..." });
              try {
                const result = await recordingService.cleanupExpiredRecordings(callSettings.value.recordingRetentionDays || 3);
                uni.hideLoading();
                if (result.success) {
                  const freedMB = (result.freedSpace / 1024 / 1024).toFixed(2);
                  uni.showModal({
                    title: "清理完成",
                    content: `已删除 ${result.deletedCount} 个录音文件
释放空间: ${freedMB} MB`,
                    showCancel: false
                  });
                  const stats = await recordingService.getRecordingStats();
                  recordingStats.value = stats;
                } else {
                  uni.showToast({ title: "清理失败", icon: "none" });
                }
              } catch (e) {
                uni.hideLoading();
                formatAppLog("error", "at pages/settings/index.vue:559", "清理录音失败:", e);
                uni.showToast({ title: "清理失败", icon: "none" });
              }
            }
          }
        });
      };
      const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      };
      const handleRefreshRecordingStatus = async () => {
        uni.showLoading({ title: "检测中..." });
        try {
          const hasPermission = await recordingService.checkPermissions();
          if (!hasPermission) {
            uni.hideLoading();
            uni.showModal({
              title: "权限不足",
              content: "请先授予APP存储权限，才能检测录音文件",
              confirmText: "去授权",
              success: (res) => {
                if (res.confirm) {
                  plus.runtime.openURL("app-settings:");
                }
              }
            });
            return;
          }
          const enabled = await recordingService.checkRecordingEnabled();
          recordingEnabled.value = enabled;
          uni.hideLoading();
          if (enabled) {
            uni.showToast({ title: "系统录音已开启", icon: "success" });
          } else {
            uni.showModal({
              title: "系统录音未开启",
              content: '未检测到系统录音功能，请点击"去设置"开启手机的通话录音功能',
              showCancel: false,
              confirmText: "我知道了"
            });
          }
        } catch (e) {
          uni.hideLoading();
          formatAppLog("error", "at pages/settings/index.vue:614", "检测录音状态失败:", e);
          uni.showToast({ title: "检测失败", icon: "none" });
        }
      };
      const handleReconnect = () => {
        if (userStore.wsToken) {
          wsService.disconnect();
          setTimeout(() => {
            wsService.connect();
            uni.showToast({ title: "正在重连...", icon: "none" });
          }, 500);
        } else {
          uni.showModal({
            title: "需要重新绑定",
            content: "连接凭证已失效，需要重新扫码绑定设备",
            confirmText: "去扫码",
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({ url: "/pages/scan/index" });
              }
            }
          });
        }
      };
      onShow(() => {
        if (!userStore.token) {
          userStore.restore();
        }
        wsConnected.value = wsService.isConnected;
        autoCheckRecordingStatus();
      });
      vue.onMounted(() => {
        loadSettings();
        uni.$on("ws:connected", () => {
          wsConnected.value = true;
        });
        uni.$on("ws:disconnected", () => {
          wsConnected.value = false;
        });
        autoCheckTimer = setInterval(() => {
          autoCheckRecordingStatus();
        }, 3e4);
        checkAndAutoCleanRecordings();
      });
      const checkAndAutoCleanRecordings = async () => {
        if (!callSettings.value.autoCleanRecording) return;
        try {
          const lastCleanup = uni.getStorageSync("lastRecordingCleanup");
          const now2 = Date.now();
          const oneDayMs = 24 * 60 * 60 * 1e3;
          if (!lastCleanup || now2 - parseInt(lastCleanup) > oneDayMs) {
            formatAppLog("log", "at pages/settings/index.vue:677", "[Settings] 执行自动录音清理");
            const result = await recordingService.cleanupExpiredRecordings(callSettings.value.recordingRetentionDays || 3);
            if (result.deletedCount > 0) {
              formatAppLog("log", "at pages/settings/index.vue:681", `[Settings] 自动清理完成: 删除 ${result.deletedCount} 个文件`);
            }
            uni.setStorageSync("lastRecordingCleanup", String(now2));
          }
        } catch (e) {
          formatAppLog("error", "at pages/settings/index.vue:688", "[Settings] 自动清理录音失败:", e);
        }
      };
      vue.onUnmounted(() => {
        uni.$off("ws:connected");
        uni.$off("ws:disconnected");
        if (autoCheckTimer) {
          clearInterval(autoCheckTimer);
          autoCheckTimer = null;
        }
      });
      const goToServerConfig = () => {
        uni.navigateTo({ url: "/pages/server-config/index" });
      };
      const openRecordingSettings = async () => {
        uni.showLoading({ title: "正在打开设置..." });
        try {
          const success = await recordingService.tryEnableSystemRecording();
          uni.hideLoading();
          const brand = recordingService.getDeviceBrand();
          let tipContent = "";
          if (brand.includes("xiaomi") || brand.includes("redmi")) {
            tipContent = "请在打开的页面中找到：\n通话录音 > 自动录音 > 开启";
          } else if (brand.includes("huawei") || brand.includes("honor")) {
            tipContent = "请在打开的页面中找到：\n通话自动录音 > 开启";
          } else if (brand.includes("oppo") || brand.includes("realme")) {
            tipContent = "请在打开的页面中找到：\n通话录音 > 自动录音 > 开启";
          } else if (brand.includes("vivo") || brand.includes("iqoo")) {
            tipContent = "请在打开的页面中找到：\n通话录音 > 自动录音 > 开启";
          } else {
            tipContent = '请在打开的页面中找到"通话录音"或"自动录音"选项并开启';
          }
          if (success) {
            uni.showModal({
              title: "开启通话录音",
              content: tipContent,
              showCancel: false,
              confirmText: "我知道了"
            });
          } else {
            let guide = "请手动进入手机设置开启通话录音功能：\n\n";
            if (brand.includes("xiaomi") || brand.includes("redmi")) {
              guide += "小米/红米手机：\n设置 > 应用设置 > 系统应用设置 > 电话 > 通话录音 > 自动录音";
            } else if (brand.includes("huawei") || brand.includes("honor")) {
              guide += "华为/荣耀手机：\n电话 > 更多 > 设置 > 通话自动录音";
            } else if (brand.includes("oppo") || brand.includes("realme")) {
              guide += "OPPO/Realme手机：\n电话 > 设置 > 通话录音 > 自动录音";
            } else if (brand.includes("vivo") || brand.includes("iqoo")) {
              guide += "VIVO/iQOO手机：\n电话 > 设置 > 通话录音 > 自动录音";
            } else {
              guide += '通用设置路径：\n电话/拨号 > 设置 > 通话录音 > 自动录音\n\n或在系统设置中搜索"通话录音"';
            }
            uni.showModal({
              title: "开启通话录音",
              content: guide,
              showCancel: false,
              confirmText: "我知道了"
            });
          }
        } catch (e) {
          uni.hideLoading();
          formatAppLog("error", "at pages/settings/index.vue:764", "打开录音设置失败:", e);
          uni.showToast({ title: "打开设置失败", icon: "none" });
        }
      };
      const goToAbout = () => {
        uni.navigateTo({ url: "/pages/about/index" });
      };
      const handleUnbind = () => {
        uni.showModal({
          title: "确认解绑",
          content: "解绑后将无法接收PC端拨号指令，确定要解绑吗？",
          success: async (res) => {
            var _a;
            if (res.confirm) {
              uni.showLoading({ title: "解绑中..." });
              try {
                wsService.disconnect();
                await unbindDevice((_a = userStore.deviceInfo) == null ? void 0 : _a.deviceId);
                userStore.clearDeviceInfo();
                uni.hideLoading();
                uni.showToast({ title: "解绑成功", icon: "success" });
              } catch (e) {
                uni.hideLoading();
                formatAppLog("error", "at pages/settings/index.vue:801", "解绑失败:", e);
                userStore.clearDeviceInfo();
                uni.showToast({ title: "已解绑", icon: "success" });
              }
            }
          }
        });
      };
      const handleLogout = () => {
        uni.showModal({
          title: "确认退出",
          content: "确定要退出登录吗？",
          success: (res) => {
            var _a;
            if (res.confirm) {
              wsService.send("DEVICE_OFFLINE", {
                deviceId: (_a = userStore.deviceInfo) == null ? void 0 : _a.deviceId,
                reason: "logout"
              });
              wsService.disconnect();
              uni.removeStorageSync("currentCall");
              userStore.logout();
              uni.reLaunch({ url: "/pages/login/index" });
            }
          }
        });
      };
      const __returned__ = { userStore, serverStore, recordingEnabled, checkingRecording, get autoCheckTimer() {
        return autoCheckTimer;
      }, set autoCheckTimer(v) {
        autoCheckTimer = v;
      }, callSettings, retentionDaysOptions, retentionDaysIndex, recordingStats, showPasswordModal, passwordModalType, passwordModalTitle, newPassword, confirmPassword, inputPassword, securityAnswer, inputSecurityAnswer, storedPassword, storedSecurityAnswer, wsConnected, connectionStatus, connectionText, loadSettings, saveSettings, savePasswordData, updateSetting, handleAutoUploadToggle, showChangePassword, showSecurityQuestion, closePasswordModal, handlePasswordConfirm, autoCheckRecordingStatus, handleRetentionDaysChange, handleManualCleanup, formatFileSize, handleRefreshRecordingStatus, handleReconnect, checkAndAutoCleanRecordings, goToServerConfig, openRecordingSettings, goToAbout, handleUnbind, handleLogout };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    var _a, _b, _c, _d, _e, _f;
    return vue.openBlock(), vue.createElementBlock("view", { class: "settings-page" }, [
      vue.createCommentVNode(" 用户信息 "),
      vue.createElementVNode("view", { class: "user-section" }, [
        vue.createElementVNode("view", { class: "avatar" }, [
          vue.createElementVNode(
            "text",
            null,
            vue.toDisplayString(((_b = (_a = $setup.userStore.userInfo) == null ? void 0 : _a.realName) == null ? void 0 : _b.charAt(0)) || "?"),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "info" }, [
          vue.createElementVNode(
            "text",
            { class: "name" },
            vue.toDisplayString(((_c = $setup.userStore.userInfo) == null ? void 0 : _c.realName) || "未登录"),
            1
            /* TEXT */
          ),
          vue.createElementVNode(
            "text",
            { class: "dept" },
            vue.toDisplayString(((_d = $setup.userStore.userInfo) == null ? void 0 : _d.department) || "") + " · " + vue.toDisplayString(((_e = $setup.userStore.userInfo) == null ? void 0 : _e.role) || ""),
            1
            /* TEXT */
          )
        ])
      ]),
      vue.createCommentVNode(" 设备信息 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "设备信息"),
        vue.createElementVNode("view", { class: "setting-group" }, [
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "📱 设备状态"),
            vue.createElementVNode(
              "text",
              {
                class: vue.normalizeClass(["value", { bound: $setup.userStore.isBound }])
              },
              vue.toDisplayString($setup.userStore.isBound ? "已绑定" : "未绑定"),
              3
              /* TEXT, CLASS */
            )
          ]),
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "🔗 绑定账号"),
            vue.createElementVNode(
              "text",
              { class: "value" },
              vue.toDisplayString(((_f = $setup.userStore.userInfo) == null ? void 0 : _f.username) || "未绑定"),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "📡 通讯连接"),
            vue.createElementVNode("view", { class: "connection-status" }, [
              vue.createElementVNode(
                "view",
                {
                  class: vue.normalizeClass(["status-dot", $setup.connectionStatus])
                },
                null,
                2
                /* CLASS */
              ),
              vue.createElementVNode(
                "text",
                {
                  class: vue.normalizeClass(["value", $setup.connectionStatus])
                },
                vue.toDisplayString($setup.connectionText),
                3
                /* TEXT, CLASS */
              ),
              $setup.connectionStatus === "disconnected" && $setup.userStore.isBound ? (vue.openBlock(), vue.createElementBlock("button", {
                key: 0,
                class: "btn-mini-reconnect",
                onClick: $setup.handleReconnect
              }, " 重连 ")) : vue.createCommentVNode("v-if", true)
            ])
          ]),
          $setup.userStore.deviceInfo ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "setting-item"
          }, [
            vue.createElementVNode("text", { class: "label" }, "📲 设备型号"),
            vue.createElementVNode(
              "text",
              { class: "value" },
              vue.toDisplayString($setup.userStore.deviceInfo.deviceModel),
              1
              /* TEXT */
            )
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      vue.createCommentVNode(" 通话设置 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "通话设置"),
        vue.createElementVNode("view", { class: "setting-group" }, [
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "🔔 来电提醒"),
            vue.createElementVNode("switch", {
              checked: $setup.callSettings.callNotify,
              onChange: _cache[0] || (_cache[0] = ($event) => $setup.updateSetting("callNotify", $event)),
              color: "#34D399"
            }, null, 40, ["checked"])
          ]),
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "📳 振动提醒"),
            vue.createElementVNode("switch", {
              checked: $setup.callSettings.vibrate,
              onChange: _cache[1] || (_cache[1] = ($event) => $setup.updateSetting("vibrate", $event)),
              color: "#34D399"
            }, null, 40, ["checked"])
          ])
        ])
      ]),
      vue.createCommentVNode(" 录音设置 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "录音设置"),
        vue.createElementVNode("view", { class: "setting-group" }, [
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "🎙️ 系统录音状态"),
            vue.createElementVNode("view", { class: "recording-status" }, [
              $setup.checkingRecording ? (vue.openBlock(), vue.createElementBlock("view", {
                key: 0,
                class: "checking-indicator"
              }, [
                vue.createElementVNode("text", null, "检测中...")
              ])) : (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                { key: 1 },
                [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["status-dot", $setup.recordingEnabled ? "enabled" : "disabled"])
                    },
                    null,
                    2
                    /* CLASS */
                  ),
                  vue.createElementVNode(
                    "text",
                    {
                      class: vue.normalizeClass(["value", $setup.recordingEnabled ? "enabled" : "disabled"])
                    },
                    vue.toDisplayString($setup.recordingEnabled ? "已开启" : "未开启"),
                    3
                    /* TEXT, CLASS */
                  ),
                  vue.createElementVNode("button", {
                    class: "btn-mini-refresh",
                    onClick: $setup.handleRefreshRecordingStatus
                  }, " 刷新 ")
                ],
                64
                /* STABLE_FRAGMENT */
              ))
            ])
          ]),
          vue.createElementVNode("view", {
            class: "setting-item clickable",
            onClick: $setup.openRecordingSettings
          }, [
            vue.createElementVNode("text", { class: "label" }, "⚙️ 开启系统录音"),
            vue.createElementVNode("text", { class: "value" }, "去设置"),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ]),
          vue.createElementVNode("view", {
            class: "setting-item",
            onClick: $setup.handleAutoUploadToggle
          }, [
            vue.createElementVNode("text", { class: "label" }, "📤 自动上传录音"),
            vue.createElementVNode("view", { class: "upload-status" }, [
              $setup.callSettings.autoUploadRecording ? (vue.openBlock(), vue.createElementBlock("text", {
                key: 0,
                class: "lock-icon"
              }, "🔒")) : vue.createCommentVNode("v-if", true),
              vue.createElementVNode("switch", {
                checked: $setup.callSettings.autoUploadRecording,
                color: "#34D399",
                disabled: true
              }, null, 8, ["checked"])
            ])
          ]),
          $setup.callSettings.autoUploadRecording ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "setting-item clickable",
            onClick: $setup.showChangePassword
          }, [
            vue.createElementVNode("text", { class: "label" }, "🔑 修改上传密码"),
            vue.createElementVNode("text", { class: "value" }, "点击修改"),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ])) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 🔥 录音清理设置 "),
          vue.createElementVNode("view", { class: "setting-item" }, [
            vue.createElementVNode("text", { class: "label" }, "🗑️ 自动清理录音"),
            vue.createElementVNode("switch", {
              checked: $setup.callSettings.autoCleanRecording,
              onChange: _cache[2] || (_cache[2] = ($event) => $setup.updateSetting("autoCleanRecording", $event)),
              color: "#34D399"
            }, null, 40, ["checked"])
          ]),
          $setup.callSettings.autoCleanRecording ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 1,
            class: "setting-item"
          }, [
            vue.createElementVNode("text", { class: "label" }, "📅 保留天数"),
            vue.createElementVNode("picker", {
              value: $setup.retentionDaysIndex,
              range: $setup.retentionDaysOptions,
              onChange: $setup.handleRetentionDaysChange
            }, [
              vue.createElementVNode(
                "text",
                { class: "value picker-value" },
                vue.toDisplayString($setup.callSettings.recordingRetentionDays || 3) + " 天",
                1
                /* TEXT */
              )
            ], 40, ["value"])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("view", {
            class: "setting-item clickable",
            onClick: $setup.handleManualCleanup
          }, [
            vue.createElementVNode("text", { class: "label" }, "🧹 立即清理录音"),
            vue.createElementVNode(
              "text",
              { class: "value" },
              vue.toDisplayString($setup.recordingStats.totalCount) + " 个文件，" + vue.toDisplayString($setup.formatFileSize($setup.recordingStats.totalSize)),
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ])
        ]),
        vue.createElementVNode("view", { class: "setting-tip" }, [
          vue.createElementVNode("text", null, "💡 提示：开启手机系统的通话录音功能后，APP会自动扫描并上传录音文件。自动上传功能受密码保护，关闭需要输入密码或回答安全问题。开启自动清理后，超过保留天数的本地录音文件将被自动删除以节省存储空间。")
        ])
      ]),
      vue.createCommentVNode(" 其他设置 "),
      vue.createElementVNode("view", { class: "section" }, [
        vue.createElementVNode("text", { class: "section-title" }, "其他设置"),
        vue.createElementVNode("view", { class: "setting-group" }, [
          vue.createElementVNode("view", {
            class: "setting-item clickable",
            onClick: $setup.goToServerConfig
          }, [
            vue.createElementVNode("text", { class: "label" }, "🌐 服务器设置"),
            vue.createElementVNode(
              "text",
              { class: "value" },
              vue.toDisplayString($setup.serverStore.displayUrl),
              1
              /* TEXT */
            ),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ]),
          vue.createElementVNode("view", {
            class: "setting-item clickable",
            onClick: $setup.goToAbout
          }, [
            vue.createElementVNode("text", { class: "label" }, "ℹ️ 关于"),
            vue.createElementVNode("text", { class: "value" }, "v1.0.0"),
            vue.createElementVNode("text", { class: "arrow" }, "›")
          ])
        ])
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "actions" }, [
        $setup.userStore.isBound ? (vue.openBlock(), vue.createElementBlock("button", {
          key: 0,
          class: "btn-unbind",
          onClick: $setup.handleUnbind
        }, " 🔓 解绑设备 ")) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("button", {
          class: "btn-logout",
          onClick: $setup.handleLogout
        }, " 🚪 退出登录 ")
      ]),
      vue.createCommentVNode(" 密码设置弹窗 "),
      $setup.showPasswordModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "modal-overlay",
        onClick: $setup.closePasswordModal
      }, [
        vue.createElementVNode("view", {
          class: "modal-content",
          onClick: _cache[11] || (_cache[11] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode(
            "text",
            { class: "modal-title" },
            vue.toDisplayString($setup.passwordModalTitle),
            1
            /* TEXT */
          ),
          vue.createCommentVNode(" 设置密码 "),
          $setup.passwordModalType === "setup" ? (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 0 },
            [
              vue.createElementVNode("text", { class: "modal-desc" }, "请设置4位数字密码，用于保护自动上传功能"),
              vue.createElementVNode("view", { class: "password-input-group" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "number",
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $setup.newPassword = $event),
                    placeholder: "请输入4位密码",
                    maxlength: "4",
                    class: "password-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.newPassword]
                ])
              ]),
              vue.createElementVNode("view", { class: "password-input-group" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "number",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.confirmPassword = $event),
                    placeholder: "请确认密码",
                    maxlength: "4",
                    class: "password-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.confirmPassword]
                ])
              ]),
              vue.createElementVNode("text", { class: "modal-desc" }, "设置安全问题（忘记密码时使用）"),
              vue.createElementVNode("view", { class: "security-question" }, [
                vue.createElementVNode("text", { class: "question-label" }, "您的小学母校是？"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $setup.securityAnswer = $event),
                    placeholder: "请输入答案",
                    class: "answer-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.securityAnswer]
                ])
              ])
            ],
            64
            /* STABLE_FRAGMENT */
          )) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 验证密码（关闭时） "),
          $setup.passwordModalType === "verify" ? (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 1 },
            [
              vue.createElementVNode("text", { class: "modal-desc" }, "请输入密码以关闭自动上传功能"),
              vue.createElementVNode("view", { class: "password-input-group" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "number",
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $setup.inputPassword = $event),
                    placeholder: "请输入4位密码",
                    maxlength: "4",
                    class: "password-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.inputPassword]
                ])
              ]),
              vue.createElementVNode("view", {
                class: "forgot-password",
                onClick: $setup.showSecurityQuestion
              }, [
                vue.createElementVNode("text", null, "忘记密码？")
              ])
            ],
            64
            /* STABLE_FRAGMENT */
          )) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 安全问题验证 "),
          $setup.passwordModalType === "security" ? (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 2 },
            [
              vue.createElementVNode("text", { class: "modal-desc" }, "请回答安全问题以重置密码"),
              vue.createElementVNode("view", { class: "security-question" }, [
                vue.createElementVNode("text", { class: "question-label" }, "您的小学母校是？"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $setup.inputSecurityAnswer = $event),
                    placeholder: "请输入答案",
                    class: "answer-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.inputSecurityAnswer]
                ])
              ])
            ],
            64
            /* STABLE_FRAGMENT */
          )) : vue.createCommentVNode("v-if", true),
          vue.createCommentVNode(" 修改密码 "),
          $setup.passwordModalType === "change" ? (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            { key: 3 },
            [
              vue.createElementVNode("text", { class: "modal-desc" }, "请先输入当前密码"),
              vue.createElementVNode("view", { class: "password-input-group" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "number",
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $setup.inputPassword = $event),
                    placeholder: "当前密码",
                    maxlength: "4",
                    class: "password-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.inputPassword]
                ])
              ]),
              vue.createElementVNode("text", { class: "modal-desc" }, "设置新密码"),
              vue.createElementVNode("view", { class: "password-input-group" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "number",
                    "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => $setup.newPassword = $event),
                    placeholder: "新密码",
                    maxlength: "4",
                    class: "password-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.newPassword]
                ])
              ]),
              vue.createElementVNode("view", { class: "password-input-group" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "number",
                    "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => $setup.confirmPassword = $event),
                    placeholder: "确认新密码",
                    maxlength: "4",
                    class: "password-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $setup.confirmPassword]
                ])
              ])
            ],
            64
            /* STABLE_FRAGMENT */
          )) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("view", { class: "modal-buttons" }, [
            vue.createElementVNode("button", {
              class: "btn-cancel",
              onClick: $setup.closePasswordModal
            }, "取消"),
            vue.createElementVNode("button", {
              class: "btn-confirm",
              onClick: $setup.handlePasswordConfirm
            }, "确定")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesSettingsIndex = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-b4180827"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/settings/index.vue"]]);
  const scriptRel = "modulepreload";
  const assetsURL = function(dep) {
    return "/" + dep;
  };
  const seen = {};
  const __vitePreload = function preload(baseModule, deps, importerUrl) {
    let promise = Promise.resolve();
    if (false) {
      document.getElementsByTagName("link");
      const cspNonceMeta = document.querySelector(
        "meta[property=csp-nonce]"
      );
      const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
      promise = Promise.allSettled(
        deps.map((dep) => {
          dep = assetsURL(dep);
          if (dep in seen) return;
          seen[dep] = true;
          const isCss = dep.endsWith(".css");
          const cssSelector = isCss ? '[rel="stylesheet"]' : "";
          if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
            return;
          }
          const link = document.createElement("link");
          link.rel = isCss ? "stylesheet" : scriptRel;
          if (!isCss) {
            link.as = "script";
          }
          link.crossOrigin = "";
          link.href = dep;
          if (cspNonce) {
            link.setAttribute("nonce", cspNonce);
          }
          document.head.appendChild(link);
          if (isCss) {
            return new Promise((res, rej) => {
              link.addEventListener("load", res);
              link.addEventListener(
                "error",
                () => rej(new Error(`Unable to preload CSS for ${dep}`))
              );
            });
          }
        })
      );
    }
    function handlePreloadError(err) {
      const e = new Event("vite:preloadError", {
        cancelable: true
      });
      e.payload = err;
      window.dispatchEvent(e);
      if (!e.defaultPrevented) {
        throw err;
      }
    }
    return promise.then((res) => {
      for (const item of res || []) {
        if (item.status !== "rejected") continue;
        handlePreloadError(item.reason);
      }
      return baseModule().catch(handlePreloadError);
    });
  };
  const _sfc_main$8 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      vue.onMounted(() => {
        setTimeout(() => {
          handleScan();
        }, 300);
      });
      onShow(() => {
      });
      const handleScan = () => {
        uni.scanCode({
          scanType: ["qrCode"],
          success: async (res) => {
            formatAppLog("log", "at pages/scan/index.vue:64", "扫码结果:", res.result);
            await processQRCode(res.result);
          },
          fail: (err) => {
            var _a;
            formatAppLog("error", "at pages/scan/index.vue:68", "扫码失败:", err);
            if ((_a = err.errMsg) == null ? void 0 : _a.includes("cancel")) {
              return;
            }
            uni.showToast({ title: "扫码失败，请重试", icon: "none" });
          }
        });
      };
      const goBack = () => {
        uni.navigateBack();
      };
      const processQRCode = async (content) => {
        try {
          const data = JSON.parse(content);
          formatAppLog("log", "at pages/scan/index.vue:87", "解析二维码数据:", data);
          if (data.action !== "bind_device" && data.type !== "work_phone_bind") {
            uni.showToast({ title: "无效的二维码", icon: "none" });
            return;
          }
          if (data.expiresAt) {
            const expiresAt = typeof data.expiresAt === "number" ? data.expiresAt : new Date(data.expiresAt).getTime();
            if (Date.now() > expiresAt) {
              uni.showToast({ title: "二维码已过期，请重新生成", icon: "none" });
              return;
            }
          }
          const systemInfo = uni.getSystemInfoSync();
          const bindToken = data.token || data.connectionId;
          uni.showLoading({ title: "绑定中..." });
          const result = await bindDevice({
            bindToken,
            deviceInfo: {
              deviceId: systemInfo.deviceId || `device_${Date.now()}`,
              deviceName: systemInfo.deviceModel || "未知设备",
              deviceModel: systemInfo.deviceModel || "",
              osType: systemInfo.platform === "ios" ? "ios" : "android",
              osVersion: systemInfo.system || "",
              appVersion: "1.0.0"
            }
          });
          uni.hideLoading();
          userStore.setWsInfo(result.wsToken, result.wsUrl);
          userStore.setDeviceInfo({
            deviceId: result.deviceId,
            deviceName: systemInfo.deviceModel || "未知设备",
            deviceModel: systemInfo.deviceModel || "",
            osType: systemInfo.platform === "ios" ? "ios" : "android",
            osVersion: systemInfo.system || "",
            appVersion: "1.0.0"
          });
          uni.showToast({ title: "绑定成功", icon: "success" });
          const { wsService: wsService2 } = await __vitePreload(async () => {
            const { wsService: wsService3 } = await Promise.resolve().then(() => websocket);
            return { wsService: wsService3 };
          }, false ? __VITE_PRELOAD__ : void 0);
          formatAppLog("log", "at pages/scan/index.vue:139", "[Scan] 绑定成功，立即建立WebSocket连接");
          wsService2.connect();
          setTimeout(() => {
            uni.switchTab({ url: "/pages/index/index" });
          }, 1500);
        } catch (e) {
          uni.hideLoading();
          formatAppLog("error", "at pages/scan/index.vue:149", "绑定失败:", e);
          uni.showToast({ title: e.message || "绑定失败", icon: "none" });
        }
      };
      const __returned__ = { userStore, handleScan, goBack, processQRCode };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "scan-page" }, [
      vue.createCommentVNode(" 扫描中提示 "),
      vue.createElementVNode("view", { class: "scanning-area" }, [
        vue.createElementVNode("view", { class: "scan-icon" }, "📷"),
        vue.createElementVNode("view", { class: "scan-text" }, "正在打开扫码...")
      ]),
      vue.createCommentVNode(" 操作提示 "),
      vue.createElementVNode("view", { class: "tips" }, [
        vue.createElementVNode("view", { class: "tips-title" }, "扫描PC端绑定二维码"),
        vue.createElementVNode("view", { class: "steps" }, [
          vue.createElementVNode("view", { class: "step" }, [
            vue.createElementVNode("view", { class: "step-num" }, "1"),
            vue.createElementVNode("view", { class: "step-text" }, "PC端登录CRM系统")
          ]),
          vue.createElementVNode("view", { class: "step" }, [
            vue.createElementVNode("view", { class: "step-num" }, "2"),
            vue.createElementVNode("view", { class: "step-text" }, "进入「通话管理」-「呼出配置」")
          ]),
          vue.createElementVNode("view", { class: "step" }, [
            vue.createElementVNode("view", { class: "step-num" }, "3"),
            vue.createElementVNode("view", { class: "step-text" }, "点击「工作手机」-「添加新手机」")
          ]),
          vue.createElementVNode("view", { class: "step" }, [
            vue.createElementVNode("view", { class: "step-num" }, "4"),
            vue.createElementVNode("view", { class: "step-text" }, "扫描显示的二维码完成绑定")
          ])
        ])
      ]),
      vue.createCommentVNode(" 重新扫码按钮 "),
      vue.createElementVNode("view", { class: "actions" }, [
        vue.createElementVNode("button", {
          class: "btn-rescan",
          onClick: $setup.handleScan
        }, "重新扫码"),
        vue.createElementVNode("button", {
          class: "btn-back",
          onClick: $setup.goBack
        }, "返回")
      ])
    ]);
  }
  const PagesScanIndex = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-99526857"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/scan/index.vue"]]);
  const _sfc_main$7 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const callId = vue.ref("");
      const customerName = vue.ref("未知客户");
      const customerId = vue.ref("");
      const phoneNumber = vue.ref("");
      const callStatus = vue.ref("dialing");
      const callStartTime = vue.ref(0);
      const duration = vue.ref(0);
      const durationTimer = vue.ref(null);
      const isMuted = vue.ref(false);
      const isSpeaker = vue.ref(false);
      const showKeypad = vue.ref(false);
      const dtmfInput = vue.ref("");
      const isRecording = vue.ref(false);
      const keypadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
      const customerInitial = vue.computed(() => {
        var _a;
        return ((_a = customerName.value) == null ? void 0 : _a.charAt(0)) || "?";
      });
      const maskedPhone = vue.computed(() => {
        if (!phoneNumber.value || phoneNumber.value.length < 7) return phoneNumber.value;
        return phoneNumber.value.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
      });
      const statusText = vue.computed(() => {
        switch (callStatus.value) {
          case "dialing":
            return "正在呼叫...";
          case "ringing":
            return "对方响铃中...";
          case "connected":
            return "通话中";
          case "ended":
            return "通话已结束";
          default:
            return "";
        }
      });
      const formattedDuration = vue.computed(() => {
        const min = Math.floor(duration.value / 60);
        const sec = duration.value % 60;
        return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
      });
      onLoad((options) => {
        formatAppLog("log", "at pages/calling/index.vue:128", "[Calling] 页面加载, options:", options);
        callId.value = (options == null ? void 0 : options.callId) || `call_${Date.now()}`;
        customerName.value = decodeURIComponent((options == null ? void 0 : options.name) || "未知客户");
        customerId.value = (options == null ? void 0 : options.customerId) || "";
        phoneNumber.value = (options == null ? void 0 : options.phone) || "";
        startCall();
      });
      const startCall = () => {
        formatAppLog("log", "at pages/calling/index.vue:140", "[Calling] 开始通话流程, phone:", phoneNumber.value);
        wsService.reportCallStatus(callId.value, "dialing");
        callStateService.startMonitoring({
          callId: callId.value,
          phoneNumber: phoneNumber.value,
          customerName: customerName.value,
          customerId: customerId.value
        });
        callStateService.onStateChange((state) => {
          formatAppLog("log", "at pages/calling/index.vue:155", "[Calling] 通话状态变化:", state);
          handleCallStateChange(state);
        });
        callStateService.onCallEnd((callInfo, callDuration) => {
          formatAppLog("log", "at pages/calling/index.vue:161", "[Calling] 通话结束回调:", callInfo, callDuration);
          duration.value = callDuration;
        });
        makeSystemCall();
      };
      const handleCallStateChange = (state) => {
        switch (state) {
          case "ringing":
            callStatus.value = "ringing";
            break;
          case "offhook":
            callStatus.value = "connected";
            callStartTime.value = Date.now();
            startDurationTimer();
            isRecording.value = true;
            break;
          case "ended":
            callStatus.value = "ended";
            stopDurationTimer();
            isRecording.value = false;
            break;
        }
      };
      const makeSystemCall = () => {
        if (!phoneNumber.value) {
          formatAppLog("error", "at pages/calling/index.vue:195", "[Calling] 电话号码为空");
          return;
        }
        formatAppLog("log", "at pages/calling/index.vue:199", "[Calling] 调用系统拨号:", phoneNumber.value);
        plus.device.dial(phoneNumber.value, false);
        formatAppLog("log", "at pages/calling/index.vue:204", "[Calling] plus.device.dial 已调用");
      };
      const startDurationTimer = () => {
        stopDurationTimer();
        durationTimer.value = setInterval(() => {
          duration.value = callStateService.getCurrentDuration();
        }, 1e3);
      };
      const stopDurationTimer = () => {
        if (durationTimer.value) {
          clearInterval(durationTimer.value);
          durationTimer.value = null;
        }
      };
      const toggleMute = () => {
        isMuted.value = !isMuted.value;
        uni.showToast({
          title: isMuted.value ? "已静音" : "已取消静音",
          icon: "none"
        });
      };
      const toggleSpeaker = () => {
        isSpeaker.value = !isSpeaker.value;
        uni.showToast({
          title: isSpeaker.value ? "已开启免提" : "已关闭免提",
          icon: "none"
        });
      };
      const sendDTMF = (key) => {
        dtmfInput.value += key;
        uni.showToast({ title: key, icon: "none", duration: 300 });
      };
      const handleHangup = async () => {
        formatAppLog("log", "at pages/calling/index.vue:263", "[Calling] 用户点击结束通话");
        uni.showModal({
          title: "提示",
          content: "请在系统电话界面点击挂断按钮结束通话",
          showCancel: false,
          confirmText: "我知道了"
        });
      };
      const handleCallEndFromServer = (data) => {
        formatAppLog("log", "at pages/calling/index.vue:276", "[Calling] 收到服务器结束通话指令:", data);
        if (data.callId === callId.value) {
          uni.showModal({
            title: "通话已结束",
            content: "CRM系统已标记通话结束，请在系统电话界面确认挂断",
            showCancel: false,
            confirmText: "确定",
            success: () => {
              uni.redirectTo({
                url: `/pages/call-ended/index?callId=${callId.value}&name=${encodeURIComponent(customerName.value)}&customerId=${customerId.value}&duration=${duration.value}&hasRecording=${isRecording.value}`
              });
            }
          });
        }
      };
      vue.onMounted(() => {
        formatAppLog("log", "at pages/calling/index.vue:295", "[Calling] 页面挂载");
        uni.setKeepScreenOn({ keepScreenOn: true });
        uni.$on("call:end", handleCallEndFromServer);
        uni.$on("ws:call_ended", handleCallEndFromServer);
      });
      vue.onUnmounted(() => {
        formatAppLog("log", "at pages/calling/index.vue:306", "[Calling] 页面卸载");
        stopDurationTimer();
        uni.setKeepScreenOn({ keepScreenOn: false });
        uni.$off("call:end", handleCallEndFromServer);
        uni.$off("ws:call_ended", handleCallEndFromServer);
      });
      const __returned__ = { callId, customerName, customerId, phoneNumber, callStatus, callStartTime, duration, durationTimer, isMuted, isSpeaker, showKeypad, dtmfInput, isRecording, keypadKeys, customerInitial, maskedPhone, statusText, formattedDuration, startCall, handleCallStateChange, makeSystemCall, startDurationTimer, stopDurationTimer, toggleMute, toggleSpeaker, sendDTMF, handleHangup, handleCallEndFromServer };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "calling-page" }, [
      vue.createCommentVNode(" 背景渐变 "),
      vue.createElementVNode("view", { class: "bg-gradient" }),
      vue.createCommentVNode(" 通话信息 "),
      vue.createElementVNode("view", { class: "call-info" }, [
        vue.createCommentVNode(" 头像 "),
        vue.createElementVNode("view", { class: "avatar" }, [
          vue.createElementVNode(
            "text",
            { class: "avatar-text" },
            vue.toDisplayString($setup.customerInitial),
            1
            /* TEXT */
          )
        ]),
        vue.createCommentVNode(" 客户名称 "),
        vue.createElementVNode(
          "text",
          { class: "customer-name" },
          vue.toDisplayString($setup.customerName),
          1
          /* TEXT */
        ),
        vue.createCommentVNode(" 电话号码 "),
        vue.createElementVNode(
          "text",
          { class: "phone-number" },
          vue.toDisplayString($setup.maskedPhone),
          1
          /* TEXT */
        ),
        vue.createCommentVNode(" 通话状态 "),
        vue.createElementVNode(
          "text",
          { class: "call-status" },
          vue.toDisplayString($setup.statusText),
          1
          /* TEXT */
        ),
        vue.createCommentVNode(" 通话时长 "),
        $setup.callStatus === "connected" ? (vue.openBlock(), vue.createElementBlock(
          "text",
          {
            key: 0,
            class: "call-duration"
          },
          vue.toDisplayString($setup.formattedDuration),
          1
          /* TEXT */
        )) : vue.createCommentVNode("v-if", true),
        vue.createCommentVNode(" 录音状态指示 "),
        $setup.isRecording ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "recording-indicator"
        }, [
          vue.createElementVNode("view", { class: "recording-dot" }),
          vue.createElementVNode("text", { class: "recording-text" }, "录音中")
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createCommentVNode(" 功能按钮区域 "),
      $setup.callStatus === "connected" ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "action-buttons"
      }, [
        vue.createElementVNode("view", { class: "action-row" }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["action-btn", { active: $setup.isMuted }]),
              onClick: $setup.toggleMute
            },
            [
              vue.createElementVNode(
                "view",
                { class: "btn-icon" },
                vue.toDisplayString($setup.isMuted ? "🔇" : "🔊"),
                1
                /* TEXT */
              ),
              vue.createElementVNode(
                "text",
                { class: "btn-label" },
                vue.toDisplayString($setup.isMuted ? "取消静音" : "静音"),
                1
                /* TEXT */
              )
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["action-btn", { active: $setup.isSpeaker }]),
              onClick: $setup.toggleSpeaker
            },
            [
              vue.createElementVNode("view", { class: "btn-icon" }, "📢"),
              vue.createElementVNode(
                "text",
                { class: "btn-label" },
                vue.toDisplayString($setup.isSpeaker ? "听筒" : "免提"),
                1
                /* TEXT */
              )
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode("view", {
            class: "action-btn",
            onClick: _cache[0] || (_cache[0] = ($event) => $setup.showKeypad = !$setup.showKeypad)
          }, [
            vue.createElementVNode("view", { class: "btn-icon" }, "⌨️"),
            vue.createElementVNode("text", { class: "btn-label" }, "键盘")
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 拨号键盘（可选显示） "),
      $setup.showKeypad ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "keypad-overlay",
        onClick: _cache[2] || (_cache[2] = ($event) => $setup.showKeypad = false)
      }, [
        vue.createElementVNode("view", {
          class: "keypad-container",
          onClick: _cache[1] || (_cache[1] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode(
            "view",
            { class: "keypad-display" },
            vue.toDisplayString($setup.dtmfInput),
            1
            /* TEXT */
          ),
          vue.createElementVNode("view", { class: "keypad-grid" }, [
            (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($setup.keypadKeys, (key) => {
                return vue.createElementVNode("view", {
                  class: "key",
                  key,
                  onClick: ($event) => $setup.sendDTMF(key)
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "key-num" },
                    vue.toDisplayString(key),
                    1
                    /* TEXT */
                  )
                ], 8, ["onClick"]);
              }),
              64
              /* STABLE_FRAGMENT */
            ))
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 挂断按钮 "),
      vue.createElementVNode("view", { class: "hangup-section" }, [
        vue.createElementVNode("view", {
          class: "hangup-btn",
          onClick: $setup.handleHangup
        }, [
          vue.createElementVNode("text", { class: "hangup-icon" }, "📞")
        ]),
        vue.createElementVNode("text", { class: "hangup-label" }, "结束通话")
      ])
    ]);
  }
  const PagesCallingIndex = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-2f1addb2"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/calling/index.vue"]]);
  const _sfc_main$6 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const callId = vue.ref("");
      const phoneNumber = vue.ref("");
      const customerName = vue.ref("");
      const customerId = vue.ref("");
      const duration = vue.ref(0);
      const hasRecording = vue.ref(false);
      const isEditMode = vue.ref(false);
      const callResult = vue.ref("connected");
      const notes = vue.ref("");
      const selectedTags = vue.ref([]);
      const intention = vue.ref("");
      const followUpRequired = vue.ref(false);
      const nextFollowUpDate = vue.ref("");
      const saving = vue.ref(false);
      const quickTags = ["意向高", "需报价", "再联系", "已成交", "无意向", "竞品客户"];
      const intentions = [
        { label: "很有意向", value: "high" },
        { label: "一般", value: "medium" },
        { label: "较低", value: "low" },
        { label: "暂无", value: "none" }
      ];
      const callResultIcon = vue.computed(() => {
        const icons = {
          connected: "✅",
          no_answer: "📵",
          busy: "📞",
          invalid: "❌"
        };
        return icons[callResult.value] || "📞";
      });
      onLoad((options) => {
        formatAppLog("log", "at pages/call-ended/index.vue:174", "[CallEnded] onLoad options:", options);
        callId.value = (options == null ? void 0 : options.callId) || "";
        phoneNumber.value = (options == null ? void 0 : options.phone) || "";
        customerName.value = decodeURIComponent((options == null ? void 0 : options.name) || "") || "未知客户";
        customerId.value = (options == null ? void 0 : options.customerId) || "";
        duration.value = parseInt(options == null ? void 0 : options.duration) || 0;
        hasRecording.value = (options == null ? void 0 : options.hasRecording) === "true";
        isEditMode.value = (options == null ? void 0 : options.isEdit) === "true";
        formatAppLog("log", "at pages/call-ended/index.vue:184", "[CallEnded] Parsed params:", {
          callId: callId.value,
          customerName: customerName.value,
          isEditMode: isEditMode.value
        });
        if (isEditMode.value) {
          uni.setNavigationBarTitle({ title: "添加跟进记录" });
        } else {
          uni.setNavigationBarTitle({ title: "通话记录" });
        }
        if (duration.value > 10) {
          callResult.value = "connected";
        }
      });
      const toggleTag = (tag) => {
        const index = selectedTags.value.indexOf(tag);
        if (index > -1) {
          selectedTags.value.splice(index, 1);
        } else {
          selectedTags.value.push(tag);
        }
      };
      const onDateChange = (e) => {
        nextFollowUpDate.value = e.detail.value;
      };
      const formatDuration = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}分${sec}秒`;
      };
      const handleSave = async () => {
        saving.value = true;
        try {
          if (callId.value) {
            if (!isEditMode.value) {
              const statusMap = {
                connected: "connected",
                no_answer: "missed",
                busy: "busy",
                invalid: "failed"
              };
              const finalStatus = statusMap[callResult.value];
              const finalDuration = callResult.value === "connected" ? duration.value : 0;
              wsService.reportCallEnd(callId.value, {
                status: finalStatus,
                endTime: (/* @__PURE__ */ new Date()).toISOString(),
                duration: finalDuration,
                hasRecording: hasRecording.value,
                endReason: "user_submit"
              });
              await reportCallEnd({
                callId: callId.value,
                status: finalStatus,
                endTime: (/* @__PURE__ */ new Date()).toISOString(),
                duration: finalDuration,
                hasRecording: hasRecording.value
              });
            }
            if (notes.value || selectedTags.value.length > 0 || intention.value || followUpRequired.value) {
              await submitCallFollowup({
                callId: callId.value,
                notes: notes.value || (isEditMode.value ? "" : `通话结果: ${getResultText(callResult.value)}`),
                tags: selectedTags.value,
                intention: intention.value || void 0,
                followUpRequired: followUpRequired.value,
                nextFollowUpDate: nextFollowUpDate.value ? `${nextFollowUpDate.value}T09:00:00` : void 0,
                customerId: customerId.value || void 0
              });
            }
          }
          if (!isEditMode.value) {
            uni.removeStorageSync("currentCall");
            uni.removeStorageSync("lastEndedCall");
          }
          uni.showToast({ title: "保存成功", icon: "success" });
          uni.$emit("call:completed");
          setTimeout(() => {
            if (isEditMode.value) {
              uni.navigateBack();
            } else {
              uni.switchTab({ url: "/pages/index/index" });
            }
          }, 1e3);
        } catch (e) {
          formatAppLog("error", "at pages/call-ended/index.vue:297", "保存失败:", e);
          uni.showToast({ title: e.message || "保存失败", icon: "none" });
        } finally {
          saving.value = false;
        }
      };
      const getResultText = (result) => {
        const map = {
          connected: "已接通",
          no_answer: "无人接听",
          busy: "忙线/拒接",
          invalid: "号码无效"
        };
        return map[result] || result;
      };
      const handleSkip = () => {
        if (isEditMode.value) {
          uni.navigateBack();
        } else {
          uni.removeStorageSync("currentCall");
          uni.$emit("call:completed");
          uni.switchTab({ url: "/pages/index/index" });
        }
      };
      const __returned__ = { callId, phoneNumber, customerName, customerId, duration, hasRecording, isEditMode, callResult, notes, selectedTags, intention, followUpRequired, nextFollowUpDate, saving, quickTags, intentions, callResultIcon, toggleTag, onDateChange, formatDuration, handleSave, getResultText, handleSkip };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "call-ended-page" }, [
      vue.createCommentVNode(" 通话信息 "),
      vue.createElementVNode("view", { class: "call-info" }, [
        vue.createElementVNode(
          "view",
          { class: "status-icon" },
          vue.toDisplayString($setup.isEditMode ? "📝" : $setup.callResultIcon),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "title" },
          vue.toDisplayString($setup.isEditMode ? "添加跟进记录" : "通话已结束"),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "customer-name" },
          vue.toDisplayString($setup.customerName || "未知客户"),
          1
          /* TEXT */
        ),
        !$setup.isEditMode ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "stats"
        }, [
          vue.createElementVNode("view", { class: "stat-item" }, [
            vue.createElementVNode("text", { class: "label" }, "通话时长"),
            vue.createElementVNode(
              "text",
              { class: "value" },
              vue.toDisplayString($setup.formatDuration($setup.duration)),
              1
              /* TEXT */
            )
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createCommentVNode(" 通话结果确认（非编辑模式） "),
      !$setup.isEditMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "通话结果"),
        vue.createElementVNode("view", { class: "result-options" }, [
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["result-option", { active: $setup.callResult === "connected" }]),
              onClick: _cache[0] || (_cache[0] = ($event) => $setup.callResult = "connected")
            },
            [
              vue.createElementVNode("text", { class: "result-icon" }, "✅"),
              vue.createElementVNode("text", { class: "result-text" }, "已接通"),
              vue.createElementVNode("text", { class: "result-desc" }, "与客户正常通话")
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["result-option", { active: $setup.callResult === "no_answer" }]),
              onClick: _cache[1] || (_cache[1] = ($event) => $setup.callResult = "no_answer")
            },
            [
              vue.createElementVNode("text", { class: "result-icon" }, "📵"),
              vue.createElementVNode("text", { class: "result-text" }, "无人接听"),
              vue.createElementVNode("text", { class: "result-desc" }, "响铃后无人接听")
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["result-option", { active: $setup.callResult === "busy" }]),
              onClick: _cache[2] || (_cache[2] = ($event) => $setup.callResult = "busy")
            },
            [
              vue.createElementVNode("text", { class: "result-icon" }, "📞"),
              vue.createElementVNode("text", { class: "result-text" }, "忙线/拒接"),
              vue.createElementVNode("text", { class: "result-desc" }, "对方忙线或拒接")
            ],
            2
            /* CLASS */
          ),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["result-option", { active: $setup.callResult === "invalid" }]),
              onClick: _cache[3] || (_cache[3] = ($event) => $setup.callResult = "invalid")
            },
            [
              vue.createElementVNode("text", { class: "result-icon" }, "❌"),
              vue.createElementVNode("text", { class: "result-text" }, "号码无效"),
              vue.createElementVNode("text", { class: "result-desc" }, "空号/停机/欠费")
            ],
            2
            /* CLASS */
          )
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 通话备注（接通时或编辑模式显示） "),
      $setup.callResult === "connected" || $setup.isEditMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "添加通话备注"),
        vue.withDirectives(vue.createElementVNode(
          "textarea",
          {
            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $setup.notes = $event),
            placeholder: "记录通话要点...",
            maxlength: 500,
            class: "notes-input"
          },
          null,
          512
          /* NEED_PATCH */
        ), [
          [vue.vModelText, $setup.notes]
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 快捷标签（接通时或编辑模式显示） "),
      $setup.callResult === "connected" || $setup.isEditMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "快捷标签"),
        vue.createElementVNode("view", { class: "tags" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.quickTags, (tag) => {
              return vue.createElementVNode("view", {
                key: tag,
                class: vue.normalizeClass(["tag", { active: $setup.selectedTags.includes(tag) }]),
                onClick: ($event) => $setup.toggleTag(tag)
              }, vue.toDisplayString(tag), 11, ["onClick"]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 客户意向（接通时或编辑模式显示） "),
      $setup.callResult === "connected" || $setup.isEditMode ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 3,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "客户意向"),
        vue.createElementVNode("view", { class: "intentions" }, [
          (vue.openBlock(), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.intentions, (item) => {
              return vue.createElementVNode("view", {
                key: item.value,
                class: vue.normalizeClass(["intention", { active: $setup.intention === item.value }]),
                onClick: ($event) => $setup.intention = item.value
              }, vue.toDisplayString(item.label), 11, ["onClick"]);
            }),
            64
            /* STABLE_FRAGMENT */
          ))
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 下次跟进 "),
      $setup.followUpRequired ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 4,
        class: "section"
      }, [
        vue.createElementVNode("text", { class: "section-title" }, "下次跟进时间"),
        vue.createElementVNode("picker", {
          mode: "date",
          value: $setup.nextFollowUpDate,
          onChange: $setup.onDateChange
        }, [
          vue.createElementVNode(
            "view",
            { class: "date-picker" },
            vue.toDisplayString($setup.nextFollowUpDate || "选择日期"),
            1
            /* TEXT */
          )
        ], 40, ["value"])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createElementVNode("view", { class: "follow-switch" }, [
        vue.createElementVNode("text", null, "需要后续跟进"),
        vue.createElementVNode("switch", {
          checked: $setup.followUpRequired,
          onChange: _cache[5] || (_cache[5] = ($event) => $setup.followUpRequired = $event.detail.value),
          color: "#34D399"
        }, null, 40, ["checked"])
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "actions" }, [
        vue.createElementVNode("button", {
          class: "btn-save",
          onClick: $setup.handleSave,
          loading: $setup.saving
        }, " 保存并返回 ", 8, ["loading"]),
        vue.createElementVNode("button", {
          class: "btn-skip",
          onClick: $setup.handleSkip
        }, " 跳过 ")
      ])
    ]);
  }
  const PagesCallEndedIndex = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-acbf5c2b"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/call-ended/index.vue"]]);
  const _sfc_main$5 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const callId = vue.ref("");
      const callDetail = vue.ref(null);
      const isLoading = vue.ref(false);
      const needRefresh = vue.ref(false);
      const customerInitial = vue.computed(() => {
        var _a, _b;
        return ((_b = (_a = callDetail.value) == null ? void 0 : _a.customerName) == null ? void 0 : _b.charAt(0)) || "?";
      });
      const callTypeText = vue.computed(() => {
        var _a;
        return ((_a = callDetail.value) == null ? void 0 : _a.callType) === "outbound" ? "呼出" : "呼入";
      });
      const statusClass = vue.computed(() => {
        var _a;
        const status = (_a = callDetail.value) == null ? void 0 : _a.callStatus;
        if (status === "connected") return "success";
        if (status === "missed" || status === "rejected") return "danger";
        return "warning";
      });
      const statusText = vue.computed(() => {
        var _a, _b;
        const map = {
          connected: "已接通",
          missed: "未接听",
          busy: "忙线",
          failed: "呼叫失败",
          rejected: "已拒接",
          pending: "待处理",
          calling: "拨号中"
        };
        return map[((_a = callDetail.value) == null ? void 0 : _a.callStatus) || ""] || ((_b = callDetail.value) == null ? void 0 : _b.callStatus) || "未知";
      });
      onLoad((options) => {
        formatAppLog("log", "at pages/call-detail/index.vue:168", "[CallDetail] onLoad options:", options);
        callId.value = (options == null ? void 0 : options.id) || "";
        if (callId.value) {
          loadDetail();
        }
      });
      onShow(() => {
        if (needRefresh.value && callId.value) {
          formatAppLog("log", "at pages/call-detail/index.vue:178", "[CallDetail] onShow - 刷新数据");
          loadDetail();
          needRefresh.value = false;
        }
      });
      const loadDetail = async () => {
        if (!callId.value) return;
        isLoading.value = true;
        try {
          const data = await getCallDetail(callId.value);
          callDetail.value = data;
          formatAppLog("log", "at pages/call-detail/index.vue:192", "[CallDetail] 加载详情成功:", JSON.stringify(data));
          formatAppLog("log", "at pages/call-detail/index.vue:193", "[CallDetail] customerPhone:", data == null ? void 0 : data.customerPhone);
        } catch (e) {
          formatAppLog("error", "at pages/call-detail/index.vue:195", "[CallDetail] 加载通话详情失败:", e.message || e);
          uni.showToast({ title: "加载失败", icon: "none" });
        } finally {
          isLoading.value = false;
        }
      };
      const maskPhone = (phone) => {
        if (!phone || phone.length < 7) return phone || "";
        return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
      };
      const formatDateTime = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${month}月${day}日 ${hours}:${minutes}`;
      };
      const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";
        return `${date.getMonth() + 1}月${date.getDate()}日`;
      };
      const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return "0秒";
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        if (min > 0) {
          return `${min}分${sec}秒`;
        }
        return `${sec}秒`;
      };
      const getIntentionText = (intention) => {
        const map = {
          high: "高意向",
          medium: "一般",
          low: "低意向",
          none: "无意向"
        };
        return map[intention || ""] || intention || "-";
      };
      const handleCall = () => {
        var _a, _b;
        const phone = (_a = callDetail.value) == null ? void 0 : _a.customerPhone;
        formatAppLog("log", "at pages/call-detail/index.vue:249", "[CallDetail] handleCall, phone:", phone);
        if (!phone) {
          uni.showToast({ title: "暂无电话号码", icon: "none" });
          return;
        }
        uni.showModal({
          title: "确认回拨",
          content: `确定要拨打 ${((_b = callDetail.value) == null ? void 0 : _b.customerName) || "该客户"} 吗？`,
          success: async (res) => {
            if (res.confirm) {
              if (phone.includes("*")) {
                uni.showToast({ title: "号码已脱敏，请手动拨打", icon: "none" });
              } else {
                await makePhoneCall(phone);
              }
            }
          }
        });
      };
      const handleMessage = () => {
        var _a;
        const phone = (_a = callDetail.value) == null ? void 0 : _a.customerPhone;
        formatAppLog("log", "at pages/call-detail/index.vue:274", "[CallDetail] handleMessage, phone:", phone);
        if (!phone) {
          uni.showToast({ title: "暂无电话号码", icon: "none" });
          return;
        }
        if (phone.includes("*")) {
          plus.runtime.openURL("sms:");
          uni.showToast({ title: "号码已脱敏，请手动输入", icon: "none" });
        } else {
          plus.runtime.openURL(`sms:${phone}`);
        }
      };
      const playRecording = () => {
        var _a;
        if (!((_a = callDetail.value) == null ? void 0 : _a.recordingUrl)) {
          uni.showToast({ title: "暂无录音", icon: "none" });
          return;
        }
        const innerAudioContext = uni.createInnerAudioContext();
        innerAudioContext.src = callDetail.value.recordingUrl;
        innerAudioContext.play();
        uni.showToast({ title: "正在播放录音", icon: "none" });
      };
      const handleAddFollowup = () => {
        var _a, _b, _c, _d;
        formatAppLog("log", "at pages/call-detail/index.vue:313", "[CallDetail] handleAddFollowup clicked");
        formatAppLog("log", "at pages/call-detail/index.vue:314", "[CallDetail] callId:", callId.value);
        formatAppLog("log", "at pages/call-detail/index.vue:315", "[CallDetail] callDetail:", callDetail.value);
        if (!callId.value) {
          uni.showToast({ title: "通话ID不存在", icon: "none" });
          return;
        }
        needRefresh.value = true;
        const name = encodeURIComponent(((_a = callDetail.value) == null ? void 0 : _a.customerName) || "");
        const customerId = ((_b = callDetail.value) == null ? void 0 : _b.customerId) || "";
        const duration = ((_c = callDetail.value) == null ? void 0 : _c.duration) || 0;
        const hasRecording = ((_d = callDetail.value) == null ? void 0 : _d.hasRecording) || false;
        const url = `/pages/call-ended/index?callId=${callId.value}&name=${name}&customerId=${customerId}&duration=${duration}&hasRecording=${hasRecording}&isEdit=true`;
        formatAppLog("log", "at pages/call-detail/index.vue:333", "[CallDetail] navigateTo:", url);
        uni.navigateTo({
          url,
          success: () => {
            formatAppLog("log", "at pages/call-detail/index.vue:338", "[CallDetail] navigateTo success");
          },
          fail: (err) => {
            formatAppLog("error", "at pages/call-detail/index.vue:341", "[CallDetail] navigateTo fail:", err);
            uni.showToast({ title: "跳转失败", icon: "none" });
          }
        });
      };
      const __returned__ = { callId, callDetail, isLoading, needRefresh, customerInitial, callTypeText, statusClass, statusText, loadDetail, maskPhone, formatDateTime, formatDate, formatDuration, getIntentionText, handleCall, handleMessage, playRecording, handleAddFollowup };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
    return vue.openBlock(), vue.createElementBlock("view", { class: "call-detail-page" }, [
      vue.createCommentVNode(" 顶部客户信息 "),
      vue.createElementVNode("view", { class: "customer-header" }, [
        vue.createElementVNode("view", { class: "avatar" }, [
          vue.createElementVNode(
            "text",
            { class: "avatar-text" },
            vue.toDisplayString($setup.customerInitial),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode(
          "text",
          { class: "customer-name" },
          vue.toDisplayString(((_a = $setup.callDetail) == null ? void 0 : _a.customerName) || "未知客户"),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "text",
          { class: "phone-masked" },
          vue.toDisplayString($setup.maskPhone((_b = $setup.callDetail) == null ? void 0 : _b.customerPhone)),
          1
          /* TEXT */
        ),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["call-result-badge", $setup.statusClass])
          },
          vue.toDisplayString($setup.statusText),
          3
          /* TEXT, CLASS */
        )
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "action-buttons" }, [
        vue.createElementVNode("view", {
          class: "action-btn",
          onClick: $setup.handleCall
        }, [
          vue.createElementVNode("view", { class: "btn-icon call" }, [
            vue.createElementVNode("text", { class: "icon-text" }, "☎")
          ]),
          vue.createElementVNode("text", { class: "btn-label" }, "回拨")
        ]),
        vue.createElementVNode("view", {
          class: "action-btn",
          onClick: $setup.handleMessage
        }, [
          vue.createElementVNode("view", { class: "btn-icon message" }, [
            vue.createElementVNode("text", { class: "icon-text" }, "✉")
          ]),
          vue.createElementVNode("text", { class: "btn-label" }, "短信")
        ])
      ]),
      vue.createCommentVNode(" 通话信息卡片 "),
      vue.createElementVNode("view", { class: "info-card" }, [
        vue.createElementVNode("view", { class: "card-title" }, "通话信息"),
        vue.createElementVNode("view", { class: "info-row" }, [
          vue.createElementVNode("text", { class: "info-label" }, "通话类型"),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["type-badge", (_c = $setup.callDetail) == null ? void 0 : _c.callType])
            },
            [
              vue.createElementVNode(
                "text",
                null,
                vue.toDisplayString($setup.callTypeText),
                1
                /* TEXT */
              )
            ],
            2
            /* CLASS */
          )
        ]),
        vue.createElementVNode("view", { class: "info-row" }, [
          vue.createElementVNode("text", { class: "info-label" }, "通话状态"),
          vue.createElementVNode(
            "view",
            {
              class: vue.normalizeClass(["status-badge", $setup.statusClass])
            },
            vue.toDisplayString($setup.statusText),
            3
            /* TEXT, CLASS */
          )
        ]),
        vue.createElementVNode("view", { class: "info-row" }, [
          vue.createElementVNode("text", { class: "info-label" }, "开始时间"),
          vue.createElementVNode(
            "text",
            { class: "info-value" },
            vue.toDisplayString($setup.formatDateTime((_d = $setup.callDetail) == null ? void 0 : _d.startTime)),
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "info-row" }, [
          vue.createElementVNode("text", { class: "info-label" }, "通话时长"),
          vue.createElementVNode(
            "text",
            { class: "info-value highlight" },
            vue.toDisplayString($setup.formatDuration((_e = $setup.callDetail) == null ? void 0 : _e.duration)),
            1
            /* TEXT */
          )
        ]),
        ((_f = $setup.callDetail) == null ? void 0 : _f.endTime) ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "info-row"
        }, [
          vue.createElementVNode("text", { class: "info-label" }, "结束时间"),
          vue.createElementVNode(
            "text",
            { class: "info-value" },
            vue.toDisplayString($setup.formatDateTime((_g = $setup.callDetail) == null ? void 0 : _g.endTime)),
            1
            /* TEXT */
          )
        ])) : vue.createCommentVNode("v-if", true),
        ((_h = $setup.callDetail) == null ? void 0 : _h.hasRecording) ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "info-row"
        }, [
          vue.createElementVNode("text", { class: "info-label" }, "录音"),
          vue.createElementVNode("view", {
            class: "recording-btn",
            onClick: $setup.playRecording
          }, [
            vue.createElementVNode("text", { class: "recording-icon" }, "▶"),
            vue.createElementVNode("text", { class: "recording-text" }, "播放录音")
          ])
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createCommentVNode(" 跟进记录卡片 "),
      vue.createElementVNode("view", { class: "info-card" }, [
        vue.createElementVNode("view", { class: "card-title" }, "跟进记录"),
        ((_j = (_i = $setup.callDetail) == null ? void 0 : _i.callTags) == null ? void 0 : _j.length) ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "info-row"
        }, [
          vue.createElementVNode("text", { class: "info-label" }, "标签"),
          vue.createElementVNode("view", { class: "tags" }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($setup.callDetail.callTags, (tag) => {
                return vue.openBlock(), vue.createElementBlock(
                  "text",
                  {
                    class: "tag",
                    key: tag
                  },
                  vue.toDisplayString(tag),
                  1
                  /* TEXT */
                );
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])) : vue.createCommentVNode("v-if", true),
        ((_k = $setup.callDetail) == null ? void 0 : _k.followUpRequired) !== void 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "info-row"
        }, [
          vue.createElementVNode("text", { class: "info-label" }, "需要跟进"),
          vue.createElementVNode(
            "text",
            { class: "info-value" },
            vue.toDisplayString($setup.callDetail.followUpRequired ? "是" : "否"),
            1
            /* TEXT */
          )
        ])) : vue.createCommentVNode("v-if", true),
        ((_l = $setup.callDetail) == null ? void 0 : _l.notes) ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 2,
          class: "notes-section"
        }, [
          vue.createElementVNode("text", { class: "notes-label" }, "备注"),
          vue.createElementVNode(
            "text",
            { class: "notes-text" },
            vue.toDisplayString($setup.callDetail.notes),
            1
            /* TEXT */
          )
        ])) : vue.createCommentVNode("v-if", true),
        !((_m = $setup.callDetail) == null ? void 0 : _m.notes) && !((_o = (_n = $setup.callDetail) == null ? void 0 : _n.callTags) == null ? void 0 : _o.length) ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 3,
          class: "empty-notes"
        }, [
          vue.createElementVNode("text", { class: "empty-text" }, "暂无跟进记录")
        ])) : vue.createCommentVNode("v-if", true)
      ]),
      vue.createCommentVNode(" 历史跟进记录 "),
      ((_q = (_p = $setup.callDetail) == null ? void 0 : _p.followUpRecords) == null ? void 0 : _q.length) ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "info-card"
      }, [
        vue.createElementVNode("view", { class: "card-title" }, "历史跟进"),
        vue.createElementVNode("view", { class: "followup-list" }, [
          (vue.openBlock(true), vue.createElementBlock(
            vue.Fragment,
            null,
            vue.renderList($setup.callDetail.followUpRecords, (record) => {
              return vue.openBlock(), vue.createElementBlock("view", {
                class: "followup-item",
                key: record.id
              }, [
                vue.createElementVNode("view", { class: "followup-header" }, [
                  vue.createElementVNode(
                    "text",
                    { class: "followup-user" },
                    vue.toDisplayString(record.userName),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "followup-time" },
                    vue.toDisplayString($setup.formatDateTime(record.createdAt)),
                    1
                    /* TEXT */
                  )
                ]),
                vue.createElementVNode(
                  "text",
                  { class: "followup-content" },
                  vue.toDisplayString(record.content),
                  1
                  /* TEXT */
                ),
                record.intention || record.nextFollowUpDate ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "followup-meta"
                }, [
                  record.intention ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 0,
                      class: "meta-item"
                    },
                    "意向: " + vue.toDisplayString($setup.getIntentionText(record.intention)),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true),
                  record.nextFollowUpDate ? (vue.openBlock(), vue.createElementBlock(
                    "text",
                    {
                      key: 1,
                      class: "meta-item"
                    },
                    "下次跟进: " + vue.toDisplayString($setup.formatDate(record.nextFollowUpDate)),
                    1
                    /* TEXT */
                  )) : vue.createCommentVNode("v-if", true)
                ])) : vue.createCommentVNode("v-if", true)
              ]);
            }),
            128
            /* KEYED_FRAGMENT */
          ))
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 底部操作 "),
      vue.createElementVNode("view", { class: "bottom-actions" }, [
        vue.createElementVNode("button", {
          class: "btn-primary",
          onClick: $setup.handleAddFollowup
        }, " 添加跟进记录 ")
      ])
    ]);
  }
  const PagesCallDetailIndex = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__scopeId", "data-v-7dde404a"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/call-detail/index.vue"]]);
  const _sfc_main$4 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const userStore = useUserStore();
      const phoneNumber = vue.ref("");
      const keys = [
        { value: "1", sub: "" },
        { value: "2", sub: "ABC" },
        { value: "3", sub: "DEF" },
        { value: "4", sub: "GHI" },
        { value: "5", sub: "JKL" },
        { value: "6", sub: "MNO" },
        { value: "7", sub: "PQRS" },
        { value: "8", sub: "TUV" },
        { value: "9", sub: "WXYZ" },
        { value: "*", sub: "" },
        { value: "0", sub: "+" },
        { value: "#", sub: "" }
      ];
      const handleKeyPress = (value) => {
        if (phoneNumber.value.length < 15) {
          phoneNumber.value += value;
          vibrate("short");
        }
      };
      const handleDelete = () => {
        phoneNumber.value = phoneNumber.value.slice(0, -1);
      };
      const handleCall = async () => {
        if (!phoneNumber.value) return;
        const callId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = (/* @__PURE__ */ new Date()).toISOString();
        uni.setStorageSync("currentCall", {
          callId,
          phoneNumber: phoneNumber.value,
          customerName: "手动拨号",
          customerId: "",
          startTime,
          isManualDial: true
        });
        const success = await makePhoneCall(phoneNumber.value);
        if (success) {
          uni.navigateTo({
            url: `/pages/calling/index?callId=${callId}&name=${encodeURIComponent("手动拨号")}&phone=${phoneNumber.value}&isManual=true`
          });
        } else {
          uni.showToast({ title: "拨号失败", icon: "none" });
          uni.removeStorageSync("currentCall");
        }
      };
      const __returned__ = { userStore, phoneNumber, keys, handleKeyPress, handleDelete, handleCall };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "dialpad-page" }, [
      vue.createElementVNode("view", { class: "header" }, [
        vue.createElementVNode("text", { class: "title" }, "拨号")
      ]),
      vue.createCommentVNode(" 号码显示 "),
      vue.createElementVNode("view", { class: "display" }, [
        vue.createElementVNode(
          "text",
          {
            class: vue.normalizeClass(["number", { placeholder: !$setup.phoneNumber }])
          },
          vue.toDisplayString($setup.phoneNumber || "请输入号码"),
          3
          /* TEXT, CLASS */
        )
      ]),
      vue.createCommentVNode(" 数字键盘 "),
      vue.createElementVNode("view", { class: "keys" }, [
        (vue.openBlock(), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($setup.keys, (key) => {
            return vue.createElementVNode("view", {
              key: key.value,
              class: "key",
              onClick: ($event) => $setup.handleKeyPress(key.value)
            }, [
              vue.createElementVNode(
                "text",
                { class: "key-main" },
                vue.toDisplayString(key.value),
                1
                /* TEXT */
              ),
              key.sub ? (vue.openBlock(), vue.createElementBlock(
                "text",
                {
                  key: 0,
                  class: "key-sub"
                },
                vue.toDisplayString(key.sub),
                1
                /* TEXT */
              )) : vue.createCommentVNode("v-if", true)
            ], 8, ["onClick"]);
          }),
          64
          /* STABLE_FRAGMENT */
        ))
      ]),
      vue.createCommentVNode(" 操作按钮 "),
      vue.createElementVNode("view", { class: "actions" }, [
        vue.createElementVNode("view", { class: "action-btn" }),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["action-btn call", { disabled: !$setup.phoneNumber }]),
            onClick: $setup.handleCall
          },
          [
            vue.createElementVNode("text", null, "📞")
          ],
          2
          /* CLASS */
        ),
        $setup.phoneNumber ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "action-btn delete",
          onClick: $setup.handleDelete
        }, [
          vue.createElementVNode("text", null, "⌫")
        ])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "action-btn"
        }))
      ])
    ]);
  }
  const PagesDialpadIndex = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-1f062f68"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/dialpad/index.vue"]]);
  const _sfc_main$3 = {};
  function _sfc_render$2(_ctx, _cache) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "agreement-page" }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "scroll-content"
      }, [
        vue.createElementVNode("view", { class: "content" }, [
          vue.createElementVNode("text", { class: "title" }, "用户服务协议"),
          vue.createElementVNode("text", { class: "update-time" }, "更新日期：2026年1月2日"),
          vue.createElementVNode("text", { class: "update-time" }, "生效日期：2026年1月2日"),
          vue.createCommentVNode(" 引言 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-content intro" }, ' 欢迎您使用CRM外呼助手（以下简称"本应用"）！本应用由广州仙狐网络科技有限公司（以下简称"我们"）开发和运营。在您使用本应用之前，请您仔细阅读并充分理解本《用户服务协议》（以下简称"本协议"）的全部内容。 '),
            vue.createElementVNode("text", { class: "section-content intro" }, ' 【特别提示】当您点击"同意"按钮或以其他方式确认接受本协议，或您下载、安装、注册、登录、使用本应用时，即表示您已充分阅读、理解并同意接受本协议的全部内容，本协议即在您与我们之间产生法律效力。如您不同意本协议的任何条款，请勿使用本应用。 ')
          ]),
          vue.createCommentVNode(" 第一条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第一条 协议的接受与修改"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.1 协议的接受"),
              vue.createElementVNode("text", { class: "section-content" }, " 本协议是您与广州仙狐网络科技有限公司之间关于使用本应用服务所订立的协议。本协议对您和我们均具有法律约束力。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.2 协议的修改"),
              vue.createElementVNode("text", { class: "section-content" }, " 我们有权根据国家法律法规的变化、业务发展需要等原因，对本协议进行修改。修改后的协议将在本应用内公布，自公布之日起生效。如您在协议修改后继续使用本应用，即视为您已接受修改后的协议。如您不同意修改后的协议，应立即停止使用本应用。 ")
            ])
          ]),
          vue.createCommentVNode(" 第二条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第二条 服务内容"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.1 服务概述"),
              vue.createElementVNode("text", { class: "section-content" }, " 本应用是一款企业级客户关系管理（CRM）移动办公工具，旨在帮助企业提高外呼效率和客户管理水平。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.2 主要功能"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "（1）外呼管理：支持通过工作手机发起外呼，自动记录通话信息，管理通话录音；"),
                vue.createElementVNode("text", { class: "list-item" }, "（2）客户管理：查看和管理客户信息，记录客户跟进情况，维护客户关系；"),
                vue.createElementVNode("text", { class: "list-item" }, "（3）订单管理：查看订单状态，处理订单相关事务，跟踪订单进度；"),
                vue.createElementVNode("text", { class: "list-item" }, "（4）数据统计：查看个人业绩数据、通话统计、客户分析等报表；"),
                vue.createElementVNode("text", { class: "list-item" }, "（5）消息通知：接收系统消息、业务提醒、任务通知等；"),
                vue.createElementVNode("text", { class: "list-item" }, "（6）设备绑定：支持工作手机与PC端系统的绑定联动；"),
                vue.createElementVNode("text", { class: "list-item" }, "（7）其他企业办公相关功能。")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.3 使用限制"),
              vue.createElementVNode("text", { class: "section-content" }, " 本应用仅供企业内部员工使用，需要通过企业管理员分配的账号登录使用。未经授权，任何个人或组织不得使用本应用。 ")
            ])
          ]),
          vue.createCommentVNode(" 第三条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第三条 用户账号"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.1 账号获取"),
              vue.createElementVNode("text", { class: "section-content" }, " 您的账号由企业管理员创建和分配。账号信息包括但不限于用户名、初始密码、所属部门、角色权限等。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.2 账号安全"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "（1）您应妥善保管账号和密码，不得将账号密码告知他人；"),
                vue.createElementVNode("text", { class: "list-item" }, "（2）您应对账号下的所有行为负责，包括但不限于通话记录、客户操作、数据修改等；"),
                vue.createElementVNode("text", { class: "list-item" }, "（3）如发现账号被盗用或存在安全风险，应立即通知企业管理员并修改密码；"),
                vue.createElementVNode("text", { class: "list-item" }, "（4）因您自身原因导致账号密码泄露所造成的损失，由您自行承担。")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.3 账号使用规范"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "（1）您不得将账号转让、出借、出租给他人使用；"),
                vue.createElementVNode("text", { class: "list-item" }, "（2）您不得使用他人账号登录本应用；"),
                vue.createElementVNode("text", { class: "list-item" }, "（3）您不得通过任何方式获取他人账号信息。")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.4 账号注销"),
              vue.createElementVNode("text", { class: "section-content" }, " 当您离职或不再需要使用本应用时，企业管理员将注销您的账号。账号注销后，您将无法继续使用本应用，相关数据将按照企业规定进行处理。 ")
            ])
          ]),
          vue.createCommentVNode(" 第四条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第四条 用户行为规范"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "4.1 基本规范"),
              vue.createElementVNode("text", { class: "section-content" }, " 您在使用本应用时，应遵守国家法律法规、企业规章制度以及本协议的各项规定。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "4.2 禁止行为"),
              vue.createElementVNode("text", { class: "section-content" }, "您不得利用本应用从事以下行为："),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "（1）违反国家法律法规的行为，包括但不限于电话诈骗、非法集资、传销等；"),
                vue.createElementVNode("text", { class: "list-item" }, "（2）骚扰、欺诈客户，恶意拨打骚扰电话；"),
                vue.createElementVNode("text", { class: "list-item" }, "（3）泄露客户隐私信息、企业商业秘密；"),
                vue.createElementVNode("text", { class: "list-item" }, "（4）传播违法、有害、淫秽、暴力等不良信息；"),
                vue.createElementVNode("text", { class: "list-item" }, "（5）破坏、干扰本应用的正常运行；"),
                vue.createElementVNode("text", { class: "list-item" }, "（6）利用技术手段非法获取数据或攻击系统；"),
                vue.createElementVNode("text", { class: "list-item" }, "（7）其他可能损害我们、企业或第三方合法权益的行为。")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "4.3 违规处理"),
              vue.createElementVNode("text", { class: "section-content" }, " 如您违反上述规范，我们有权采取以下措施：暂停或终止您使用本应用的权利；向企业管理员通报；配合有关部门进行调查；保留追究法律责任的权利。 ")
            ])
          ]),
          vue.createCommentVNode(" 第五条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第五条 知识产权"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.1 应用知识产权"),
              vue.createElementVNode("text", { class: "section-content" }, " 本应用的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、界面设计、版面框架、图标、商标等，均受著作权法、商标法、专利法等知识产权法律法规保护，其知识产权归我们或相关权利人所有。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.2 使用限制"),
              vue.createElementVNode("text", { class: "section-content" }, " 未经我们书面许可，您不得复制、修改、传播、出售、出租本应用的任何内容，不得对本应用进行反向工程、反编译或反汇编。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.3 业务数据归属"),
              vue.createElementVNode("text", { class: "section-content" }, " 您在使用本应用过程中产生的业务数据（包括但不限于客户信息、订单数据、通话记录等），其所有权归属于您所在企业。 ")
            ])
          ]),
          vue.createCommentVNode(" 第六条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第六条 免责声明"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "6.1 服务中断"),
              vue.createElementVNode("text", { class: "section-content" }, " 因网络状况、通讯线路、系统维护升级等原因造成的服务中断或延迟，我们不承担责任，但会尽力减少对您的影响。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "6.2 不可抗力"),
              vue.createElementVNode("text", { class: "section-content" }, " 因不可抗力（如自然灾害、战争、政府行为、法律法规变化等）导致的服务中断或无法履行本协议，我们不承担责任。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "6.3 用户原因"),
              vue.createElementVNode("text", { class: "section-content" }, " 因您自身原因（如账号泄露、操作失误、设备故障等）造成的损失，我们不承担责任。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "6.4 第三方服务"),
              vue.createElementVNode("text", { class: "section-content" }, " 本应用可能包含第三方服务链接或接口，我们对第三方服务的内容、安全性和行为不承担责任。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "6.5 通话内容"),
              vue.createElementVNode("text", { class: "section-content" }, " 您使用本应用进行的通话内容和业务行为，由您自行负责。我们不对通话内容进行审核，也不对因通话内容引起的纠纷承担责任。 ")
            ])
          ]),
          vue.createCommentVNode(" 第七条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第七条 协议终止"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "7.1 用户终止"),
              vue.createElementVNode("text", { class: "section-content" }, " 您可以随时停止使用本应用。如需注销账号，请联系企业管理员。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "7.2 我们终止"),
              vue.createElementVNode("text", { class: "section-content" }, " 如您违反本协议或相关法律法规，我们有权立即终止向您提供服务，无需事先通知。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "7.3 终止后果"),
              vue.createElementVNode("text", { class: "section-content" }, " 协议终止后，您应停止使用本应用。我们有权删除您的账号和相关数据，但法律法规另有规定的除外。 ")
            ])
          ]),
          vue.createCommentVNode(" 第八条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第八条 争议解决"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "8.1 适用法律"),
              vue.createElementVNode("text", { class: "section-content" }, " 本协议的订立、执行、解释及争议解决均适用中华人民共和国法律（不包括港澳台地区法律）。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "8.2 争议解决方式"),
              vue.createElementVNode("text", { class: "section-content" }, " 因本协议引起的或与本协议有关的任何争议，双方应首先通过友好协商解决。协商不成的，任何一方均可向广州仙狐网络科技有限公司所在地有管辖权的人民法院提起诉讼。 ")
            ])
          ]),
          vue.createCommentVNode(" 第九条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第九条 其他条款"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "9.1 条款独立性"),
              vue.createElementVNode("text", { class: "section-content" }, " 本协议的任何条款被认定为无效或不可执行，不影响其他条款的效力。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "9.2 完整协议"),
              vue.createElementVNode("text", { class: "section-content" }, " 本协议构成您与我们之间关于使用本应用的完整协议，取代之前就同一事项达成的任何口头或书面协议。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "9.3 联系方式"),
              vue.createElementVNode("text", { class: "section-content" }, " 如您对本协议有任何疑问，可通过以下方式联系我们： "),
              vue.createElementVNode("view", { class: "contact-info" }, [
                vue.createElementVNode("text", { class: "contact-item" }, "公司名称：广州仙狐网络科技有限公司"),
                vue.createElementVNode("text", { class: "contact-item" }, "客服电话：13570727234"),
                vue.createElementVNode("text", { class: "contact-item" }, "电子邮箱：xianhuquwang@163.com"),
                vue.createElementVNode("text", { class: "contact-item" }, "微信客服：nxys789"),
                vue.createElementVNode("text", { class: "contact-item" }, "公司地址：广州市黄埔区南翔一路68号")
              ])
            ])
          ]),
          vue.createCommentVNode(" 结尾 "),
          vue.createElementVNode("view", { class: "footer-section" }, [
            vue.createElementVNode("text", { class: "footer-text" }, "广州仙狐网络科技有限公司"),
            vue.createElementVNode("text", { class: "footer-text" }, "2026年1月2日")
          ])
        ])
      ])
    ]);
  }
  const PagesAgreementUserAgreement = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-c8dcd74e"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/agreement/user-agreement.vue"]]);
  const _sfc_main$2 = {};
  function _sfc_render$1(_ctx, _cache) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "agreement-page" }, [
      vue.createElementVNode("scroll-view", {
        "scroll-y": "",
        class: "scroll-content"
      }, [
        vue.createElementVNode("view", { class: "content" }, [
          vue.createElementVNode("text", { class: "title" }, "隐私政策"),
          vue.createElementVNode("text", { class: "update-time" }, "更新日期：2026年1月2日"),
          vue.createElementVNode("text", { class: "update-time" }, "生效日期：2026年1月2日"),
          vue.createCommentVNode(" 引言 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-content intro" }, ' 广州仙狐网络科技有限公司（以下简称"我们"）非常重视用户的隐私保护。本《隐私政策》旨在向您说明我们如何收集、使用、存储、共享和保护您的个人信息，以及您如何管理您的个人信息。 '),
            vue.createElementVNode("text", { class: "section-content intro" }, ' 【特别提示】请您在使用CRM外呼助手（以下简称"本应用"）前，仔细阅读并充分理解本隐私政策的全部内容。一旦您开始使用本应用，即表示您已充分理解并同意本政策。如您不同意本政策的任何内容，请勿使用本应用。 ')
          ]),
          vue.createCommentVNode(" 第一条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第一条 我们收集的信息"),
            vue.createElementVNode("text", { class: "section-content" }, " 为了向您提供服务，我们可能会收集以下类型的信息： "),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.1 账号信息"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 用户名、密码（加密存储，我们无法获取明文密码）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 员工姓名、工号、所属部门"),
                vue.createElementVNode("text", { class: "list-item" }, "• 职位、角色权限信息"),
                vue.createElementVNode("text", { class: "list-item" }, "• 联系方式（由企业管理员录入）")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.2 设备信息"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 设备型号、品牌、操作系统版本"),
                vue.createElementVNode("text", { class: "list-item" }, "• 设备唯一标识符（用于设备绑定和安全验证）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 网络状态信息（WiFi/移动网络）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 应用版本信息")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.3 通话相关信息"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 通话记录（通话时间、时长、通话状态）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 通话录音（需要您授权存储权限）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 客户电话号码（用于外呼功能）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 通话备注和跟进记录")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.4 日志信息"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 应用使用日志、操作记录"),
                vue.createElementVNode("text", { class: "list-item" }, "• 错误日志（用于问题排查和服务改进）"),
                vue.createElementVNode("text", { class: "list-item" }, "• 登录时间、登录IP地址")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "1.5 位置信息（可选）"),
              vue.createElementVNode("text", { class: "section-content" }, " 仅在您明确授权后收集，用于考勤打卡、外勤签到等功能。您可以随时在系统设置中关闭位置权限。 ")
            ])
          ]),
          vue.createCommentVNode(" 第二条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第二条 我们如何使用您的信息"),
            vue.createElementVNode("text", { class: "section-content" }, " 我们收集的信息将用于以下目的： "),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.1 提供核心服务"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 验证您的身份，完成登录认证"),
                vue.createElementVNode("text", { class: "list-item" }, "• 提供外呼、客户管理等业务功能"),
                vue.createElementVNode("text", { class: "list-item" }, "• 记录和管理通话信息"),
                vue.createElementVNode("text", { class: "list-item" }, "• 实现设备绑定和数据同步")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.2 保障服务安全"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 设备绑定和安全验证"),
                vue.createElementVNode("text", { class: "list-item" }, "• 防止账号被盗用或滥用"),
                vue.createElementVNode("text", { class: "list-item" }, "• 识别和防范安全风险"),
                vue.createElementVNode("text", { class: "list-item" }, "• 检测和防止欺诈行为")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.3 改进服务质量"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 分析应用使用情况，优化功能体验"),
                vue.createElementVNode("text", { class: "list-item" }, "• 排查和修复技术问题"),
                vue.createElementVNode("text", { class: "list-item" }, "• 开发新功能和服务")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "2.4 企业管理需要"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 向企业管理员提供员工工作数据统计"),
                vue.createElementVNode("text", { class: "list-item" }, "• 支持企业进行业务分析和决策"),
                vue.createElementVNode("text", { class: "list-item" }, "• 生成业绩报表和数据分析")
              ])
            ])
          ]),
          vue.createCommentVNode(" 第三条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第三条 信息的存储与保护"),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.1 存储位置"),
              vue.createElementVNode("text", { class: "section-content" }, " 您的信息存储在企业指定的服务器上，服务器位于中华人民共和国境内。我们采用业界标准的安全措施保护数据安全。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.2 存储期限"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 账号信息：在您使用服务期间持续保存，账号注销后按规定删除"),
                vue.createElementVNode("text", { class: "list-item" }, "• 通话记录：根据企业设置的保留期限保存，通常为1-3年"),
                vue.createElementVNode("text", { class: "list-item" }, "• 通话录音：根据企业设置的保留期限保存"),
                vue.createElementVNode("text", { class: "list-item" }, "• 日志信息：通常保存不超过6个月")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "3.3 安全措施"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 数据传输采用HTTPS/SSL加密"),
                vue.createElementVNode("text", { class: "list-item" }, "• 敏感信息（如密码）采用不可逆加密存储"),
                vue.createElementVNode("text", { class: "list-item" }, "• 实施严格的访问控制，限制数据访问权限"),
                vue.createElementVNode("text", { class: "list-item" }, "• 定期进行安全评估和漏洞修复"),
                vue.createElementVNode("text", { class: "list-item" }, "• 建立数据备份和灾难恢复机制")
              ])
            ])
          ]),
          vue.createCommentVNode(" 第四条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第四条 信息的共享与披露"),
            vue.createElementVNode("text", { class: "section-content" }, " 我们不会向第三方出售您的个人信息。在以下情况下，我们可能会共享您的信息： "),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "4.1 企业内部共享"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 向您所在企业的管理员提供必要的工作数据"),
                vue.createElementVNode("text", { class: "list-item" }, "• 在企业内部进行业务协作时共享相关信息"),
                vue.createElementVNode("text", { class: "list-item" }, "• 生成团队业绩报表时使用汇总数据")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "4.2 法律要求"),
              vue.createElementVNode("view", { class: "list-content" }, [
                vue.createElementVNode("text", { class: "list-item" }, "• 根据法律法规的强制性要求"),
                vue.createElementVNode("text", { class: "list-item" }, "• 响应政府部门的合法要求"),
                vue.createElementVNode("text", { class: "list-item" }, "• 为保护我们、用户或公众的合法权益"),
                vue.createElementVNode("text", { class: "list-item" }, "• 配合司法机关的调查取证")
              ])
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "4.3 第三方服务"),
              vue.createElementVNode("text", { class: "section-content" }, " 使用第三方云服务存储数据时，我们会确保其具备相应的安全保障能力，并签署数据保护协议。使用第三方通信服务时，仅共享必要的信息。 ")
            ])
          ]),
          vue.createCommentVNode(" 第五条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第五条 您的权利"),
            vue.createElementVNode("text", { class: "section-content" }, " 根据相关法律法规，您对您的个人信息享有以下权利： "),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.1 访问权"),
              vue.createElementVNode("text", { class: "section-content" }, " 您可以查看您的账号信息、通话记录等个人数据。如需获取更多信息，可联系企业管理员。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.2 更正权"),
              vue.createElementVNode("text", { class: "section-content" }, " 如发现您的个人信息有误，可联系企业管理员进行更正。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.3 删除权"),
              vue.createElementVNode("text", { class: "section-content" }, " 您可以请求删除您的个人信息，但可能受到法律法规和企业规定的限制。某些信息可能因合规要求需要保留一定期限。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.4 撤回同意"),
              vue.createElementVNode("text", { class: "section-content" }, " 您可以随时撤回对本隐私政策的同意，但这可能导致您无法继续使用本应用的部分或全部功能。 ")
            ]),
            vue.createElementVNode("view", { class: "subsection" }, [
              vue.createElementVNode("text", { class: "subsection-title" }, "5.5 注销账号"),
              vue.createElementVNode("text", { class: "section-content" }, " 当您离职或不再需要使用本应用时，可联系企业管理员注销账号。账号注销后，我们将按规定删除或匿名化处理您的个人信息。 ")
            ])
          ]),
          vue.createCommentVNode(" 第六条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第六条 权限申请说明"),
            vue.createElementVNode("text", { class: "section-content" }, " 本应用可能需要申请以下系统权限，我们承诺仅在必要时使用这些权限： "),
            vue.createElementVNode("view", { class: "permission-table" }, [
              vue.createElementVNode("view", { class: "permission-item" }, [
                vue.createElementVNode("text", { class: "permission-name" }, "📞 电话权限"),
                vue.createElementVNode("text", { class: "permission-desc" }, "用途：发起外呼、获取通话状态"),
                vue.createElementVNode("text", { class: "permission-required" }, "必要性：核心功能必需")
              ]),
              vue.createElementVNode("view", { class: "permission-item" }, [
                vue.createElementVNode("text", { class: "permission-name" }, "🎙️ 麦克风权限"),
                vue.createElementVNode("text", { class: "permission-desc" }, "用途：通话录音功能"),
                vue.createElementVNode("text", { class: "permission-required" }, "必要性：录音功能必需，可选择不授权")
              ]),
              vue.createElementVNode("view", { class: "permission-item" }, [
                vue.createElementVNode("text", { class: "permission-name" }, "📁 存储权限"),
                vue.createElementVNode("text", { class: "permission-desc" }, "用途：保存录音文件、缓存数据"),
                vue.createElementVNode("text", { class: "permission-required" }, "必要性：部分功能必需")
              ]),
              vue.createElementVNode("view", { class: "permission-item" }, [
                vue.createElementVNode("text", { class: "permission-name" }, "🌐 网络权限"),
                vue.createElementVNode("text", { class: "permission-desc" }, "用途：与服务器通信、同步数据"),
                vue.createElementVNode("text", { class: "permission-required" }, "必要性：核心功能必需")
              ]),
              vue.createElementVNode("view", { class: "permission-item" }, [
                vue.createElementVNode("text", { class: "permission-name" }, "🔔 通知权限"),
                vue.createElementVNode("text", { class: "permission-desc" }, "用途：接收消息推送、来电提醒"),
                vue.createElementVNode("text", { class: "permission-required" }, "必要性：消息功能必需，可选择不授权")
              ]),
              vue.createElementVNode("view", { class: "permission-item" }, [
                vue.createElementVNode("text", { class: "permission-name" }, "📷 相机权限"),
                vue.createElementVNode("text", { class: "permission-desc" }, "用途：扫描二维码绑定设备"),
                vue.createElementVNode("text", { class: "permission-required" }, "必要性：扫码功能必需，可选择不授权")
              ])
            ]),
            vue.createElementVNode("text", { class: "section-content" }, " 您可以在手机系统设置中随时管理这些权限。关闭某些权限可能导致相关功能无法正常使用。 ")
          ]),
          vue.createCommentVNode(" 第七条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第七条 未成年人保护"),
            vue.createElementVNode("text", { class: "section-content" }, " 本应用为企业办公应用，不面向未成年人提供服务。如果我们发现在未经监护人同意的情况下收集了未成年人的个人信息，我们将尽快删除相关信息。如果您是未成年人的监护人，发现被监护人使用了本应用，请及时联系我们。 ")
          ]),
          vue.createCommentVNode(" 第八条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第八条 隐私政策的更新"),
            vue.createElementVNode("text", { class: "section-content" }, " 我们可能会根据法律法规变化、业务发展需要等原因更新本隐私政策。更新后的政策将在本应用内公布，重大变更时我们会通过应用内通知、弹窗提示等方式告知您。 "),
            vue.createElementVNode("text", { class: "section-content" }, " 建议您定期查阅本隐私政策，以了解我们如何保护您的信息。如您在政策更新后继续使用本应用，即表示您同意更新后的政策。 ")
          ]),
          vue.createCommentVNode(" 第九条 "),
          vue.createElementVNode("view", { class: "section" }, [
            vue.createElementVNode("text", { class: "section-title" }, "第九条 联系我们"),
            vue.createElementVNode("text", { class: "section-content" }, " 如果您对本隐私政策有任何疑问、意见或建议，或需要行使您的个人信息权利，可以通过以下方式联系我们： "),
            vue.createElementVNode("view", { class: "contact-info" }, [
              vue.createElementVNode("text", { class: "contact-item" }, "公司名称：广州仙狐网络科技有限公司"),
              vue.createElementVNode("text", { class: "contact-item" }, "客服电话：13570727234"),
              vue.createElementVNode("text", { class: "contact-item" }, "电子邮箱：xianhuquwang@163.com"),
              vue.createElementVNode("text", { class: "contact-item" }, "微信客服：nxys789"),
              vue.createElementVNode("text", { class: "contact-item" }, "公司地址：广州市黄埔区南翔一路68号")
            ]),
            vue.createElementVNode("text", { class: "section-content" }, " 我们将在收到您的反馈后15个工作日内回复。 ")
          ]),
          vue.createCommentVNode(" 结尾 "),
          vue.createElementVNode("view", { class: "footer-section" }, [
            vue.createElementVNode("text", { class: "footer-text" }, "广州仙狐网络科技有限公司"),
            vue.createElementVNode("text", { class: "footer-text" }, "2026年1月2日")
          ])
        ])
      ])
    ]);
  }
  const PagesAgreementPrivacyPolicy = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-4ef64c96"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/agreement/privacy-policy.vue"]]);
  const _sfc_main$1 = /* @__PURE__ */ vue.defineComponent({
    __name: "index",
    setup(__props, { expose: __expose }) {
      __expose();
      const openUserAgreement = () => {
        uni.navigateTo({ url: "/pages/agreement/user-agreement" });
      };
      const openPrivacyPolicy = () => {
        uni.navigateTo({ url: "/pages/agreement/privacy-policy" });
      };
      const showFeedback = () => {
        uni.showModal({
          title: "意见反馈",
          content: "如有问题或建议，请通过以下方式联系我们：\n\n📞 客服电话：13570727234\n📧 邮箱：xianhuquwang@163.com\n💬 微信：nxys789\n\n我们会认真对待每一条反馈！",
          showCancel: false,
          confirmText: "我知道了"
        });
      };
      const showContact = () => {
        uni.showActionSheet({
          itemList: ["拨打客服电话", "复制客服微信", "复制邮箱地址"],
          success: (res) => {
            if (res.tapIndex === 0) {
              uni.makePhoneCall({
                phoneNumber: "13570727234",
                fail: () => {
                  uni.setClipboardData({
                    data: "13570727234",
                    success: () => {
                      uni.showToast({ title: "电话已复制", icon: "success" });
                    }
                  });
                }
              });
            } else if (res.tapIndex === 1) {
              uni.setClipboardData({
                data: "nxys789",
                success: () => {
                  uni.showToast({ title: "微信号已复制", icon: "success" });
                }
              });
            } else if (res.tapIndex === 2) {
              uni.setClipboardData({
                data: "xianhuquwang@163.com",
                success: () => {
                  uni.showToast({ title: "邮箱已复制", icon: "success" });
                }
              });
            }
          }
        });
      };
      const __returned__ = { openUserAgreement, openPrivacyPolicy, showFeedback, showContact };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "about-page" }, [
      vue.createCommentVNode(" 应用信息 "),
      vue.createElementVNode("view", { class: "app-info" }, [
        vue.createElementVNode("image", {
          class: "app-logo",
          src: _imports_0,
          mode: "aspectFit"
        }),
        vue.createElementVNode("text", { class: "app-name" }, "CRM外呼助手"),
        vue.createElementVNode("text", { class: "app-version" }, "版本 v1.0.0"),
        vue.createElementVNode("text", { class: "app-slogan" }, "高效外呼 · 智能管理")
      ]),
      vue.createCommentVNode(" 功能入口 "),
      vue.createElementVNode("view", { class: "menu-section" }, [
        vue.createElementVNode("view", {
          class: "menu-item",
          onClick: $setup.openUserAgreement
        }, [
          vue.createElementVNode("text", { class: "menu-icon" }, "📄"),
          vue.createElementVNode("text", { class: "menu-label" }, "用户服务协议"),
          vue.createElementVNode("text", { class: "menu-arrow" }, "›")
        ]),
        vue.createElementVNode("view", {
          class: "menu-item",
          onClick: $setup.openPrivacyPolicy
        }, [
          vue.createElementVNode("text", { class: "menu-icon" }, "🔒"),
          vue.createElementVNode("text", { class: "menu-label" }, "隐私政策"),
          vue.createElementVNode("text", { class: "menu-arrow" }, "›")
        ]),
        vue.createElementVNode("view", {
          class: "menu-item",
          onClick: $setup.showFeedback
        }, [
          vue.createElementVNode("text", { class: "menu-icon" }, "💬"),
          vue.createElementVNode("text", { class: "menu-label" }, "意见反馈"),
          vue.createElementVNode("text", { class: "menu-arrow" }, "›")
        ]),
        vue.createElementVNode("view", {
          class: "menu-item",
          onClick: $setup.showContact
        }, [
          vue.createElementVNode("text", { class: "menu-icon" }, "📞"),
          vue.createElementVNode("text", { class: "menu-label" }, "联系我们"),
          vue.createElementVNode("text", { class: "menu-arrow" }, "›")
        ])
      ]),
      vue.createCommentVNode(" 公司信息 "),
      vue.createElementVNode("view", { class: "company-section" }, [
        vue.createElementVNode("text", { class: "company-name" }, "广州仙狐网络科技有限公司"),
        vue.createElementVNode("text", { class: "copyright" }, "Copyright © 2024-2026 All Rights Reserved")
      ])
    ]);
  }
  const PagesAboutIndex = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-6b4e7e2d"], ["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/pages/about/index.vue"]]);
  __definePage("pages/splash/index", PagesSplashIndex);
  __definePage("pages/server-config/index", PagesServerConfigIndex);
  __definePage("pages/login/index", PagesLoginIndex);
  __definePage("pages/index/index", PagesIndexIndex);
  __definePage("pages/calls/index", PagesCallsIndex);
  __definePage("pages/stats/index", PagesStatsIndex);
  __definePage("pages/settings/index", PagesSettingsIndex);
  __definePage("pages/scan/index", PagesScanIndex);
  __definePage("pages/calling/index", PagesCallingIndex);
  __definePage("pages/call-ended/index", PagesCallEndedIndex);
  __definePage("pages/call-detail/index", PagesCallDetailIndex);
  __definePage("pages/dialpad/index", PagesDialpadIndex);
  __definePage("pages/agreement/user-agreement", PagesAgreementUserAgreement);
  __definePage("pages/agreement/privacy-policy", PagesAgreementPrivacyPolicy);
  __definePage("pages/about/index", PagesAboutIndex);
  const _sfc_main = /* @__PURE__ */ vue.defineComponent({
    __name: "App",
    setup(__props, { expose: __expose }) {
      __expose();
      onLaunch(() => {
        formatAppLog("log", "at App.vue:7", "App Launch");
        const serverStore = useServerStore();
        const userStore = useUserStore();
        serverStore.restoreFromStorage();
        userStore.restore();
        setupCallStateListener();
      });
      onShow(() => {
        formatAppLog("log", "at App.vue:21", "App Show");
        checkPendingCall();
      });
      onHide(() => {
        formatAppLog("log", "at App.vue:27", "App Hide");
      });
      const checkPendingCall = () => {
        const currentCall = uni.getStorageSync("currentCall");
        if (currentCall && currentCall.callId) {
          formatAppLog("log", "at App.vue:34", "[App] 发现未完成的通话:", currentCall.callId);
          const pages = getCurrentPages();
          const currentPage = pages[pages.length - 1];
          const currentRoute = (currentPage == null ? void 0 : currentPage.route) || "";
          if (currentRoute.includes("call-ended")) {
            formatAppLog("log", "at App.vue:43", "[App] 已在通话结束页面，跳过");
            return;
          }
          const startTime = new Date(currentCall.startTime).getTime();
          const duration = Math.floor((Date.now() - startTime) / 1e3);
          uni.removeStorageSync("currentCall");
          setTimeout(() => {
            uni.navigateTo({
              url: `/pages/call-ended/index?callId=${currentCall.callId}&name=${encodeURIComponent(currentCall.customerName || "")}&customerId=${currentCall.customerId || ""}&duration=${duration}&hasRecording=false`,
              fail: (err) => {
                formatAppLog("error", "at App.vue:59", "[App] 跳转失败:", err);
                uni.setStorageSync("currentCall", currentCall);
              }
            });
          }, 500);
        }
      };
      const setupCallStateListener = () => {
        plus.globalEvent.addEventListener("resume", () => {
          formatAppLog("log", "at App.vue:74", "[App] 应用从后台返回");
          setTimeout(() => {
            checkPendingCall();
          }, 1e3);
        });
      };
      const __returned__ = { checkPendingCall, setupCallStateListener, get onLaunch() {
        return onLaunch;
      }, get onShow() {
        return onShow;
      }, get onHide() {
        return onHide;
      }, get useServerStore() {
        return useServerStore;
      }, get useUserStore() {
        return useUserStore;
      } };
      Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
      return __returned__;
    }
  });
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "D:/kaifa/CRM - 1.8.0开发中/crmAPP/src/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    const pinia = createPinia();
    app.use(pinia);
    return {
      app,
      pinia
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
