// src/app/_components/MicButton.js
import { useState, useRef } from 'react'

export default function MicButton({ onClick }) {
	const [recording, setRecording] = useState(false)
	const mediaRecorderRef = useRef(null) // useRef로 mediaRecorder 상태 관리
	let audioChunks = []

	const startRecording = async () => {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: true,
		})
		const mediaRecorder = new MediaRecorder(stream)

		mediaRecorderRef.current = mediaRecorder // mediaRecorder 참조 저장

		mediaRecorder.ondataavailable = (event) => {
			audioChunks.push(event.data)
		}

		mediaRecorder.onstop = async () => {
			const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
			const arrayBuffer = await audioBlob.arrayBuffer()
			const base64Audio = Buffer.from(arrayBuffer).toString('base64')

			// API 호출
			const response = await fetch('/api/speech-to-text', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ audioData: base64Audio }),
			})
			const data = await response.json()
			onClick(data.text)
		}

		mediaRecorder.start()
		setRecording(true)
	}

	const stopRecording = () => {
		if (mediaRecorderRef.current) {
			mediaRecorderRef.current.stop()
			setRecording(false)
		} else {
			console.error('No active media recorder found.')
		}
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
