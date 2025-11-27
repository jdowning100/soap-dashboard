'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import gsap, { Elastic } from 'gsap'
import * as THREE from 'three'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import {
	CHAIN_DISPLAY_NAMES,
	CHAIN_SYMBOLS,
	getBlockExplorerUrl
} from '@/lib/chains'

// Types
interface MinedBlock {
	blockHash: string
	blockHeight: number
	blockTime: number
	reward: number
	coinbaseTxid: string
	chain: string
}

interface HoverInfo {
	block: MinedBlock
	x: number
	y: number
}

const logoVertexShader = `
varying vec2 vUv;
varying vec4 vColor;
varying float vDistance;
varying vec3 vWorldPosition;

uniform float uTime;
uniform float uProgress;
uniform float uRadius;
uniform float uDistortion;
uniform vec3 uMousePos;

float map(float value, float min1, float max1, float min2, float max2) {
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main()    {
    vUv = uv;
    vColor = color;

    vec3 startPos = vec3(0., 0., 0.);
    vec3 finalPos = position;
    float delay = color.r;

    // Map tween progress
    float mapProgress = map(uProgress, 0., 1., 0., 2.);

    // Stagger using a color channel
    float stag = mapProgress - color.r;
    float am = uProgress * clamp(stag, 0., 1.);

    vec3 interactPos = (modelMatrix * vec4(position.xyz, 1.0)).xyz;

    // Mouse interaction (magic here)
    vec3 mouseDir = normalize(uMousePos - cameraPosition);
    vec3 camToWorld = interactPos - cameraPosition;
    float distFromCam = dot(camToWorld, mouseDir);
    vec3 p = interactPos - (cameraPosition + distFromCam * mouseDir);
    float dist = length(p);
    vec3 dir = p / dist;

    // Create the mouse radius
    dist = clamp(dist, 0., uRadius);
    vDistance = dist;
    vWorldPosition = (modelMatrix * vec4(position, 1.)).xyz;

    // Mouse distortion
    float distortion = map(dist, 0., uRadius, uDistortion, 0.);

    // Create value to mix between start and finish
    float value = am;

    // Animate using value
    vec3 transformedPosition = mix(startPos, finalPos, am);

    // Overlay with mouse interaction
    transformedPosition += dir * distortion;
    // transformedPosition += (1. - smoothstep(-0.75, 0.75, d + 0.1)) * dir;

    float pulse = map(cos(uTime + color.r * 2.), -1., 1., 0., 1.);
    transformedPosition.xy = mix(transformedPosition.xy, transformedPosition.xy * 1.07, pulse);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformedPosition, 1.0);
}
`

const logoFragmentShader = `
varying vec2 vUv;
varying vec4 vColor;
varying float vDistance;
varying vec3 vWorldPosition;

uniform float uTime;
uniform float uProgress;
uniform sampler2D uDiffuse;
uniform float uTexScale;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColorHover;
uniform float uColorStrength;
uniform float uColorSpeed;
uniform float uColorAmplitude;

//	Classic Perlin 3D Noise
//	by Stefan Gustavson
//
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P){
	vec3 Pi0 = floor(P);// Integer part for indexing
	vec3 Pi1 = Pi0 + vec3(1.0);// Integer part + 1
	Pi0 = mod(Pi0, 289.0);
	Pi1 = mod(Pi1, 289.0);
	vec3 Pf0 = fract(P);// Fractional part for interpolation
	vec3 Pf1 = Pf0 - vec3(1.0);// Fractional part - 1.0
	vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
	vec4 iy = vec4(Pi0.yy, Pi1.yy);
	vec4 iz0 = Pi0.zzzz;
	vec4 iz1 = Pi1.zzzz;

	vec4 ixy = permute(permute(ix) + iy);
	vec4 ixy0 = permute(ixy + iz0);
	vec4 ixy1 = permute(ixy + iz1);

	vec4 gx0 = ixy0 / 7.0;
	vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
	gx0 = fract(gx0);
	vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
	vec4 sz0 = step(gz0, vec4(0.0));
	gx0 -= sz0 * (step(0.0, gx0) - 0.5);
	gy0 -= sz0 * (step(0.0, gy0) - 0.5);

	vec4 gx1 = ixy1 / 7.0;
	vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
	gx1 = fract(gx1);
	vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
	vec4 sz1 = step(gz1, vec4(0.0));
	gx1 -= sz1 * (step(0.0, gx1) - 0.5);
	gy1 -= sz1 * (step(0.0, gy1) - 0.5);

	vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
	vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
	vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
	vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
	vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
	vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
	vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
	vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

	vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
	g000 *= norm0.x;
	g010 *= norm0.y;
	g100 *= norm0.z;
	g110 *= norm0.w;
	vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
	g001 *= norm1.x;
	g011 *= norm1.y;
	g101 *= norm1.z;
	g111 *= norm1.w;

	float n000 = dot(g000, Pf0);
	float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
	float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
	float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
	float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
	float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
	float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
	float n111 = dot(g111, Pf1);

	vec3 fade_xyz = fade(Pf0);
	vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
	vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
	float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
	return 2.2 * n_xyz;
}

void main() {
	vec4 texture = texture2D(uDiffuse, vUv * uTexScale);

	vec3 finalColor = mix(uColor1, uColor2, vColor.r) + uColorStrength;
	texture.rgb += cos(uTime * finalColor.r * uColorSpeed) * uColorAmplitude;

	float noise = cnoise(vec3(vWorldPosition.xy * 8., uTime * 0.5));
	noise = clamp(0.6 + noise * .3, 0., 1.);
	float circle = smoothstep(noise, noise + 0.3, vDistance);
	finalColor = mix(uColorHover, finalColor, circle);
	float alpha = mix(1., texture.r, circle);

	// Avoid having some fragments staying after we revert the progress (because of mouse distortion)
	float transparency = step(0.1, uProgress);

	gl_FragColor = vec4(finalColor, alpha * transparency);
}
`

