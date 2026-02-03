import { createBrowserRouter } from 'react-router-dom'

import AppLayout from './AppLayout'
import CampaignDetail from '../pages/CampaignDetail'
import CampaignList from '../pages/CampaignList'
import ContentDetail from '../pages/ContentDetail'
import ContentReview from '../pages/ContentReview'
import CreateCampaign from '../pages/CreateCampaign'
import NotFound from '../pages/NotFound'
import { campaignDetailLoader } from '../loaders/campaignLoaders'
import { contentDetailLoader, contentReviewLoader } from '../loaders/contentLoaders'
import { campaignListLoader, createCampaignLoader } from '../loaders'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <CampaignList />,
        loader: campaignListLoader,
      },
      {
        path: 'campaigns/new',
        element: <CreateCampaign />,
        loader: createCampaignLoader,
      },
      {
        path: 'campaigns/:id',
        element: <CampaignDetail />,
        loader: campaignDetailLoader,
      },
      {
        path: 'content/:id',
        element: <ContentDetail />,
        loader: contentDetailLoader,
      },
      {
        path: 'content/:id/review',
        element: <ContentReview />,
        loader: contentReviewLoader,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])
