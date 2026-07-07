import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { VoltButton, VoltCard } from '@voltui/components'
import { GithubLinkComponent } from '@wisp/ui'

@Component({
  selector: 'app-home',
  imports: [RouterLink, VoltButton, VoltCard, GithubLinkComponent],
  template: `
    <section class="flex flex-col items-center gap-6 py-16 text-center">
      <h1 class="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        Deploy your repos to your own VPS
      </h1>
      <p class="max-w-xl text-lg text-muted-foreground">
        Wisp is a lightweight, open-source PaaS. Point it at a git repo, and it
        builds, runs, and routes your services through Caddy.
      </p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <a href="https://github.com/Andersseen/wisp" target="_blank" rel="noopener noreferrer">
          <volt-button size="lg">Get started</volt-button>
        </a>
        <wisp-github-link variant="outline" size="lg" [showText]="true" />
      </div>
    </section>

    <section class="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
      @for (feature of features; track feature.title) {
        <volt-card>
          <div class="p-6">
            <h3 class="mb-2 font-semibold">{{ feature.title }}</h3>
            <p class="text-sm text-muted-foreground">{{ feature.description }}</p>
          </div>
        </volt-card>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePageComponent {
  protected readonly features = [
    {
      title: 'Git to container',
      description: 'Wisp clones your repo, builds a Docker image, and runs it.',
    },
    {
      title: 'Automatic routing',
      description: 'Caddy provisions routes for every deployed service.',
    },
    {
      title: 'Job queue',
      description: 'BullMQ on Valkey handles builds, deploys, and teardowns.',
    },
    {
      title: 'SQLite + Drizzle',
      description: 'Lightweight persistence perfect for a single VPS.',
    },
    {
      title: 'Angular dashboard',
      description: 'Manage services, view logs, and monitor status in real time.',
    },
    {
      title: 'Open source',
      description: 'Self-host Wisp on your own server. MIT licensed.',
    },
  ]
}
