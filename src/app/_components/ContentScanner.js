// src/app/_components/ContentScanner.js
import { useState, useEffect } from 'react'

export default function ContentScanner({ content, highlightWords }) {
	const [scannedContent, setScannedContent] = useState(content)

	useEffect(() => {
		let highlighted = content
		highlightWords.forEach((word) => {
			highlighted = highlighted.replace(
				new RegExp(`(${word})`, 'gi'),
				'<span class="bg-yellow-500">$1</span>',
			)
		})
		setScannedContent(highlighted)
	}, [content, highlightWords])

	return (
		<div
			className="p-4 rounded-lg bg-gray-800 text-white leading-relaxed"
			dangerouslySetInnerHTML={{ __html: scannedContent }}
		></div>
	)
}
