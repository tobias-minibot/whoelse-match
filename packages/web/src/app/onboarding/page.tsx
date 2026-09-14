import { SiteNav } from "@/components/SiteNav";
import { ProfileForm } from "@/components/ProfileForm";

export default function OnboardingPage() {
  return (
    <div className="app">
      <SiteNav current="join" />
      <p className="doctrine">Write a short profile. Then you can be found.</p>
      <ProfileForm mode="onboard" />
    </div>
  );
}
