function ready(fn) {
  if (document.readyState !== 'loading') {
    fn();
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
}

const ticker = {
	bitmex: {
		XBTUSD: 0,
		XBTUSDT: 0,
	},
	deribit: {
		'BTC-PERPETUAL': 0,
	},
};

function usdFormat(num) {
	return new Intl.NumberFormat(`en-US`, { currency: `USD`, style: 'currency' }).format(num);
}

function initBitmex(pair) {
	const wsUrlBitmex = `wss://ws.bitmex.com/realtime?subscribe=trade:${pair}`;
	const wsBitmex = new WebSocket(wsUrlBitmex);
	wsBitmex.onmessage = m => {
		const parsed = JSON.parse(m.data);
		//console.log('data::',parsed)
		if (parsed.data && parsed.data.length) {
			const o = parsed.data[parsed.data.length - 1];
			document.querySelector(`.ticker .${o.symbol} span`).textContent = usdFormat(o.price);

			if (pair === 'XBTUSD') {
				ticker.bitmex['XBTUSD'] = o.price;
			} else if (pair === 'XBTUSDT') {
				ticker.bitmex['XBTUSDT'] = o.price;
			} else {
				let perp;
				if (pair.includes('USDT')) {
					perp = ticker.bitmex['XBTUSDT'];
				} else {
					perp = ticker.bitmex['XBTUSD'];
				}

				if (perp) {
					const premium = (1 - perp / o.price) * 100;
					if (premium < 0) {
						document.querySelector(`.ticker .${o.symbol} u`).classList.remove('red');
						document.querySelector(`.ticker .${o.symbol} u`).classList.add('green');
					} else {
						document.querySelector(`.ticker .${o.symbol} u`).classList.remove('green');
						document.querySelector(`.ticker .${o.symbol} u`).classList.add('red');
					}
					document.querySelector(`.ticker .${o.symbol} u`).textContent = `${premium.toFixed(3)}%`;
				}
			}
		}
	};
}

initBitmex('XBTUSD');
initBitmex('XBTZ22');
initBitmex('XBTH23');
initBitmex('XBTM23');
initBitmex('XBTUSDT');
initBitmex('XBTUSDTZ22');
initBitmex('XBTUSDTH23');

let deribitPairs = [];
const wsDeribit = new WebSocket('wss://www.deribit.com/ws/api/v2');
wsDeribit.onopen = () => {
	console.log('onopen deribit:')
	wsDeribit.send(JSON.stringify({
		jsonrpc: '2.0',
		id: 1004,
		method: 'public/get_instruments',
		params: {
			currency: 'BTC',
			kind: 'future',
			expired: false
		}
	}));
};
wsDeribit.onmessage = m => {
	const parsed = JSON.parse(m.data);
	if (parsed.id === 1004) {
		deribitPairs = parsed.result.map(i => `ticker.${i.instrument_name}.100ms`);
		wsDeribit.send(JSON.stringify({
			jsonrpc : '2.0',
			id : 1005,
			method : 'public/subscribe',
			params : {
				channels : deribitPairs
			}
		}))
	} else if (parsed.method === 'subscription') {
		const o = parsed.params.data;
		if (!o) return;
		document.querySelector(`.ticker .${o.instrument_name} span`).textContent = usdFormat(o.last_price);
		if (o.instrument_name === 'BTC-PERPETUAL') {
			ticker.deribit['BTC-PERPETUAL'] = o.last_price;
		} else {
			const perp = ticker.deribit['BTC-PERPETUAL'];
			if (perp) {
				const premium = (1 - perp / o.last_price) * 100;
				if (premium < 0) {
					document.querySelector(`.ticker .${o.instrument_name} u`).classList.remove('red');
					document.querySelector(`.ticker .${o.instrument_name} u`).classList.add('green');
				} else {
					document.querySelector(`.ticker .${o.instrument_name} u`).classList.remove('green');
					document.querySelector(`.ticker .${o.instrument_name} u`).classList.add('red');
				}
				document.querySelector(`.ticker .${o.instrument_name} u`).textContent = `${premium.toFixed(3)}%`;
			}
		}
	}
};
