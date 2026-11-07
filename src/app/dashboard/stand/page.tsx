"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStand } from '@/components/stand/use-stand'
import { InvitationsPanel } from '@/components/stand/invitations-panel'
import { AttendancePanel } from '@/components/stand/attendance-panel'
import { ModerationPanel } from '@/components/stand/moderation-panel'
import { LeadsPanel } from '@/components/stand/leads-panel'
import { ReportPanel } from '@/components/stand/report-panel'

// Pilotage du stand ANSUT – ITF 2026 : invitations, présences, questions, contacts, bilan.
export default function StandDashboardPage() {
  const { panels, role, error, reload } = useStand()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-itf-navy">Stand ANSUT · ITF 2026</h1>
        <p className="text-muted-foreground">
          {role === 'ADMIN' ? 'Vous pouvez valider les courriers (DG).' : 'Validation des courriers réservée au DG (administrateur).'}
        </p>
      </div>
      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Tabs defaultValue="invitations">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="presences">Présences</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="bilan">Bilan du jour</TabsTrigger>
        </TabsList>
        <TabsContent value="invitations"><InvitationsPanel panels={panels} canValidate={role === 'ADMIN'} reload={reload} /></TabsContent>
        <TabsContent value="presences"><AttendancePanel panels={panels} /></TabsContent>
        <TabsContent value="questions"><ModerationPanel key={panels.length} panels={panels} /></TabsContent>
        <TabsContent value="contacts"><LeadsPanel /></TabsContent>
        <TabsContent value="bilan"><ReportPanel /></TabsContent>
      </Tabs>
    </div>
  )
}
