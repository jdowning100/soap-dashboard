declare module 'three/examples/jsm/loaders/KTX2Loader' {
	import { Loader, LoadingManager, CompressedTexture, WebGLRenderer } from 'three'

	export class KTX2Loader extends Loader {
		constructor(manager?: LoadingManager)
		setTranscoderPath(path: string): KTX2Loader
		setWorkerLimit(limit: number): KTX2Loader
		detectSupport(renderer: WebGLRenderer): KTX2Loader
		load(
			url: string,
			onLoad: (texture: CompressedTexture) => void,
			onProgress?: (event: ProgressEvent) => void,
			onError?: (error: unknown) => void
		): void
		dispose(): void
	}
}
