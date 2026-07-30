// Pick - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');

  // Load stats
  loadStats();

  // Get stored product data
  chrome.storage.local.get(['currentProduct', 'alternatives'], (data) => {
    if (data.currentProduct && data.alternatives && data.alternatives.length > 0) {
      showProductWithAlternatives(data.currentProduct, data.alternatives);
    } else if (data.currentProduct) {
      showNoDeals(data.currentProduct);
    } else {
      showNoProduct();
    }
  });
});

function loadStats() {
  chrome.storage.local.get(['totalSaved', 'dealsFound'], (data) => {
    document.getElementById('total-saved').textContent = `$${(data.totalSaved || 0).toFixed(0)}`;
    document.getElementById('deals-found').textContent = data.dealsFound || 0;
  });
}

function showNoProduct() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="no-product">
      <div class="no-product-icon">🛍️</div>
      <h2>No product detected</h2>
      <p>Visit a product page on a supported site and Pick will automatically find better deals.</p>
      <div class="supported-sites">
        <span class="site-badge">Amazon</span>
        <span class="site-badge">Walmart</span>
        <span class="site-badge">Target</span>
        <span class="site-badge">Best Buy</span>
      </div>
    </div>
  `;
}

// DOM-building helper — text always goes through textContent, never markup.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Only allow http(s) URLs from stored/scraped data — anything else is dropped.
function safeHttpUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch (e) {
    // fall through
  }
  return null;
}

// Product name/image come from scraped retailer pages and alternatives from
// API data — all built with createElement/textContent so none of it is ever
// interpreted as markup.
function buildProductInfo(product, nameMaxLength) {
  const info = el('div', 'product-info');
  const imageUrl = safeHttpUrl(product.image);
  if (imageUrl) {
    const img = el('img', 'product-image');
    img.src = imageUrl;
    img.alt = '';
    info.appendChild(img);
  }
  const details = el('div', 'product-details');
  const name = nameMaxLength ? truncate(product.name, nameMaxLength) : product.name;
  details.appendChild(el('div', 'product-name', name));
  details.appendChild(el('div', 'product-price', `$${product.price.toFixed(2)}`));
  info.appendChild(details);
  return info;
}

function showNoDeals(product) {
  const content = document.getElementById('content');
  content.textContent = '';

  const info = buildProductInfo(product);
  const price = info.querySelector('.product-price');
  price.style.textDecoration = 'none';
  price.style.color = '#2A9D8F';
  content.appendChild(info);

  const noDeals = el('div', 'no-deals');
  noDeals.appendChild(el('div', 'no-deals-icon', '✓'));
  noDeals.appendChild(el('h3', null, "You've got the best price!"));
  noDeals.appendChild(el('p', null, "We checked other retailers and couldn't find this product cheaper."));
  content.appendChild(noDeals);
}

function showProductWithAlternatives(product, alternatives) {
  const content = document.getElementById('content');
  content.textContent = '';

  content.appendChild(buildProductInfo(product, 60));

  const section = el('div', 'alternatives-section');
  const header = el('div', 'alternatives-header');
  header.appendChild(el('h3', null, 'Cheaper options found'));
  header.appendChild(el('span', 'alternatives-count',
    `${alternatives.length} ${alternatives.length === 1 ? 'deal' : 'deals'}`));
  section.appendChild(header);

  alternatives.forEach((alt, index) => {
    const url = safeHttpUrl(alt.url);
    if (!url) return;

    const link = el('a', 'alternative');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.savings = product.price - alt.price;

    const left = el('div', 'alt-left');
    const site = el('span', 'alt-site', alt.site);
    if (index === 0) {
      const badge = el('span', null, 'BEST');
      badge.style.cssText = 'background:#2A9D8F;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;';
      site.appendChild(badge);
    }
    left.appendChild(site);
    left.appendChild(el('span', 'alt-savings', `Save $${(product.price - alt.price).toFixed(2)}`));
    link.appendChild(left);

    const right = el('div', 'alt-right');
    right.appendChild(el('div', 'alt-price', `$${alt.price.toFixed(2)}`));
    right.appendChild(el('div', 'alt-percent', `-${Math.round((1 - alt.price / product.price) * 100)}%`));
    link.appendChild(right);

    link.addEventListener('click', () => {
      trackSavings(product.price - alt.price);
    });

    section.appendChild(link);
  });

  content.appendChild(section);
}

function trackSavings(amount) {
  chrome.storage.local.get(['totalSaved', 'dealsFound'], (data) => {
    const newTotal = (data.totalSaved || 0) + amount;
    const newCount = (data.dealsFound || 0) + 1;

    chrome.storage.local.set({
      totalSaved: newTotal,
      dealsFound: newCount
    });
  });
}

function truncate(str, length) {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}
