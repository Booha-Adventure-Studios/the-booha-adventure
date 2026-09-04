/* Bounded decoded-image cache. It never touches the browser HTTP cache. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.BoohaDecodedImageCache = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  class DecodedImageCache {
    constructor(options = {}) {
      this.budgetBytes = Math.max(1, Number(options.budgetBytes) || 48 * 1048576);
      this.temporaryBytes = Math.max(1, Number(options.temporaryBytes) || 8 * 1048576);
      this.createImage = options.createImage || (() => new Image());
      this.onEvict = typeof options.onEvict === 'function' ? options.onEvict : null;
      this.entries = new Map();
      this.clock = 0;
      this.usageBytes = 0;
    }

    get(key, options = {}) {
      if (this.entries.has(key)) {
        const entry = this.entries.get(key);
        entry.lastUsed = ++this.clock;
        this._applyProtection(entry, options);
        return entry.image;
      }
      const entry = {
        key,
        image: this.createImage(),
        bytes: this.temporaryBytes,
        loaded: false,
        failed: false,
        lastUsed: ++this.clock,
        required: false,
        popupPinned: false,
        celebrationPinned: false,
        token: Symbol(key),
        onLoad: null,
        onError: null,
      };
      this._applyProtection(entry, options);
      this.entries.set(key, entry);
      this.usageBytes += entry.bytes;
      const image = entry.image;
      image.decoding = 'async';
      entry.onLoad = () => this._finishLoad(entry);
      entry.onError = () => this._finishError(entry);
      image.addEventListener('load', entry.onLoad, { once: true });
      image.addEventListener('error', entry.onError, { once: true });
      if (options.src) image.src = options.src;
      this.evictIfNeeded();
      return image;
    }

    protect(key, kind, value = true) {
      const entry = this.entries.get(key);
      if (!entry) return false;
      if (kind === 'required') entry.required = value;
      if (kind === 'popup') entry.popupPinned = value;
      if (kind === 'celebration') entry.celebrationPinned = value;
      entry.lastUsed = ++this.clock;
      if (!value) this.evictIfNeeded();
      return true;
    }

    evictIfNeeded() {
      while (this.usageBytes > this.budgetBytes) {
        let candidate = null;
        for (const entry of this.entries.values()) {
          if (entry.required || entry.popupPinned || entry.celebrationPinned) continue;
          if (!candidate || entry.lastUsed < candidate.lastUsed) candidate = entry;
        }
        if (!candidate) break;
        this._remove(candidate);
      }
    }

    clearProtection(kind) {
      for (const entry of this.entries.values()) {
        if (kind === 'required') entry.required = false;
        if (kind === 'popup') entry.popupPinned = false;
        if (kind === 'celebration') entry.celebrationPinned = false;
      }
      this.evictIfNeeded();
    }

    stats() {
      let loaded = 0;
      let protectedBytes = 0;
      for (const entry of this.entries.values()) if (entry.loaded) loaded += 1;
      for (const entry of this.entries.values()) {
        if (entry.required || entry.popupPinned || entry.celebrationPinned) protectedBytes += entry.bytes;
      }
      return {
        count: this.entries.size,
        loaded,
        usageBytes: this.usageBytes,
        budgetBytes: this.budgetBytes,
        protectedBytes,
        overBudget: this.usageBytes > this.budgetBytes,
        keys: Array.from(this.entries.keys()),
      };
    }

    _applyProtection(entry, options) {
      if (options.required !== undefined) entry.required = options.required === true;
      if (options.popupPinned !== undefined) entry.popupPinned = options.popupPinned === true;
      if (options.celebrationPinned !== undefined) entry.celebrationPinned = options.celebrationPinned === true;
    }

    _finishLoad(entry) {
      if (this.entries.get(entry.key) !== entry || entry.failed) return;
      const width = Number(entry.image.naturalWidth) || 0;
      const height = Number(entry.image.naturalHeight) || 0;
      const bytes = width > 0 && height > 0 ? width * height * 4 : this.temporaryBytes;
      this.usageBytes += bytes - entry.bytes;
      entry.bytes = bytes;
      entry.loaded = width > 0 && height > 0;
      entry.lastUsed = ++this.clock;
      this.evictIfNeeded();
    }

    _finishError(entry) {
      if (this.entries.get(entry.key) !== entry) return;
      entry.failed = true;
      this._remove(entry);
    }

    _remove(entry) {
      if (this.entries.get(entry.key) !== entry) return;
      this.entries.delete(entry.key);
      this.usageBytes -= entry.bytes;
      if (entry.image) {
        if (entry.onLoad) entry.image.removeEventListener('load', entry.onLoad);
        if (entry.onError) entry.image.removeEventListener('error', entry.onError);
        entry.image.onload = null;
        entry.image.onerror = null;
        try {
          if (typeof entry.image.removeAttribute === 'function') entry.image.removeAttribute('src');
          else entry.image.src = '';
        } catch (_) {}
      }
      if (this.onEvict) this.onEvict(entry.key, entry.image, entry);
      entry.onLoad = null;
      entry.onError = null;
      entry.image = null;
    }
  }

  return DecodedImageCache;
}));
