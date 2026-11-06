import { SiteHeader, SiteFooter } from '@/components/brand/brand'
import { AssistantChat } from '@/components/stand/assistant-chat'

export const metadata = { title: 'Assistant · Stand ANSUT ITF 2026' }

export default function AssistantPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      <main className="itf-hero-bg flex-1 px-4 py-8">
        <div className="container mx-auto max-w-2xl">
          <h1 className="mb-4 text-3xl font-extrabold text-itf-navy">Une question ? <span className="itf-gradient-text">Demandez-moi</span></h1>
          <AssistantChat />
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
