import type { BuildInput } from '../../types/deploy'

export class BuildService {
  async build(input: BuildInput): Promise<{ success: boolean; log: string }> {
    // TODO: implement build logic (git clone, docker build)
    return { success: true, log: `Built ${input.serviceId} from ${input.gitUrl}` }
  }
}
