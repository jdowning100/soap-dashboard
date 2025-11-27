import { NextResponse } from 'next/server'

interface EsploraVin {
	txid: string
	vout: number
	prevout: null | {
		scriptpubkey: string
		scriptpubkey_asm: string
		scriptpubkey_type: string
		scriptpubkey_address: string
		value: number
	}
	scriptsig: string
	scriptsig_asm: string
	witness?: string[]
	is_coinbase: boolean
	sequence: number
}

interface EsploraVout {
	scriptpubkey: string
	scriptpubkey_asm: string
	scriptpubkey_type: string
	scriptpubkey_address?: string
	value: number
}

interface EsploraTransaction {
	txid: string
	version: number
	locktime: number
	vin: EsploraVin[]
	vout: EsploraVout[]
	size: number
	weight: number
	fee: number
	status: {
		confirmed: boolean
		block_height: number
		block_hash: string
		block_time: number
	}
}

export interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
}

const ADDRESS = 'tltc1qxj48dsj9wkyr8j6p30x2k8wq88z9tdtra6xewg'

export async function GET() {
	try {
		const res = await fetch(
			`https://litecoinspace.org/testnet/api/address/${ADDRESS}/txs`
		)
		const data: EsploraTransaction[] = await res.json()

		// Map to MinedBlock format (filter for coinbase transactions only)
		const blocks: MinedBlock[] = data
			.filter((tx) => tx.vin.length > 0 && tx.vin[0].is_coinbase === true)
			.map((tx) => {
				// Get the first non-OP_RETURN output value
				const firstOutput = tx.vout.find(
					(out) => out.scriptpubkey_type !== 'op_return'
				)
				// Esplora API returns value in satoshis
				const reward = firstOutput ? firstOutput.value / 100000000 : 0

				return {
					blockHash: tx.status.block_hash,
					blockHeight: tx.status.block_height,
					blockTime: tx.status.block_time,
					reward,
					coinbaseTxid: tx.txid
				}
			})

		return NextResponse.json({
			chain: 'litecoin-testnet',
			address: ADDRESS,
			blocks
		})
	} catch (error) {
		console.error('Failed to fetch Litecoin transactions:', error)
		return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
	}
}
