import { NextResponse } from 'next/server'
import { insertMinedBlock, blockExists, upsertPrice, MinedBlock } from '@/lib/db'

export const maxDuration = 60;

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

// Map chain names to CoinGecko IDs
const CHAIN_TO_COINGECKO_ID: Record<string, string> = {
	'ravencoin-testnet': 'ravencoin',
	'bcash-testnet': 'bitcoin-cash',
	'dogecoin-testnet': 'dogecoin',
	'litecoin-testnet': 'litecoin'
}

interface PriceData {
	[coinId: string]: {
		usd: number
	}
}

async function fetchAndStorePrices(): Promise<Record<string, number>> {
	const coinIds = Object.values(CHAIN_TO_COINGECKO_ID).join(',')

	try {
		const res = await fetch(
			`${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=usd`,
			{
				headers: {
					'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
				}
			}
		)

		if (!res.ok) {
			console.error('CoinGecko API error:', res.status)
			return {}
		}

		const data: PriceData = await res.json()

		// Store prices in database
		const prices: Record<string, number> = {}
		for (const [chain, coinId] of Object.entries(CHAIN_TO_COINGECKO_ID)) {
			if (data[coinId]?.usd) {
				prices[chain] = data[coinId].usd
				await upsertPrice(chain, data[coinId].usd)
			}
		}

		return prices
	} catch (error) {
		console.error('Failed to fetch prices:', error)
		return {}
	}
}

// Ravencoin config
const RVN_ADDRESS = 'mvwrYV23K5ZB2DFXjaiNHkB66j97gnRorK'
const RVN_RPC_URL = 'http://34.133.26.97:18766/'
const RVN_RPC_USER = 'ravencoinrpc'
const RVN_RPC_PASS = 'yourStrongPasswordHere'

// Tatum API config
const TATUM_API_KEY = 't-69277b10ac7d22f05b88e70b-86945e0006ae4a298772dc0c'
const BCH_ADDRESS = 'bchtest:qq2mudwqwfcel7aah0jcew5cp9twkjsv5y68ep4jl6'
const DOGE_ADDRESS = 'ndWSGfKCsDFadmMvfdSV6Dj2WFYgPkXnLm'

// Litecoin config
const LTC_ADDRESS = 'tltc1qxj48dsj9wkyr8j6p30x2k8wq88z9tdtra6xewg'

interface PollResult {
	chain: string
	fetched: number
	newBlocks: number
	error?: string
}

// RPC helper for Ravencoin
async function rpcCall(method: string, params: unknown[] = []): Promise<unknown> {
	const res = await fetch(RVN_RPC_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
			Authorization: 'Basic ' + Buffer.from(`${RVN_RPC_USER}:${RVN_RPC_PASS}`).toString('base64')
		},
		body: JSON.stringify({ jsonrpc: '1.0', id: 'ravencoin-api', method, params })
	})
	const data = await res.json()
	if (data.error) throw new Error(data.error.message)
	return data.result
}

async function pollRavencoin(): Promise<PollResult> {
	const chain = 'ravencoin-testnet'
	try {
		const res = await fetch(`https://rvnt.cryptoscope.io/api/getaddress/?address=${RVN_ADDRESS}`)
		const contentType = res.headers.get('content-type')
		if (!res.ok || !contentType?.includes('application/json')) {
			return { chain, fetched: 0, newBlocks: 0, error: 'API unavailable' }
		}

		const data = await res.json()
		interface RvnTx { tx_time: number; block_ix: number; txid: string; amount: string; is_reward: boolean }
		const rewardTxs: RvnTx[] = (data.last_txs || []).filter((tx: RvnTx) => tx.is_reward)

		let newBlocks = 0
		for (const tx of rewardTxs) {
			const exists = await blockExists(tx.txid) // Use txid as temporary check, will use blockHash
			if (exists) continue

			// Fetch block hash via RPC
			let blockHash = 'unknown'
			try {
				blockHash = (await rpcCall('getblockhash', [tx.block_ix])) as string
			} catch {
				// If RPC fails, still store with unknown hash
			}

			// Check again with actual blockHash
			if (blockHash !== 'unknown' && await blockExists(blockHash)) continue

			const block: MinedBlock = {
				blockHash,
				blockHeight: tx.block_ix,
				blockTime: tx.tx_time,
				reward: parseFloat(tx.amount),
				coinbaseTxid: tx.txid,
				chain
			}

			await insertMinedBlock(block)
			newBlocks++
		}

		return { chain, fetched: rewardTxs.length, newBlocks }
	} catch (error) {
		return { chain, fetched: 0, newBlocks: 0, error: String(error) }
	}
}

