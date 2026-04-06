export default {
  projectName: 'melody',
  branchPrefix: 'feat/',
  baseBranch: 'main',
  worktreeRoot: 'worktrees',
  packageDirs: ['.', 'packages/*'],
  env: {
    exampleFile: '.env.example',
    localFile: '.env',
  },
  pr: {
    baseRef: 'origin/main',
    summaryOutputFile: '.pr-summary-prompt.md',
    agentOutputFile: '.pr-agent-prompt.md',
    excludedDiffPaths: [':(glob,exclude)**/package-lock.json', ':(glob,exclude)**/dist/**'],
    ciWorkflowName: 'CI',
    coverageArtifactName: 'coverage-reports',
    verifyCommands: ['npm run lint'],
  },
};
