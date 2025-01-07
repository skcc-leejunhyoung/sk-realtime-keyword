import { useState, useEffect } from 'react'

export default function ContentScanner({ content }) {
	const [scannedContent, setScannedContent] = useState(content)

	useEffect(() => {
		let processedContent = content

		// "vwb"를 "VWBE"로 치환
		processedContent = processedContent.replace(/\bvwb\b/gi, 'VWBE')

		setScannedContent(processedContent)
	}, [content])

	return (
		<div className="p-4 rounded-lg bg-gray-800 text-white leading-relaxed">
			{scannedContent}
		</div>
	)
}