// Simplified glow shader (fog is unused in the standalone logo)
const glowVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    vec3 objectNormal = vec3(normal);
    vec3 transformedNormal = normalMatrix * objectNormal;
    vNormal = transformedNormal;
    vUv = uv;

    vec3 transformedPosition = position;

    vec4 mvPosition = vec4(transformedPosition, 1.0);
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;
    vViewPosition = -mvPosition.xyz;
}
`

const glowFragmentShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform float uScale;

float circle(in vec2 _st, in float _radius){
    vec2 dist = _st-vec2(0.5);
	return 1.-smoothstep(_radius-(_radius*uInnerRadius),
                         _radius+(_radius*uOuterRadius),
                         dot(dist,dist)*4.);
}

void main() {
  gl_FragColor = vec4(uColor, circle(vUv, uScale) * uOpacity);
}
`

function createFallbackTexture(): THREE.Texture {
	const data = new Uint8Array([255, 255, 255, 255])
	const tex = new THREE.DataTexture(data, 1, 1)
	tex.needsUpdate = true
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping
	return tex as THREE.Texture
}

interface LogoVisualProps {
	blocks: MinedBlock[]
	onHover: (info: HoverInfo | null) => void
}

function LogoVisual({ blocks, onHover }: LogoVisualProps) {
	const meshRef = useRef<THREE.Mesh>(null)
	const glowRef = useRef<THREE.Mesh>(null)
	const currentPointer = useRef(new THREE.Vector2())
	const targetPointer = useRef(new THREE.Vector2())
	const tempVec = useRef(new THREE.Vector3())
	const mouseVec = useRef(new THREE.Vector3())
	const raycaster = useRef(new THREE.Raycaster())
	const [logoTexture, setLogoTexture] = useState<THREE.Texture | null>(null)
	const [isMobile, setIsMobile] = useState(false)

	const { scene } = useGLTF('/models/logo.glb')
	const { camera, gl, size } = useThree()

	// Detect mobile based on viewport width
	useEffect(() => {
		setIsMobile(size.width < 768)
	}, [size.width])

	useEffect(() => {
		let mounted = true
		const loader = new KTX2Loader()
		loader.setTranscoderPath('/basis/')
		try {
			loader.detectSupport(gl)
		} catch (err) {
			console.error('KTX2 detectSupport failed', err)
			if (mounted) setLogoTexture(createFallbackTexture())
			return
		}

		const onError = (err?: unknown) => {
			console.error('KTX2 load error', err)
			if (!mounted) return
			setLogoTexture(createFallbackTexture())
		}

			loader.load(
				'/webgl/images/logo/logo-hex.ktx2',
				(tex) => {
					if (!mounted) return
					tex.wrapS = tex.wrapT = THREE.RepeatWrapping
					setLogoTexture(tex)
				},
				undefined,
				onError
			)

		return () => {
			mounted = false
			loader.dispose()
		}
	}, [gl])

	const geometry = useMemo(() => {
		const mesh = scene.children[0] as THREE.Mesh
		const geo = mesh.geometry.clone()
		return geo
	}, [scene])

	const logoUniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uProgress: { value: 0 },
			uDiffuse: { value: createFallbackTexture() },
			uTexScale: { value: 9 },
			uMousePos: { value: new THREE.Vector3(10, 10, 0) },
			uRadius: { value: 1.5 },
			uDistortion: { value: 0.07 },
			uColor1: { value: new THREE.Color(0xac1b00) },
			uColor2: { value: new THREE.Color(0xfbdc77) },
			uColorHover: { value: new THREE.Color(0xFFFF66) },
			uColorStrength: { value: 0 },
			uColorSpeed: { value: 2 },
			uColorAmplitude: { value: 0.2 }
		}),
		[]
	)

	// Update texture when loaded
	useEffect(() => {
		if (logoTexture) {
			logoUniforms.uDiffuse.value = logoTexture as THREE.Texture
		}
	}, [logoTexture, logoUniforms])

	const glowUniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uColor: { value: new THREE.Color(0xff1400) },
			uOpacity: { value: 0.53 },
			uInnerRadius: { value: 1.99 },
			uOuterRadius: { value: 1.67 },
			uScale: { value: 0.36 }
		}),
		[]
	)

	useEffect(() => {
		camera.position.set(0, 4, 13.75)
		camera.lookAt(0, 6.6, 0)
	}, [camera])

	useEffect(() => {
		if (!glowRef.current) return

		const tl = gsap.timeline({
			defaults: {
				duration: 5,
				ease: Elastic.easeOut.config(0.57, 0.4)
			}
		})

		tl.fromTo(
			logoUniforms.uProgress,
			{ value: 0 },
			{ value: 1 }
		)
		.fromTo(
			glowRef.current.scale,
			{ x: 0, y: 0, z: 0 },
			{ x: 9.68, y: 9.68, z: 9.68 },
			0
		)
		.fromTo(
			glowUniforms.uOpacity,
			{ value: 0 },
			{ value: 0.53 },
			0
		)

		return () => {
			tl.kill()
		}
	}, [glowUniforms, logoUniforms])

	// Handle pointer move for raycasting
	const handlePointerMove = useCallback((event: THREE.Event) => {
		if (!meshRef.current || blocks.length === 0) return

		const e = event as unknown as { clientX: number; clientY: number }
		const rect = gl.domElement.getBoundingClientRect()
		const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
		const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

		raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera)
		const intersects = raycaster.current.intersectObject(meshRef.current)

		if (intersects.length > 0) {
			const hit = intersects[0]
			const face = hit.face
			if (face && geometry.attributes.color) {
				const colors = geometry.attributes.color
				// Get average color of the hit face vertices
				const colorR = (
					colors.getX(face.a) +
					colors.getX(face.b) +
					colors.getX(face.c)
				) / 3

				// Map color to block index based on number of blocks
				const numBuckets = blocks.length
				const blockIndex = Math.min(
					Math.floor(colorR * numBuckets),
					numBuckets - 1
				)
				const block = blocks[blockIndex]

				onHover({
					block,
					x: e.clientX,
					y: e.clientY
				})
			}
		} else {
			onHover(null)
		}
	}, [camera, geometry, gl.domElement, onHover, blocks])

	const handlePointerLeave = useCallback(() => {
		onHover(null)
	}, [onHover])

	// Handle click/tap - mobile shows modal, desktop opens explorer
	const handleClick = useCallback((event: THREE.Event) => {
		if (!meshRef.current || blocks.length === 0) return

		const e = event as unknown as { clientX: number; clientY: number }
		const rect = gl.domElement.getBoundingClientRect()
		const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
		const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

		raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera)
		const intersects = raycaster.current.intersectObject(meshRef.current)

		if (intersects.length > 0) {
			const hit = intersects[0]
			const face = hit.face
			if (face && geometry.attributes.color) {
				const colors = geometry.attributes.color
				const colorR = (
					colors.getX(face.a) +
					colors.getX(face.b) +
					colors.getX(face.c)
				) / 3

				const numBuckets = blocks.length
				const blockIndex = Math.min(
					Math.floor(colorR * numBuckets),
					numBuckets - 1
				)
				const block = blocks[blockIndex]

				if (isMobile) {
					// Mobile: show the modal
					onHover({
						block,
						x: e.clientX,
						y: e.clientY
					})
				} else {
					// Desktop: open block explorer directly
					const url = getBlockExplorerUrl(block.chain, block.blockHash)
					if (url !== '#') {
						window.open(url, '_blank')
					}
				}
			}
		}
	}, [camera, geometry, gl.domElement, onHover, blocks, isMobile])

	useFrame((state, delta) => {
		const normalizedDelta = Math.min(delta, 0.016) / 0.016

		logoUniforms.uTime.value = state.clock.elapsedTime
		glowUniforms.uTime.value = state.clock.elapsedTime

		targetPointer.current.set(state.pointer.x, state.pointer.y)
		currentPointer.current.lerp(targetPointer.current, 0.1 * normalizedDelta)

		mouseVec.current.set(currentPointer.current.x, currentPointer.current.y, 0.5)
		mouseVec.current.unproject(camera)
		mouseVec.current.sub(camera.position).normalize()

		// Get world position of mesh (includes group offset)
		if (meshRef.current) {
			meshRef.current.getWorldPosition(tempVec.current)
		} else {
			tempVec.current.set(0, 6.632504, 1.147684)
		}
		const distance = tempVec.current.sub(camera.position).dot(mouseVec.current)

		logoUniforms.uMousePos.value
			.copy(camera.position)
			.add(mouseVec.current.multiplyScalar(distance))
	})


	return (
		<group position={[0, isMobile ? 7.5 : 6.632504, 1.147684]} scale={isMobile ? 0.75 : 1.25}>
			<mesh
				ref={meshRef}
				geometry={geometry}
				onPointerMove={handlePointerMove}
				onPointerLeave={handlePointerLeave}
				onClick={handleClick}
			>
				<shaderMaterial
					vertexShader={logoVertexShader}
					fragmentShader={logoFragmentShader}
					uniforms={logoUniforms}
					transparent
					blending={THREE.AdditiveBlending}
					side={THREE.DoubleSide}
					vertexColors
				/>
			</mesh>
			<mesh ref={glowRef} position={[0, 0.25, 0]} scale={0}>
				<planeGeometry />
				<shaderMaterial
					vertexShader={glowVertexShader}
					fragmentShader={glowFragmentShader}
					uniforms={glowUniforms}
					transparent
					blending={THREE.AdditiveBlending}
					depthTest={false}
				/>
			</mesh>
		</group>
	)
}

