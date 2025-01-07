// src/app/page.js
'use client'

import { useState } from 'react'
import ContentScanner from './_components/ContentScanner'
import LottieButton from './_components/LottieButton'

export default function HomePage() {
	const [transcribedText, setTranscribedText] = useState('')

	const handleTextUpdate = (newText) => {
		setTranscribedText(newText)
	}

	return (
		<main className="flex flex-col items-center justify-center w-[60%] mx-auto bg-black">
			{transcribedText.length > 1 && (
				<ContentScanner content={transcribedText} />
			)}
			<LottieButton onTextReceived={handleTextUpdate} />
		</main>
	)
}
