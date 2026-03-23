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

function showNoDeals(product) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="product-info">
      ${product.image ? `<img src="${product.image}" alt="" class="product-image">` : ''}
      <div class="product-details">
        <div class="product-name">${product.name}</div>
        <div class="product-price" style="text-decoration: none; color: #2A9D8F;">$${product.price.toFixed(2)}</div>
      </div>
    </div>
    <div class="no-deals">
      <div class="no-deals-icon">✓</div>
      <h3>You've got the best price!</h3>
      <p>We checked other retailers and couldn't find this product cheaper.</p>
    </div>
  `;
}

function showProductWithAlternatives(product, alternatives) {
  const content = document.getElementById('content');

  const bestSavings = product.price - alternatives[0].price;

  content.innerHTML = `
    <div class="product-info">
      ${product.image ? `<img src="${product.image}" alt="" class="product-image">` : ''}
      <div class="product-details">
        <div class="product-name">${truncate(product.name, 60)}</div>
        <div class="product-price">$${product.price.toFixed(2)}</div>
      </div>
    </div>
    <div class="alternatives-section">
      <div class="alternatives-header">
        <h3>Cheaper options found</h3>
        <span class="alternatives-count">${alternatives.length} ${alternatives.length === 1 ? 'deal' : 'deals'}</span>
      </div>
      ${alternatives.map((alt, index) => `
        <a href="${alt.url}" target="_blank" class="alternative" data-savings="${product.price - alt.price}">
          <div class="alt-left">
            <span class="alt-site">${alt.site}${index === 0 ? ' <span style="background:#2A9D8F;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;margin-left:6px;">BEST</span>' : ''}</span>
            <span class="alt-savings">Save $${(product.price - alt.price).toFixed(2)}</span>
          </div>
          <div class="alt-right">
            <div class="alt-price">$${alt.price.toFixed(2)}</div>
            <div class="alt-percent">-${Math.round((1 - alt.price / product.price) * 100)}%</div>
          </div>
        </a>
      `).join('')}
    </div>
  `;

  // Add click handlers to track savings
  document.querySelectorAll('.alternative').forEach(el => {
    el.addEventListener('click', () => {
      const savings = parseFloat(el.dataset.savings);
      trackSavings(savings);
    });
  });
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
