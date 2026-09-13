import { SiteNav } from "@/components/SiteNav";
import { ProfileForm } from "@/components/ProfileForm";

export default function MePage() {
  return (
    <div className="app">
      <SiteNav current="me" />
      <p className="doctrine">
        <strong>Owned writes.</strong> Edit display name, bio, and OFFER/SEEK records. Withdraw is
        durable. Cross-owner stays 403.
      </p>
      <ProfileForm mode="edit" />
    </div>
  );
}
