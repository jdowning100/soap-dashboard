import { NextResponse } from 'next/server'

interface TatumDogeInput {
	prevout: {
		hash: string
		index: number
	}
	sequence: number
	script: string
	address: string | null
}

interface TatumDogeOutput {
	value: string
	script: string
	address: string
	scriptPubKey: {
		type: string
		reqSigs: number
	}
}

interface TatumDogeTransaction {
	blockNumber: number
	fee: string
	hash: string
	index: number
	inputs: TatumDogeInput[]
	locktime: number
	outputs: TatumDogeOutput[]
	size: number
	time: number
	version: number
	vsize: number
	witnessHash: string
	block: string
}

export interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
}

const TATUM_API_KEY = 't-69277b10ac7d22f05b88e70b-86945e0006ae4a298772dc0c'
const ADDRESS = 'ndWSGfKCsDFadmMvfdSV6Dj2WFYgPkXnLm'

export async function GET() {
	try {
		const res = await fetch(
			`https://api.tatum.io/v3/dogecoin/transaction/address/${ADDRESS}?pageSize=10&offset=0`,
			{
				headers: {
					'x-api-key': TATUM_API_KEY
				}
			}
		)
		const data: TatumDogeTransaction[] = await res.json()

		// Map to MinedBlock format (filter for coinbase transactions only)
		const blocks: MinedBlock[] = data
			.filter(
				(tx) =>
					tx.inputs.length > 0 &&
					tx.inputs[0].prevout.hash === '' &&
					tx.inputs[0].prevout.index === 4294967295
			)
			.map((tx) => {
				const firstOutput = tx.outputs[0]
				// Dogecoin Tatum API returns value as string in satoshis
				const reward = firstOutput ? parseFloat(firstOutput.value) / 100000000 : 0

				return {
					blockHash: tx.block,
					blockHeight: tx.blockNumber,
					blockTime: tx.time,
					reward,
					coinbaseTxid: tx.hash
				}
			})

		return NextResponse.json({
			chain: 'dogecoin-testnet',
			address: ADDRESS,
			blocks
		})
	} catch (error) {
		console.error('Failed to fetch Dogecoin transactions:', error)
		return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
	}
}
