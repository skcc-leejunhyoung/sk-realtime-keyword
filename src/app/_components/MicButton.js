// src/app/_components/MicButton.js
import { useState, useRef } from 'react'

export default function MicButton({ onTextReceived }) {
	const [recording, setRecording] = useState(false)
	const audioContextRef = useRef(null)
	const processorRef = useRef(null)
	const sourceRef = useRef(null)

	// 임시 버퍼
	const bufferChunksRef = useRef([])
	const chunkCountRef = useRef(0)
	const CHUNK_THRESHOLD = 4

	const startRecording = async () => {
		if (!audioContextRef.current) {
			audioContextRef.current = new AudioContext({ sampleRate: 16000 })
		}
		const audioContext = audioContextRef.current

		// 마이크 스트림
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
		})

		sourceRef.current = audioContext.createMediaStreamSource(stream)

		// ScriptProcessorNode 설정 (버퍼 사이즈, 입력 채널 수, 출력 채널 수)
		processorRef.current = audioContext.createScriptProcessor(8192, 1, 1)

		// onaudioprocess에서 청크 누적 후 일정 횟수마다 전송
		processorRef.current.onaudioprocess = async (event) => {
			const inputBuffer = event.inputBuffer.getChannelData(0)
			const int16Buffer = float32ToInt16(inputBuffer)

			// 임시 배열에 쌓기
			bufferChunksRef.current.push(new Int16Array(int16Buffer))
			chunkCountRef.current++

			// 일정 횟수(CHUNK_THRESHOLD)마다 한 번씩 전송
			if (chunkCountRef.current >= CHUNK_THRESHOLD) {
				// 여러 청크를 합쳐 Int16Array
				const merged = mergeChunks(bufferChunksRef.current)
				bufferChunksRef.current = []
				chunkCountRef.current = 0

				try {
					await fetch('/api/speech-to-text', {
						method: 'POST',
						headers: { 'Content-Type': 'application/octet-stream' },
						body: merged.buffer,
					})
				} catch (err) {
					console.error('Upload chunk error:', err)
				}
			}
		}

		sourceRef.current.connect(processorRef.current)
		processorRef.current.connect(audioContext.destination)

		// SSE
		const eventSource = new EventSource('/api/speech-to-text')
		eventSource.onmessage = (event) => {
			const data = event.data.trim()

			if (data === '[DONE]') {
				eventSource.close()
				return
			}
			if (data.startsWith('[ERROR]')) {
				console.error('SSE Error:', data)
				return
			}

			try {
				const json = JSON.parse(data)

				if (json?.responseType?.includes('transcription')) {
					let recognizedText = json.transcription?.text || ''
					recognizedText = recognizedText.replace(/undefined/g, '')
					if (!recognizedText.trim()) return
					onTextReceived((prev) => prev + recognizedText)
				}
			} catch (err) {
				console.warn('Parse error or not JSON:', data)
			}
		}

		setRecording(true)
	}

	const stopRecording = () => {
		setRecording(false)
		if (processorRef.current) {
			processorRef.current.disconnect()
			processorRef.current.onaudioprocess = null
			processorRef.current = null
		}
		if (sourceRef.current) {
			sourceRef.current.disconnect()
			sourceRef.current = null
		}
		if (audioContextRef.current) {
			audioContextRef.current.close()
			audioContextRef.current = null
		}
	}

	function float32ToInt16(float32Array) {
		const len = float32Array.length
		const buf = new Int16Array(len)
		for (let i = 0; i < len; i++) {
			let s = Math.max(-1, Math.min(1, float32Array[i]))
			buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff
		}
		return buf
	}

	function mergeChunks(chunks) {
		let totalLength = 0
		chunks.forEach((arr) => {
			totalLength += arr.length
		})
		const merged = new Int16Array(totalLength)
		let offset = 0
		chunks.forEach((arr) => {
			merged.set(arr, offset)
			offset += arr.length
		})
		return merged
	}

	return (
		<button
			onClick={recording ? stopRecording : startRecording}
			className="p-4 bg-blue-500 text-white rounded"
		>
			{recording ? 'Stop Recording' : 'Start Recording'}
		</button>
	)
}
