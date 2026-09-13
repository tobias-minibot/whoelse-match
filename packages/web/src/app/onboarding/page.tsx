import { SiteNav } from "@/components/SiteNav";
import { ProfileForm } from "@/components/ProfileForm";

export default function OnboardingPage() {
  return (
    <div className="app">
      <SiteNav current="join" />
      <p className="doctrine">
        <strong>Humans ask Who Else. Agents call WhoElse. Same network.</strong> Dating is the first
        costume, not a second product.
      </p>
      <ProfileForm mode="onboard" />
    </div>
  );
}
