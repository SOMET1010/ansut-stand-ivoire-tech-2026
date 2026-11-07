import { redirect } from 'next/navigation'

// L'accueil de l'administration est le pilotage du stand (les anciens chiffres étaient fictifs).
export default function AdminHome() {
  redirect('/dashboard/stand')
}
