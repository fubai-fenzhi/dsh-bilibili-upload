export const SKILL_NAME = 'bilibili-upload';

export const SKILL_DESCRIPTION = 'Upload or edit a Bilibili video from DSH through biliup: check login, pick title/desc/tags/cover/partition, default to private, verify the BV id, and edit visibility through the web API.';

export const SKILL_CONTENT = `# Bilibili upload workflow

Use this skill when the user asks to upload, publish, edit, or check a Bilibili video from this machine.

## Preconditions

- \`biliup\` is installed and its path is configured (\`biliupPath\` or \`BILIUP_PATH\`).
- The user has run \`biliup login\` once; \`cookies.json\` sits next to the biliup binary.
- Never print, copy, or send the cookie values.

## Steps

1. Run \`bili_check\`. If biliup or cookies are missing, tell the user what is missing and stop; do not try to install or log in on their behalf.
2. Collect metadata:
   - title: at most about 80 chars, descriptive, no clickbait that the video does not deliver.
   - desc: reuse the prepared description text if the user has one.
   - tags: 5-10 comma-separated tags.
   - cover: prefer a 4:3 image; a 16:9 one also works.
3. Choose the partition. Default \`tid\` is 188. Keep \`submit\` at \`web\`: the \`app\` interface maps some partitions to the wrong parent.
4. Upload with \`bili_upload\`. Keep \`onlySelf\` at its default (true) unless the user explicitly asked for a public video in this conversation. Run with \`dryRun: true\` first when the command looks risky.
5. Verify: call \`bili_check\` with the returned BV id. Report the state and whether the video is public or private.
6. Visibility or metadata fixes go through \`bili_edit\`. It refuses while the archive is still under review (state -50), so wait for the review to finish and retry.
7. Deleting an archive requires the Bilibili web UI's captcha; ask the user to delete it manually.

## Pitfalls

- The legacy \`tid\` field can look wrong (for example 21) while the real new partition is \`tid_v2\`. Report both before claiming a partition is wrong.
- A private archive can sit in review for hours; do not re-upload the same video repeatedly.
- Never upload the same video twice to fix metadata; use \`bili_edit\` after review.
`;

export const SKILL_REGISTRATION = {
  name: SKILL_NAME,
  description: SKILL_DESCRIPTION,
  whenToUse: 'when the user asks to upload, publish, edit, or check a Bilibili video',
  source: 'custom',
  content: SKILL_CONTENT,
};
