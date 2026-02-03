import type { LoaderFunction } from 'react-router-dom'

import { api } from '../lib/api'

export const contentDetailLoader: LoaderFunction = async ({ params }) => {
  if (!params.id) {
    throw new Response('Content not found', { status: 404 })
  }

  return api.getContent(params.id)
}

export const contentReviewLoader: LoaderFunction = async ({ params }) => {
  if (!params.id) {
    throw new Response('Content not found', { status: 404 })
  }

  return api.getContent(params.id)
}
