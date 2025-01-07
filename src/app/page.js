// src/app/page.js
'use client'

import { useState } from 'react'
import MicButton from './_components/MicButton'
import TypingText from './_components/TypingText'
import ContentScanner from './_components/ContentScanner'

export default function HomePage() {
	const [transcribedText, setTranscribedText] = useState('')
	const highlightWords = ['example', 'highlight', 'real-time']

	const handleTranscription = (text) => {
		setTranscribedText(text)
	}

	return (
		<main className="flex flex-col items-center justify-center min-h-screen space-y-6 bg-black">
			<MicButton onClick={handleTranscription} />
			{transcribedText && (
				<div className="min-w-96 max-w-96 rounded-sm bg-gray-800 px-4 py-2 text-yellow-400 shadow-lg">
					<TypingText text={transcribedText} />
				</div>
			)}
			{transcribedText.length > 50 && (
				<ContentScanner
					content={transcribedText}
					highlightWords={highlightWords}
				/>
			)}
		</main>
	)
}
