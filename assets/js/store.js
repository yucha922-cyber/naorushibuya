/* ================================================================
   NAORU整体 LP - store.js（店舗データ読み込み）

   店舗固有の情報は stores/<storeId>.json に集約されています。
   このスクリプトがJSONを読み込み、HTML内の以下の目印へ値を流し込みます。

     data-store-text="パス"        → 要素の textContent を差し替え
     data-store-html="パス"        → 要素の innerHTML を差し替え（<br>等を含む値）
     data-store-attr="属性:パス,..." → 指定属性を差し替え（例 href:reserveUrl）

   「パス」はJSONのキーをドットで繋いだもの（例: tel.display / staff.0.name）。

   読み込む店舗は <html data-store="shibuya"> で指定します（既定: shibuya）。
   新店舗は stores/ にJSONを追加し、data-store の値を変えるだけで切替できます。

   ※ デザイン・レイアウトは変更しません。値の差し替えのみを行います。
   ================================================================ */

(function () {
  'use strict';

  var storeId = (document.documentElement.getAttribute('data-store') || 'shibuya').trim();

  // ドット区切りパスで入れ子の値を取り出す（配列インデックスも可）
  function get(obj, path) {
    return path.split('.').reduce(function (o, key) {
      return (o == null) ? undefined : o[key];
    }, obj);
  }

  function applyBindings(data) {
    // テキスト差し替え
    document.querySelectorAll('[data-store-text]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-store-text'));
      if (v != null) el.textContent = v;
    });

    // HTML差し替え（<br>などを含む値）
    document.querySelectorAll('[data-store-html]').forEach(function (el) {
      var v = get(data, el.getAttribute('data-store-html'));
      if (v != null) el.innerHTML = v;
    });

    // 属性差し替え（"href:reserveUrl, title:storeName" の形式）
    document.querySelectorAll('[data-store-attr]').forEach(function (el) {
      el.getAttribute('data-store-attr').split(',').forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx === -1) return;
        var attr = pair.slice(0, idx).trim();
        var v = get(data, pair.slice(idx + 1).trim());
        if (attr && v != null) el.setAttribute(attr, v);
      });
    });
  }

  function applyHead(data) {
    var seo = data.seo || {};

    if (seo.metaTitle) document.title = seo.metaTitle;

    function setMeta(selector, value) {
      if (value == null) return;
      var el = document.head.querySelector(selector);
      if (el) el.setAttribute('content', value);
    }
    setMeta('meta[name="description"]', seo.metaDescription);
    setMeta('meta[property="og:title"]', seo.ogTitle);
    setMeta('meta[property="og:description"]', seo.ogDescription);
    setMeta('meta[property="og:image"]', seo.ogImage);

    // canonical（無ければ生成）
    if (seo.canonicalUrl) {
      var canonical = document.head.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', seo.canonicalUrl);
    }

    // JSON-LD（LocalBusiness）を店舗データから再構築
    var ldEl = document.getElementById('store-jsonld');
    if (ldEl) {
      var addr = data.address || {};
      var ld = {
        '@context': 'https://schema.org',
        '@type': 'HealthAndBeautyBusiness',
        name: data.storeName,
        image: seo.ogImage,
        description: seo.jsonLdDescription,
        address: {
          '@type': 'PostalAddress',
          postalCode: addr.postalCode,
          addressRegion: addr.region,
          addressLocality: addr.locality,
          streetAddress: addr.street,
          addressCountry: 'JP'
        },
        telephone: data.tel && data.tel.intl,
        openingHours: data.openingHoursSchema,
        priceRange: '¥¥'
      };
      if (data.googleRating > 0 && data.reviewCount > 0) {
        ld.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: data.googleRating,
          reviewCount: data.reviewCount
        };
      }
      ldEl.textContent = JSON.stringify(ld, null, 2);
    }
  }

  fetch('stores/' + storeId + '.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('store json not found: ' + storeId);
      return res.json();
    })
    .then(function (data) {
      applyBindings(data);
      applyHead(data);
    })
    .catch(function (err) {
      // 読み込み失敗時はHTMLの初期表示（渋谷院）をそのまま使う
      console.error('[store.js] 店舗データの読み込みに失敗しました:', err.message);
    });
})();
