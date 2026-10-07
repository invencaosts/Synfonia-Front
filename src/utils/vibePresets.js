import { Smile, Frown, CloudRain, Moon, Sparkles, ListMusic } from 'lucide-react';

export const VIBE_PRESETS = [
  { icon: Smile, label: 'Feliz', value: 'feliz' },
  { icon: Frown, label: 'Triste', value: 'triste' },
  { icon: CloudRain, label: 'Melancólica', value: 'melancolica' },
  { icon: Moon, label: 'Noite', value: 'noite' },
  { icon: Sparkles, label: 'Energia', value: 'energia' },
];

export const vibeIcon = (vibe) => VIBE_PRESETS.find(v => v.value === vibe)?.icon || ListMusic;
