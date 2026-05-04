import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone'
import { PINECONE_API_KEY, PINECONE_INDEX } from './config'

let pc: Pinecone | null = null

function getClient(): Pinecone {
  if (!pc) {
    pc = new Pinecone({
      apiKey: PINECONE_API_KEY
    })
  }
  return pc
}

export function getIndex() {
  return getClient().index(PINECONE_INDEX)
}

export { getClient }
