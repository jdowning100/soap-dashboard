'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useRef } from 'react'
import BlocksTable from '@/components/BlocksTable'

// Dynamic import to avoid SSR issues with Three.js
const QuaiLogo = dynamic(() => import('@/components/QuaiLogo'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
      <div className="text-white">{/* Loading... */}</div>
    </div>
  ),
})

export const bchCoinbaseAddress = "qq2mudwqwfcel7aah0jcew5cp9twkjsv5y68ep4jl6"
export const dogcoinCoinbaseAddress = "ndWSGfKCsDFadmMvfdSV6Dj2WFYgPkXnLm"
export const rvnCoinbaseAddress = "mvwrYV23K5ZB2DFXjaiNHkB66j97gnRorK"
export const rvnAPIURL = "https://rvnt.cryptoscope.io/api/getaddress/?address=mvwrYV23K5ZB2DFXjaiNHkB66j97gnRorK"
export const ltcCoinbaseAddress = "tltc1qxj48dsj9wkyr8j6p30x2k8wq88z9tdtra6xewg"
export const litecoinAPIURL = "https://litecoinspace.org/testnet/api/address/tltc1qxj48dsj9wkyr8j6p30x2k8wq88z9tdtra6xewg/txs"

interface MinedBlock {
  blockHash: string
  blockHeight: number
  blockTime: number
  reward: number
  coinbaseTxid: string
  chain: string
}

export default function Home() {
  const [blocks, setBlocks] = useState<MinedBlock[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/blocks')
      .then(res => res.json())
      .then(data => {
        if (data.blocks && Array.isArray(data.blocks)) {
          setBlocks(data.blocks)
        }
        if (data.prices) {
          setPrices(data.prices)
        }
      })
      .catch(err => {
        console.error('Failed to fetch blocks:', err)
      })
  }, [])

  const scrollToTable = () => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <style jsx global>{`
        @font-face {
          font-family: 'YapariSemBd';
          src: url('/fonts/Yapari-SemiBold.woff2') format('woff2'),
               url('/fonts/Yapari-SemiBold.woff') format('woff');
          font-style: normal;
          font-weight: 600;
        }
        @font-face {
          font-family: 'Monorama';
          src: url('/fonts/Monorama-Regular.woff2') format('woff2'),
               url('/fonts/Monorama-Regular.woff') format('woff');
          font-weight: normal;
          font-style: normal;
        }

        html {
          scroll-behavior: smooth;
        }

        .nav-button {
          font-family: 'Monorama', monospace;
          color: #fff;
          text-decoration: none;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          line-height: 1.29;
          cursor: pointer;
          background: none;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          height: 30px;
          border-style: solid;
          border-width: 20px;
          border-image-source: url('/borders/border_button.svg');
          border-image-slice: 45% 40%;
          border-image-repeat: stretch;
          border-image-width: 50px 60px;
          transition: border-image-source 0.15s ease, color 0.15s ease;
        }

        .nav-button:hover {
          border-image-source: url('/borders/border_ressource_title.svg');
          color: #e20101;
        }

        .nav-button span {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          pointer-events: none;
        }

        .nav-button__icon {
          width: 19px;
          height: 19px;
        }

        .nav-button:hover .nav-button__icon path {
          stroke: #e20101;
        }
      `}</style>

      {/* Navigation Button - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <button className="nav-button" onClick={scrollToTable}>
          <span>
            View Blocks
            <svg className="nav-button__icon" width="19" height="19" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.0042 1.28293C10.6969 1.10759 10.32 1.10759 10.0127 1.28293L6.2582 3.42591C5.94638 3.60389 5.75391 3.93537 5.75391 4.2944V8.56059C5.75391 8.91962 5.94638 9.2511 6.2582 9.42908L10.0127 11.5721C10.32 11.7474 10.6969 11.7474 11.0042 11.5721L14.7587 9.42908C15.0705 9.2511 15.263 8.91962 15.263 8.56059V4.2944C15.263 3.93537 15.0705 3.60389 14.7587 3.42591L11.0042 1.28293Z" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M5.75391 3.71387L10.0214 6.15699C10.3298 6.33355 10.7088 6.33317 11.0168 6.156L15.263 3.71387" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M10.5078 11.8554L10.5188 6.44238" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M6.25068 9.42836C5.9435 9.25306 5.56657 9.25306 5.25939 9.42836L1.50484 11.571C1.19299 11.7489 1.00049 12.0804 1.00049 12.4395V16.7056C1.00049 17.0647 1.19296 17.3962 1.50478 17.5741L5.25933 19.7171C5.56654 19.8925 5.94353 19.8925 6.25074 19.7171L10.0053 17.5741C10.3171 17.3962 10.5096 17.0647 10.5096 16.7056V12.4395C10.5096 12.0804 10.3171 11.7489 10.0052 11.571L6.25068 9.42836Z" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M1.00049 11.8584L5.26758 14.3015C5.57598 14.4781 5.95492 14.4777 6.26298 14.3005L10.5096 11.8584" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M5.75488 19.9999L5.76586 14.5869" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M15.7409 9.42833C15.4337 9.25305 15.0568 9.25305 14.7496 9.42835L10.9951 11.571C10.6832 11.7489 10.4907 12.0804 10.4907 12.4395V16.7056C10.4907 17.0647 10.6832 17.3962 10.995 17.5741L14.7496 19.7171C15.0568 19.8925 15.4338 19.8925 15.741 19.7171L19.4959 17.5741C19.8078 17.3962 20.0003 17.0647 20.0003 16.7056V12.4395C20.0003 12.0805 19.8078 11.7489 19.4959 11.571L15.7409 9.42833Z" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M10.4907 11.8584L14.7583 14.3015C15.0667 14.4781 15.4456 14.4777 15.7536 14.3006L20.0003 11.8584" stroke="currentColor" strokeMiterlimit="10"/>
              <path d="M15.2461 19.9999L15.2566 14.5869" stroke="currentColor" strokeMiterlimit="10"/>
            </svg>
          </span>
        </button>
      </div>

      {/* Hero Section with 3D Logo */}
      <div className="relative min-h-screen bg-[#0a0a0a]">
        <QuaiLogo blocks={blocks} prices={prices} />

        {/* Overlay content */}
        <div className="absolute bottom-[10%] md:bottom-0 left-0 right-0 p-8 text-center">
          <h1 className="text-4xl font-bold text-white tracking-wider" style={{ fontFamily: 'YapariSemBd, sans-serif', letterSpacing: '-0.02em' }}>
            SOAP DASHBOARD
          </h1>
          <p className="mt-4 text-sm text-gray-400" style={{ fontFamily: 'YapariSemBd, sans-serif', letterSpacing: '-0.02em' }}>
            CONNECTING THE WORLD
          </p>

          {/* Scroll indicator */}
          <div className="mt-8 animate-bounce">
            <svg
              className="w-6 h-6 mx-auto text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Blocks Table Section */}
      <div ref={tableRef} className="min-h-screen bg-[#0a0a0a] py-20">
        <BlocksTable blocks={blocks} prices={prices} />
      </div>
    </>
  )
}
