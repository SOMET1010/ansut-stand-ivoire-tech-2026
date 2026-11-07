import { Clock, Mic, Network, Presentation, Sparkles, Trophy } from 'lucide-react'

/** Couleur et icône d'un statut de séquence, déduites de son libellé (saisi librement par l'équipe). */
export function categoryMeta(category: string | null) {
  const c = (category ?? '').toLowerCase()
  if (/talk|intervention|masterclass|panel/.test(c)) return { className: 'bg-itf-navy/10 text-itf-navy', icon: Mic }
  if (/animation/.test(c)) return { className: 'bg-itf-cyan/15 text-[#0f6f96]', icon: Sparkles }
  if (/présence|presence|délégation|delegation|institution/.test(c)) return { className: 'bg-itf-orange/15 text-[#a65f00]', icon: Trophy }
  if (/événement|evenement|afterwork|networking/.test(c)) return { className: 'bg-itf-green/15 text-[#3d7f1f]', icon: Network }
  if (/pitch|plateau|atelier/.test(c)) return { className: 'bg-itf-green/15 text-[#3d7f1f]', icon: Presentation }
  return { className: 'bg-muted text-muted-foreground', icon: Clock }
}
