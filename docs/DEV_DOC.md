# How to Run Locally

## Use Docker to Build the Project

It's recommended to run `dev:build` to build the images and download the required ones:

```bash
pnpm dev:build
```

## Use Docker to Run

You can run the project using `dev:run`:

```bash
pnpm dev:run
```

## Model Schema

There are three entities:

1. Campaign
2. ContentPiece
3. ContentPieceTranslation

As this is a demo project, the schema is simple and does not include users.

The `Campaign` entity represents a campaign, and `ContentPiece` represents a content item to be saved. The information about the `title` and `description` is stored in `ContentPieceTranslation`.

## Workflow

1. The user goes to the web app and creates a new campaign.
2. The user goes to the campaign's content list.
3. The user can generate content and translations.
4. In the header of the web app, there are two inputs that allow the user to select the language and the model to use when a generation request is dispatched from the campaign's content list page.
5. The user can see real-time updates. If they go to the content information, there are a few more actions available:

    - Generate new draft translations for existing translations: If the user selects to generate a draft for a language that already has information, it will _override_ the content with the newly generated info.

    - Translate to other languages: If the user selects to generate a draft for a language that does NOT have information but the content already has a translation in another language, it will be translated to the new language.

    - Approve the generated content: Once approved, the user is no longer able to request a new generation.

    - Reject the generated content: Once rejected, the user is no longer able to request a new generation.

## Extra Notes

The `ContentPiece` has a review state, which can be:

- Draft: Initial state of a content item.
- Suggested by AI: The content has AI-generated info, but the user has not accessed the information to review it.
- Reviewed: The content has AI-generated info, and the user has accessed the information to review it.
- Approved: The user approved the content.
- Rejected: The user rejected the content.
