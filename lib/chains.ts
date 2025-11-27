// Chain display names
export const CHAIN_DISPLAY_NAMES: Record<string, string> = {
	'ravencoin-testnet': 'Ravencoin Testnet',
	'bcash-testnet': 'Bitcoin Cash Testnet',
	'dogecoin-testnet': 'Dogecoin Testnet',
	'litecoin-testnet': 'Litecoin Testnet'
}

// Chain currency symbols
export const CHAIN_SYMBOLS: Record<string, string> = {
	'ravencoin-testnet': 'RVN',
	'bcash-testnet': 'BCH',
	'dogecoin-testnet': 'DOGE',
	'litecoin-testnet': 'LTC'
}

// Chain colors for visual distinction
export const CHAIN_COLORS: Record<string, string> = {
	'ravencoin-testnet': '#384182',
	'bcash-testnet': '#0ac18e',
	'dogecoin-testnet': '#c2a633',
	'litecoin-testnet': '#345d9d'
}

// Chain logo images
export const CHAIN_LOGOS: Record<string, string> = {
	'ravencoin-testnet': '/ravencoin.webp',
	'bcash-testnet': '/bitcoin-cash-circle.webp',
	'dogecoin-testnet': '/dogecoin.webp',
	'litecoin-testnet': '/litecoin.webp'
}

// Block explorer URLs for each chain
export const getBlockExplorerUrl = (chain: string, blockHash: string): string => {
	switch (chain) {
		case 'ravencoin-testnet':
			return `https://rvnt.cryptoscope.io/block/?blockhash=${blockHash}`
		case 'litecoin-testnet':
			return `https://blockexplorer.one/litecoin/testnet/blockHash/${blockHash}`
		case 'bcash-testnet':
			return `https://blockexplorer.one/bitcoin-cash/testnet/blockHash/${blockHash}`
		case 'dogecoin-testnet':
			return `https://blockexplorer.one/dogecoin/testnet/blockHash/${blockHash}`
		default:
			return '#'
	}
}
