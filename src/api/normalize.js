export const NETWORK_MESSAGE =
	"Не удалось связаться с сервисом. Проверьте соединение и повторите запрос";

// Request timeout! и Gateway error! присылает не API, а функция api/hsprice.js на деплое
const API_ERROR_MESSAGES = {
	"Request quota exceeded!": "Превышен лимит запросов, попробуйте позже",
	"Empty key!": "Ошибка конфигурации ключа API",
	"Invalid key client!": "Ошибка конфигурации ключа API",
	"Invalid access key": "Ошибка конфигурации ключа API",
	"Request timeout!": "Сервис отвечает слишком долго. Повторите запрос",
	"Gateway error!": NETWORK_MESSAGE,
};

// API на «ничего не найдено» возвращает один элемент-заглушку с нулевым goodsID и пустым brand
function isEmptyItem(item) {
	return !item.goodsID || item.goodsID === "0" || !item.brand;
}

export function parseResponse(json) {
	if (json?.error) {
		const messages = []
			.concat(json.error)
			.map((e) => API_ERROR_MESSAGES[e] ?? e);
		throw new Error([...new Set(messages)].join(". "));
	}

	return (json?.goods ?? []).filter((item) => !isEmptyItem(item));
}

// Корневой price не используем: он оставлен в API для совместимости, актуальная цена у складов
export function getPrice(item) {
	const prices = (item.warehouses ?? [])
		.filter((w) => Number(w.stock) > 0)
		.map((w) => Number(w.price));

	return prices.length ? Math.min(...prices) : null;
}

export function extractBrands(goods) {
	const byBrand = new Map();

	for (const item of goods) {
		if (!byBrand.has(item.brand)) {
			byBrand.set(item.brand, {
				brand: item.brand,
				name: item.name,
				count: Number(item.count) || 0,
			});
		}
	}

	return [...byBrand.values()].sort((a, b) => a.brand.localeCompare(b.brand));
}

const toOffer = (item) => ({
	id: item.goodsID,
	brand: item.brand,
	number: item.number,
	name: item.name,
	count: Number(item.count) || 0,
	price: getPrice(item),
});

// Сначала в наличии, внутри группы по возрастанию цены, без цены в конце группы
const byStockAndPrice = (a, b) =>
	(b.count > 0) - (a.count > 0) ||
	(a.price === null) - (b.price === null) ||
	a.price - b.price;

export function buildOffers(goods) {
	const first = goods.find((item) => !isEmptyItem(item));
	const original = first ? toOffer(first) : null;

	const seen = new Set([original?.id]);
	const analogues = [];

	for (const item of goods.flatMap((g) => g.analogues ?? [])) {
		if (isEmptyItem(item) || seen.has(item.goodsID)) {
			continue;
		}

		seen.add(item.goodsID);
		analogues.push(toOffer(item));
	}

	return { original, analogues: analogues.sort(byStockAndPrice) };
}
