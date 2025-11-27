import { NextResponse } from 'next/server'
import { getMinedBlocks, getPrices } from '@/lib/db'

export async function GET(request: Request) {
	try {
		// Check for chain filter
		const { searchParams } = new URL(request.url)
		const chain = searchParams.get('chain')

		// Fetch blocks and prices from database in parallel
		const [blocks, prices] = await Promise.all([
			getMinedBlocks(chain || undefined),
			getPrices()
		])

		return NextResponse.json({
			blocks,
			count: blocks.length,
			prices
		})
	} catch (error) {
		console.error('Failed to fetch blocks from database:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch blocks', blocks: [], prices: {} },
			{ status: 500 }
		)
	}
}
