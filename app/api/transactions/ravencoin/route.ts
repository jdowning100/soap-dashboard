import { NextResponse } from 'next/server'

interface RavencoinTransaction {
	tx_time: number
	block_ix: number
	txid: string
	amount: string
	is_reward: boolean
}

export interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
}

const ADDRESS = 'mvwrYV23K5ZB2DFXjaiNHkB66j97gnRorK'
const RPC_URL = 'http://34.133.26.97:18766/'
const RPC_USER = 'ravencoinrpc'
const RPC_PASS = 'yourStrongPasswordHere'

async function rpcCall(method: string, params: unknown[] = []): Promise<unknown> {
	const res = await fetch(RPC_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
			Authorization: 'Basic ' + Buffer.from(`${RPC_USER}:${RPC_PASS}`).toString('base64')
		},
		body: JSON.stringify({
			jsonrpc: '1.0',
			id: 'ravencoin-api',
			method,
			params
		})
	})
	const data = await res.json()
	if (data.error) {
		throw new Error(data.error.message)
	}
	return data.result
}

async function fetchBlockHash(blockHeight: number): Promise<string> {
	return (await rpcCall('getblockhash', [blockHeight])) as string
}

export async function GET() {
	try {
		const res = await fetch(
			`https://rvnt.cryptoscope.io/api/getaddress/?address=${ADDRESS}`
		)

		// Check if response is OK and is JSON
		const contentType = res.headers.get('content-type')
		if (!res.ok || !contentType?.includes('application/json')) {
			const text = await res.text()
			console.error('Cryptoscope API error:', text)
			return NextResponse.json(
				{ error: 'Cryptoscope API unavailable', chain: 'ravencoin-testnet', blocks: [] },
				{ status: 503 }
			)
		}

		const data = await res.json()

		// Filter for coinbase/reward transactions only
		const rewardTxs: RavencoinTransaction[] = (data.last_txs || []).filter(
			(tx: RavencoinTransaction) => tx.is_reward
		)

		// Fetch block hashes via RPC (in parallel)
		const blockHashes = await Promise.all(
			rewardTxs.map((tx) =>
				fetchBlockHash(tx.block_ix).catch(() => 'unknown')
			)
		)

		// Map to MinedBlock format
		const blocks: MinedBlock[] = rewardTxs.map((tx, index) => ({
			blockHash: blockHashes[index],
			blockHeight: tx.block_ix,
			blockTime: tx.tx_time,
			reward: parseFloat(tx.amount),
			coinbaseTxid: tx.txid
		}))

		return NextResponse.json({
			chain: 'ravencoin-testnet',
			address: ADDRESS,
			blocks
		})
	} catch (error) {
		console.error('Failed to fetch Ravencoin transactions:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch', chain: 'ravencoin-testnet', blocks: [] },
			{ status: 500 }
		)
	}
}
