// Comprehensive product template system with 20+ items per category across all retailers

export interface ProductTemplate {
  name: string;
  category: string;
  basePrice: number;
  imageUrl: string;
}

// Helper to generate price variations across retailers
function generateRetailerPrices(basePrice: number) {
  return {
    Amazon: basePrice + (Math.random() * 20 - 10),
    Walmart: basePrice + (Math.random() * 25 - 15),
    Target: basePrice + (Math.random() * 20 - 8),
    'Best Buy': basePrice + (Math.random() * 30 - 10),
    "Macy's": basePrice + (Math.random() * 25 - 5),
  };
}

// Massive product template catalog - 200+ products across all categories
export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // ELECTRONICS - Phones (20+)
  { name: 'iPhone 15 Pro Max 256GB', category: 'phones', basePrice: 1199, imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80' },
  { name: 'iPhone 15 Pro 128GB', category: 'phones', basePrice: 999, imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80' },
  { name: 'iPhone 15 Plus 256GB', category: 'phones', basePrice: 899, imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80' },
  { name: 'iPhone 14 Pro 128GB', category: 'phones', basePrice: 799, imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80' },
  { name: 'Samsung Galaxy S24 Ultra 512GB', category: 'phones', basePrice: 1399, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Samsung Galaxy S24+ 256GB', category: 'phones', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Samsung Galaxy S24 128GB', category: 'phones', basePrice: 799, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Samsung Galaxy Z Fold 5 256GB', category: 'phones', basePrice: 1799, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Samsung Galaxy Z Flip 5 256GB', category: 'phones', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Google Pixel 8 Pro 256GB', category: 'phones', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'Google Pixel 8 128GB', category: 'phones', basePrice: 699, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'Google Pixel 7a 128GB', category: 'phones', basePrice: 499, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'OnePlus 12 256GB', category: 'phones', basePrice: 799, imageUrl: 'https://dummyimage.com/400x400/FF0000/fff&text=OnePlus' },
  { name: 'OnePlus 11 128GB', category: 'phones', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/FF0000/fff&text=OnePlus' },
  { name: 'Motorola Edge+ 2024 256GB', category: 'phones', basePrice: 799, imageUrl: 'https://dummyimage.com/400x400/0078D7/fff&text=Moto' },
  { name: 'Motorola Razr+ 2024 256GB', category: 'phones', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/0078D7/fff&text=Moto' },
  { name: 'iPhone SE (3rd Gen) 128GB', category: 'phones', basePrice: 429, imageUrl: 'https://images.unsplash.com/photo-1592286927505-25f428820dc7?w=400&q=80' },
  { name: 'Samsung Galaxy A54 5G 128GB', category: 'phones', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Google Pixel 6a 128GB', category: 'phones', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'Nothing Phone (2) 256GB', category: 'phones', basePrice: 699, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Nothing' },

  // ELECTRONICS - TVs (20+)
  { name: 'Samsung 65" QLED 4K Smart TV', category: 'tvs', basePrice: 1299, imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80' },
  { name: 'Samsung 55" QLED 4K Smart TV', category: 'tvs', basePrice: 899, imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80' },
  { name: 'LG 77" OLED C3 4K Smart TV', category: 'tvs', basePrice: 2799, imageUrl: 'https://dummyimage.com/400x400/A50034/fff&text=LG+OLED' },
  { name: 'LG 65" OLED C3 4K Smart TV', category: 'tvs', basePrice: 1799, imageUrl: 'https://dummyimage.com/400x400/A50034/fff&text=LG+OLED' },
  { name: 'LG 55" OLED C3 4K Smart TV', category: 'tvs', basePrice: 1299, imageUrl: 'https://dummyimage.com/400x400/A50034/fff&text=LG+OLED' },
  { name: 'Sony 75" Bravia XR 4K LED TV', category: 'tvs', basePrice: 1999, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },
  { name: 'Sony 65" Bravia XR 4K LED TV', category: 'tvs', basePrice: 1499, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },
  { name: 'TCL 75" 4K QLED Roku Smart TV', category: 'tvs', basePrice: 899, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=TCL' },
  { name: 'TCL 65" 4K QLED Roku Smart TV', category: 'tvs', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=TCL' },
  { name: 'TCL 55" 4K QLED Roku Smart TV', category: 'tvs', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=TCL' },
  { name: 'Hisense 75" U8K Mini-LED 4K TV', category: 'tvs', basePrice: 1299, imageUrl: 'https://dummyimage.com/400x400/E31E24/fff&text=Hisense' },
  { name: 'Hisense 65" U8K Mini-LED 4K TV', category: 'tvs', basePrice: 899, imageUrl: 'https://dummyimage.com/400x400/E31E24/fff&text=Hisense' },
  { name: 'Vizio 75" M-Series 4K Smart TV', category: 'tvs', basePrice: 749, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=VIZIO' },
  { name: 'Vizio 65" M-Series 4K Smart TV', category: 'tvs', basePrice: 549, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=VIZIO' },
  { name: 'Samsung 85" Neo QLED 4K Smart TV', category: 'tvs', basePrice: 3299, imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80' },
  { name: 'LG 48" OLED C3 4K Smart TV', category: 'tvs', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/A50034/fff&text=LG+OLED' },
  { name: 'Samsung 43" Crystal UHD 4K TV', category: 'tvs', basePrice: 349, imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400&q=80' },
  { name: 'Amazon Fire TV 50" Omni 4K', category: 'tvs', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/FF9900/000&text=Fire+TV' },
  { name: 'Amazon Fire TV 65" Omni 4K', category: 'tvs', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/FF9900/000&text=Fire+TV' },
  { name: 'Sony 55" X90L 4K LED TV', category: 'tvs', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },

  // ELECTRONICS - Tablets (20+)
  { name: 'iPad Pro 12.9" M2 256GB', category: 'tablets', basePrice: 1099, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'iPad Pro 11" M2 128GB', category: 'tablets', basePrice: 799, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'iPad Air 11" M2 256GB', category: 'tablets', basePrice: 749, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'iPad Air 11" M2 128GB', category: 'tablets', basePrice: 599, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'iPad 10th Gen 64GB', category: 'tablets', basePrice: 349, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'iPad 10th Gen 256GB', category: 'tablets', basePrice: 499, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'iPad Mini 6th Gen 64GB', category: 'tablets', basePrice: 499, imageUrl: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&q=80' },
  { name: 'Samsung Galaxy Tab S9 Ultra 256GB', category: 'tablets', basePrice: 1199, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy+Tab' },
  { name: 'Samsung Galaxy Tab S9+ 256GB', category: 'tablets', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy+Tab' },
  { name: 'Samsung Galaxy Tab S9 128GB', category: 'tablets', basePrice: 799, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy+Tab' },
  { name: 'Samsung Galaxy Tab A9+ 128GB', category: 'tablets', basePrice: 269, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy+Tab' },
  { name: 'Microsoft Surface Pro 9 256GB', category: 'tablets', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/0078D7/fff&text=Surface' },
  { name: 'Microsoft Surface Go 3 128GB', category: 'tablets', basePrice: 549, imageUrl: 'https://dummyimage.com/400x400/0078D7/fff&text=Surface' },
  { name: 'Amazon Fire HD 10 64GB', category: 'tablets', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/FF9900/000&text=Fire' },
  { name: 'Amazon Fire HD 8 32GB', category: 'tablets', basePrice: 99, imageUrl: 'https://dummyimage.com/400x400/FF9900/000&text=Fire' },
  { name: 'Lenovo Tab P11 Pro Gen 2 256GB', category: 'tablets', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/E2231A/fff&text=Lenovo' },
  { name: 'Google Pixel Tablet 128GB', category: 'tablets', basePrice: 499, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'OnePlus Pad 128GB', category: 'tablets', basePrice: 479, imageUrl: 'https://dummyimage.com/400x400/FF0000/fff&text=OnePlus' },
  { name: 'Amazon Fire Max 11 64GB', category: 'tablets', basePrice: 229, imageUrl: 'https://dummyimage.com/400x400/FF9900/000&text=Fire' },
  { name: 'ASUS ZenPad 3S 10 64GB', category: 'tablets', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=ASUS' },

  // ELECTRONICS - Cameras (20+)
  { name: 'Canon EOS R6 Mark II Body', category: 'cameras', basePrice: 2499, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80' },
  { name: 'Canon EOS R5 Body', category: 'cameras', basePrice: 3899, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80' },
  { name: 'Canon EOS R8 Body', category: 'cameras', basePrice: 1499, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80' },
  { name: 'Sony Alpha a7 IV Body', category: 'cameras', basePrice: 2499, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },
  { name: 'Sony Alpha a7R V Body', category: 'cameras', basePrice: 3899, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },
  { name: 'Sony ZV-E1 Body', category: 'cameras', basePrice: 2199, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },
  { name: 'Nikon Z8 Body', category: 'cameras', basePrice: 3999, imageUrl: 'https://dummyimage.com/400x400/FFE800/000&text=Nikon' },
  { name: 'Nikon Z6 III Body', category: 'cameras', basePrice: 2499, imageUrl: 'https://dummyimage.com/400x400/FFE800/000&text=Nikon' },
  { name: 'Fujifilm X-T5 Body', category: 'cameras', basePrice: 1699, imageUrl: 'https://dummyimage.com/400x400/EC0029/fff&text=Fuji' },
  { name: 'Fujifilm X-H2S Body', category: 'cameras', basePrice: 2499, imageUrl: 'https://dummyimage.com/400x400/EC0029/fff&text=Fuji' },
  { name: 'GoPro HERO12 Black', category: 'cameras', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=GoPro' },
  { name: 'GoPro HERO11 Black', category: 'cameras', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=GoPro' },
  { name: 'DJI Osmo Action 4', category: 'cameras', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=DJI' },
  { name: 'DJI Pocket 3', category: 'cameras', basePrice: 519, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=DJI' },
  { name: 'Insta360 X3', category: 'cameras', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/E74C3C/fff&text=Insta360' },
  { name: 'Canon PowerShot G7 X Mark III', category: 'cameras', basePrice: 749, imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80' },
  { name: 'Sony RX100 VII', category: 'cameras', basePrice: 1299, imageUrl: 'https://dummyimage.com/400x400/003087/fff&text=Sony' },
  { name: 'Panasonic Lumix GH6 Body', category: 'cameras', basePrice: 2199, imageUrl: 'https://dummyimage.com/400x400/0067B1/fff&text=Lumix' },
  { name: 'OM System OM-1 Body', category: 'cameras', basePrice: 2199, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=OM' },
  { name: 'Ricoh GR IIIx', category: 'cameras', basePrice: 1099, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Ricoh' },

  // ELECTRONICS - Smartwatches (20+)
  { name: 'Apple Watch Ultra 2 49mm', category: 'smartwatches', basePrice: 799, imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80' },
  { name: 'Apple Watch Series 9 45mm GPS', category: 'smartwatches', basePrice: 429, imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80' },
  { name: 'Apple Watch Series 9 41mm GPS', category: 'smartwatches', basePrice: 399, imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80' },
  { name: 'Apple Watch SE (2nd Gen) 44mm', category: 'smartwatches', basePrice: 279, imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80' },
  { name: 'Apple Watch SE (2nd Gen) 40mm', category: 'smartwatches', basePrice: 249, imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&q=80' },
  { name: 'Samsung Galaxy Watch 6 Classic 47mm', category: 'smartwatches', basePrice: 429, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Samsung Galaxy Watch 6 44mm', category: 'smartwatches', basePrice: 329, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Samsung Galaxy Watch 6 40mm', category: 'smartwatches', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Galaxy' },
  { name: 'Google Pixel Watch 2 45mm', category: 'smartwatches', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'Google Pixel Watch 2 41mm', category: 'smartwatches', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/4285F4/fff&text=Pixel' },
  { name: 'Garmin Fenix 7X Sapphire Solar', category: 'smartwatches', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/007CC3/fff&text=Garmin' },
  { name: 'Garmin Forerunner 965', category: 'smartwatches', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/007CC3/fff&text=Garmin' },
  { name: 'Garmin Venu 3', category: 'smartwatches', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/007CC3/fff&text=Garmin' },
  { name: 'Fitbit Sense 2', category: 'smartwatches', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/00B0B9/fff&text=Fitbit' },
  { name: 'Fitbit Versa 4', category: 'smartwatches', basePrice: 229, imageUrl: 'https://dummyimage.com/400x400/00B0B9/fff&text=Fitbit' },
  { name: 'Amazfit GTR 4', category: 'smartwatches', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/FF6B00/fff&text=Amazfit' },
  { name: 'Fossil Gen 6 Wellness Edition', category: 'smartwatches', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/78350F/fff&text=Fossil' },
  { name: 'TicWatch Pro 5', category: 'smartwatches', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=TicWatch' },
  { name: 'Withings ScanWatch 2', category: 'smartwatches', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Withings' },
  { name: 'COROS PACE 3', category: 'smartwatches', basePrice: 229, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=COROS' },

  // ELECTRONICS - Gaming Consoles (20+)
  { name: 'PlayStation 5 Disc Edition', category: 'gaming', basePrice: 499, imageUrl: 'https://dummyimage.com/400x400/003791/fff&text=PS5' },
  { name: 'PlayStation 5 Digital Edition', category: 'gaming', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/003791/fff&text=PS5' },
  { name: 'PlayStation 5 Slim Disc Edition', category: 'gaming', basePrice: 499, imageUrl: 'https://dummyimage.com/400x400/003791/fff&text=PS5' },
  { name: 'Xbox Series X 1TB', category: 'gaming', basePrice: 499, imageUrl: 'https://dummyimage.com/400x400/107C10/fff&text=Xbox' },
  { name: 'Xbox Series S 512GB', category: 'gaming', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/107C10/fff&text=Xbox' },
  { name: 'Nintendo Switch OLED', category: 'gaming', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/E60012/fff&text=Switch' },
  { name: 'Nintendo Switch Standard', category: 'gaming', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/E60012/fff&text=Switch' },
  { name: 'Nintendo Switch Lite', category: 'gaming', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/E60012/fff&text=Switch' },
  { name: 'Steam Deck 512GB', category: 'gaming', basePrice: 649, imageUrl: 'https://dummyimage.com/400x400/1B2838/fff&text=Steam' },
  { name: 'Steam Deck 256GB', category: 'gaming', basePrice: 529, imageUrl: 'https://dummyimage.com/400x400/1B2838/fff&text=Steam' },
  { name: 'ASUS ROG Ally Z1 Extreme', category: 'gaming', basePrice: 699, imageUrl: 'https://dummyimage.com/400x400/FF0000/fff&text=ROG' },
  { name: 'Lenovo Legion Go', category: 'gaming', basePrice: 699, imageUrl: 'https://dummyimage.com/400x400/E2231A/fff&text=Legion' },
  { name: 'PlayStation Portal Remote Player', category: 'gaming', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/003791/fff&text=PS' },
  { name: 'Meta Quest 3 512GB', category: 'gaming', basePrice: 649, imageUrl: 'https://dummyimage.com/400x400/0081FB/fff&text=Quest' },
  { name: 'Meta Quest 3 128GB', category: 'gaming', basePrice: 499, imageUrl: 'https://dummyimage.com/400x400/0081FB/fff&text=Quest' },
  { name: 'Meta Quest 2 256GB', category: 'gaming', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/0081FB/fff&text=Quest' },
  { name: 'Nintendo 2DS XL', category: 'gaming', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/E60012/fff&text=Nintendo' },
  { name: 'Anbernic RG35XX Plus', category: 'gaming', basePrice: 79, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Anbernic' },
  { name: 'Retroid Pocket 4 Pro', category: 'gaming', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/FF6B00/fff&text=Retroid' },
  { name: 'Ayaneo Kun', category: 'gaming', basePrice: 999, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Ayaneo' },

  // SHOES - Running & Athletic (25+)
  { name: 'Nike Air Zoom Pegasus 40', category: 'shoes', basePrice: 139, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { name: 'Nike React Infinity 4', category: 'shoes', basePrice: 159, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { name: 'Nike Vaporfly 3', category: 'shoes', basePrice: 259, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { name: 'Nike Air Max 270', category: 'shoes', basePrice: 139, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { name: 'Adidas Ultraboost 23', category: 'shoes', basePrice: 179, imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80' },
  { name: 'Adidas Ultraboost Light', category: 'shoes', basePrice: 189, imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80' },
  { name: 'Adidas Solarboost 5', category: 'shoes', basePrice: 139, imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80' },
  { name: 'Brooks Ghost 15', category: 'shoes', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/0057B8/fff&text=Brooks' },
  { name: 'Brooks Adrenaline GTS 23', category: 'shoes', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/0057B8/fff&text=Brooks' },
  { name: 'Hoka Clifton 9', category: 'shoes', basePrice: 144, imageUrl: 'https://dummyimage.com/400x400/FF6B00/fff&text=HOKA' },
  { name: 'Hoka Bondi 8', category: 'shoes', basePrice: 164, imageUrl: 'https://dummyimage.com/400x400/FF6B00/fff&text=HOKA' },
  { name: 'New Balance 990v6', category: 'shoes', basePrice: 184, imageUrl: 'https://dummyimage.com/400x400/9CA3AF/fff&text=NB' },
  { name: 'New Balance Fresh Foam X 1080v13', category: 'shoes', basePrice: 159, imageUrl: 'https://dummyimage.com/400x400/9CA3AF/fff&text=NB' },
  { name: 'ASICS Gel-Nimbus 25', category: 'shoes', basePrice: 159, imageUrl: 'https://dummyimage.com/400x400/0033A0/fff&text=ASICS' },
  { name: 'ASICS Gel-Kayano 30', category: 'shoes', basePrice: 169, imageUrl: 'https://dummyimage.com/400x400/0033A0/fff&text=ASICS' },
  { name: 'Saucony Endorphin Speed 3', category: 'shoes', basePrice: 169, imageUrl: 'https://dummyimage.com/400x400/FF6B00/fff&text=Saucony' },
  { name: 'Saucony Ride 16', category: 'shoes', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/FF6B00/fff&text=Saucony' },
  { name: 'On Cloudmonster', category: 'shoes', basePrice: 169, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=On' },
  { name: 'On Cloud 5', category: 'shoes', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=On' },
  { name: 'Puma Deviate Nitro 2', category: 'shoes', basePrice: 159, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=PUMA' },
  { name: 'Under Armour HOVR Phantom 3', category: 'shoes', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=UA' },
  { name: 'Reebok Floatride Energy 5', category: 'shoes', basePrice: 119, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Reebok' },
  { name: 'Mizuno Wave Rider 27', category: 'shoes', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Mizuno' },
  { name: 'Salomon Speedcross 6', category: 'shoes', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Salomon' },
  { name: 'Altra Lone Peak 7', category: 'shoes', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Altra' },

  // Additional categories continue below...
  // CLOTHING - Men's (20+)
  { name: 'Levi\'s 501 Original Fit Jeans', category: 'clothing', basePrice: 59, imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80' },
  { name: 'Levi\'s 511 Slim Fit Jeans', category: 'clothing', basePrice: 69, imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80' },
  { name: 'Champion Reverse Weave Hoodie', category: 'clothing', basePrice: 54, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80' },
  { name: 'Carhartt Duck Detroit Jacket', category: 'clothing', basePrice: 99, imageUrl: 'https://dummyimage.com/400x400/92400E/fff&text=Carhartt' },
  { name: 'Patagonia Better Sweater Fleece', category: 'clothing', basePrice: 119, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Patagonia' },
  { name: 'North Face Denali Fleece Jacket', category: 'clothing', basePrice: 169, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=NorthFace' },
  { name: 'Columbia Flannel Shirt', category: 'clothing', basePrice: 44, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Columbia' },
  { name: 'Wrangler Cowboy Cut Jeans', category: 'clothing', basePrice: 39, imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80' },
  { name: 'Dickies 874 Work Pants', category: 'clothing', basePrice: 29, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Dickies' },
  { name: 'Nike Dri-FIT T-Shirt', category: 'clothing', basePrice: 29, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Nike' },
  { name: 'Adidas Tiro Track Pants', category: 'clothing', basePrice: 49, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Adidas' },
  { name: 'Ralph Lauren Polo Shirt', category: 'clothing', basePrice: 89, imageUrl: 'https://dummyimage.com/400x400/001489/fff&text=RL' },
  { name: 'Tommy Hilfiger Button-Down Shirt', category: 'clothing', basePrice: 69, imageUrl: 'https://dummyimage.com/400x400/0F2C57/fff&text=TH' },
  { name: 'Calvin Klein Boxer Briefs 3-Pack', category: 'clothing', basePrice: 42, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=CK' },
  { name: 'Hanes ComfortBlend Hoodie', category: 'clothing', basePrice: 24, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80' },
  { name: 'Columbia Winter Parka', category: 'clothing', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Columbia' },
  { name: 'North Face Thermoball Jacket', category: 'clothing', basePrice: 219, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=NorthFace' },
  { name: 'Patagonia Down Sweater', category: 'clothing', basePrice: 279, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Patagonia' },
  { name: 'Uniqlo Ultra Light Down Jacket', category: 'clothing', basePrice: 69, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Uniqlo' },
  { name: 'H&M Cotton Chinos', category: 'clothing', basePrice: 29, imageUrl: 'https://dummyimage.com/400x400/E50000/fff&text=H%26M' },

  // HOME & FURNITURE (25+)
  { name: 'IKEA Kallax 4x4 Shelf Unit', category: 'home', basePrice: 119, imageUrl: 'https://dummyimage.com/400x400/0284C7/fff&text=IKEA' },
  { name: 'IKEA Poäng Armchair', category: 'home', basePrice: 99, imageUrl: 'https://dummyimage.com/400x400/0284C7/fff&text=IKEA' },
  { name: 'IKEA Hemnes Bed Frame Queen', category: 'home', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/0284C7/fff&text=IKEA' },
  { name: 'West Elm Mid-Century Sofa', category: 'home', basePrice: 1299, imageUrl: 'https://dummyimage.com/400x400/8B7355/fff&text=WestElm' },
  { name: 'Wayfair Upholstered Platform Bed', category: 'home', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/7B61A8/fff&text=Wayfair' },
  { name: 'Ashley Furniture Reclining Sofa', category: 'home', basePrice: 799, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=Ashley' },
  { name: 'La-Z-Boy Recliner', category: 'home', basePrice: 799, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=LaZBoy' },
  { name: 'Herman Miller Aeron Chair', category: 'home', basePrice: 1395, imageUrl: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&q=80' },
  { name: 'Steelcase Leap V2 Chair', category: 'home', basePrice: 1099, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Steelcase' },
  { name: 'Autonomous ErgoChair Pro', category: 'home', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Auto' },
  { name: 'FlexiSpot Standing Desk 48"', category: 'home', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=FlexiSpot' },
  { name: 'UPLIFT V2 Standing Desk 60"', category: 'home', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=UPLIFT' },
  { name: 'Pottery Barn Cameron Sofa', category: 'home', basePrice: 1899, imageUrl: 'https://dummyimage.com/400x400/8B7355/fff&text=PB' },
  { name: 'Crate&Barrel Lounge II Sofa', category: 'home', basePrice: 1699, imageUrl: 'https://dummyimage.com/400x400/8B7355/fff&text=C%26B' },
  { name: 'Article Sven Charme Tan Sofa', category: 'home', basePrice: 1299, imageUrl: 'https://dummyimage.com/400x400/D2B48C/000&text=Article' },
  { name: 'Brooklinen Luxe Sheet Set Queen', category: 'home', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=Brooklinen' },
  { name: 'Parachute Linen Sheet Set Queen', category: 'home', basePrice: 219, imageUrl: 'https://dummyimage.com/400x400/F5F5DC/000&text=Parachute' },
  { name: 'Casper Original Mattress Queen', category: 'home', basePrice: 995, imageUrl: 'https://dummyimage.com/400x400/0080FF/fff&text=Casper' },
  { name: 'Purple Mattress Queen', category: 'home', basePrice: 1299, imageUrl: 'https://dummyimage.com/400x400/6F2DA8/fff&text=Purple' },
  { name: 'Tuft & Needle Original Mattress Queen', category: 'home', basePrice: 795, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=T%26N' },
  { name: 'Philips Hue White LED Starter Kit', category: 'home', basePrice: 99, imageUrl: 'https://dummyimage.com/400x400/0000FF/fff&text=Hue' },
  { name: 'Ruggable Washable Rug 8x10', category: 'home', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/E8D5C4/000&text=Ruggable' },
  { name: 'Safavieh Area Rug 9x12', category: 'home', basePrice: 299, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=Safavieh' },
  { name: 'Threshold Storage Bins 6-Pack', category: 'home', basePrice: 39, imageUrl: 'https://dummyimage.com/400x400/CC0000/fff&text=Target' },
  { name: 'ClosetMaid Cube Organizer 9-Cube', category: 'home', basePrice: 79, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=ClosetMaid' },

  // BEAUTY & PERSONAL CARE (20+)
  { name: 'Dyson Airwrap Complete', category: 'beauty', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/A855F7/fff&text=Dyson' },
  { name: 'Dyson Supersonic Hair Dryer', category: 'beauty', basePrice: 429, imageUrl: 'https://dummyimage.com/400x400/A855F7/fff&text=Dyson' },
  { name: 'GHD Platinum+ Styler', category: 'beauty', basePrice: 279, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=ghd' },
  { name: 'T3 Lucea Straightening Iron', category: 'beauty', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=T3' },
  { name: 'Revlon One-Step Hair Dryer', category: 'beauty', basePrice: 59, imageUrl: 'https://dummyimage.com/400x400/DC143C/fff&text=Revlon' },
  { name: 'The Ordinary Niacinamide 10% + Zinc 1%', category: 'beauty', basePrice: 5.90, imageUrl: 'https://dummyimage.com/400x400/EC4899/fff&text=Ordinary' },
  { name: 'CeraVe Moisturizing Cream 19oz', category: 'beauty', basePrice: 16, imageUrl: 'https://dummyimage.com/400x400/3B82F6/fff&text=CeraVe' },
  { name: 'La Roche-Posay Toleriane Cleanser', category: 'beauty', basePrice: 14, imageUrl: 'https://dummyimage.com/400x400/1E3A8A/fff&text=LRP' },
  { name: 'Neutrogena Hydro Boost Water Gel', category: 'beauty', basePrice: 18, imageUrl: 'https://dummyimage.com/400x400/0080FF/fff&text=Neutrogena' },
  { name: 'Olaplex No. 3 Hair Perfector', category: 'beauty', basePrice: 30, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Olaplex' },
  { name: 'K18 Leave-In Molecular Repair Hair Mask', category: 'beauty', basePrice: 75, imageUrl: 'https://dummyimage.com/400x400/FF1493/fff&text=K18' },
  { name: 'Maybelline Sky High Mascara', category: 'beauty', basePrice: 11, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Maybelline' },
  { name: 'Fenty Beauty Pro Filt\'r Foundation', category: 'beauty', basePrice: 40, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Fenty' },
  { name: 'Urban Decay Naked Palette', category: 'beauty', basePrice: 54, imageUrl: 'https://dummyimage.com/400x400/9370DB/fff&text=UD' },
  { name: 'Morphe 35O Eyeshadow Palette', category: 'beauty', basePrice: 25, imageUrl: 'https://dummyimage.com/400x400/FF6347/fff&text=Morphe' },
  { name: 'Anastasia Beverly Hills Brow Wiz', category: 'beauty', basePrice: 25, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=ABH' },
  { name: 'Drunk Elephant C-Firma Serum', category: 'beauty', basePrice: 80, imageUrl: 'https://dummyimage.com/400x400/FF8C00/fff&text=DE' },
  { name: 'Sunday Riley Good Genes Serum', category: 'beauty', basePrice: 85, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=SR' },
  { name: 'Tatcha Dewy Skin Cream', category: 'beauty', basePrice: 72, imageUrl: 'https://dummyimage.com/400x400/FFB6C1/000&text=Tatcha' },
  { name: 'Foreo Luna 3 Facial Cleansing Brush', category: 'beauty', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/FF1493/fff&text=FOREO' },

  // KITCHEN & APPLIANCES (20+)
  { name: 'KitchenAid Artisan 5-Qt Stand Mixer', category: 'kitchen', basePrice: 429, imageUrl: 'https://dummyimage.com/400x400/EC4899/fff&text=KitchenAid' },
  { name: 'Cuisinart Food Processor 14-Cup', category: 'kitchen', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Cuisinart' },
  { name: 'Ninja Professional Blender 1000W', category: 'kitchen', basePrice: 89, imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&q=80' },
  { name: 'Vitamix 5200 Blender', category: 'kitchen', basePrice: 449, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Vitamix' },
  { name: 'Instant Pot Duo 7-in-1 6Qt', category: 'kitchen', basePrice: 89, imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=InstantPot' },
  { name: 'Instant Pot Duo Crisp 11-in-1 8Qt', category: 'kitchen', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=InstantPot' },
  { name: 'Ninja Foodi 14-in-1 Pressure Cooker', category: 'kitchen', basePrice: 179, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Ninja' },
  { name: 'Breville Smart Oven Air Fryer', category: 'kitchen', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Breville' },
  { name: 'Cosori Air Fryer 5.8QT', category: 'kitchen', basePrice: 119, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Cosori' },
  { name: 'Philips Air Fryer XXL', category: 'kitchen', basePrice: 249, imageUrl: 'https://dummyimage.com/400x400/0000FF/fff&text=Philips' },
  { name: 'Keurig K-Elite Coffee Maker', category: 'kitchen', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/78350F/fff&text=Keurig' },
  { name: 'Nespresso VertuoPlus Coffee Maker', category: 'kitchen', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Nespresso' },
  { name: 'Breville Barista Express Espresso Machine', category: 'kitchen', basePrice: 699, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Breville' },
  { name: 'De\'Longhi Dedica Espresso Machine', category: 'kitchen', basePrice: 329, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=DeLonghi' },
  { name: 'All-Clad D3 Stainless 10-Piece Cookware Set', category: 'kitchen', basePrice: 699, imageUrl: 'https://dummyimage.com/400x400/C0C0C0/000&text=AllClad' },
  { name: 'Calphalon Classic Nonstick 10-Piece Set', category: 'kitchen', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Calphalon' },
  { name: 'Lodge Cast Iron Skillet 12"', category: 'kitchen', basePrice: 39, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Lodge' },
  { name: 'Le Creuset Dutch Oven 5.5Qt', category: 'kitchen', basePrice: 379, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=LeCreuset' },
  { name: 'OXO Good Grips 15-Piece Kitchen Tool Set', category: 'kitchen', basePrice: 59, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=OXO' },
  { name: 'Pyrex Glass Food Storage 18-Piece Set', category: 'kitchen', basePrice: 39, imageUrl: 'https://dummyimage.com/400x400/1E90FF/fff&text=Pyrex' },

  // SPORTS & FITNESS (20+)
  { name: 'Bowflex SelectTech 552 Dumbbells', category: 'sports', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/475569/fff&text=Bowflex' },
  { name: 'PowerBlock Elite Dumbbells', category: 'sports', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=PowerBlock' },
  { name: 'Rogue Echo Bike', category: 'sports', basePrice: 795, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Rogue' },
  { name: 'Concept2 Model D Rowing Machine', category: 'sports', basePrice: 1015, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=Concept2' },
  { name: 'Peloton Bike+', category: 'sports', basePrice: 2495, imageUrl: 'https://dummyimage.com/400x400/DC2626/fff&text=Peloton' },
  { name: 'NordicTrack Commercial S22i Studio Cycle', category: 'sports', basePrice: 1999, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=NordicTrack' },
  { name: 'Schwinn IC4 Indoor Cycling Bike', category: 'sports', basePrice: 899, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Schwinn' },
  { name: 'Manduka PRO Yoga Mat', category: 'sports', basePrice: 120, imageUrl: 'https://dummyimage.com/400x400/8B5CF6/fff&text=Manduka' },
  { name: 'Liforme Yoga Mat', category: 'sports', basePrice: 139, imageUrl: 'https://dummyimage.com/400x400/00CED1/fff&text=Liforme' },
  { name: 'Lululemon The Reversible Mat 5mm', category: 'sports', basePrice: 78, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Lululemon' },
  { name: 'TRX Home2 Suspension Trainer', category: 'sports', basePrice: 179, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=TRX' },
  { name: 'Resistance Bands Set with Handles', category: 'sports', basePrice: 29, imageUrl: 'https://dummyimage.com/400x400/FF6347/fff&text=Bands' },
  { name: 'Ab Roller Wheel with Knee Pad', category: 'sports', basePrice: 19, imageUrl: 'https://dummyimage.com/400x400/1F2937/fff&text=AbWheel' },
  { name: 'Garmin Forerunner 255', category: 'sports', basePrice: 349, imageUrl: 'https://dummyimage.com/400x400/007CC3/fff&text=Garmin' },
  { name: 'Fitbit Charge 6', category: 'sports', basePrice: 159, imageUrl: 'https://dummyimage.com/400x400/00B0B9/fff&text=Fitbit' },
  { name: 'Whoop 4.0 Fitness Tracker', category: 'sports', basePrice: 239, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=WHOOP' },
  { name: 'Wilson Evolution Indoor Basketball', category: 'sports', basePrice: 64, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Wilson' },
  { name: 'Spalding NBA Official Game Basketball', category: 'sports', basePrice: 149, imageUrl: 'https://dummyimage.com/400x400/FF6600/fff&text=Spalding' },
  { name: 'Callaway Mavrik Driver', category: 'sports', basePrice: 399, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=Callaway' },
  { name: 'TaylorMade Stealth 2 Driver', category: 'sports', basePrice: 599, imageUrl: 'https://dummyimage.com/400x400/FFFFFF/000&text=TM' },

  // TOYS & GAMES (20+)
  { name: 'LEGO Star Wars Millennium Falcon', category: 'toys', basePrice: 169, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=LEGO' },
  { name: 'LEGO City Police Station', category: 'toys', basePrice: 99, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=LEGO' },
  { name: 'LEGO Harry Potter Hogwarts Castle', category: 'toys', basePrice: 469, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=LEGO' },
  { name: 'LEGO Technic Bugatti Chiron', category: 'toys', basePrice: 379, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=LEGO' },
  { name: 'Barbie Dreamhouse', category: 'toys', basePrice: 199, imageUrl: 'https://dummyimage.com/400x400/FF69B4/fff&text=Barbie' },
  { name: 'Hot Wheels Ultimate Garage', category: 'toys', basePrice: 129, imageUrl: 'https://dummyimage.com/400x400/FF6600/fff&text=HotWheels' },
  { name: 'Nerf Ultra One Motorized Blaster', category: 'toys', basePrice: 49, imageUrl: 'https://dummyimage.com/400x400/FF6600/fff&text=NERF' },
  { name: 'Nerf Elite 2.0 Phoenix CS-6', category: 'toys', basePrice: 24, imageUrl: 'https://dummyimage.com/400x400/FF6600/fff&text=NERF' },
  { name: 'Play-Doh Super Color Pack 20-Count', category: 'toys', basePrice: 14, imageUrl: 'https://dummyimage.com/400x400/9370DB/fff&text=PlayDoh' },
  { name: 'Melissa & Doug Wooden Building Blocks', category: 'toys', basePrice: 24, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=M%26D' },
  { name: 'Fisher-Price Little People Farm', category: 'toys', basePrice: 39, imageUrl: 'https://dummyimage.com/400x400/FFD700/000&text=FP' },
  { name: 'VTech KidiZoom Camera', category: 'toys', basePrice: 49, imageUrl: 'https://dummyimage.com/400x400/0080FF/fff&text=VTech' },
  { name: 'LeapFrog Learning Friends 100 Words Book', category: 'toys', basePrice: 19, imageUrl: 'https://dummyimage.com/400x400/32CD32/fff&text=LeapFrog' },
  { name: 'Catan Board Game', category: 'toys', basePrice: 49, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=Catan' },
  { name: 'Ticket to Ride Board Game', category: 'toys', basePrice: 54, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=TTR' },
  { name: 'Monopoly Classic Board Game', category: 'toys', basePrice: 19, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Monopoly' },
  { name: 'Uno Card Game', category: 'toys', basePrice: 5.99, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=UNO' },
  { name: 'Jenga Classic Game', category: 'toys', basePrice: 14, imageUrl: 'https://dummyimage.com/400x400/8B4513/fff&text=Jenga' },
  { name: 'Marvel Legends Spider-Man Figure', category: 'toys', basePrice: 24, imageUrl: 'https://dummyimage.com/400x400/E31C24/fff&text=Marvel' },
  { name: 'Star Wars Black Series Figure', category: 'toys', basePrice: 27, imageUrl: 'https://dummyimage.com/400x400/000000/fff&text=StarWars' },
];

// Intent-based search mappings
export const SEARCH_INTENTS: Record<string, string[]> = {
  'gift for mom': ['beauty', 'home', 'clothing', 'kitchen'],
  'gift for dad': ['electronics', 'sports', 'clothing', 'tools'],
  'back to school': ['electronics', 'tablets', 'clothing', 'shoes'],
  'home office': ['furniture', 'electronics', 'home'],
  'workout': ['sports', 'shoes', 'clothing'],
  'gaming': ['gaming', 'electronics', 'tvs'],
  'cooking': ['kitchen', 'home'],
  'bedroom': ['home', 'furniture'],
  'living room': ['furniture', 'tvs', 'home'],
  'kids birthday': ['toys', 'gaming', 'tablets'],
  'valentine': ['beauty', 'clothing', 'home'],
  'christmas': ['electronics', 'toys', 'gaming', 'beauty'],
  'travel': ['cameras', 'electronics', 'clothing'],
  'fitness': ['sports', 'shoes', 'smartwatches'],
};

// Generate fallback products for any query
export function generateFallbackProducts(query: string, count: number = 60): any[] {
  const normalizedQuery = query.toLowerCase();
  const queryVariations = normalizeQuery(query);
  const products: any[] = [];

  // Try to match intent first
  for (const [intent, categories] of Object.entries(SEARCH_INTENTS)) {
    if (normalizedQuery.includes(intent)) {
      // Get products from all matching categories
      categories.forEach(category => {
        const categoryProducts = PRODUCT_TEMPLATES.filter(p =>
          p.category.includes(category) || p.name.toLowerCase().includes(category)
        );
        products.push(...categoryProducts);
      });

      if (products.length > 0) {
        return generateProductsFromTemplates(products.slice(0, Math.min(products.length, 40)), query);
      }
    }
  }

  // Check if we have real product names for any query variation
  for (const variation of queryVariations) {
    if (REAL_PRODUCT_NAMES[variation]) {
      // Use dynamic generator with real names
      return generateDynamicProducts(query, count);
    }
  }

  // Match by category with fuzzy matching
  const matchingTemplates = PRODUCT_TEMPLATES.filter(template => {
    const templateNameLower = template.name.toLowerCase();
    const templateCategoryLower = template.category.toLowerCase();

    // Check all query variations
    for (const variation of queryVariations) {
      if (templateCategoryLower.includes(variation) || templateNameLower.includes(variation)) {
        return true;
      }
    }

    // Check individual words (minimum 3 characters)
    const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);
    return queryWords.some(word => templateNameLower.includes(word) || templateCategoryLower.includes(word));
  });

  if (matchingTemplates.length > 0) {
    return generateProductsFromTemplates(matchingTemplates, query);
  }

  // If no match, create dynamic products based on query
  return generateDynamicProducts(query, count);
}

// Generate products from templates across all retailers
function generateProductsFromTemplates(templates: ProductTemplate[], query: string): any[] {
  const products: any[] = [];

  templates.forEach((template, idx) => {
    const prices = generateRetailerPrices(template.basePrice);

    Object.entries(prices).forEach(([retailer, price]) => {
      products.push({
        id: `${retailer.toLowerCase().replace(/[^a-z0-9]/g, '')}-${idx}`,
        name: template.name,
        price: Math.max(1, parseFloat(price.toFixed(2))),
        currency: 'USD',
        retailer,
        url: `https://www.${retailer.toLowerCase().replace(/[^a-z]/g, '')}.com/search?q=${encodeURIComponent(template.name)}`,
        imageUrl: template.imageUrl,
        inStock: Math.random() > 0.1, // 90% in stock
      });
    });
  });

  return products;
}

// Price ranges by category for realistic pricing
const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'toothpaste': { min: 3, max: 12 },
  'soap': { min: 2, max: 15 },
  'shampoo': { min: 4, max: 25 },
  'conditioner': { min: 4, max: 25 },
  'deodorant': { min: 3, max: 12 },
  'lotion': { min: 5, max: 30 },
  'skincare': { min: 8, max: 120 },
  'makeup': { min: 5, max: 80 },
  'perfume': { min: 20, max: 200 },
  'cologne': { min: 20, max: 200 },
  'phone case': { min: 8, max: 40 },
  'charger': { min: 10, max: 50 },
  'cable': { min: 5, max: 30 },
  'water bottle': { min: 10, max: 45 },
  'backpack': { min: 25, max: 150 },
  'sunglasses': { min: 15, max: 300 },
  'watch': { min: 20, max: 500 },
  'candle': { min: 8, max: 40 },
  'coffee': { min: 8, max: 30 },
  'tea': { min: 5, max: 25 },
  'vitamins': { min: 10, max: 50 },
  'protein powder': { min: 20, max: 80 },
  'supplements': { min: 10, max: 60 },
  'mouse': { min: 10, max: 150 },
  'keyboard': { min: 20, max: 250 },
  'headphones': { min: 15, max: 500 },
  'earbuds': { min: 20, max: 300 },
  'monitor': { min: 100, max: 1200 },
  'laptop': { min: 300, max: 3000 },
  'tablet': { min: 100, max: 1500 },
  'phone': { min: 150, max: 1500 },
  'desk': { min: 80, max: 800 },
  'chair': { min: 50, max: 1500 },
  'pillow': { min: 15, max: 100 },
  'towel': { min: 8, max: 50 },
  'sheets': { min: 20, max: 200 },
  'blanket': { min: 20, max: 150 },
  'rug': { min: 30, max: 500 },
  'lamp': { min: 15, max: 200 },
  'plates': { min: 15, max: 100 },
  'cups': { min: 10, max: 50 },
  'utensils': { min: 10, max: 80 },
  'pan': { min: 20, max: 200 },
  'pot': { min: 20, max: 200 },
  'knife': { min: 15, max: 150 },
  'cutting board': { min: 10, max: 80 },
  'notebook': { min: 3, max: 20 },
  'pen': { min: 2, max: 30 },
  'pencil': { min: 2, max: 15 },
  'shoes': { min: 30, max: 350 },
  'sneakers': { min: 40, max: 300 },
  'boots': { min: 50, max: 400 },
  'sandals': { min: 15, max: 150 },
  'shirt': { min: 12, max: 150 },
  'pants': { min: 20, max: 200 },
  'jacket': { min: 40, max: 400 },
  'dress': { min: 25, max: 300 },
  'socks': { min: 5, max: 25 },
  'underwear': { min: 8, max: 40 },
  'bra': { min: 15, max: 80 },
  'default': { min: 10, max: 100 },
};

// Real product name templates for common searches
const REAL_PRODUCT_NAMES: Record<string, string[]> = {
  'toothpaste': [
    'Colgate Total Whitening Toothpaste 5.1oz',
    'Crest 3D White Advanced Luminous Mint 3.7oz',
    'Sensodyne Pronamel Gentle Whitening 4oz',
    'Arm & Hammer Advance White Extreme Whitening 6oz',
    'Hello Activated Charcoal Fluoride Free Toothpaste 4oz',
    'Tom\'s of Maine Natural Fluoride-Free Toothpaste 4.7oz',
    'Aquafresh Extreme Clean Whitening Action 5.6oz',
    'Pepsodent Complete Care Toothpaste 6oz',
    'Close-Up Red Hot Toothpaste 4oz',
    'Colgate Optic White Overnight Teeth Whitening 3oz',
    'Crest Pro-Health Advanced Deep Clean Mint 4.6oz',
    'Sensodyne Rapid Relief Extra Fresh 3.4oz',
  ],
  'shampoo': [
    'Pantene Pro-V Daily Moisture Renewal Shampoo 12oz',
    'Head & Shoulders Classic Clean Anti-Dandruff 13.5oz',
    'Herbal Essences Bio:Renew Argan Oil Shampoo 13.5oz',
    'TRESemmé Keratin Smooth Color Shampoo 28oz',
    'Dove Nutritive Solutions Daily Moisture 12oz',
    'L\'Oreal Paris Elvive Total Repair 5 Shampoo 12.6oz',
    'OGX Nourishing Coconut Milk Shampoo 13oz',
    'Garnier Fructis Sleek & Shine Shampoo 12.5oz',
    'Suave Professionals Keratin Infusion Shampoo 28oz',
    'Aveeno Apple Cider Vinegar Blend Shampoo 12oz',
  ],
  'soap': [
    'Dove Beauty Bar White 4oz (4 Pack)',
    'Irish Spring Original Deodorant Bar Soap 3.7oz (3 Pack)',
    'Dial Antibacterial Gold Bar Soap 4oz (8 Pack)',
    'Ivory Classic Clean Original Bar Soap 3.17oz (10 Pack)',
    'Olay Ultra Moisture Beauty Bar 4oz (6 Pack)',
    'Lever 2000 Original Bar Soap 4oz (6 Pack)',
    'Cetaphil Gentle Cleansing Bar 4.5oz (3 Pack)',
    'Neutrogena Transparent Facial Bar Original Formula 3.5oz (3 Pack)',
    'Dr. Bronner\'s Pure-Castile Bar Soap Peppermint 5oz',
    'Coast Refreshing Deodorant Soap Pacific Force 4oz (4 Pack)',
  ],
  'deodorant': [
    'Degree Men Cool Rush Antiperspirant Stick 2.7oz',
    'Secret Clinical Strength Invisible Solid 1.6oz',
    'Old Spice High Endurance Pure Sport 3oz',
    'Dove Advanced Care Antiperspirant Powder 2.6oz',
    'Native Coconut & Vanilla Natural Deodorant 2.65oz',
    'Arm & Hammer Essentials Fresh Antiperspirant 2.5oz',
    'Speed Stick Regular Deodorant 3oz',
    'Ban Invisible Solid Antiperspirant Powder Fresh 2.6oz',
    'Mitchum Advanced Control Clean Control 2.7oz',
    'Right Guard Sport Original Antiperspirant 2.6oz',
  ],
  'phone case': [
    'OtterBox Defender Series Case for iPhone 15 Pro',
    'Spigen Ultra Hybrid Clear Case iPhone 15',
    'Casetify Impact Case Custom Print iPhone 15 Pro Max',
    'Apple Silicone Case with MagSafe iPhone 15',
    'Speck Presidio2 Grip Case iPhone 15 Plus',
    'Caseology Parallax Case iPhone 15 Pro',
    'SUPCASE UB Pro Full-Body Rugged Case iPhone 15',
    'Mous Limitless 5.0 Aramid Fiber Case iPhone 15 Pro',
    'Pela Eco-Friendly Compostable Case iPhone 15',
    'Totallee Thin Case 0.02" iPhone 15',
  ],
  'water bottle': [
    'Hydro Flask Standard Mouth 21oz',
    'YETI Rambler 26oz Bottle',
    'Nalgene Wide Mouth BPA-Free Water Bottle 32oz',
    'CamelBak Chute Mag 32oz Bottle',
    'Contigo AutoSeal Chill Stainless Steel 24oz',
    'S\'well Stainless Steel Insulated Bottle 17oz',
    'Simple Modern Summit Water Bottle 32oz',
    'Thermos Stainless King Vacuum-Insulated 24oz',
    'Owala FreeSip Insulated Stainless Steel 24oz',
    'Klean Kanteen Classic Stainless 27oz',
  ],
  'backpack': [
    'JanSport Right Pack Backpack 31L',
    'The North Face Borealis Backpack 28L',
    'Herschel Supply Co. Little America Backpack',
    'Nike Brasilia Training Backpack Medium',
    'Adidas Classic 3-Stripes Backpack',
    'Fjallraven Kanken Classic Backpack 16L',
    'Under Armour Hustle 5.0 Backpack',
    'SwissGear 1900 ScanSmart TSA Laptop Backpack',
    'Osprey Daylite Plus Backpack 20L',
    'Patagonia Refugio Backpack 26L',
  ],
  'sunglasses': [
    'Ray-Ban Wayfarer Classic RB2140',
    'Oakley Holbrook Prizm Polarized',
    'Maui Jim Peahi Polarized Sunglasses',
    'Costa Del Mar Blackfin Polarized',
    'Warby Parker Percey Sunglasses',
    'Persol PO0649 Steve McQueen Edition',
    'Gucci GG0061S Square Sunglasses',
    'Prada Linea Rossa PS 01US',
    'Carrera CARRERA 8035/S Aviator',
    'Polaroid PLD 2053/S Polarized',
  ],
  'candle': [
    'Yankee Candle Large Jar Vanilla Cupcake 22oz',
    'Bath & Body Works 3-Wick Candle Mahogany Teakwood 14.5oz',
    'Chesapeake Bay Candle Balance + Harmony Water Lily Pear',
    'Voluspa Baltic Amber Candle 12oz',
    'Diptyque Baies Scented Candle 6.5oz',
    'Paddywax Apothecary Tobacco Patchouli 8oz',
    'Mrs. Meyer\'s Clean Day Soy Candle Lavender 7.2oz',
    'Homesick State Candle California 13.75oz',
    'WoodWick Fireside Large Hourglass Candle 21.5oz',
    'Capri Blue Volcano Candle Jar 19oz',
  ],
  'vitamins': [
    'Nature Made Multi Complete with Iron 130 Tablets',
    'Centrum Adult Multivitamin 200 Tablets',
    'One A Day Men\'s Health Formula 200 Tablets',
    'Vitafusion Adult Gummy Vitamins 150 Count',
    'Garden of Life Vitamin Code Raw One 75 Capsules',
    'Rainbow Light Men\'s One Multivitamin 150 Tablets',
    'Optimum Nutrition Opti-Men Multivitamin 90 Tablets',
    'MegaFood Women\'s One Daily 60 Tablets',
    'SmartyPants Adult Complete Gummy Vitamins 180 Count',
    'Nature\'s Way Alive! Once Daily Men\'s 60 Tablets',
  ],
  'protein powder': [
    'Optimum Nutrition Gold Standard 100% Whey Protein 5lb',
    'Dymatize ISO100 Hydrolyzed Protein Powder 3lb',
    'MuscleTech Nitro-Tech Whey Protein 4lb',
    'BSN SYNTHA-6 Protein Powder 5lb',
    'Isopure Zero Carb Protein Powder 3lb',
    'Orgain Organic Plant Based Protein Powder 2.03lb',
    'Vega Sport Premium Protein 30 Servings',
    'Garden of Life Raw Organic Protein 22oz',
    'Quest Nutrition Protein Powder 3lb',
    'Naked Whey Protein Powder 5lb',
  ],
  'coffee': [
    'Starbucks Pike Place Roast Medium Roast Ground Coffee 12oz',
    'Dunkin\' Original Blend Medium Roast Ground Coffee 12oz',
    'Peet\'s Coffee Major Dickason\'s Blend Dark Roast 12oz',
    'Lavazza Super Crema Espresso Whole Bean Coffee 2.2lb',
    'Death Wish Coffee Dark Roast Grounds 16oz',
    'Folgers Classic Roast Ground Coffee 30.5oz',
    'Maxwell House Original Roast Ground Coffee 30.6oz',
    'Eight O\'Clock Original Whole Bean Coffee 36oz',
    'Community Coffee Breakfast Blend Medium Roast 12oz',
    'Green Mountain Coffee French Vanilla K-Cups 24ct',
  ],
  'charger': [
    'Anker PowerPort III 20W USB-C Fast Charger',
    'Apple 20W USB-C Power Adapter',
    'Samsung 25W Super Fast Charging Wall Charger',
    'Belkin BoostCharge Dual USB-C Wall Charger 40W',
    'UGREEN 65W USB C Charger 3-Port GaN Charger',
    'Spigen 40W Dual USB C Charger',
    'Aukey Omnia Mix4 100W 4-Port PD Charger',
    'RAVPower 61W USB-C Wall Charger PD 3.0',
    'Baseus 65W GaN II Pro USB C Charger',
    'Nekteck 60W USB-C GaN Charger',
  ],
  'mouse': [
    'Logitech MX Master 3S Wireless Mouse',
    'Razer DeathAdder V3 Gaming Mouse',
    'Logitech G502 HERO High Performance Gaming Mouse',
    'Apple Magic Mouse Multi-Touch Surface',
    'Microsoft Surface Mobile Mouse Bluetooth',
    'SteelSeries Rival 3 Wireless Gaming Mouse',
    'Corsair Dark Core RGB Pro Wireless Gaming Mouse',
    'HP X3000 Wireless Mouse',
    'Anker 2.4G Wireless Vertical Ergonomic Mouse',
    'Logitech M720 Triathlon Multi-Device Wireless Mouse',
  ],
  'notebook': [
    'Moleskine Classic Notebook Hard Cover Large Ruled 240 Pages',
    'Leuchtturm1917 Medium A5 Dotted Hardcover Notebook',
    'Rhodia Webnotebook A5 Dot Grid 192 Pages',
    'Five Star Spiral Notebook 5 Subject College Ruled',
    'Mead Composition Notebook Wide Ruled 100 Sheets',
    'Oxford Composition Notebook College Ruled 100 Sheets',
    'Rocketbook Smart Reusable Notebook Letter Size',
    'Cambridge Limited Notebook 11" x 8.5" 80 Sheets',
    'TOPS The Legal Pad Jr. Legal Rule 5" x 8" 50 Sheets',
    'Strathmore 400 Series Sketch Pad 9"x12" 100 Sheets',
  ],
  'pen': [
    'Pilot G2 Retractable Gel Ink Pens Fine Point 12 Pack',
    'Paper Mate InkJoy Gel Pens Medium Point 14 Pack',
    'uni-ball Signo 207 Retractable Gel Pens 12 Pack',
    'Sharpie S-Gel High Performance Gel Pens 12 Pack',
    'BIC Cristal Ballpoint Stick Pens Medium 24 Pack',
    'Pentel EnerGel RTX Retractable Gel Pens 12 Pack',
    'Zebra Sarasa Dry Gel Ink Pens 10 Pack',
    'Pilot FriXion Ball Erasable Gel Pens 12 Pack',
    'Staedtler Triplus Fineliner Pens 20 Pack',
    'Sakura Pigma Micron Fineliners Assorted 6 Pack',
  ],
  'pillow': [
    'Coop Home Goods Original Adjustable Loft Pillow Queen',
    'Beckham Hotel Collection Bed Pillows Queen Set of 2',
    'Purple Harmony Pillow Standard',
    'Tempur-Pedic TEMPUR-Cloud Pillow Queen',
    'Casper Original Pillow Standard/Queen',
    'Sleep Number ComfortFit Pillow Ultimate',
    'MyPillow Classic Medium Support Queen',
    'Snuggle-Pedic Ultra-Luxury Bamboo Pillow Queen',
    'EPABO Contour Memory Foam Pillow Orthopedic',
    'Xtreme Comforts Hypoallergenic Shredded Memory Foam',
  ],
  'towel': [
    'Utopia Towels Cotton Bath Towels Set 8 Pack',
    'AmazonBasics Quick-Dry Bath Towel 2-Pack',
    'Chakir Turkish Linens Luxury Bath Towels 4 Pack',
    'Brooklinen Super-Plush Bath Towels Set of 2',
    'Parachute Classic Bathrobe Turkish Cotton',
    'Onsen Bath Towel Waffle Weave',
    'Boll & Branch Plush Bath Towel',
    'Pottery Barn Hydrocotton Bath Towel',
    'Frontgate Resort Cotton Bath Towel Set of 4',
    'Crate & Barrel Egyptian Cotton Bath Towel',
  ],
  'watch': [
    'Timex Weekender Chronograph 40mm',
    'Casio Men\'s G-Shock Digital Watch',
    'Citizen Eco-Drive Chandler Field Watch',
    'Seiko 5 Automatic Stainless Steel Watch',
    'Fossil Gen 6 Smartwatch 44mm',
    'Garmin Forerunner 245 Music GPS Running Watch',
    'Invicta Pro Diver Automatic Watch',
    'Orient Bambino Automatic Dress Watch',
    'Nixon Time Teller Stainless Steel Watch',
    'Bulova Precisionist Chronograph Watch',
  ],
  'perfume': [
    'Chanel No. 5 Eau de Parfum Spray 3.4oz',
    'Dior Sauvage Eau de Toilette 3.4oz',
    'Viktor & Rolf Flowerbomb Eau de Parfum 3.4oz',
    'Marc Jacobs Daisy Eau de Toilette 3.4oz',
    'Versace Bright Crystal Eau de Toilette 3oz',
    'Calvin Klein Euphoria Eau de Parfum 3.4oz',
    'Yves Saint Laurent Black Opium Eau de Parfum 3oz',
    'Giorgio Armani Acqua di Gio Pour Homme 3.4oz',
    'Dolce & Gabbana Light Blue Eau de Toilette 3.3oz',
    'Prada Candy Eau de Parfum 2.7oz',
  ],
  'desk': [
    'IKEA BEKANT Desk 63" White',
    'FlexiSpot Electric Height Adjustable Desk 48"',
    'Autonomous SmartDesk Core 53"',
    'Bush Furniture Somerset 60W L-Shaped Desk',
    'UPLIFT V2 Standing Desk 60"x30"',
    'Sauder Edge Water Computer Desk Estate Black',
    'Walker Edison Modern L-Shaped Corner Desk',
    'Mr IRONSTONE L-Shaped Desk 51" Computer Corner Desk',
    'Vari Electric Standing Desk 60"x30"',
    'HON 10500 Series Double Pedestal Desk 60W',
  ],
  'chair': [
    'Herman Miller Aeron Ergonomic Office Chair',
    'Steelcase Leap Fabric Office Chair',
    'IKEA MARKUS Office Chair High Back',
    'Secretlab TITAN Evo Gaming Chair',
    'Herman Miller Sayl Ergonomic Office Chair',
    'Autonomous ErgoChair Pro',
    'Branch Ergonomic Chair',
    'HON Ignition 2.0 Mesh Task Chair',
    'Flash Furniture Mid-Back Mesh Swivel Chair',
    'AmazonBasics High-Back Executive Swivel Chair',
  ],
};

// Get price range based on query
function getPriceRange(query: string): { min: number; max: number } {
  const normalizedQuery = query.toLowerCase();

  // Check exact matches first
  for (const [key, range] of Object.entries(PRICE_RANGES)) {
    if (normalizedQuery.includes(key)) {
      return range;
    }
  }

  // Category inference
  if (normalizedQuery.includes('laptop') || normalizedQuery.includes('computer')) {
    return PRICE_RANGES['laptop'];
  }
  if (normalizedQuery.includes('phone') && !normalizedQuery.includes('case')) {
    return PRICE_RANGES['phone'];
  }
  if (normalizedQuery.includes('shoe') || normalizedQuery.includes('sneaker')) {
    return PRICE_RANGES['shoes'];
  }
  if (normalizedQuery.includes('furniture') || normalizedQuery.includes('couch') || normalizedQuery.includes('sofa')) {
    return { min: 200, max: 2000 };
  }

  return PRICE_RANGES['default'];
}

// Normalize search query for matching
function normalizeQuery(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const variations: string[] = [normalized];

  // Remove spaces
  variations.push(normalized.replace(/\s+/g, ''));

  // Common variations
  if (normalized.includes('tooth paste')) variations.push('toothpaste');
  if (normalized === 'toothpaste') variations.push('tooth paste', 'teeth whitening', 'oral care');
  if (normalized.includes('hair care')) variations.push('shampoo', 'conditioner');
  if (normalized.includes('body wash')) variations.push('soap');
  if (normalized.includes('antiperspirant')) variations.push('deodorant');

  return variations;
}

// Generate dynamic products when no template matches
function generateDynamicProducts(query: string, count: number): any[] {
  const products: any[] = [];
  const retailers = ['Amazon', 'Walmart', 'Target', 'Best Buy', "Macy's"];
  const priceRange = getPriceRange(query);
  const queryVariations = normalizeQuery(query);

  // Check if we have real product names for this query
  let productNames: string[] = [];
  for (const variation of queryVariations) {
    if (REAL_PRODUCT_NAMES[variation]) {
      productNames = REAL_PRODUCT_NAMES[variation];
      break;
    }
  }

  // If we found real product names, use them
  if (productNames.length > 0) {
    productNames.forEach((productName, i) => {
      const basePrice = priceRange.min + Math.random() * (priceRange.max - priceRange.min);

      retailers.forEach(retailer => {
        const priceVariation = basePrice * (0.85 + Math.random() * 0.3); // ±15% variation
        const price = Math.max(priceRange.min, Math.min(priceRange.max, priceVariation));

        products.push({
          id: `${retailer.toLowerCase().replace(/[^a-z]/g, '')}-real-${i}`,
          name: productName,
          price: parseFloat(price.toFixed(2)),
          currency: 'USD',
          retailer,
          url: `https://www.${retailer.toLowerCase().replace(/[^a-z]/g, '')}.com/search?q=${encodeURIComponent(productName)}`,
          imageUrl: `https://dummyimage.com/400x400/6B7280/fff&text=${encodeURIComponent(productName.substring(0, 30))}`,
          inStock: Math.random() > 0.15,
        });
      });
    });
  } else {
    // Fallback: Generate realistic product variations
    const brands = ['Premium', 'Essential', 'Pro', 'Classic', 'Ultra', 'Advanced', 'Deluxe', 'Basic'];
    const descriptors = ['Professional', 'Heavy Duty', 'Compact', 'Portable', 'Wireless', 'Digital'];

    for (let i = 0; i < Math.min(10, Math.ceil(count / retailers.length)); i++) {
      const brand = brands[i % brands.length];
      const descriptor = i < descriptors.length ? descriptors[i] : '';
      const productName = descriptor
        ? `${brand} ${descriptor} ${query}`
        : `${brand} ${query}`;

      const basePrice = priceRange.min + Math.random() * (priceRange.max - priceRange.min);

      retailers.forEach(retailer => {
        const priceVariation = basePrice * (0.85 + Math.random() * 0.3);
        const price = Math.max(priceRange.min, Math.min(priceRange.max, priceVariation));

        products.push({
          id: `${retailer.toLowerCase().replace(/[^a-z]/g, '')}-dynamic-${i}`,
          name: productName,
          price: parseFloat(price.toFixed(2)),
          currency: 'USD',
          retailer,
          url: `https://www.${retailer.toLowerCase().replace(/[^a-z]/g, '')}.com/search?q=${encodeURIComponent(query)}`,
          imageUrl: `https://dummyimage.com/400x400/6B7280/fff&text=${encodeURIComponent(query.substring(0, 20))}`,
          inStock: true,
        });
      });
    }
  }

  return products.slice(0, count);
}

// Get trending products for homepage
export function getTrendingProducts(): any[] {
  const trendingTemplates = [
    PRODUCT_TEMPLATES.find(p => p.name.includes('iPhone 15 Pro')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('Sony WH-1000XM5')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('iPad Air')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('Nike Air')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('KitchenAid')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('Dyson Airwrap')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('Apple Watch')),
    PRODUCT_TEMPLATES.find(p => p.name.includes('LEGO')),
  ].filter(Boolean) as ProductTemplate[];

  return generateProductsFromTemplates(trendingTemplates, 'trending').slice(0, 8);
}

// Related search suggestions
export function getRelatedSearches(query: string): string[] {
  const normalizedQuery = query.toLowerCase();

  const relatedMap: Record<string, string[]> = {
    'shoes': ['running socks', 'shoe insoles', 'sneaker cleaner', 'shoe organizer'],
    'running': ['running shoes', 'fitness tracker', 'water bottle', 'running socks'],
    'laptop': ['laptop bag', 'mouse', 'laptop stand', 'USB-C hub'],
    'phone': ['phone case', 'screen protector', 'wireless charger', 'earbuds'],
    'kitchen': ['cutting board', 'knife set', 'storage containers', 'dish towels'],
    'headphones': ['headphone case', 'audio cable', 'headphone stand', 'earbuds'],
    'camera': ['camera bag', 'memory card', 'tripod', 'lens cleaner'],
    'tv': ['soundbar', 'HDMI cable', 'TV mount', 'streaming device'],
    'gaming': ['gaming headset', 'controller', 'gaming chair', 'monitor'],
    'beauty': ['makeup remover', 'beauty sponge', 'mirror', 'organizer'],
  };

  for (const [key, suggestions] of Object.entries(relatedMap)) {
    if (normalizedQuery.includes(key)) {
      return suggestions;
    }
  }

  return ['accessories', 'similar items', 'top rated', 'best sellers'];
}
