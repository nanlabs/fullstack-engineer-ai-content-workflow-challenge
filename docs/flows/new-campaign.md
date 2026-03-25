# New Campaign Flow

## Goal

Provide a dedicated onboarding experience for campaign creation, based on `Campaign Genesis`.

## Primary actions

- enter campaign name
- enter campaign brief
- create the campaign
- return to the dashboard without creating

## Routing

- create success -> `/campaigns/{campaignId}`
- cancel/back -> `/`

## UX rules

- the page keeps the Stitch shell language
- the creation form is the primary focus
- onboarding copy explains what happens after creation

## Notes

- creating the first content piece remains inside the workbench, not on this screen