interface SceneProps {
	blocks: MinedBlock[]
	onHover: (info: HoverInfo | null) => void
}

function Scene({ blocks, onHover }: SceneProps) {
	return (
		<>
			<color attach="background" args={['#0a0000']} />
			<LogoVisual blocks={blocks} onHover={onHover} />
			<EffectComposer multisampling={0}>
				<Bloom
					intensity={1.8}
					luminanceThreshold={0.6}
					luminanceSmoothing={0.3}
					radius={0.4}
				/>
			</EffectComposer>
		</>
	)
}

interface BlockModalProps {
	info: HoverInfo
	prices: Record<string, number>
	onDismiss: () => void
}

function BlockModal({ info, prices, onDismiss }: BlockModalProps) {
	const { block, x, y } = info
	const date = new Date(block.blockTime * 1000)
	const chainName = CHAIN_DISPLAY_NAMES[block.chain] || block.chain
	const symbol = CHAIN_SYMBOLS[block.chain] || ''
	const price = prices[block.chain] || 0
	const usdValue = price > 0 ? (block.reward * price).toFixed(2) : null

	// Calculate position to keep modal within viewport
	const modalWidth = 280
	const modalHeight = 220
	const padding = 10

	const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800
	const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 600

	let left = x + 15
	let top = y + 15

	// Adjust horizontal position if modal would overflow right edge
	if (left + modalWidth > viewportWidth - padding) {
		left = x - modalWidth - 15
	}
	// Ensure modal doesn't go off left edge
	if (left < padding) {
		left = padding
	}

	// Adjust vertical position if modal would overflow bottom edge
	if (top + modalHeight > viewportHeight - padding) {
		top = y - modalHeight - 15
	}
	// Ensure modal doesn't go off top edge
	if (top < padding) {
		top = padding
	}

	return (
		<div
			style={{
				position: 'fixed',
				left,
				top,
				background: 'rgba(0, 0, 0, 0.95)',
				border: '1px solid #ac1b00',
				borderRadius: '8px',
				padding: '12px 16px',
				color: '#fff',
				fontSize: '12px',
				fontFamily: 'monospace',
				pointerEvents: 'auto',
				zIndex: 1000,
				maxWidth: `${modalWidth}px`,
				boxShadow: '0 4px 20px rgba(172, 27, 0, 0.3)'
			}}
			onClick={(e) => e.stopPropagation()}
		>
			<button
				onClick={onDismiss}
				style={{
					position: 'absolute',
					top: '8px',
					right: '8px',
					background: 'none',
					border: 'none',
					color: '#888',
					cursor: 'pointer',
					fontSize: '16px',
					padding: '4px',
					lineHeight: 1
				}}
			>
				×
			</button>
			<div style={{ marginBottom: '4px', fontSize: '10px', color: '#888' }}>
				{chainName}
			</div>
			<a
				href={getBlockExplorerUrl(block.chain, block.blockHash)}
				target="_blank"
				rel="noopener noreferrer"
				style={{
					display: 'block',
					marginBottom: '8px',
					fontWeight: 'bold',
					color: '#fbdc77',
					textDecoration: 'none',
					cursor: 'pointer'
				}}
				onClick={(e) => e.stopPropagation()}
			>
				Block #{block.blockHeight} ↗
			</a>
			<div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
				<span style={{ color: '#888' }}>Block Hash:</span>
				<br />
				{block.blockHash}
			</div>
			<div style={{ marginBottom: '4px' }}>
				<span style={{ color: '#888' }}>Time:</span> {date.toLocaleString()}
			</div>
			<div style={{ marginBottom: '4px' }}>
				<span style={{ color: '#888' }}>Reward:</span> {block.reward} {symbol}
				{usdValue && <span style={{ color: '#4ade80' }}> (${usdValue})</span>}
			</div>
			<div style={{ wordBreak: 'break-all' }}>
				<span style={{ color: '#888' }}>Coinbase TxID:</span>
				<br />
				{block.coinbaseTxid}
			</div>
		</div>
	)
}

