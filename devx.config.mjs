export default {
  projectName: 'melody',
  branchPrefix: 'feat/',
  baseBranch: 'main',
  worktreeRoot: 'worktrees',
  packageDirs: ['.', 'packages/api', 'packages/worker', 'packages/web', 'packages/shared'],
  env: {
    exampleFile: '.env.example',
    localFile: '.env',
  },
  pr: {
    baseRef: 'origin/main',
    prepOutputFile: 'prompts/pr-prep-prompt.md',
    feedbackOutputFile: 'prompts/pr-feedback-prompt.md',
    excludedDiffPaths: [':(glob,exclude)**/package-lock.json', ':(glob,exclude)**/dist/**'],
    ciWorkflowName: 'CI',
    coverageArtifactName: 'coverage-reports',
    verifyCommands: ['npm run lint', 'npm run typecheck', 'npm run build', 'npm run test'],
  },
};
