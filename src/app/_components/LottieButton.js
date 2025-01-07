// src/app/_components/LottieButton.js
'use client'

import { useState, useRef, useEffect } from 'react'
import lottie from 'lottie-web'
import './LottieButton.css' // CSS 파일 import

export default function LottieButton({ onTextReceived }) {
	const [recording, setRecording] = useState(false)
	const audioContextRef = useRef(null)
	const processorRef = useRef(null)
	const sourceRef = useRef(null)
	const bufferChunksRef = useRef([])
	const chunkCountRef = useRef(0)
	const CHUNK_THRESHOLD = 4
	const lottieContainer = useRef(null)

	useEffect(() => {
		const animation = lottie.loadAnimation({
			container: lottieContainer.current,
			renderer: 'svg',
			loop: true,
			autoplay: true,
			animationData: require('./lottie.json'),
		})

		return () => {
			animation.destroy()
		}
	}, [])

	const startRecording = async () => {
		if (!audioContextRef.current) {
			audioContextRef.current = new AudioContext({ sampleRate: 16000 })
		}
		const audioContext = audioContextRef.current

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
		})
		sourceRef.current = audioContext.createMediaStreamSource(stream)
		processorRef.current = audioContext.createScriptProcessor(8192, 1, 1)

		processorRef.current.onaudioprocess = async (event) => {
			const inputBuffer = event.inputBuffer.getChannelData(0)
			const int16Buffer = float32ToInt16(inputBuffer)

			bufferChunksRef.current.push(new Int16Array(int16Buffer))
			chunkCountRef.current++

			if (chunkCountRef.current >= CHUNK_THRESHOLD) {
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
		<div
			ref={lottieContainer}
			onClick={recording ? stopRecording : startRecording}
			className={`lottie-button ${recording ? 'fade-out' : 'fade-in'}`}
		></div>
	)
}