async function pollBitcoinCash(): Promise<PollResult> {
	const chain = 'bcash-testnet'
	try {
		const res = await fetch(
			`https://api.tatum.io/v3/bcash/transaction/address/${BCH_ADDRESS}?pageSize=50`,
			{ headers: { 'x-api-key': TATUM_API_KEY } }
		)
		if (!res.ok) {
			return { chain, fetched: 0, newBlocks: 0, error: `HTTP ${res.status}` }
		}

		const transactions = await res.json()
		interface BchVin { coinbase?: string }
		interface BchVout { value: number; scriptPubKey: { addresses?: string[] } }
		interface BchTx { txid: string; blockhash: string; blockheight: number; blocktime: number; vin: BchVin[]; vout: BchVout[] }

		const coinbaseTxs = (transactions as BchTx[]).filter(
			(tx) => tx.vin.length > 0 && 'coinbase' in tx.vin[0] && !!tx.vin[0].coinbase
		)

		let newBlocks = 0
		for (const tx of coinbaseTxs) {
			if (await blockExists(tx.blockhash)) continue

			const firstOutput = tx.vout.find((out) =>
				out.scriptPubKey.addresses?.some((addr) =>
					addr.toLowerCase().includes(BCH_ADDRESS.replace('bchtest:', '').toLowerCase())
				)
			) || tx.vout[0]

			const block: MinedBlock = {
				blockHash: tx.blockhash,
				blockHeight: tx.blockheight,
				blockTime: tx.blocktime,
				reward: firstOutput?.value || 0,
				coinbaseTxid: tx.txid,
				chain
			}

			await insertMinedBlock(block)
			newBlocks++
		}

		return { chain, fetched: coinbaseTxs.length, newBlocks }
	} catch (error) {
		return { chain, fetched: 0, newBlocks: 0, error: String(error) }
	}
}

async function pollDogecoin(): Promise<PollResult> {
	const chain = 'dogecoin-testnet'
	try {
		const res = await fetch(
			`https://api.tatum.io/v3/dogecoin/transaction/address/${DOGE_ADDRESS}?pageSize=50`,
			{ headers: { 'x-api-key': TATUM_API_KEY } }
		)
		if (!res.ok) {
			return { chain, fetched: 0, newBlocks: 0, error: `HTTP ${res.status}` }
		}

		const transactions = await res.json()
		interface DogeInput { prevout: { hash: string; index: number } }
		interface DogeOutput { value: string; address: string }
		interface DogeTx { hash: string; block: string; blockNumber: number; time: number; inputs: DogeInput[]; outputs: DogeOutput[] }

		const coinbaseTxs = (transactions as DogeTx[]).filter((tx) => {
			if (!tx.inputs || tx.inputs.length === 0) return false
			const firstInput = tx.inputs[0]
			return firstInput.prevout.hash === '' && firstInput.prevout.index === 4294967295
		})

		let newBlocks = 0
		for (const tx of coinbaseTxs) {
			if (await blockExists(tx.block)) continue

			const firstOutput = tx.outputs.find(
				(out) => out.address.toLowerCase() === DOGE_ADDRESS.toLowerCase()
			) || tx.outputs[0]

			const block: MinedBlock = {
				blockHash: tx.block,
				blockHeight: tx.blockNumber,
				blockTime: tx.time,
				reward: parseFloat(firstOutput?.value || '0') / 100000000,
				coinbaseTxid: tx.hash,
				chain
			}

			await insertMinedBlock(block)
			newBlocks++
		}

		return { chain, fetched: coinbaseTxs.length, newBlocks }
	} catch (error) {
		return { chain, fetched: 0, newBlocks: 0, error: String(error) }
	}
}

async function pollLitecoin(): Promise<PollResult> {
	const chain = 'litecoin-testnet'
	try {
		const res = await fetch(
			`https://litecoinspace.org/testnet/api/address/${LTC_ADDRESS}/txs`
		)
		if (!res.ok) {
			return { chain, fetched: 0, newBlocks: 0, error: `HTTP ${res.status}` }
		}

		const transactions = await res.json()
		interface LtcVin { is_coinbase: boolean }
		interface LtcVout { value: number; scriptpubkey_address?: string }
		interface LtcTx { txid: string; status: { block_hash: string; block_height: number; block_time: number }; vin: LtcVin[]; vout: LtcVout[] }

		const coinbaseTxs = (transactions as LtcTx[]).filter(
			(tx) => tx.vin.length > 0 && tx.vin[0].is_coinbase === true
		)

		let newBlocks = 0
		for (const tx of coinbaseTxs) {
			if (await blockExists(tx.status.block_hash)) continue

			const firstOutput = tx.vout.find(
				(out) => out.scriptpubkey_address?.toLowerCase() === LTC_ADDRESS.toLowerCase()
			) || tx.vout[0]

			const block: MinedBlock = {
				blockHash: tx.status.block_hash,
				blockHeight: tx.status.block_height,
				blockTime: tx.status.block_time,
				reward: (firstOutput?.value || 0) / 100000000,
				coinbaseTxid: tx.txid,
				chain
			}

			await insertMinedBlock(block)
			newBlocks++
		}

		return { chain, fetched: coinbaseTxs.length, newBlocks }
	} catch (error) {
		return { chain, fetched: 0, newBlocks: 0, error: String(error) }
	}
}

export async function GET() {
	try {
		// Poll all chains and fetch prices in parallel
		const [rvnResult, bchResult, dogeResult, ltcResult, prices] = await Promise.all([
			pollRavencoin(),
			pollBitcoinCash(),
			pollDogecoin(),
			pollLitecoin(),
			fetchAndStorePrices()
		])

		const results = [rvnResult, bchResult, dogeResult, ltcResult]
		const totalNew = results.reduce((sum, r) => sum + r.newBlocks, 0)

		return NextResponse.json({
			success: true,
			timestamp: new Date().toISOString(),
			totalNewBlocks: totalNew,
			results,
			prices
		})
	} catch (error) {
		console.error('Cron poll failed:', error)
		return NextResponse.json(
			{ success: false, error: String(error) },
			{ status: 500 }
		)
	}
}
