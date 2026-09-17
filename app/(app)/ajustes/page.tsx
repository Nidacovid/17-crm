import { PageHeader } from "@/components/layout/PageHeader";
import { GoogleConnectionCard } from "@/components/settings/GoogleConnectionCard";
import { ReminderFieldsCard } from "@/components/settings/ReminderFieldsCard";
import { IcsFeedCard } from "@/components/settings/IcsFeedCard";
import { getAjustesGoogleData } from "@/lib/queries/settings";

// 10.8: sección Google de la pantalla de Ajustes. El resto de preferencias
// de la app llegará en fases posteriores.
export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const [{ google }, data] = await Promise.all([
    searchParams,
    getAjustesGoogleData(),
  ]);
  const googleStatus =
    google === "ok" ? "ok" : google === "error" ? "error" : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const icsUrl = data.icsToken
    ? `${appUrl}/api/calendar/${data.icsToken}`
    : "";

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <GoogleConnectionCard
          connection={data.connection}
          googleCalendarId={data.googleCalendarId}
          googleStatus={googleStatus}
          pendingSyncCount={data.pendingSyncCount}
          syncErrors={data.syncErrors}
        />
        <ReminderFieldsCard
          reminderTime={data.reminderTime}
          reminderDaysBefore={data.reminderDaysBefore}
        />
        <IcsFeedCard url={icsUrl} />
      </div>
    </>
  );
}