import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default async function ChallengeUpdatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Challenge Updates</CardTitle>
          <CardDescription>View announcements and messages from the challenge creator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Updates feed coming soon</p>
            <p className="text-sm">
              This will be a message board where the challenge creator can post updates
              and participants can stay informed about important announcements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
