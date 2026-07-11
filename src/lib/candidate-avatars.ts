const avatarByCandidateId: Record<string, string> = {
  "cand-daniel": "https://randomuser.me/api/portraits/men/75.jpg",
  "cand-emma": "https://randomuser.me/api/portraits/women/65.jpg",
  "cand-sofia": "https://randomuser.me/api/portraits/women/44.jpg",
  "cand-noah": "https://randomuser.me/api/portraits/men/32.jpg",
  "cand-olivia": "https://randomuser.me/api/portraits/women/68.jpg",
  "cand-liam": "https://randomuser.me/api/portraits/men/46.jpg",
};

const avatarByName: Record<string, string> = {
  "daniel lee": avatarByCandidateId["cand-daniel"],
  "emma johnson": avatarByCandidateId["cand-emma"],
  "sofia williams": avatarByCandidateId["cand-sofia"],
  "noah kim": avatarByCandidateId["cand-noah"],
  "olivia smith": avatarByCandidateId["cand-olivia"],
  "liam chen": avatarByCandidateId["cand-liam"],
};

export function candidateAvatarUrl(candidateName: string, candidateId?: string) {
  return (candidateId ? avatarByCandidateId[candidateId] : undefined) ?? avatarByName[candidateName.trim().toLowerCase()];
}