interface QuaiLogoProps {
	blocks?: MinedBlock[]
	prices?: Record<string, number>
}

export default function QuaiLogo({ blocks = [], prices = {} }: QuaiLogoProps) {
	const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
	const [isMobile, setIsMobile] = useState(false)
	const lastMeshClickTime = useRef(0)

	// Detect mobile on mount
	useEffect(() => {
		setIsMobile(window.innerWidth < 768)
		const handleResize = () => setIsMobile(window.innerWidth < 768)
		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const dismissModal = useCallback(() => {
		setHoverInfo(null)
	}, [])

	// Handle container click - only dismiss on mobile, and only if not clicking mesh
	const handleContainerClick = useCallback(() => {
		// Only handle dismiss on mobile
		if (!isMobile) return

		// If a mesh click just happened (within 100ms), don't dismiss
		if (Date.now() - lastMeshClickTime.current < 100) return

		setHoverInfo(null)
	}, [isMobile])

	// Wrapper for onHover that tracks mesh clicks
	const handleHover = useCallback((info: HoverInfo | null) => {
		if (info) {
			// Track when mesh was clicked (for mobile tap detection)
			lastMeshClickTime.current = Date.now()
		}
		setHoverInfo(info)
	}, [])

	return (
			<div
				style={{ width: '100%', height: '100vh', position: 'relative' }}
				onClick={handleContainerClick}
			>
				<Canvas
					camera={{ position: [0, 4, 13.75], fov: 45 }}
					gl={{
						alpha: false,
						antialias: false,
						powerPreference: 'high-performance',
						stencil: false,
					}}
				>
				<Suspense fallback={null}>
					<Scene blocks={blocks} onHover={handleHover} />
				</Suspense>
			</Canvas>
			{hoverInfo && <BlockModal info={hoverInfo} prices={prices} onDismiss={dismissModal} />}
		</div>
	)
}

useGLTF.preload('/models/logo.glb')
