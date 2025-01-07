// src/app/api/speech-to-text/route.js
'use server'

import { NextResponse } from 'next/server'
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

// gRPC
const SECRET_KEY = process.env.CLOVA_SECRET_KEY
const GRPC_URL = 'clovaspeech-gw.ncloud.com:50051'
const PROTO_PATH = './nest.proto'

// proto
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {})
const clovaSpeechProto = grpc.loadPackageDefinition(packageDefinition)
const { NestService } = clovaSpeechProto.com.nbp.cdncp.nest.grpc.proto.v1

// gRPC 클라이언트 (TLS)
let client = new NestService(GRPC_URL, grpc.credentials.createSsl())

// Duplex 스트림 call (SSE 전송용)
let call = null

// GET: SSE로 gRPC 응답 전송
export async function GET(req) {
	return new Promise((resolve, reject) => {
		const metadata = new grpc.Metadata()
		metadata.add('authorization', `Bearer ${SECRET_KEY}`)

		call = client.recognize(metadata)

		const configJson = {
			transcription: { language: 'ko' },
		}
		call.write({
			type: 0,
			config: { config: JSON.stringify(configJson) },
		})

		let isClosed = false

		const stream = new ReadableStream({
			start(controller) {
				call.on('data', (response) => {
					if (response.contents && !isClosed) {
						const text = response.contents
						controller.enqueue(`data: ${text}\n\n`)
					}
				})

				call.on('end', () => {
					if (!isClosed) {
						controller.enqueue('data: [DONE]\n\n')
						controller.close()
						isClosed = true
					}
				})

				call.on('error', (err) => {
					if (!isClosed) {
						controller.enqueue(`data: [ERROR] ${err.message}\n\n`)
						controller.close()
						isClosed = true
					}
				})
			},
			cancel(reason) {
				if (!isClosed) {
					call.end()
					isClosed = true
				}
			},
		})

		resolve(
			new Response(stream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
				},
			}),
		)
	})
}

// POST: 클라이언트에서 PCM chunk 전송 시, gRPC에도 DATA로 write
export async function POST(req) {
	if (!call) {
		return NextResponse.json(
			{ error: 'Streaming not initialized' },
			{ status: 500 },
		)
	}
	try {
		const arrayBuffer = await req.arrayBuffer()
		const audioBuffer = Buffer.from(arrayBuffer)

		call.write({
			type: 1,
			data: {
				chunk: audioBuffer,
				extra_contents: JSON.stringify({ seqId: 0, epFlag: false }),
			},
		})

		return NextResponse.json({ status: 'Chunk sent' })
	} catch (error) {
		console.error('POST Error:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}
