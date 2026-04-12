import { spawnSync } from 'child_process';

export type RuntimeDependency = 'ffmpeg' | 'ffprobe' | 'yt-dlp';

const COMMAND_ARGS: Record<RuntimeDependency, string[]> = {
  ffmpeg: ['-version'],
  ffprobe: ['-version'],
  'yt-dlp': ['--version'],
};

export function getMissingRuntimeDependencies(
  dependencies: RuntimeDependency[],
): RuntimeDependency[] {
  return dependencies.filter((dependency) => {
    const result = spawnSync(dependency, COMMAND_ARGS[dependency], {
      stdio: 'ignore',
      shell: false,
    });

    return !!result.error || result.status !== 0;
  });
}
