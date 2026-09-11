const fs = require('fs');

async function fetchQuote(code, market) {
  let symbol = code;
  if (market === 'JP' && !code.includes('.')) symbol = `${code}.T`;
  if (market === 'KR' && !code.includes('.')) symbol = `${code}.KS`;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice || meta?.chartPreviousClose || null;
  } catch (e) {
    console.error(`Error fetching ${symbol}:`, e.message);
    return null;
  }
}

async function main() {
  const rawData = process.env.STOCKS_DATA || '[]';
  let stocks = [];
  try {
    stocks = JSON.parse(rawData);
  } catch (e) {
    console.error('Failed to parse STOCKS_DATA:', e.message);
  }

  const prices = {};

  // 為替レート取得
  let fxRates = { USD: 155.0, KRW: 0.11 };
  try {
    const fxRes = await fetch('https://open.er-api.com/v6/latest/USD');
    if (fxRes.ok) {
      const fxData = await fxRes.json();
      if (fxData?.rates) {
        fxRates.USD = fxData.rates.JPY;
        fxRates.KRW = fxData.rates.JPY / fxData.rates.KRW;
      }
    }
  } catch (e) {
    console.warn('FX fetch failed, using fallback.');
  }

  for (const item of stocks) {
    if (!item.code || !item.market) continue;
    const price = await fetchQuote(item.code, item.market);
    const key = `${item.market}_${item.code}`;
    prices[key] = price;
  }

  const output = {
    updatedAt: new Date().toISOString(),
    fx: fxRates,
    prices: prices
  };

  fs.writeFileSync('./prices.json', JSON.stringify(output, null, 2));
  console.log('prices.json successfully updated.');
}

main();
