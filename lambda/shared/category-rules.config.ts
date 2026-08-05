// MCCs that count as "Relevant Spend".
export const RELEVANT_MCC_CODES: string[] = [
    '5021', '5045', '5046', '5047', '5065', '5072', '5074', '5085', '5099', '5111',
    '5139', '5200', '5251', '5300', '5310', '5331', '5399', '5411', '5531', '5533',
    '5655', '5661', '5712', '5718', '5719', '5722', '5732', '5733', '5940', '5941',
    '5942', '5943', '5945', '5946', '5948', '5949', '5964', '5965', '5966', '5969',
    '5970', '5978', '5995', '5996', '5997', '5999',
];

// Merchant-name substrings that count as "Office" spend.
export const OFFICE_MERCHANT_SUBSTRINGS: string[] = [
    'Staples', 'Officemax', 'Office Depot', 'WB Mason', 'W B Mason', 'Quill', 'Stapls', 'HiTouch',
];

// "Amazon + Prime Spend": merchant must contain one of these...
export const AMAZON_PRIME_INCLUDE_SUBSTRINGS: string[] = ['amazon', 'amzn', 'amazon prime', 'b2b prime'];

// ...and must NOT contain any of these.
export const AMAZON_PRIME_EXCLUDE_SUBSTRINGS: string[] = [
    'Amazon.Ca', 'Amazon.fr', 'Amazon Freetime', 'Amazon Fresh', 'Amazon Web Services',
    'AMZN Digital', 'Amazon Music', 'Amazon MP3', 'Prime Now', 'Amazon Tips', 'Amzn Tradein',
    'AMZNGRCYTIP', 'AMAZON DIGIT', 'AMZN MKTP CA', 'AMZNFREETIME', 'AMAZONMAGZNE',
    'AMAZON HOSE & RUBBER', 'AMZNRESTRNTS', 'AMZNGROCERY', 'AMZN AD', 'Amazon kids+',
    'Amazon.co.uk', 'AMAZON PAY', 'AMAZON SELLER REPAY', 'AMAZON FR MARKETPLACE',
];

export const BUSINESS_PRIME_SUBSTRING = 'b2b prime';
export const CONSUMER_PRIME_SUBSTRING = 'amazon prime';

// "Trips To Stores": merchant must contain one of these...
export const TRIPS_TO_STORE_INCLUDE_SUBSTRINGS: string[] = [
    'Home Depot', 'Lowes', 'Menards', 'Target', 'Wal-Mart', 'Walmart', 'WM Supercenter',
    'Best Buy', 'Dollar', 'Hobby Lobby', 'Autozone', 'Big lots',
];

// ...and must NOT contain any of these.
export const TRIPS_TO_STORE_EXCLUDE_SUBSTRINGS: string[] = [
    'Lowes foods', 'ecommerce', '.com', 'Fuel', 'bestbuy.com', 'Walmart Grocery',
    'Dollar Rent-a-car', 'Silver Dollar', 'ecom', 'Paypal', 'dollar rent a car', 'murphy',
    'E-commerce', 'EGIFT CARD', 'Rent', 'THE HOME DEPOT PRO', 'TARGET SPECIALTY PROD',
    'ONTARGET JOBS', 'TARGET SOLUTION', 'THE HOME DEPOT PRO INSTNL', 'ONLINE', 'DIRECT',
    'BEST BUY AUTOMOTIVE EQUIP', 'TARGET MARKETING GROUP', 'BEST BUY DIRECT', 'Target Plus',
    'ACTION TARGETS',
];

// "E-Commerce": merchant must contain one of these...
export const ECOMMERCE_INCLUDE_SUBSTRINGS: string[] = [
    '.com', 'Ecom', 'Ecomm', 'Bestbuycom', 'paypal', 'Amazon Pay', 'Amazon Payment',
];

// ...and must NOT contain any of these (also requires a relevant MCC, see category-rules.ts).
export const ECOMMERCE_EXCLUDE_SUBSTRINGS: string[] = ['Amazon.com', 'AMZN', 'amazon.ca'];

// MCCs that count as "IT Peripherals".
export const IT_PERIPHERALS_MCC_CODES: string[] = ['5045', '5732'];

// MCCs that count as "MRO".
export const MRO_MCC_CODES: string[] = ['5039', '5072', '5251', '5200', '5085', '5074'];
