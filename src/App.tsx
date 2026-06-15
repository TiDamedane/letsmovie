import { useEffect, useState } from "react";
import { CollectingPage } from "@/components/collecting-page";
import { CreateActivityPage } from "@/components/create-activity-page";
import { MemoryDetailPage } from "@/components/memory-detail-page";
import { MyActivitiesPage } from "@/components/my-activities-page";
import { MyMemoriesPage } from "@/components/my-memories-page";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return hash;
}

function App() {
  const hash = useHashRoute();
  const isCreateActivityPage = hash.startsWith("#/activities/new");
  const memoryMatch = hash.match(/^#\/memories\/([^/]+)$/);
  const activityMatch = hash.match(/^#\/activities\/([^/]+)$/);

  if (isCreateActivityPage) return <CreateActivityPage />;
  if (memoryMatch) {
    return <MemoryDetailPage activityId={decodeURIComponent(memoryMatch[1])} />;
  }
  if (hash === "#/memories") return <MyMemoriesPage />;
  if (activityMatch) {
    return <CollectingPage activityId={decodeURIComponent(activityMatch[1])} />;
  }
  return <MyActivitiesPage />;
}

export default App;
