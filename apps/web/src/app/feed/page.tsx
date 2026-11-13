import { AuthenticatedApp } from "@/components/authenticated-app";
import { FeedView } from "@/components/feed-view";

export default function FeedPage() {
  return (
    <AuthenticatedApp>
      <FeedView />
    </AuthenticatedApp>
  );
}
