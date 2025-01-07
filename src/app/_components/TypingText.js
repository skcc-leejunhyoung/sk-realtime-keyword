// src/app/_components/TypingText.js
import { useEffect, useState } from 'react'

export default function TypingText({ text }) {
	const [displayedText, setDisplayedText] = useState('')
	const typingSpeed = 50 // 타이핑 속도 조절

	useEffect(() => {
		let i = 0
		const interval = setInterval(() => {
			if (i < text.length) {
				setDisplayedText((prev) => prev + text[i])
				i++
			} else {
				clearInterval(interval)
			}
		}, typingSpeed)
		return () => clearInterval(interval)
	}, [text])

	return <div className="text-yellow-400">{displayedText}</div>
}
