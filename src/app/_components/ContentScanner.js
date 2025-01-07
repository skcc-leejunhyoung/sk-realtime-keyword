// src/app/_components/ContentScanner.js
import { useState, useEffect } from 'react'

export default function ContentScanner({ content }) {
	const [scannedContent, setScannedContent] = useState([])

	useEffect(() => {
		let processedContent = content.replace(/\bvwb\b/gi, 'VWBE') // vwb 치환
		const sentences = processedContent.split(/(?<=\.)/g) // 마침표로 문장 분리

		let currentBlock = ''
		let blocks = []

		sentences.forEach((sentence) => {
			currentBlock += sentence.trim() + ' '
			const wordCount = currentBlock.split(' ').length
			const charCount = currentBlock.length

			if (sentences.length >= 1 && charCount >= 100) {
				blocks.push(currentBlock.trim())
				currentBlock = '' // 블록 초기화
			}
		})

		// 남아있는 텍스트 처리
		if (currentBlock.trim() !== '') {
			blocks.push(currentBlock.trim())
		}

		setScannedContent(blocks)
	}, [content])

	return (
		<div className="p-4 rounded-lg text-white leading-relaxed space-y-6">
			{scannedContent.map((block, index) => (
				<div
					key={index}
					className="p-4 bg-gray-800 rounded-lg shadow-md"
				>
					{block}
				</div>
			))}
		</div>
	)
}
