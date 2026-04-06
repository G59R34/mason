import { avatarStyle } from '../lib/avatarColor';
import type { ProfileLite, ServerMemberRow } from '../types';

type Props = {
  members: ServerMemberRow[];
  profiles: Record<string, ProfileLite>;
};

export function MembersPanel({ members, profiles }: Props) {
  function label(m: ServerMemberRow) {
    const nick = m.nickname?.trim();
    if (nick) return nick;
    const p = profiles[m.user_id];
    if (p?.display_name?.trim()) return p.display_name;
    if (p?.email) return p.email.split('@')[0];
    return `user_${m.user_id.slice(0, 6)}`;
  }

  function roleLabel(role: string) {
    if (role === 'admin') return 'Admin';
    if (role === 'mod') return 'Mod';
    return null;
  }

  return (
    <aside className="mc-members" aria-label="Server members">
      <div className="mc-members-head">
        <span className="mc-members-title">Members</span>
        <span className="mc-members-count">{members.length}</span>
      </div>
      <ul className="mc-members-list">
        {members.map((m) => (
          <li key={m.user_id} className="mc-members-row">
            <div className="mc-members-avatar" style={avatarStyle(m.user_id)}>
              {label(m).slice(0, 1).toUpperCase()}
            </div>
            <div className="mc-members-info">
              <span className="mc-members-name">{label(m)}</span>
              {roleLabel(m.role) && <span className="mc-members-role">{roleLabel(m.role)}</span>}
            </div>
          </li>
        ))}
      </ul>
      {members.length === 0 && (
        <p className="mc-members-empty">No members — run masoncord_setup.sql and ensure you are in the server.</p>
      )}
    </aside>
  );
}
