import { NextResponse } from 'next/server'

interface TatumBCashVin {
	coinbase?: string
	txid?: string
	vout?: number
	sequence: number
}

interface TatumBCashVout {
	value: number
	n: number
	scriptPubKey: {
		asm: string
		hex: string
		reqSigs: number
		type: string
		addresses: string[]
	}
}

interface TatumBCashTransaction {
	txid: string
	hash: string
	version: number
	size: number
	locktime: number
	vin: TatumBCashVin[]
	vout: TatumBCashVout[]
	hex: string
	blockhash: string
	confirmations: number
	time: number
	blocktime: number
	blockheight: number
}

export interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
}

const TATUM_API_KEY = 't-69277b10ac7d22f05b88e70b-86945e0006ae4a298772dc0c'
const ADDRESS = 'bchtest:qq2mudwqwfcel7aah0jcew5cp9twkjsv5y68ep4jl6'

export async function GET() {
	try {
		const res = await fetch(
			`https://api.tatum.io/v3/bcash/transaction/address/${ADDRESS}?pageSize=10&offset=0`,
			{
				headers: {
					'x-api-key': TATUM_API_KEY
				}
			}
		)
		const data: TatumBCashTransaction[] = await res.json()

		// Map to MinedBlock format
		const blocks: MinedBlock[] = data
			.filter((tx) => tx.vin.length > 0 && 'coinbase' in tx.vin[0] && !!tx.vin[0].coinbase)
			.map((tx) => {
				const firstOutput = tx.vout[0]
				const reward = firstOutput?.value || 0

				return {
					blockHash: tx.blockhash,
					blockHeight: tx.blockheight,
					blockTime: tx.blocktime,
					reward,
					coinbaseTxid: tx.txid
				}
			})

		return NextResponse.json({
			chain: 'bcash-testnet',
			address: ADDRESS,
			blocks
		})
	} catch (error) {
		console.error('Failed to fetch Bitcoin Cash transactions:', error)
		return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
	}
}
