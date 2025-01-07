// src/app/_components/TypingText.js
import { useEffect, useState, useRef } from 'react'

export default function TypingText({ text }) {
	const [displayedText, setDisplayedText] = useState('')
	const typingSpeed = 90

	const prevTextLengthRef = useRef(0)

	useEffect(() => {
		const startIndex = prevTextLengthRef.current
		const endIndex = text.length
		if (endIndex < startIndex) {
			setDisplayedText('')
			prevTextLengthRef.current = 0
			return
		}

		let i = startIndex
		const interval = setInterval(() => {
			if (i < endIndex) {
				setDisplayedText((prev) => prev + text[i])
				i++
			} else {
				clearInterval(interval)
				prevTextLengthRef.current = endIndex
			}
		}, typingSpeed)

		return () => clearInterval(interval)
	}, [text])

	return <div className="text-yellow-400">{displayedText}</div>
}
