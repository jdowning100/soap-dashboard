'use client'

import {
	CHAIN_COLORS,
	CHAIN_LOGOS,
	CHAIN_SYMBOLS,
	getBlockExplorerUrl
} from '@/lib/chains'

// Use shorter display names for the table
const CHAIN_DISPLAY_NAMES: Record<string, string> = {
	'ravencoin-testnet': 'Ravencoin',
	'bcash-testnet': 'Bitcoin Cash',
	'dogecoin-testnet': 'Dogecoin',
	'litecoin-testnet': 'Litecoin'
}

interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
	chain: string
}

interface BlocksTableProps {
	blocks: MinedBlock[]
	prices: Record<string, number>
}

export default function BlocksTable({ blocks, prices }: BlocksTableProps) {
	const formatDate = (timestamp: number) => {
		const date = new Date(timestamp * 1000)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	const truncateHash = (hash: string) => {
		if (hash.length <= 16) return hash
		return `${hash.slice(0, 8)}...${hash.slice(-8)}`
	}

	// Calculate analytics
	const now = Date.now() / 1000
	const twentyFourHoursAgo = now - 24 * 60 * 60

	const totalRevenue = blocks.reduce((sum, block) => {
		const price = prices[block.chain] || 0
		return sum + block.reward * price
	}, 0)

	const revenue24h = blocks
		.filter(block => block.blockTime >= twentyFourHoursAgo)
		.reduce((sum, block) => {
			const price = prices[block.chain] || 0
			return sum + block.reward * price
		}, 0)

	const ravencoinBlocks = blocks.filter(b => b.chain === 'ravencoin-testnet').length
	const litecoinBlocks = blocks.filter(b => b.chain === 'litecoin-testnet').length
	const dogecoinBlocks = blocks.filter(b => b.chain === 'dogecoin-testnet').length
	const bitcoinCashBlocks = blocks.filter(b => b.chain === 'bcash-testnet').length

	return (
		<div className="blocks-table-container">
			<style jsx>{`
				.blocks-table-container {
					width: 100%;
					max-width: 1400px;
					margin: 0 auto;
					padding: 0 20px;
				}

				.table-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 30px;
				}

				.table-title {
					font-family: 'YapariSemBd', sans-serif;
					font-size: 32px;
					color: #fff;
					text-transform: uppercase;
					letter-spacing: -0.02em;
				}

				.table-subtitle {
					font-family: 'Monorama', monospace;
					font-size: 14px;
					color: #a1a1a1;
					text-transform: uppercase;
					margin-top: 8px;
				}

				.blocks-table {
					width: 100%;
					border-collapse: collapse;
				}

				.blocks-table thead {
					border-bottom: 1px solid #393939;
				}

				.blocks-table th {
					font-family: 'Monorama', monospace;
					font-size: 12px;
					color: #a1a1a1;
					text-transform: uppercase;
					text-align: left;
					padding: 12px 16px;
					font-weight: 400;
					letter-spacing: 0.05em;
				}

				.blocks-table tbody tr {
					border-bottom: 1px solid #1a1a1a;
					cursor: pointer;
					transition: background-color 0.15s ease;
				}

				.blocks-table tbody tr:hover {
					background-color: rgba(226, 1, 1, 0.1);
				}

				.blocks-table td {
					font-family: 'Monorama', monospace;
					font-size: 14px;
					color: #fff;
					padding: 16px;
					vertical-align: middle;
				}

				.chain-badge {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 4px 10px;
					border-radius: 4px;
					font-size: 12px;
					text-transform: uppercase;
				}

				.chain-logo {
					width: 20px;
					height: 20px;
					border-radius: 50%;
					object-fit: cover;
				}

				.block-height {
					color: #fbdc77;
					font-weight: 600;
				}

				.block-hash {
					color: #a1a1a1;
					font-size: 12px;
				}

				.reward-amount {
					color: #fff;
				}

				.reward-usd {
					color: #4ade80;
					font-size: 12px;
					margin-left: 8px;
				}

				.block-time {
					color: #878787;
					font-size: 12px;
				}

				.view-link {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					color: #a1a1a1;
					font-size: 12px;
					text-transform: uppercase;
					transition: color 0.15s ease;
				}

				.blocks-table tbody tr:hover .view-link {
					color: #e20101;
				}

				.arrow-icon {
					width: 12px;
					height: 12px;
					transition: transform 0.15s ease;
				}

				.blocks-table tbody tr:hover .arrow-icon {
					transform: translateX(4px);
				}

				.empty-state {
					text-align: center;
					padding: 60px 20px;
					color: #a1a1a1;
					font-family: 'Monorama', monospace;
				}

				.analytics-grid {
					display: grid;
					grid-template-columns: repeat(6, 1fr);
					gap: 16px;
					margin-bottom: 40px;
				}

				.analytics-card {
					background: rgba(255, 255, 255, 0.03);
					border: 1px solid #1a1a1a;
					border-radius: 8px;
					padding: 20px;
				}

				.analytics-card--highlight {
					border-color: #4ade80;
					background: rgba(74, 222, 128, 0.05);
				}

				.analytics-label {
					font-family: 'Monorama', monospace;
					font-size: 11px;
					color: #878787;
					text-transform: uppercase;
					letter-spacing: 0.05em;
					margin-bottom: 8px;
				}

				.analytics-value {
					font-family: 'YapariSemBd', sans-serif;
					font-size: 24px;
					color: #fff;
					letter-spacing: -0.02em;
				}

				.analytics-value--green {
					color: #4ade80;
				}

				.analytics-chain-icon {
					width: 16px;
					height: 16px;
					border-radius: 50%;
					margin-right: 6px;
					vertical-align: middle;
				}

				@media (max-width: 1200px) {
					.analytics-grid {
						grid-template-columns: repeat(3, 1fr);
					}
				}

				@media (max-width: 768px) {
					.analytics-grid {
						grid-template-columns: repeat(2, 1fr);
					}

					.blocks-table th:nth-child(3),
					.blocks-table td:nth-child(3) {
						display: none;
					}

					.blocks-table th,
					.blocks-table td {
						padding: 12px 8px;
						font-size: 12px;
					}

					.table-title {
						font-size: 24px;
					}

					.analytics-value {
						font-size: 18px;
					}
				}
			`}</style>

			<div className="table-header">
				<div>
					<h2 className="table-title">Mined Blocks</h2>
					<p className="table-subtitle">{blocks.length} blocks across all chains</p>
				</div>
			</div>

			{/* Analytics Cards */}
			<div className="analytics-grid">
				<div className="analytics-card analytics-card--highlight">
					<div className="analytics-label">Total Revenue</div>
					<div className="analytics-value analytics-value--green">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
				</div>
				<div className="analytics-card analytics-card--highlight">
					<div className="analytics-label">24h Revenue</div>
					<div className="analytics-value analytics-value--green">${revenue24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
				</div>
				<div className="analytics-card">
					<div className="analytics-label">
						<img src="/ravencoin.webp" alt="RVN" className="analytics-chain-icon" />
						Ravencoin
					</div>
					<div className="analytics-value">{ravencoinBlocks.toLocaleString()}</div>
				</div>
				<div className="analytics-card">
					<div className="analytics-label">
						<img src="/litecoin.webp" alt="LTC" className="analytics-chain-icon" />
						Litecoin
					</div>
					<div className="analytics-value">{litecoinBlocks.toLocaleString()}</div>
				</div>
				<div className="analytics-card">
					<div className="analytics-label">
						<img src="/dogecoin.webp" alt="DOGE" className="analytics-chain-icon" />
						Dogecoin
					</div>
					<div className="analytics-value">{dogecoinBlocks.toLocaleString()}</div>
				</div>
				<div className="analytics-card">
					<div className="analytics-label">
						<img src="/bitcoin-cash-circle.webp" alt="BCH" className="analytics-chain-icon" />
						Bitcoin Cash
					</div>
					<div className="analytics-value">{bitcoinCashBlocks.toLocaleString()}</div>
				</div>
			</div>

			{blocks.length === 0 ? (
				<div className="empty-state">
					<p>No blocks mined yet</p>
				</div>
			) : (
				<table className="blocks-table">
					<thead>
						<tr>
							<th>Chain</th>
							<th>Block</th>
							<th>Hash</th>
							<th>Reward</th>
							<th>Time</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{blocks.map((block, index) => {
							const chainName = CHAIN_DISPLAY_NAMES[block.chain] || block.chain
							const symbol = CHAIN_SYMBOLS[block.chain] || ''
							const chainColor = CHAIN_COLORS[block.chain] || '#fff'
							const chainLogo = CHAIN_LOGOS[block.chain] || ''
							const price = prices[block.chain] || 0
							const usdValue = price > 0 ? (block.reward * price).toFixed(2) : null
							const explorerUrl = getBlockExplorerUrl(block.chain, block.blockHash)

							return (
								<tr
									key={`${block.chain}-${block.blockHeight}-${index}`}
									onClick={() => window.open(explorerUrl, '_blank')}
								>
									<td>
										<span className="chain-badge" style={{ backgroundColor: `${chainColor}20` }}>
											{chainLogo && <img src={chainLogo} alt={chainName} className="chain-logo" />}
											{chainName}
										</span>
									</td>
									<td>
										<span className="block-height">#{block.blockHeight}</span>
									</td>
									<td>
										<span className="block-hash">{truncateHash(block.blockHash)}</span>
									</td>
									<td>
										<span className="reward-amount">{block.reward} {symbol}</span>
										{usdValue && <span className="reward-usd">(${usdValue})</span>}
									</td>
									<td>
										<span className="block-time">{formatDate(block.blockTime)}</span>
									</td>
									<td>
										<span className="view-link">
											View
											<svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
												<path d="M5 12h14M12 5l7 7-7 7" />
											</svg>
										</span>
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
		</div>
	)
}
