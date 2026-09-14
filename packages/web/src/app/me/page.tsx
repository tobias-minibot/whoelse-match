import { SiteNav } from "@/components/SiteNav";
import { ProfileForm } from "@/components/ProfileForm";

export default function MePage() {
  return (
    <div className="app">
      <SiteNav current="me" />
      <p className="doctrine">Your name, bio, and what you offer or seek.</p>
      <ProfileForm mode="edit" />
    </div>
  );
}
