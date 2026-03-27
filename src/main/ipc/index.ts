import { registerRepoHandlers } from './repo'
import { registerGitHandlers } from './git'
import { registerCliHandlers } from './cli'
import { registerCoverHandlers } from './cover'
import { registerDevServerHandlers } from './devServer'
import { registerFilesystemHandlers } from './filesystem'
import { registerSetupHandlers } from './setup'
import { registerDebugHandlers } from './debug'

export function registerAllHandlers(): void {
  registerRepoHandlers()
  registerGitHandlers()
  registerCliHandlers()
  registerCoverHandlers()
  registerDevServerHandlers()
  registerFilesystemHandlers()
  registerSetupHandlers()
  registerDebugHandlers()
}
