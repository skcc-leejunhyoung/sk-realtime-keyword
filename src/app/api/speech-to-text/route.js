// src/app/api/speech-to-text/route.js
'use server' // Next.js 13+ (App Router)에서 서버 전용 파일임을 명시

import { NextResponse } from 'next/server'

// (서버 사이드 전용) gRPC 관련 라이브러리
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

// ---------------------------------------------------------------------
// 1) 환경 변수 및 설정
// ---------------------------------------------------------------------
const SECRET_KEY = process.env.CLOVA_SECRET_KEY // .env에 CLOVA_SECRET_KEY=... 형식으로 저장
const GRPC_URL = 'clovaspeech-gw.ncloud.com:50051' // Clova Speech gRPC URL

// nest.proto 파일 경로 (프로젝트 내 위치에 맞게 수정)
const PROTO_PATH = './nest.proto'

// 2) protoLoader로 proto 파일 로드
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	// 필요 시 설정 (e.g. keepCase: true, longs: String 등)
})
// 3) gRPC 객체 생성
const clovaSpeechProto = grpc.loadPackageDefinition(packageDefinition)

// Clova Speech 문서 기준: package com.nbp.cdncp.nest.grpc.proto.v1;
// service NestService { rpc recognize(stream NestRequest) returns (stream NestResponse){}; }
const { NestService } = clovaSpeechProto.com.nbp.cdncp.nest.grpc.proto.v1

// 4) gRPC 클라이언트 생성
//    - 실제 환경에선 인증서(TLS) 사용이 필요할 수 있으므로 createSsl()로 변경 가능
// 4) gRPC 클라이언트 생성 (TLS)
let client = new NestService(
	GRPC_URL, // 'clovaspeech-gw.ncloud.com:50051'
	grpc.credentials.createSsl(),
)

// NestRequest에 들어갈 RequestType(예: CONFIG=0, DATA=1)
const nestProto = {
	RequestType: {
		CONFIG: 0,
		DATA: 1,
	},
}

// ---------------------------------------------------------------------
// 5) gRPC를 통한 STT 함수
// ---------------------------------------------------------------------
async function startRecognition(audioBuffer) {
	return new Promise((resolve, reject) => {
		// gRPC 메타데이터에 인증 토큰 추가
		const metadata = new grpc.Metadata()
		// Clova Speech: Authorization 헤더에 Bearer {secretKey} 형태
		metadata.add('authorization', `Bearer ${SECRET_KEY}`)

		/**
		 * Config JSON (문서에서 제시한 구조에 맞춰 자유롭게 확장 가능)
		 * 아래 예시:
		 *  transcription.language = 'ko'  (한국어)
		 *  keywordBoosting.boostings = [{ words: '...', weight: ... }, ...]
		 */
		const config = {
			transcription: {
				language: 'ko',
			},
			keywordBoosting: {
				boostings: [{ words: '네이버, 인식', weight: 2.0 }],
			},
			// forbidden: { forbiddens: '금칙어1, 금칙어2' },
			// semanticEpd: { ... },
			// 등등 필요하면 확장
		}

		// Clova Speech가 Config를 JSON 문자열로 받는다면 stringify 필요
		const configMessage = {
			config: JSON.stringify(config),
		}

		// NestRequest 예시
		const configRequest = {
			type: nestProto.RequestType.CONFIG, // 0
			config: configMessage, // oneof part { NestConfig config }
		}

		let call
		try {
			// NestService의 recognize 메서드(= Duplex streaming) 시작
			call = client.recognize(metadata)
		} catch (error) {
			return reject(error)
		}

		// 1) Config 먼저 전송
		call.write(configRequest)

		// 2) 오디오 데이터를 일정 크기로 나눠 전송 (16kHz, 1ch, 16bit PCM 등)
		const chunkSize = 1024
		for (let i = 0; i < audioBuffer.length; i += chunkSize) {
			const chunk = audioBuffer.slice(i, i + chunkSize)
			const dataRequest = {
				type: nestProto.RequestType.DATA, // 1
				data: {
					chunk, // NestData.chunk
					// extraContents: JSON 문자열 등 필요 시
				},
			}
			call.write(dataRequest)
		}

		// 3) 스트리밍 종료
		call.end()

		// 4) 서버 응답을 받아 전체 인식 결과를 누적
		let fullText = ''

		call.on('data', (response) => {
			// 문서에 따르면 response.contents 등에 인식결과가 들어옴
			if (response?.contents) {
				fullText += response.contents
			}
			// 필요 시 responseType, alignInfos, etc.를 파싱해도 됨
		})

		call.on('end', () => {
			resolve(fullText)
		})

		call.on('error', (err) => {
			reject(err)
		})
	})
}

// ---------------------------------------------------------------------
// 6) Next.js App Router의 POST 핸들러
// ---------------------------------------------------------------------
export async function POST(req) {
	try {
		// 1) content-type 확인
		const contentType = req.headers.get('content-type') || ''
		let audioBuffer

		// 2) multipart/form-data 또는 x-www-form-urlencoded로 올라온 경우
		if (
			contentType.includes('multipart/form-data') ||
			contentType.includes('application/x-www-form-urlencoded')
		) {
			const formData = await req.formData()
			const file = formData.get('audio')
			if (!file) {
				return NextResponse.json(
					{ error: 'No audio file provided' },
					{ status: 400 },
				)
			}
			const arrayBuffer = await file.arrayBuffer()
			audioBuffer = Buffer.from(arrayBuffer)
		} else {
			// 3) 그 외엔 raw binary로 가정
			//    fetch('/api/speech-to-text', { method: 'POST', body: audioBuffer })
			const arrayBuffer = await req.arrayBuffer()
			audioBuffer = Buffer.from(arrayBuffer)
		}

		// 4) gRPC를 통해 음성 인식
		const recognizedText = await startRecognition(audioBuffer)

		// 5) 결과를 JSON 응답
		return NextResponse.json({ text: recognizedText })
	} catch (error) {
		console.error('STT Error:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}
