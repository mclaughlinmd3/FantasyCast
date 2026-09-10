import { useEffect, useState } from 'react';
import { initials } from '../initials.js';

// Shared logo-with-initials-fallback rendering for a fantasy team's
// avatar/logo, used both above the team name (matchup summary) and as the
// smaller icon flanking "VS" (grid card) - className picks the sizing.
//
// Failed <img> loads don't log anything by default, which made "why isn't
// this team's logo showing" impossible to diagnose remotely. This logs
// which case applies: the platform never gave us a logo URL at all, versus
// it gave us one but it wouldn't actually load (with the failing URL).
export default function TeamLogo({ team, className }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = team.avatar && !logoFailed;

  useEffect(() => {
    if (!team.avatar) {
      console.warn(`No logo/avatar available from the platform for team "${team.name}"`);
    }
  }, [team.avatar, team.name]);

  return showLogo ? (
    <img
      className={className}
      src={team.avatar}
      alt=""
      onError={() => {
        console.warn(`Team logo failed to load for "${team.name}":`, team.avatar);
        setLogoFailed(true);
      }}
    />
  ) : (
    <div className={`${className} ${className}-fallback`}>{initials(team.name)}</div>
  );
}
