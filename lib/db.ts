import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Track initialization state
let isInitialized = false
let initPromise: Promise<void> | null = null

export interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
	chain: string
}

async function doInitialize() {
	await sql`
		CREATE TABLE IF NOT EXISTS mined_blocks (
			block_hash TEXT PRIMARY KEY,
			block_height INTEGER NOT NULL,
			block_time INTEGER NOT NULL,
			reward DECIMAL(20, 8) NOT NULL,
			coinbase_txid TEXT NOT NULL,
			chain TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`

	// Create index on chain for efficient filtering
	await sql`
		CREATE INDEX IF NOT EXISTS idx_mined_blocks_chain ON mined_blocks(chain)
	`

	// Create index on block_time for efficient sorting
	await sql`
		CREATE INDEX IF NOT EXISTS idx_mined_blocks_time ON mined_blocks(block_time DESC)
	`

	// Create prices table
	await sql`
		CREATE TABLE IF NOT EXISTS token_prices (
			chain TEXT PRIMARY KEY,
			price_usd DECIMAL(20, 8) NOT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`
}

export async function initializeDatabase() {
	// Already initialized
	if (isInitialized) return

	// Initialization in progress - wait for it
	if (initPromise) {
		await initPromise
		return
	}

	// Start initialization
	initPromise = doInitialize()
	await initPromise
	isInitialized = true
}

export async function getMinedBlocks(chain?: string): Promise<MinedBlock[]> {
	if (chain) {
		const rows = await sql`
			SELECT block_hash, block_height, block_time, reward, coinbase_txid, chain
			FROM mined_blocks
			WHERE chain = ${chain}
			ORDER BY block_time DESC
		`
		return rows.map(rowToMinedBlock)
	}

	const rows = await sql`
		SELECT block_hash, block_height, block_time, reward, coinbase_txid, chain
		FROM mined_blocks
		ORDER BY block_time DESC
	`
	return rows.map(rowToMinedBlock)
}

export async function insertMinedBlock(block: MinedBlock): Promise<boolean> {
	try {
		await sql`
			INSERT INTO mined_blocks (block_hash, block_height, block_time, reward, coinbase_txid, chain)
			VALUES (${block.blockHash}, ${block.blockHeight}, ${block.blockTime}, ${block.reward}, ${block.coinbaseTxid}, ${block.chain})
			ON CONFLICT (block_hash) DO NOTHING
		`
		return true
	} catch (error) {
		console.error('Failed to insert block:', error)
		return false
	}
}

export async function insertMinedBlocks(blocks: MinedBlock[]): Promise<number> {
	let inserted = 0
	for (const block of blocks) {
		const success = await insertMinedBlock(block)
		if (success) inserted++
	}
	return inserted
}

export async function blockExists(blockHash: string): Promise<boolean> {
	const result = await sql`
		SELECT 1 FROM mined_blocks WHERE block_hash = ${blockHash} LIMIT 1
	`
	return result.length > 0
}

function rowToMinedBlock(row: Record<string, unknown>): MinedBlock {
	return {
		blockHash: row.block_hash as string,
		blockHeight: row.block_height as number,
		blockTime: row.block_time as number,
		reward: parseFloat(row.reward as string),
		coinbaseTxid: row.coinbase_txid as string,
		chain: row.chain as string
	}
}

// Price functions
export async function getPrices(): Promise<Record<string, number>> {
	const rows = await sql`
		SELECT chain, price_usd FROM token_prices
	`
	const prices: Record<string, number> = {}
	for (const row of rows) {
		prices[row.chain as string] = parseFloat(row.price_usd as string)
	}
	return prices
}

export async function upsertPrice(chain: string, priceUsd: number): Promise<void> {
	await sql`
		INSERT INTO token_prices (chain, price_usd, updated_at)
		VALUES (${chain}, ${priceUsd}, CURRENT_TIMESTAMP)
		ON CONFLICT (chain) DO UPDATE SET
			price_usd = ${priceUsd},
			updated_at = CURRENT_TIMESTAMP
	`
}
