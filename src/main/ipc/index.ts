import { registerRepoHandlers } from './repo'
import { registerGitHandlers } from './git'
import { registerCliHandlers } from './cli'
import { registerDevServerHandlers } from './devServer'
import { registerFilesystemHandlers } from './filesystem'
import { registerSetupHandlers } from './setup'

export function registerAllHandlers(): void {
  registerRepoHandlers()
  registerGitHandlers()
  registerCliHandlers()
  registerDevServerHandlers()
  registerFilesystemHandlers()
  registerSetupHandlers()
}
