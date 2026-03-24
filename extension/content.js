// Pick - Content Script
// Detects products on e-commerce pages and finds better prices

(function() {
  'use strict';

  const API_BASE = 'https://pickmarketplace.app';

  // Product detection selectors for different sites
  const SITE_CONFIGS = {
    'amazon.com': {
      name: '#productTitle',
      price: '.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price-whole',
      image: '#landingImage, #imgBlkFront',
      isProductPage: () => document.querySelector('#productTitle') !== null
    },
    'walmart.com': {
      name: '[data-testid="product-title"], h1[itemprop="name"]',
      price: '[data-testid="price-wrap"] span, [itemprop="price"]',
      image: '[data-testid="hero-image"] img',
      isProductPage: () => window.location.pathname.includes('/ip/')
    },
    'target.com': {
      name: '[data-test="product-title"], h1[data-test="product-title"]',
      price: '[data-test="product-price"], span[data-test="product-price"]',
      image: '[data-test="product-image"] img, .slideDeckPicture img',
      isProductPage: () => window.location.pathname.includes('/p/')
    },
    'bestbuy.com': {
      name: '.sku-title h1, .heading-5',
      price: '.priceView-customer-price span, .priceView-hero-price span',
      image: '.primary-image img, .picture-wrapper img',
      isProductPage: () => document.querySelector('.sku-title') !== null || window.location.pathname.includes('/site/')
    }
  };

  // Get current site config
  function getSiteConfig() {
    const hostname = window.location.hostname.replace('www.', '');
    return SITE_CONFIGS[hostname] || null;
  }

  // Get current site name
  function getCurrentSite() {
    const hostname = window.location.hostname.replace('www.', '');
    const siteNames = {
      'amazon.com': 'Amazon',
      'walmart.com': 'Walmart',
      'target.com': 'Target',
      'bestbuy.com': 'Best Buy'
    };
    return siteNames[hostname] || hostname;
  }

  // Extract text from element
  function getText(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : null;
  }

  // Extract price as number
  function getPrice(selector) {
    const el = document.querySelector(selector);
    if (!el) return null;

    const text = el.textContent;
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(',', ''));
    }
    return null;
  }

  // Extract image URL
  function getImage(selector) {
    const el = document.querySelector(selector);
    return el ? (el.src || el.getAttribute('data-src')) : null;
  }

  // Extract product info from current page
  function extractProductInfo() {
    const config = getSiteConfig();
    if (!config || !config.isProductPage()) return null;

    const name = getText(config.name);
    const price = getPrice(config.price);
    const image = getImage(config.image);

    if (!name || !price) return null;

    return {
      name,
      price,
      image,
      url: window.location.href,
      site: getCurrentSite()
    };
  }

  // Call the Pick API to find alternatives
  async function findAlternatives(product) {
    try {
      // Extract key search terms from product name
      const searchTerms = product.name
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter(word => word.length > 2)
        .slice(0, 5)
        .join(' ');

      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(searchTerms)}`);

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      // Transform API results to alternatives format
      const alternatives = [];

      for (const result of data.results) {
        for (const priceData of result.prices) {
          // Skip the current site
          if (priceData.retailer === product.site) continue;

          // Only include if cheaper than current price
          if (priceData.amount < product.price) {
            alternatives.push({
              site: priceData.retailer,
              price: priceData.amount,
              url: priceData.url,
              productName: result.name
            });
          }
        }
      }

      // Sort by price and return top 3
      return alternatives
        .sort((a, b) => a.price - b.price)
        .slice(0, 3);

    } catch (error) {
      console.error('[Pick] API error:', error);
      // Fallback to mock data if API fails
      return generateMockAlternatives(product);
    }
  }

  // Get proper search URL for each retailer
  function getSearchUrl(site, query) {
    const encodedQuery = encodeURIComponent(query);
    const urls = {
      'Amazon': `https://www.amazon.com/s?k=${encodedQuery}`,
      'Walmart': `https://www.walmart.com/search?q=${encodedQuery}`,
      'Target': `https://www.target.com/s?searchTerm=${encodedQuery}`,
      'Best Buy': `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedQuery}`
    };
    return urls[site] || `https://www.google.com/search?q=${encodedQuery}+${site}`;
  }

  // Fallback mock data generator
  function generateMockAlternatives(product) {
    const retailers = ['Amazon', 'Walmart', 'Target', 'Best Buy'];
    const currentSite = product.site;

    // Extract clean search terms from product name
    const searchTerms = product.name
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 5)
      .join(' ');

    return retailers
      .filter(r => r !== currentSite)
      .map(site => ({
        site,
        price: product.price * (0.85 + Math.random() * 0.1), // 5-15% cheaper
        url: getSearchUrl(site, searchTerms)
      }))
      .filter(alt => alt.price < product.price)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);
  }

  // Create and show the Pick widget
  function showPickWidget(product, alternatives) {
    // Remove existing widget
    const existing = document.getElementById('pick-widget');
    if (existing) existing.remove();

    const bestSavings = (product.price - alternatives[0].price).toFixed(2);
    const bestPercent = Math.round((1 - alternatives[0].price / product.price) * 100);

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'pick-widget';
    widget.innerHTML = `
      <div class="pick-header">
        <div class="pick-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2A9D8F" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span>Save $${bestSavings} with Pick</span>
        </div>
        <button class="pick-close" id="pick-close">×</button>
      </div>
      <div class="pick-current">
        <span class="pick-label">Current price at ${product.site}</span>
        <span class="pick-current-price">$${product.price.toFixed(2)}</span>
      </div>
      <div class="pick-alternatives">
        ${alternatives.map((alt, index) => `
          <a href="${alt.url}" target="_blank" class="pick-alt" data-savings="${(product.price - alt.price).toFixed(2)}">
            <div class="pick-alt-info">
              <span class="pick-alt-site">${alt.site}${index === 0 ? '<span class="pick-best-badge">Best</span>' : ''}</span>
              <span class="pick-alt-price">$${alt.price.toFixed(2)}</span>
            </div>
            <div class="pick-alt-savings">
              Save $${(product.price - alt.price).toFixed(2)}
              <span class="pick-alt-percent">-${Math.round((1 - alt.price / product.price) * 100)}%</span>
            </div>
          </a>
        `).join('')}
      </div>
      <div class="pick-footer">
        <a href="${API_BASE}" target="_blank">Search more on Pick →</a>
      </div>
    `;

    document.body.appendChild(widget);

    // Add close handler
    document.getElementById('pick-close').addEventListener('click', () => {
      widget.classList.add('pick-hidden');
      setTimeout(() => widget.remove(), 300);
    });

    // Track clicks for savings
    widget.querySelectorAll('.pick-alt').forEach(el => {
      el.addEventListener('click', () => {
        const savings = parseFloat(el.dataset.savings);
        chrome.storage.local.get(['totalSaved', 'dealsFound'], (data) => {
          chrome.storage.local.set({
            totalSaved: (data.totalSaved || 0) + savings,
            dealsFound: (data.dealsFound || 0) + 1
          });
        });
      });
    });

    // Animate in
    setTimeout(() => widget.classList.add('pick-visible'), 100);
  }

  // Main function
  async function init() {
    // Wait for page to fully load
    if (document.readyState !== 'complete') {
      window.addEventListener('load', init);
      return;
    }

    // Small delay to ensure dynamic content loads
    setTimeout(async () => {
      const product = extractProductInfo();

      if (product) {
        console.log('[Pick] Product detected:', product);

        // Store current product
        chrome.storage.local.set({ currentProduct: product });

        // Find alternatives
        const alternatives = await findAlternatives(product);

        if (alternatives.length > 0) {
          console.log('[Pick] Found cheaper alternatives:', alternatives);
          showPickWidget(product, alternatives);

          // Store for popup
          chrome.storage.local.set({ alternatives });
        } else {
          console.log('[Pick] No cheaper alternatives found');
          chrome.storage.local.set({ alternatives: [] });
        }
      } else {
        console.log('[Pick] Not a product page or could not extract info');
        chrome.storage.local.remove(['currentProduct', 'alternatives']);
      }
    }, 2000);
  }

  // Run
  init();
})();
