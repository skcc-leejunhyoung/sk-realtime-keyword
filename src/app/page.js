// src/app/page.js
'use client'

import { useState } from 'react'
import ContentScanner from './_components/ContentScanner'
import dynamic from 'next/dynamic'
// 동적 import로 클라이언트에서만 로드
const LottieButton = dynamic(() => import('./_components/LottieButton'), {
	ssr: false, // 서버 사이드 렌더링 비활성화
})

export default function HomePage() {
	const [transcribedText, setTranscribedText] = useState('')

	const handleTextUpdate = (newText) => {
		setTranscribedText(newText)
	}

	return (
		<main className="flex flex-col items-center justify-center min-h-screen bg-black">
			<div className="w-[60%] max-h-[45vh]"></div>
			<div className="w-[60%] mx-auto bg-gray max-h-[35vh] overflow-y-auto">
				{transcribedText.length > 1 && (
					<ContentScanner content={transcribedText} />
				)}
			</div>
			<div className="max-h-[20vh]">
				<LottieButton onTextReceived={handleTextUpdate} />
			</div>
		</main>
	)
}
