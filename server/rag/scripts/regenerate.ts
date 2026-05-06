// Load environment variables FIRST
import 'dotenv/config'

import { regenerateEmbeddings } from '../ingest.js'
import { getEmbeddingConfig } from '../../embeddings/index.js'

async function main() {
  const config = getEmbeddingConfig()

  console.log('\n' + '='.repeat(60))
  console.log('🔄 REGENERATING ALL EMBEDDINGS')
  console.log('='.repeat(60))
  console.log(`Provider: ${config.provider}`)
  console.log(`Model: ${config.modelName}`)
  console.log(`Dimensions: ${config.dimensions}`)
  console.log('='.repeat(60))
  console.log('\n⚠️  IMPORTANT:')
  console.log('   This will REPLACE all existing embeddings in the database.')
  console.log('   Make sure this is the correct provider before continuing.')
  console.log('   To switch providers, update USE_LOCAL_EMBEDDING in server/.env\n')

  // Give user time to cancel
  console.log('Starting in 3 seconds... (Ctrl+C to cancel)\n')
  await new Promise(resolve => setTimeout(resolve, 3000))

  const result = await regenerateEmbeddings()

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Regenerated ${result.regenerated} embeddings`)
  console.log('='.repeat(60) + '\n')
}

main().catch(console.error)
