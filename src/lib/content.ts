import regionsJson from '../content/regions.json';
import poisJson from '../content/pois.json';
import activitiesJson from '../content/activities.json';
import avatarsJson from '../content/avatars.json';
import shopJson from '../content/shop.json';
import type {
  Activity,
  Avatar,
  CEFR,
  MatchContent,
  PointOfInterest,
  Region,
  ShopItem,
} from '../types';

export const regions = regionsJson as Region[];
export const pois = poisJson as PointOfInterest[];
export const activities = activitiesJson as unknown as Activity[];
export const avatars = avatarsJson as Avatar[];
export const shopItems = shopJson as ShopItem[];

export const getRegion = (id: string) => regions.find((r) => r.id === id);
export const getPoi = (id: string) => pois.find((p) => p.id === id);
export const getActivity = (id: string) => activities.find((a) => a.id === id);
export const getAvatar = (id: string | null) => avatars.find((a) => a.id === id) ?? avatars[0];
export const getShopItem = (id: string | undefined) => shopItems.find((i) => i.id === id);

export const poisForRegion = (regionId: string) => pois.filter((p) => p.regionId === regionId);

export const activitiesForPoi = (poi: PointOfInterest) =>
  poi.activityIds.map(getActivity).filter((a): a is Activity => !!a && a.status === 'approved');

const LEVELS: CEFR[] = ['A1', 'A2', 'B1', 'B2'];
export const levelAtLeast = (level: CEFR, required?: CEFR) =>
  !required || LEVELS.indexOf(level) >= LEVELS.indexOf(required);

/** Hebrew↔Arabic word list, built from every match activity. Used by the bot. */
export const dictionary = activities
  .filter((a) => a.template === 'match')
  .flatMap((a) => (a.content as MatchContent).pairs);
